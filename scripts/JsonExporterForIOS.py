# -*- coding: utf-8 -*-

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
import p929
import codecs
from shutil import rmtree
from random import random
from pprint import pprint
from datetime import timedelta
from datetime import datetime
import dateutil.parser
from local_settings import *

sys.path.insert(0, SEFARIA_PROJECT_PATH)
sys.path.insert(0, SEFARIA_PROJECT_PATH + "/sefaria")
os.environ['DJANGO_SETTINGS_MODULE'] = "settings"
import django
django.setup()

import sefaria.model as model
from sefaria.client.wrapper import get_links
from sefaria.model.text import Version
from sefaria.model.schema import Term
from sefaria.utils.talmud import section_to_daf
from sefaria.utils.hebrew import hebrew_parasha_name
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

SCHEMA_VERSION = "4"  # includes author info and new calendars
EXPORT_PATH = SEFARIA_EXPORT_PATH + "/" + SCHEMA_VERSION

TOC_PATH          = "/toc.json"
SEARCH_TOC_PATH   = "/search_toc.json"
HEB_CATS_PATH     = "/hebrew_categories.json"
PEOPLE_PATH       = "/people.json"
PACK_PATH         = "/packages.json"
CALENDAR_PATH     = "/calendar.json"
LAST_UPDATED_PATH = EXPORT_PATH + "/last_updated.json"



def make_path(doc, format):
    """
    Returns the full path and file name for exporting 'doc' in 'format'.
    """
    path = "%s/%s.%s" % (EXPORT_PATH, doc["ref"], format)
    return path


def write_doc(doc, path):
    """
    Takes a dictionary `doc` ready to export and actually writes the file to the filesystem.
    """

    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with codecs.open(path, "wb", encoding='utf-8') as f:
        json.dump(doc, f, encoding='utf-8', ensure_ascii=False, indent=(None if MINIFY_JSON else 4), separators=((',',':') if MINIFY_JSON else None))


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
            print "Skipping update for non-existent book '{}'".format(t)

    updated_books = map(lambda x: x.title, updated_indexes)
    for index in updated_indexes:
        success = export_text(index)
        if not success:
            updated_books.remove(index.title) # don't include books which dont export

    export_toc()
    export_hebrew_categories()
    export_packages()
    export_calendar()
    export_authors()
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
                try:
                    vnotesInHebrew = version.versionNotesInHebrew
                except AttributeError:
                    vnotesInHebrew = None
                try:
                    versionTitleInHebrew = version.versionTitleInHebrew
                except AttributeError:
                    versionTitleInHebrew = None

                return version.versionTitle, vnotes, vlicense, vsource, versionTitleInHebrew, vnotesInHebrew
            else:
                return None, None, None, None, None, None # default version
        else:
            #merged
            #print "MERGED SECTION {} ({})".format(oref, chunk.lang)
            all_versions = set(chunk.sources)
            merged_version = u'Merged from {}'.format(u', '.join(all_versions))
            return merged_version, None, None, None, None, None

    en_vtitle, en_vnotes, en_vlicense, en_vsource, en_vtitle_he, en_vnotes_he = get_version_title(tf._chunks['en'])
    he_vtitle, he_vnotes, he_vlicense, he_vsource, he_vtitle_he, he_vnotes_he = get_version_title(tf._chunks['he'])

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
    if en_vtitle_he:
        data['versionTitleInHebrew'] = en_vtitle_he
    if he_vtitle_he:
        data['heVersionTitleInHebrew'] = he_vtitle_he
    if en_vnotes_he:
        data['versionNotesInHebrew'] = en_vnotes_he
    if he_vnotes_he:
        data['heVersionNotesInHebrew'] = he_vnotes_he


    en_len = len(text["text"])
    he_len = len(text["he"])
    for x in xrange (0,max([en_len,he_len])):
        curContent = {}
        curContent["segmentNumber"] = str(x+1)

        links = get_links(text["ref"] + ":" + curContent["segmentNumber"], False)
        #print links
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
            try:
                index_counts['versionTitleInHebrew'] = default_versions['en'].versionTitleInHebrew
            except AttributeError:
                pass
            try:
                index_counts['versionNotesInHebrew'] = default_versions['en'].versionNotesInHebrew
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
            try:
                index_counts['heVersionTitleInHebrew'] = default_versions['he'].versionTitleInHebrew
            except AttributeError:
                pass
            try:
                index_counts['heVersionNotesInHebrew'] = default_versions['he'].versionNotesInHebrew
            except AttributeError:
                pass
        path  = "%s/%s_index.json" % (EXPORT_PATH, index.title)
        write_doc(index_counts, path)

        return True
    except Exception, e:
        print "Error exporting Index for %s: %s" % (index.title, e)
        print traceback.format_exc()

        return False


def get_indexes_in_category(cats, toc):
    indexes = []
    for temp_toc in toc:
        if u"contents" in temp_toc and (len(cats) == 0 or temp_toc[u"category"] == cats[0]):
            indexes += get_indexes_in_category(cats[1:], temp_toc[u"contents"])
        elif len(cats) == 0 and u"title" in temp_toc:
            indexes += [temp_toc[u"title"]]
    return indexes


def get_downloadable_packages():
    toc = model.library.get_toc()
    packages = [
        {
            u"en": "COMPLETE LIBRARY",
            u"he": u"כל הספרייה",
            u"color": "Other",
            u"categories": []
        },
        {
            u"en": "TANAKH with Rashi",
            u"he": u"תנ״ך עם רש״י",
            u"color": "Tanakh",
            u"parent": "TANAKH and all commentaries",
            u"categories": [
                "Tanakh/Torah",
                "Tanakh/Prophets",
                "Tanakh/Writings",
                "Tanakh/Commentary/Rashi"
            ]
        },
        {
            u"en": "TANAKH and all commentaries",
            u"he": u"תנ״ך וכל המפרשים",
            u"color": "Tanakh",
            u"categories": [
                "Tanakh"
            ]
        },
        {
            u"en": "TALMUD with Rashi and Tosafot",
            u"he": u"תלמוד עם רש״י ותוספות",
            u"parent": "TALMUD and all commentaries",
            u"color": "Talmud",
            u"categories": [
                "Talmud/Bavli/Seder Zeraim",
                "Talmud/Bavli/Seder Moed",
                "Talmud/Bavli/Seder Nashim",
                "Talmud/Bavli/Seder Nezikin",
                "Talmud/Bavli/Seder Kodashim",
                "Talmud/Bavli/Seder Tahorot",
                "Talmud/Bavli/Commentary/Rashi",
                "Talmud/Bavli/Commentary/Tosafot"
            ]
        },
        {
            u"en": "TALMUD and all commentaries",
            u"he": u"תלמוד וכל המפרשים",
            u"color": "Talmud",
            u"categories": [
                "Talmud"
            ]
        }
    ]
    # Add all top-level categories
    for cat in toc[:7]:
        if cat[u"category"] == "Tanakh" or cat[u"category"] == "Talmud":
            continue  # already included above
        packages += [{
            u"en": cat[u"category"].upper(),
            u"he": cat[u"heCategory"],
            u"color": cat[u"category"],
            u"categories": [cat[u"category"]]
        }]
    for p in packages:
        indexes = []
        hasCats = len(p[u"categories"]) > 0
        if hasCats:
            for c in p[u"categories"]:
                indexes += get_indexes_in_category(c.split("/"), toc)
        else:
            indexes += get_indexes_in_category([], toc)
        size = 0
        for i in indexes:
            size += os.path.getsize("{}/{}.zip".format(EXPORT_PATH, i)) if os.path.isfile("{}/{}.zip".format(EXPORT_PATH, i)) else 0  # get size in kb. overestimate by 1kb
        if hasCats:
            # only include indexes if not complete library
            p[u"indexes"] = indexes
        del p[u"categories"]
        p[u"size"] = size
    return packages

def write_last_updated(titles, update=False):
    """
    Writes to `last_updated.json` the current time stamp for all `titles`.
    :param update: True if you only want to update the file and not overwrite
    """

    timestamp = datetime.now().replace(second=0, microsecond=0).isoformat()
    last_updated = {
        "schema_version": SCHEMA_VERSION,
        "comment":"",
        "titles": {
            title: timestamp
            for title in titles
        }
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


def export_packages(for_sources=False):
    packages = get_downloadable_packages()
    write_doc(packages, (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + PACK_PATH)
    write_doc(packages, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + PACK_PATH)


def export_hebrew_categories(for_sources=False):
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
    write_doc(hebrew_cats_json, (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + HEB_CATS_PATH)
    write_doc(hebrew_cats_json, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + HEB_CATS_PATH)


def remove_silly_toc_nodes(toc):
    newToc = []
    for t in toc:
        if "contents" in t:
            new_item = {}
            for k, v in t.items():
                if k != "contents":
                    new_item[k] = v
            newToc += [new_item]
            newToc[-1]["contents"] = remove_silly_toc_nodes(t["contents"])
        elif "title" in t:
            newToc += [{k: v for k, v in t.items()}]
        else:
            print "Goodbye {}".format(t)
    return newToc



def export_toc(for_sources=False):
    """
    Writes the Table of Contents JSON to a single file.
    """
    print "Export Table of Contents"
    new_toc = model.library.get_toc()
    new_search_toc = model.library.get_search_filter_toc()
    new_new_toc = remove_silly_toc_nodes(new_toc)
    new_new_search_toc = remove_silly_toc_nodes(new_search_toc)
    write_doc(new_new_toc, (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + TOC_PATH)
    write_doc(new_new_search_toc, (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + SEARCH_TOC_PATH)
    write_doc(new_new_toc, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + TOC_PATH)
    write_doc(new_new_search_toc, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + SEARCH_TOC_PATH)


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
            try:
                books.add(temp_toc["title"])
            except KeyError:
                print "Bad Toc item skipping {}".format(temp_toc)
        return books

    last_updated = json.load(open(LAST_UPDATED_PATH, 'rb')) if os.path.exists(LAST_UPDATED_PATH) else {"titles": {}}
    old_books = last_updated["titles"].keys()
    new_books = get_books(new_toc, set())

    added_books = [book for book in new_books if book not in old_books]
    return added_books


def export_calendar(for_sources=False):
    """
    Writes a JSON file with Parashah and Daf Yomi calendar from today onward.
    """
    calendar = {
        "parasha": {},
        "dafyomi": {},
        "mishnah": {},
        "rambam": {},
        "929": {}
    }
    date = datetime.now() - timedelta(1)
    date_format = lambda date : date.strftime(" %m/ %d/%Y").replace(" 0", "").replace(" ", "")
    date_str = date_format(date)

    # DAF -----
    daf_today = db.dafyomi.find_one({"date": date_str})

    dafyomi = db.dafyomi.find({"_id": {"$gte": daf_today["_id"]}}).sort([("_id", 1)])
    for yom in dafyomi:
        try:
            ref = model.Ref(yom["daf"] + "a")
            tref = ref.normal()
            heTref = ref.he_normal()

            calendar["dafyomi"][yom["date"]] = {
                "ref": {"en": tref, "he": heTref}
            }
        except InputError, e:
            print "Error parsing '%s': %s" % (yom["daf"], str(e))

    # PARASHA -----
    parshiot = db.parshiot.find({"date": {"$gte": date}}).sort([("date", 1)])
    for parashah in parshiot:
        parshRef = model.Ref(parashah["ref"])
        parshTref = parshRef.normal()
        parshHeTref = parshRef.he_normal()
        haftarot = {custom: [{
            "en": model.Ref(h).normal(), "he": model.Ref(h).he_normal()
            } for h in haf_list] for custom, haf_list in parashah["haftara"].items() }
        calendar["parasha"][date_format(parashah["date"])] = {
            "parasha": {"en": parashah["parasha"], "he": hebrew_parasha_name(parashah["parasha"])},
            "ref": {"en": parshTref, "he": parshHeTref},
            "haftara": [haftarot["ashkenazi"][0], haftarot],  # backwards compatibility. app always reads first element of haftara array
            "diaspora": parashah["diaspora"]
            # below fields not currently used
            # "aliyot": parashah["aliyot"],
            # "shabbatName": parasha["shabbat_name"],
        }

    # MISHNA -----
    mishnayot = db.daily_mishnayot.find({"date": {"$gte": date}}).sort([("date", 1)])
    for mishnah in mishnayot:
        ref = model.Ref(mishnah["ref"])
        tref = ref.normal()
        heTref = ref.he_normal()
        mish_obj = {"ref": {"en": tref, "he": heTref}}
        date_key = date_format(mishnah["date"])
        if not date_key in calendar["mishnah"]:
            calendar["mishnah"][date_key] = [mish_obj]
        else:
            calendar["mishnah"][date_key] += [mish_obj]

    # RAMBAM -----
    rambamim = db.daily_rambam.find({"date": {"$gte": date}}).sort([("date",1)])
    for rambam in rambamim:
        ref = model.Ref(rambam["ref"])
        tref = ref.normal()
        heTref = ref.he_normal()
        display_value_en = tref.replace("Mishneh Torah, ","")
        display_value_he = heTref.replace(u"משנה תורה, ", u"")
        calendar["rambam"][date_format(rambam["date"])] = {
            "ref": {"en": tref, "he": heTref},
            "displayValue": {"en": display_value_en, "he": display_value_he}
        }

    # 929 -----
    end_date = date + timedelta(days=1000)
    curr_date = date
    while curr_date < end_date:
        p = p929.Perek(curr_date.date())
        ref = model.Ref("{} {}".format(p.book_name, p.book_chapter))
        tref = ref.normal()
        heTref = ref.he_normal()
        calendar["929"][date_format(curr_date)] = {
            "ref": {"en": tref, "he": heTref}
        }
        if p.number == 929:
            p929.origin = curr_date.date()
        curr_date += timedelta(days=1)

    path = (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + CALENDAR_PATH
    write_doc(calendar, path)
    write_doc(calendar, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + CALENDAR_PATH)


def export_authors(for_sources=False):
    ps = model.PersonSet()
    people = {}
    for person in ps:
        for name in person.names:
            if not isinstance(name["text"], basestring):
                continue
            people[name["text"].lower()] = 1
    path = (SEFARIA_IOS_SOURCES_PATH if for_sources else EXPORT_PATH) + PEOPLE_PATH
    write_doc(people, path)
    write_doc(people, (SEFARIA_ANDROID_SOURCES_PATH if for_sources else EXPORT_PATH) + PEOPLE_PATH)


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
    files += ["%s/%s/%s.json" % (CLOUDFLARE_PATH, SCHEMA_VERSION, title) for title in ("toc", "search_toc", "last_updated", "calendar", "hebrew_categories", "people", "packages")]
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
    export_authors()
    export_packages()
    print("--- %s seconds ---" % round(time.time() - start_time, 2))

def export_base_files_to_sources():
    """
    Export the basic files that should be bundled with a new release of the iOS app
    Run this before every new release
    """
    export_toc(for_sources=True)
    export_hebrew_categories(for_sources=True)
    export_calendar(for_sources=True)
    export_authors(for_sources=True)
    export_packages(for_sources=True)  # relies on full dump to be available to measure file sizes

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
    elif action == "export_calendar":
        export_calendar()
    elif action == "export_authors":
        export_authors()
    elif action == "export_base_files_to_sources":
        export_base_files_to_sources()
    elif action == "export_packages":
        export_packages()
    elif action == "write_last_updated":  # for updating package infor
        write_last_updated([], True)
