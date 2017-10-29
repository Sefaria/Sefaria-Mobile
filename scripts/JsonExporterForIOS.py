import sys
import os
import csv
import re
import json
import zipfile
import logging
import glob
import time
import traceback
import requests
from shutil import rmtree
from random import random
from pprint import pprint
from datetime import datetime
import dateutil.parser

from local_settings import *

sys.path.insert(0, SEFARIA_PROJECT_PATH)
sys.path.insert(0, SEFARIA_PROJECT_PATH + "/sefaria")
os.environ['DJANGO_SETTINGS_MODULE'] = "settings"

import sefaria.model as model
from sefaria.client.wrapper import get_links
from sefaria.model.text import Version
from sefaria.model.schema import Term
from sefaria.utils.talmud import section_to_daf
from sefaria.system.exceptions import InputError, BookNameError
from sefaria.system.exceptions import NoVersionFoundError
from sefaria.model.history import HistorySet
from sefaria.system.database import db

"""
list all version titles and notes in index
list index of version title / notes in section

OR

put default version title and notes in index
optional var 'merged:true' if merged. In this case section has version title and notes. This can also be merged, in which case ignore version

index is merged if any of its sections are Merged
or
any section has a version different than the default version
"""

SCHEMA_VERSION = "3"
EXPORT_PATH = SEFARIA_EXPORT_PATH + "/" + SCHEMA_VERSION
MINIFY_JSON = True

TOC_PATH          = EXPORT_PATH + "/toc.json"
SEARCH_TOC_PATH   = EXPORT_PATH + "/search_toc.json"
HEB_CATS_PATH     = EXPORT_PATH + "/hebrew_categories.json"
LAST_UPDATED_PATH = EXPORT_PATH + "/last_updated.json"



def make_path(doc, format):
    """
    Returns the full path and file name for exporting 'doc' in 'format'.
    """
    path = "%s/%s.%s" % (EXPORT_PATH, doc["ref"], format)
    return path


def make_json(doc):
    """
    Returns JSON of `doc` with export settings.
    """
    if MINIFY_JSON:
        return json.dumps(doc, separators=(',',':'), encoding='utf-8', ensure_ascii=False) #minified
    else:
        return json.dumps(doc, indent=4, encoding='utf-8', ensure_ascii=False) #prettified


def write_doc(doc, path):
    """
    Takes a dictionary `doc` ready to export and actually writes the file to the filesystem.
    """

    out  = make_json(doc)
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, "w") as f:
        f.write(out.encode('utf-8'))


def zip_last_text(title):
    """
    Zip up the JSON files of the last text exported into and delete the original JSON files.
    Assumes that all previous JSON files have been deleted and the remaining ones should go in the new zip.
    """
    os.chdir(EXPORT_PATH)

    zipPath = "%s/%s.%s" % (EXPORT_PATH, title, "zip")

    z = zipfile.ZipFile(zipPath, "w", zipfile.ZIP_DEFLATED)

    for file in glob.glob("*.json"):
        # NOTE: this also will skip search_toc.json since it ends in `toc.json`
        if file.endswith("calendar.json") or file.endswith("toc.json") or file.endswith("last_updated.json") or file.endswith("hebrew_categories.json"):
            continue
        z.write(file)
        os.remove(file)
    z.close()

    return


def export_texts(skip_existing=False):
    """
    Exports all texts in the database.
    TODO -- check history and last_updated to only export texts with changes
    """
    indexes = model.library.all_index_records()

    for index in reversed(indexes):
        if skip_existing and os.path.isfile("%s/%s.zip" % (EXPORT_PATH, index.title)):
            continue
        success = export_text(index)
        if not success:
            indexes.remove(index)

    write_last_updated([i.title for i in indexes])


def export_text(index, update=False):
    """Writes a ZIP file containing text content json and text index JSON
    :param index: can be either Index or str
    :param update: True if you want to write_last_updated for just this index
    """
    if isinstance(index, str):
        index = model.library.get_index(index)

    success = export_text_json(index)
    success = export_index(index) and success
    zip_last_text(index.title)

    if update and success:
        write_last_updated([index.title], update=update)

    return success


def export_updated():
    """
    Writes new TOC and zip files for each text that has changed since the last update.
    Write update times to last updated list.
    """
    #edit text, add text, edit text: {"date" : {"$gte": ISODate("2017-01-05T00:42:00")}, "ref" : /^Rashi on Leviticus/} REMOVE NONE INDEXES
    #add link, edit link: {"rev_type": "add link", "new.refs": /^Rashi on Berakhot/} REMOVE NONE INDEXES
    #delete link, edit link: {"rev_type": "add link", "old.refs": /^Rashi on Berakhot/} REMOVE NONE INDEXES
    if not os.path.exists(LAST_UPDATED_PATH):
        export_all()
        return

    print "Generating updated books list."
    updated_books = updated_books_list()
    print "{} books updated.".format(len(updated_books))
    new_books = new_books_since_last_update()
    print "{} books added.".format(len(new_books))
    updated_books += new_books

    print "Updating {} books\n{}".format(len(updated_books), "\n\t".join(updated_books))
    updated_indexes = []
    for t in updated_books:
        try:
            updated_indexes += [model.library.get_index(t)]
        except BookNameError:
            print "Skipping update for non-existent book '{}'".format(title)

    for index, title in zip(updated_indexes, updated_books):
        success = export_text(index)
        if not success:
            updated_books.remove(title) # don't include books which dont export

    export_toc()
    export_hebrew_categories()
    write_last_updated(updated_books, update=True)


def updated_books_list():
    """
    Returns a list of books that have updated since the last export.
    Returns None is there is no previous last_updated.json
    """
    if not os.path.exists(LAST_UPDATED_PATH):
        return None
    last_updated = json.load(open(LAST_UPDATED_PATH, "rb")).get("titles", {})
    updated_books = map(lambda x: x[0], filter(lambda x: has_updated(x[0], dateutil.parser.parse(x[1])), last_updated.items()))
    return updated_books


def has_updated(title, last_updated):
    """
    title - str name of index
    last_updated - datetime obj of our current knowledge of when this title was last updated
    """
    def construct_query(attribute, queries):
        query_list = [{attribute: {'$regex': query}} for query in queries]
        return {"date": {"$gt": last_updated}, '$or': query_list}
    try:
        title_queries = model.Ref(title).regex(as_list=True)
    except InputError:
        return False

    text_count = HistorySet(construct_query("ref", title_queries)).count()
    if text_count > 0:
        return True

    old_link_count = HistorySet(construct_query("old.refs", title_queries)).count()
    if old_link_count > 0:
        return True

    new_link_count = HistorySet(construct_query("new.refs", title_queries)).count()
    if new_link_count > 0:
        return True

    index_count = HistorySet({"date": {"$gt": last_updated}, "title":title}).count()
    if index_count > 0:
        return True

    return False


def get_default_versions(index):
    vdict = {}
    versions = index.versionSet().array()
    i = 0
    while ('he' not in vdict or 'en' not in vdict) and i < len(versions):
        v = versions[i]
        if v.language not in vdict:
            vdict[v.language] = v
        i += 1

    return vdict

def export_text_json(index):
    """
    Takes a single document from the `texts` collection exports it, by chopping it up
    Add helpful data like

    returns True if export was successful
    """
    print index.title
    defaultVersions = get_default_versions(index)
    try:
        for oref in index.all_top_section_refs():
            if oref.is_section_level():
                doc = section_data(oref, defaultVersions)
            else:
                sections = oref.all_subrefs()
                doc = {
                    "ref": oref.normal(),
                    "sections": {}
                }
                for section in sections:
                    doc["sections"][section.normal()] = section_data(section, defaultVersions)

            path = make_path(doc, "json")
            write_doc(doc, path)
        return True

    except Exception, e:
        print "Error exporting %s: %s" % (index.title, e)
        print traceback.format_exc()
        return False


def simple_link(link):
    """
    Returns dictionary with all we care about for link in a section
    """
    simple = {
        "sourceHeRef": link["sourceHeRef"],
        "sourceRef":   link["sourceRef"]
    }
    if link["category"] in ("Quoting Commentary", "Targum"):
        simple["category"] = link["category"]
    return simple


def section_data(oref, defaultVersions):
    """
    :param defaultVersions dict: {'en': Version, 'he': Version}
    Returns a dictionary with all the data we care about for section level `oref`.
    """
    tf = model.TextFamily(oref, version=None, lang=None, commentary=0, context=0, pad=0, alts=False)
    text = tf.contents()
    data = {
        "ref": text["ref"],
        "heRef": text["heRef"],
        "indexTitle": text["indexTitle"],
        "heTitle": text["heTitle"],
        "sectionRef": text["sectionRef"],
        "next":    oref.next_section_ref().normal() if oref.next_section_ref() else None,
        "prev": oref.prev_section_ref().normal() if oref.prev_section_ref() else None,
        "content": [],
    }

    def get_version_title(chunk):
        if not chunk.is_merged:
            version = chunk.version()
            if version and version.language in defaultVersions and version.versionTitle != defaultVersions[version.language].versionTitle:
                #print "VERSION NOT DEFAULT {} ({})".format(oref, chunk.lang)
                try:
                    vnotes = version.versionNotes
                except AttributeError:
                    vnotes = None
                try:
                    vlicense = version.license
                except AttributeError:
                    vlicense = None
                try:
                    vsource = version.versionSource
                except AttributeError:
                    vsource = None

                return version.versionTitle, vnotes, vlicense, vsource
            else:
                return None, None, None, None # default version
        else:
            #merged
            #print "MERGED SECTION {} ({})".format(oref, chunk.lang)
            all_versions = set(chunk.sources)
            merged_version = u'Merged from {}'.format(u', '.join(all_versions))
            return merged_version, None, None, None

    en_vtitle, en_vnotes, en_vlicense, en_vsource = get_version_title(tf._chunks['en'])
    he_vtitle, he_vnotes, he_vlicense, he_vsource = get_version_title(tf._chunks['he'])

    if en_vtitle:
        data['versionTitle'] = en_vtitle
    if he_vtitle:
        data['heVersionTitle'] = he_vtitle
    if en_vnotes:
        data['versionNotes'] = en_vnotes
    if he_vnotes:
        data['heVersionNotes'] = he_vnotes
    if en_vlicense:
        data['license'] = en_vlicense
    if he_vlicense:
        data['heLicense'] = he_vlicense
    if en_vsource:
        data['versionSource'] = en_vsource
    if he_vsource:
        data['heVersionSource'] = he_vsource


    en_len = len(text["text"])
    he_len = len(text["he"])
    for x in xrange (0,max([en_len,he_len])):
        curContent = {}
        curContent["segmentNumber"] = str(x+1)

        links = get_links(text["ref"] + ":" + curContent["segmentNumber"], False)
        print links
        if len(links) > 0:
            curContent["links"] = [simple_link(link) for link in links]

        if x < en_len: curContent["text"]=text["text"][x]
        if x < he_len: curContent["he"]=text["he"][x]

        data["content"] += [curContent]

    return data


def export_index(index):
    """
    Writes the JSON of the index record of the text called `title`.
    TODO - this function should probably take index as a parameter
    """
    try:
        index_counts = index.contents_with_content_counts()
        default_versions = get_default_versions(index)

        if 'en' in default_versions:
            index_counts['versionTitle'] = default_versions['en'].versionTitle
            try:
                index_counts['versionNotes'] = default_versions['en'].versionNotes
            except AttributeError:
                pass
            try:
                index_counts['license'] = default_versions['en'].license
            except AttributeError:
                pass
            try:
                index_counts['versionSource'] = default_versions['en'].versionSource
            except AttributeError:
                pass
        if 'he' in default_versions:
            index_counts['heVersionTitle'] = default_versions['he'].versionTitle
            try:
                index_counts['heVersionNotes'] = default_versions['he'].versionNotes
            except AttributeError:
                pass
            try:
                index_counts['heLicense'] = default_versions['he'].license
            except AttributeError:
                pass
            try:
                index_counts['heVersionSource'] = default_versions['he'].versionSource
            except AttributeError:
                pass
        path  = "%s/%s_index.json" % (EXPORT_PATH, index.title)
        write_doc(index_counts, path)

        return True
    except Exception, e:
        print "Error exporting Index for %s: %s" % (index.title, e)
        print traceback.format_exc()

        return False


def write_last_updated(titles, update=False):
    """
    Writes to `last_updated.json` the current time stamp for all `titles`.
    :param update: True if you only want to update the file and not overwrite
    """
    timestamp = datetime.now().replace(second=0, microsecond=0).isoformat()
    last_updated = {
        "schema_version": SCHEMA_VERSION,
        "comment":"",
        "titles": {title: timestamp for title in titles}
    }
    #last_updated["SCHEMA_VERSION"] = SCHEMA_VERSION
    if update:
        try:
            old_doc = json.load(open(LAST_UPDATED_PATH, "rb"))
        except IOError:
            old_doc = {"schema_version": 0, "comment": "", "titles": {}}

        old_doc["schema_version"] = last_updated["schema_version"]
        old_doc["comment"] = last_updated["comment"]
        old_doc["titles"].update(last_updated["titles"])
        last_updated = old_doc

    write_doc(last_updated, LAST_UPDATED_PATH)

    if USE_CLOUDFLARE:
        purge_cloudflare_cache(titles)


def export_hebrew_categories():
    """
    Writes translation of all English categories into a single file.
    """
    print "Export Hebrew Categories"
    term = Term()
    eng_cats = model.library.get_text_categories()
    hebrew_cats_json = {}
    for e in eng_cats:
        t = term.load_by_title(e)
        if not t:
            print u"Couldn't load term '{}'. Skipping Hebrew category".format(e)
        else:
            hebrew_cats_json[e] = t.titles[1][u'text']
    write_doc(hebrew_cats_json, HEB_CATS_PATH)


def export_toc():
    """
    Writes the Table of Contents JSON to a single file.
    """
    print "Export Table of Contents"
    new_toc = model.library.get_toc()
    new_search_toc = model.library.get_search_filter_toc()
    write_doc(new_toc, TOC_PATH)
    write_doc(new_search_toc, SEARCH_TOC_PATH)


def new_books_since_last_update():
    """
    Returns a list of books that have been added to the library since the last update.
    """
    new_toc = model.library.get_toc()
    def get_books(temp_toc, books):
        if isinstance(temp_toc, list):
            for child_toc in temp_toc:
                if "contents" in child_toc:
                    child_toc = child_toc["contents"]
                books.update(get_books(child_toc, set()))
        else:
            books.add(temp_toc["title"])
        return books

    last_updated = json.load(open(LAST_UPDATED_PATH, 'rb')) if os.path.exists(LAST_UPDATED_PATH) else {"titles": {}}
    old_books = last_updated["titles"].keys()
    new_books = get_books(new_toc, set())

    added_books = [book for book in new_books if book not in old_books]
    return added_books


def export_calendar():
    """
    Writes a JSON file with Parashah and Daf Yomi calendar from today onward.
    """
    calendar = {
        "parshiot": {},
        "dafyomi": {}
    }
    date = datetime.now()
    date_format = lambda date : date.strftime(" %m/ %d/%Y").replace(" 0", "").replace(" ", "")
    date_str = date_format(date)

    daf_today = db.dafyomi.find_one({"date": date_str})

    dafyomi = db.dafyomi.find({"_id": {"$gte": daf_today["_id"]}}).sort([("_id", 1)])
    for yom in dafyomi:
        try:
            ref = model.Ref(yom["daf"] + "a").normal()
            calendar["dafyomi"][yom["date"]] = {
                "name": yom["daf"],
                "ref": ref
            }
        except InputError, e:
            print "Error parsing '%s': %s" % (yom["daf"], str(e))


    parshiot = db.parshiot.find({"date": {"$gt": date}}).sort([("date", 1)])
    for parashah in parshiot:
        calendar["parshiot"][date_format(parashah["date"])] = {
            "name": parashah["parasha"],
            "ref": parashah["ref"],
            "haftara": parashah["haftara"],
            # below fields not currently used
            # "aliyot": parashah["aliyot"],
            # "shabbatName": parasha["shabbat_name"],
        }

    path = "%s/calendar.json" % (EXPORT_PATH)
    write_doc(calendar, path)


def clear_exports():
    """
    Deletes all files from any export directory listed in export_formats.
    """
    if os.path.exists(EXPORT_PATH):
        rmtree(EXPORT_PATH)


def purge_cloudflare_cache(titles):
    """
    Purges the URL for each zip file named in `titles` as well as toc.json, last_updated.json and calendar.json.
    """
    files = ["%s/%s/%s.zip" % (CLOUDFLARE_PATH, SCHEMA_VERSION, title) for title in titles]
    files += ["%s/%s/%s.json" % (CLOUDFLARE_PATH, SCHEMA_VERSION, title) for title in ("toc", "search_toc", "last_updated", "calendar", "hebrew_categories")]
    url = 'https://api.cloudflare.com/client/v4/zones/%s/purge_cache' % CLOUDFLARE_ZONE
    payload = {"files": files}
    headers = {
        "X-Auth-Email": CLOUDFLARE_EMAIL,
        "X-Auth-Key": CLOUDFLARE_TOKEN,
        "Content-Type": "application/json",
    }
    r = requests.delete(url, data=json.dumps(payload), headers=headers)
    print  "Purged {} files from Cloudflare".format(len(files))

    return r


def export_all(skip_existing=False):
    """
    Export everything we need.
    If `skip_existing`, skip any text that already has a zip file, otherwise delete everything and start fresh.
    """
    start_time = time.time()
    export_toc()
    export_calendar()
    export_hebrew_categories()
    export_texts(skip_existing)
    print("--- %s seconds ---" % round(time.time() - start_time, 2))


if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else None
    index = sys.argv[2] if len(sys.argv) > 2 else None
    if action == "export_all":
        export_all()
    elif action == "export_all_skip_existing":
        export_all(skip_existing=True)
    elif action == "export_text":
        if not index:
            print "To export_index, please provide index title"
        else:
            export_text(index, update=True)
    elif action == "export_updated":
        export_updated()
    elif action == "purge_cloudflare": #purge general toc and last_updated files
        if USE_CLOUDFLARE:
            purge_cloudflare_cache([])
        else:
            print "not using cloudflare"
    elif action == "export_toc":
        export_toc()
        purge_cloudflare_cache([])
    elif action == "export_hebrew_categories":
        export_hebrew_categories()
