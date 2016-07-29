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
		if skip_existing:
			if os.path.isfile("%s/%s.zip" % (SEFARIA_EXPORT_PATH, title)):
				continue 
		export_text(title)
		export_index(title)
		zip_last_text(title)


def export_text(title):
	"""
	Takes a single document from the `texts` collection exports it, by chopping it up 
	Add helpful data like 
	"""
	print title
	try:
		for oref in model.Ref(title).all_subrefs():
			text = model.TextFamily(oref, version=None, lang=None, commentary=0, context=0, pad=0, alts=False).contents()
			text["next"]	= oref.next_section_ref().normal() if oref.next_section_ref() else None
			text["prev"]	= oref.prev_section_ref().normal() if oref.prev_section_ref() else None
			text["content"] = []
			
			if str(oref) == "Sha'ar Ha'Gemul of the Ramban 1":
				print "Sha'ar Ha'Gemul of the Ramban 1 is the worst"
			else:
				for x in range (0,max([len(text["text"]),len(text["he"])])):
					curContent = {}
					curContent["segmentNumber"] = str(x+1)

					links = get_links(text["ref"]+":"+curContent["segmentNumber"], False)
					for link in links:
						del link['commentator']
						del link['heCommentator']
						del link['type']
						del link['anchorText']
						del link['commentaryNum']
						if 'heTitle' in link: del link['heTitle']
						del link['_id']
						del link['anchorRef']
						del link['ref']
						del link['anchorVerse']
					
					curContent["links"] = links
				
					if x < len(text["text"]): curContent["text"]=text["text"][x]
					else: curContent["text"]=""
					if x < len(text["he"]): curContent["he"]=text["he"][x]
					else: curContent["he"]=""

					text["content"].append(curContent)

				text.pop("maps", None)
				text.pop("versionSource", None)
				text.pop("heDigitizedBySefaria", None)
				text.pop("heVersionTitle", None)
				text.pop("heVersionNotes", None)
				text.pop("heVersionStatus", None)
				text.pop("isSpanning", None)
				text.pop("heVersionSource", None)
				text.pop("versionNotes", None)
				text.pop("versionTitle", None)
				text.pop("heLicense", None)
				text.pop("digitizedBySefaria", None)
				text.pop("versions", None)
				text.pop("license", None)
				text.pop("versionStatus", None)
				text.pop("heSources", None)
				text.pop("sources", None)
				text.pop("he",None)
				text.pop("text",None)
				
				path = make_path(text, "json")
				write_doc(text, path)
	except Exception, e:
		logging.warning(e) 	
		pass
			

def export_index(title):
	"""
	Writes the JSON of the index record of the text called `title`. 
	"""
	index = model.get_index(title)
	index = index.contents(v2=True)
	path  = "%s/%s_index.json" % (SEFARIA_EXPORT_PATH, title)
	write_doc(index, path)


def export_toc():
	"""
	Writes the Table of Contents JSON to a single file.
	"""
	print "Export Table of Contents"
	toc  = model.library.get_toc()
	path = "%s/toc.json" % (SEFARIA_EXPORT_PATH)
	write_doc(toc, path)


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
	print("--- %s seconds ---" % round(time.time() - start_time, 2))