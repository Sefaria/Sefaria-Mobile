import sys
import os
import csv
import re
import json
import zipfile
import logging
import glob
from shutil import rmtree
from random import random
from pprint import pprint
from datetime import datetime

import sefaria.model as model
from sefaria.client.wrapper import get_links
from sefaria.model.text import Version
from sefaria.utils.talmud import section_to_daf
from sefaria.system.exceptions import InputError
#from summaries import ORDER, get_toc
from sefaria.system.database import db

import time
start_time = time.time()



SEFARIA_EXPORT_PATH = "LOCAL_PATH_HERE"

texts = db.texts.find()

lang=None
version=None
lastTitleZipped = ""


def make_path(doc, format):
	"""
	Returns the full path and file name for exporting 'doc' in 'format'.
	"""
	path = "%s/%s.%s" % (SEFARIA_EXPORT_PATH,
											doc["ref"],
											format)
	return path


def make_json(doc):
	"""
	Returns JSON of 'doc' with export settings.
	"""
	return json.dumps(doc, indent=4, encoding='utf-8', ensure_ascii=False) #prettified
#	return json.dumps(doc, separators=(',',':'), encoding='utf-8', ensure_ascii=False) #minified
 

export_formats = (
	('json', make_json),
)



def export_text_doc(doc):
	global lastTitleZipped
	
	if lastTitleZipped != doc["book"]:
		zip_last_book(lastTitleZipped)

	
	try: 
		lastTitleZipped
	except: 
		lastTitleZipped = ""

	for format in export_formats:
		out = format[1](doc)
		path = make_path(doc, format[0])
		if not os.path.exists(os.path.dirname(path)):
			os.makedirs(os.path.dirname(path))
		with open(path, "w") as f:
			f.write(out.encode('utf-8'))

	lastTitleZipped = str(doc["book"])

def zip_last_book(titleToZip):

	os.chdir(SEFARIA_EXPORT_PATH)

	zipPath = "%s/%s.%s" % (SEFARIA_EXPORT_PATH,
											titleToZip,
											"zip")


	z = zipfile.ZipFile(zipPath, "w",zipfile.ZIP_DEFLATED)

	for file in glob.glob("*.json"):
		z.write(file)
		os.remove(file)
	z.close()

	return



for text in texts:
	try:
		for oref in model.Ref(text["title"]).all_subrefs():
			text = model.TextFamily(oref, version=version, lang=None, commentary=0, context=0, pad=0, alts=False).contents()
			text["next"]	   = oref.next_section_ref().normal() if oref.next_section_ref() else None
			text["prev"]	   = oref.prev_section_ref().normal() if oref.prev_section_ref() else None
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
				
				export_text_doc(text)
	except Exception, e:
		print oref
		logging.warning(e) 	
		pass
			

print("--- %s seconds ---" % round(time.time() - start_time, 2))

