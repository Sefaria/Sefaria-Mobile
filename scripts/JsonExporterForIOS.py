import sys
import os
import csv
import re
import json
import zipfile
import logging
import glob
import time
from shutil import rmtree
from random import random
from pprint import pprint
from datetime import datetime

from local_settings import *

sys.path.insert(0, SEFARIA_PROJECT_PATH)
os.environ['DJANGO_SETTINGS_MODULE'] = "settings"

import sefaria.model as model
from sefaria.client.wrapper import get_links
from sefaria.model.text import Version
from sefaria.utils.talmud import section_to_daf
from sefaria.system.exceptions import InputError
from sefaria.system.database import db


PROJECT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEFARIA_EXPORT_PATH = PROJECT_PATH + "/ReaderApp/ios/sources"


def make_path(doc, format):
	"""
	Returns the full path and file name for exporting 'doc' in 'format'.
	"""
	path = "%s/%s.%s" % (SEFARIA_EXPORT_PATH, doc["ref"], format)
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
	os.chdir(SEFARIA_EXPORT_PATH)

	zipPath = "%s/%s.%s" % (SEFARIA_EXPORT_PATH, title, "zip")

	z = zipfile.ZipFile(zipPath, "w", zipfile.ZIP_DEFLATED)

	for file in glob.glob("*.json"):
		if file.endswith("calendar.json") or file.endswith("toc.json"):
			continue
		z.write(file)
		os.remove(file)
	z.close()

	return


def export_texts(skip_existing=False):
	"""
	Exports all texts in the database. 
	"""
	titles = [i.title for i in model.library.all_index_records(with_commentary=True)]

	for title in titles:
		if skip_existing and os.path.isfile("%s/%s.zip" % (SEFARIA_EXPORT_PATH, title)):
			continue 
		export_text(title)


def export_text(title):
	"""Writes a ZIP file containing text content json and text index JSON"""
	export_text_json(title)
	export_index(title)
	zip_last_text(title)	


def export_text_json(title):
	"""
	Takes a single document from the `texts` collection exports it, by chopping it up 
	Add helpful data like 
	"""
	print title
	try:
		for oref in model.get_index(title).all_top_section_refs():
			if oref.is_section_level():
				doc = section_data(oref)
			else:
				sections = oref.all_subrefs()
				doc = {
					"ref": oref.normal(),
					"sections": {}
				}
				for section in sections:
					doc["sections"][section.normal()] = section_data(section)
					
			path = make_path(doc, "json")
			write_doc(doc, path)

	except Exception, e:
		print "Error exporting %s: %s" % (title, e)
		import traceback
		print traceback.format_exc()


def section_data(oref):
	"""
	Returns a dictionary with all the data we care about for section level `oref`.
	"""
	text = model.TextFamily(oref, version=None, lang=None, commentary=0, context=0, pad=0, alts=False).contents()
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
	
	for x in range (0,max([len(text["text"]),len(text["he"])])):
		curContent = {}
		curContent["segmentNumber"] = str(x+1)

		links = get_links(text["ref"] + ":" + curContent["segmentNumber"], False)
		def simple_link(link):
			simple = {
				"sourceHeRef": link["sourceHeRef"],
				"sourceRef":   link["sourceRef"]
			}
			if link["category"] in ("Quoting Commentary", "Targum"):
				simple["category"] = link["category"]
			return simple
			
		if len(links) > 0:
			curContent["links"] = [simple_link(link) for link in links]
	
		if x < len(text["text"]): curContent["text"]=text["text"][x]
		if x < len(text["he"]): curContent["he"]=text["he"][x]

		data["content"].append(curContent)

	return data


def export_index(title):
	"""
	Writes the JSON of the index record of the text called `title`. 
	"""
	try:
		index = model.get_index(title)
		index = index.contents_with_content_counts()
		path  = "%s/%s_index.json" % (SEFARIA_EXPORT_PATH, title)
		write_doc(index, path)
	except Exception, e:
		print "Error exporting Index for %s: %s" % (title, e)
		import traceback
		print traceback.format_exc()
			

def export_toc():
	"""
	Writes the Table of Contents JSON to a single file.
	"""
	print "Export Table of Contents"
	toc  = model.library.get_toc()
	path = "%s/toc.json" % (SEFARIA_EXPORT_PATH)
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

	path = "%s/calendar.json" % (SEFARIA_EXPORT_PATH)
	write_doc(calendar, path)


def clear_exports():
	"""
	Deletes all files from any export directory listed in export_formats.
	"""
	if os.path.exists(SEFARIA_EXPORT_PATH):
		rmtree(SEFARIA_EXPORT_PATH)


def export_all(skip_existing=False):
	"""
	Export everything we need.
	If `skip_existing`, skip any text that already has a zip file, otherwise delete everything and start fresh.
	"""
	start_time = time.time()
	if not skip_existing:
		clear_exports()
	export_texts(skip_existing)
	export_toc()
	export_calendar()
	print("--- %s seconds ---" % round(time.time() - start_time, 2))