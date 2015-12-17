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
from sefaria.model.text import Version
from sefaria.utils.talmud import section_to_daf
from sefaria.system.exceptions import InputError
#from summaries import ORDER, get_toc
from sefaria.system.database import db



SEFARIA_EXPORT_PATH = "/users/rneiss/desktop/test/"
logging.basicConfig(filename="/users/rneiss/desktop/example.log",level=logging.DEBUG)


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
	"""
	Writes document to disk according to all formats in export_formats
	"""
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
			f.write("["+out.encode('utf-8')+"]")

	lastTitleZipped = str(doc["book"])

"""	
	print lastTitleZipped
	
	if doc["title"] != lastTitleZipped:
		zip_last_book(lastTitleZipped)
		lastTitleZipped = doc["title"]
"""


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
			try:
				text = model.TextFamily(oref, version=version, lang=None, commentary=0, context=0, pad=0, alts=False).contents()
			except AttributeError as e:
				oref = oref.default_child_ref()
				text = TextFamily(oref, version=version, lang=lang, commentary=commentary, context=context, pad=pad, alts=alts).contents()

			# Use a padded ref for calculating next and prev
			# TODO: what if pad is false and the ref is of an entire book?
			# Should next_section_ref return None in that case?

			text["next"]	   = oref.next_section_ref().normal() if oref.next_section_ref() else None
			text["prev"]	   = oref.prev_section_ref().normal() if oref.prev_section_ref() else None
			text["links"] = []
			text["sortingCat"]= format_link_object_for_client(oref)
			print text["sortingCat"]

			try:			
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
		
			console.log(text)

			except Exception, e:
				logging.warning(e) 
			
			mongoSearchTerm = "^\Q"+str(oref)+":\E.*"
			sectionLinks = db.links.find({ "$or": [ { "refs.1": { "$regex": mongoSearchTerm } }, { "refs.0": { "$regex": mongoSearchTerm } } ] })
			
			
			for link in sectionLinks:
				try:
					if (oref.top_section_ref() == model.Ref(link["refs"][0]).top_section_ref()):
						text["links"].append([link["refs"][0].replace(text["book"]+" ",""),link["refs"][1]])

					else:
						text["links"].append([link["refs"][1].replace(text["book"]+" ",""),link["refs"][0]])
					
				except Exception, e:
					logging.warning(e) 	
					pass
			
			export_text_doc(text)
			
	except Exception, e:
		logging.warning(e) 	
		pass


