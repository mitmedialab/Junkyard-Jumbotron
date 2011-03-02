
# Set program names
CP = cp
MV = mv
ECHO = echo
NODE = node
MAKE = make
WWW_DIR = app/ios/www

# Add local/bin to path
PWD := $(shell pwd)
PATH := $(PWD)/local/bin:$(PATH)

# Make all
all: node python
.PHONY: node python

# Make node
node-misc:
	npm install iconv
node: node-misc
	cd dep/node; ./configure --prefix ../../local
	$(MAKE) -C dep/node install


# Make python extensions
python:
	$(MAKE) -C python all

# Convert jade templates html and copy needed files to phonegap
phonegap-www:
	$(NODE) jjapp.js private/index.jade $(WWW_DIR)/index.html
	$(CP) -r public/javascript/*.js public/css/*.css public/images $(WWW_DIR)
