
# Set program names
CP = cp
MV = mv
ECHO = echo
NODE = node
NPM = sudo npm
MAKE = make
WWW_DIR = app/ios/www

# Make all
all: node-packages python-extension

# Install required node modules
# TODO: Probably should be local to avoid stepping on anyones toes.
node-packages:
	$(NPM) install chaos@0.1.6-pre
	$(NPM) install connect@0.5.9
	$(NPM) install express@1.0.7
	$(NPM) install formidable@0.9.11
	$(NPM) install gently@0.8.0
	$(NPM) install gm@0.4.0
	$(NPM) install iconv@1.0.0
	$(NPM) install jade@0.9.1
	$(NPM) install log4js@0.2.3
	$(NPM) install mailparser@0.1.0
	$(NPM) install node-dev@0.0.5
	$(NPM) install nodemailer@0.1.6
	$(NPM) install qs@0.0.5
	$(NPM) install socket.io@0.6.16
	$(NPM) install underscore@1.1.4

# Make python extension
python-extension:
	$(MAKE) -C python all

# Convert jade templates html and copy needed files to phonegap
phonegap-www:
	$(NODE) jjapp.js private/index.jade $(WWW_DIR)/index.html
	$(CP) -r public/javascript/*.js public/css/*.css public/images $(WWW_DIR)
