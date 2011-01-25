CP = cp
MV = mv
ECHO = echo
NODE = local/bin/node
WWW_DIR = app/iphone/www

# Convert jade templates html and copy needed files to phonegap
phonegap-www:
	$(NODE) jjapp.js private/index.jade $(WWW_DIR)/index.html
	$(CP) -r public/*.js public/*.css public/images $(WWW_DIR)

# If you need ssl:
# > sudo apt-get install libssl0.9.8 # Or latest
# > sudo apt-get install libssl-dev
# If you need gmL
# > sudo apt-get install graphicsmagick
node:
	cd dep/node; ./configure --prefix ../../local
	make -C dep/node install

python:
	make -C python all

.PHONY: node python
all: node python
