CP = cp
MV = mv
ECHO = echo
NODE = /usr/local/bin/node
WWW_DIR = app/iphone/www

# Convert jade templates html and copy needed files to phonegap
phonegap-www:
	$(NODE) jjapp.js private/index.jade $(WWW_DIR)/index.html
	$(CP) -r public/*.js public/*.css public/images $(WWW_DIR)
