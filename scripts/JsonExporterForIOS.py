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

from local_settings import *

sys.path.insert(0, SEFARIA_PROJECT_PATH)
sys.path.insert(0, SEFARIA_PROJECT_PATH + "/sefaria")
os.environ['DJANGO_SETTINGS_MODULE'] = "settings"

import sefaria.model as model
from sefaria.client.wrapper import get_links
from sefaria.model.text import Version
from sefaria.utils.talmud import section_to_daf
from sefaria.system.exceptions import InputError
from sefaria.system.exceptions import NoVersionFoundError
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

SCHEMA_VERSION = "1"
EXPORT_PATH = SEFARIA_EXPORT_PATH + "/" + SCHEMA_VERSION


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
	return json.dumps(doc, indent=4, encoding='utf-8', ensure_ascii=False) #prettified
	#return json.dumps(doc, separators=(',',':'), encoding='utf-8', ensure_ascii=False) #minified


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
		if file.endswith("calendar.json") or file.endswith("toc.json") or file.endswith("last_update.json"):
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
	indexes = model.library.all_index_records(with_commentary=True)

	for index in indexes:
		if skip_existing and os.path.isfile("%s/%s.zip" % (EXPORT_PATH, index.title)):
			continue
		export_text(index)

	write_last_updated([i.title for i in indexes])


def export_text(index):
	"""Writes a ZIP file containing text content json and text index JSON"""
	export_text_json(index)
	export_index(index)
	zip_last_text(index.title)


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

	except Exception, e:
		print "Error exporting %s: %s" % (index.title, e)
		print traceback.format_exc()


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
		"next":	oref.next_section_ref().normal() if oref.next_section_ref() else None,
		"prev": oref.prev_section_ref().normal() if oref.prev_section_ref() else None,
		"content": [],
	}

	def get_version_title(chunk):
		if not chunk.is_merged:
			version = chunk.version()
			if version and version.language in defaultVersions and version.versionTitle != defaultVersions[version.language].versionTitle:
				print "VERSION NOT DEFAULT {} ({})".format(oref, chunk.lang)
				try:
					vnotes = version.versionNotes
				except AttributeError:
					vnotes = None
				try:
					vlicense = version.license
				except AttributeError:
					vlicense = None

				return version.versionTitle, vnotes, vlicense
			else:
				return None, None, None # default version
		else:
			#merged
			print "MERGED SECTION {} ({})".format(oref, chunk.lang)
			all_versions = set(chunk.sources)
			merged_version = u'Merged from {}'.format(u', '.join(all_versions))
			return merged_version, None, None

	en_vtitle, en_vnotes, en_vlicense = get_version_title(tf._chunks['en'])
	he_vtitle, he_vnotes, he_vlicense = get_version_title(tf._chunks['he'])

	if en_vtitle:
		data['versionTitle'] = en_vtitle
	if he_vtitle:
		data['heVersionTitle'] = he_vtitle
	if en_vnotes:
		data['versionNotes'] = en_vnotes
	if he_vnotes:
		data['heVersionNotes'] = he_vnotes
	if en_vlicense:
		data['versionLicense'] = en_vlicense
	if he_vlicense:
		data['heVersionLicense'] = he_vlicense



	en_len = len(text["text"])
	he_len = len(text["he"])
	for x in xrange (0,max([en_len,he_len])):
		curContent = {}
		curContent["segmentNumber"] = str(x+1)

		links = get_links(text["ref"] + ":" + curContent["segmentNumber"], False)

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
				index_counts['versionLicense'] = default_versions['en'].versionLicense
			except AttributeError:
				pass
		if 'he' in default_versions:
			index_counts['heVersionTitle'] = default_versions['he'].versionTitle
			try:
				index_counts['heVersionNotes'] = default_versions['he'].versionNotes
			except AttributeError:
				pass
			try:
				index_counts['heVersionLicense'] = default_versions['he'].versionLicense
			except AttributeError:
				pass
		path  = "%s/%s_index.json" % (EXPORT_PATH, index.title)
		write_doc(index_counts, path)
	except Exception, e:
		print "Error exporting Index for %s: %s" % (index.title, e)
		print traceback.format_exc()


def write_last_updated(titles):
	"""
	Writes to `last_updated.json` the current time stamp for all `titles`.
	TODO -- read current file, don't just overwrite
	"""
	timestamp = datetime.now().replace(second=0, microsecond=0).isoformat()
	last_updated = {title: timestamp for title in titles}
	write_doc(last_updated, EXPORT_PATH + "/last_updated.json")
	if USE_CLOUDFLARE:
		purge_cloudflare_cache(titles)


def export_toc():
	"""
	Writes the Table of Contents JSON to a single file.
	"""
	print "Export Table of Contents"
	toc  = model.library.get_toc()
	path = "%s/toc.json" % (EXPORT_PATH)
	write_doc(toc, path)


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
	files += ["%s/%s/%s.json" % (CLOUDFLARE_PATH, SCHEMA_VERSION, title) for title in ("toc", "last_updated", "calendar")]
	url = 'https://api.cloudflare.com/client/v4/zones/%s/purge_cache' % CLOUDFLARE_ZONE
	payload = {"files": files}
	headers = {
		"X-Auth-Email": CLOUDFLARE_EMAIL,
		"X-Auth-Key": CLOUDFLARE_TOKEN,
		"Content-Type": "application/json",
	}
	print files
	r = requests.delete(url, data=json.dumps(payload), headers=headers)
	return r


def export_all(skip_existing=False):
	"""
	Export everything we need.
	If `skip_existing`, skip any text that already has a zip file, otherwise delete everything and start fresh.
	"""
	start_time = time.time()
	if not skip_existing:
		clear_exports()
	export_toc()
	export_calendar()
	export_texts(skip_existing)
	print("--- %s seconds ---" % round(time.time() - start_time, 2))


def num_ged_sections(lang):
	inds = model.library.all_index_records(with_commentary=True)

	num_secs = 0
	num_merged = 0
	for j, i in enumerate(inds):
		if j % 100 == 0:
			print "{}/{}".format(j, len(inds))

		for s in i.all_section_refs():
			try:
				if s.text(lang).is_merged:
					num_merged += 1
				num_secs += 1
			except NoVersionFoundError:
				print "{} Failed from index {}".format(s, i.title)
				continue

	print "{}/{} Merged".format(num_merged, num_secs)
