// ======================================================================
// Params - global parameters

var join = require('path').join;

module.exports = {

    // Server listens on this port. NOTE: If you change this, also
    // change it in the apache configs and in jjclient.js.
    port: 80,

    // Regexp for allowable jumbotron names
    jumbotronRegExp:  /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,

    // Disallowed jumbotron names
    jumbotronReserved: { postmaster: 1,
			 abuse: 1,
			 spam: 1,
			 help: 1,
			 info: 1,
			 noreply: 1,
			 'mailer-daemon': 1 },

    // Directory for temporary file uploads
    tmpDir: '/tmp',

    // Public resource directory for web clients
    resourceDir: 'public',

    // Directory with jumbotron directories (with images and icons)
    jumbotronsDir: join('public', 'jumbotrons'),

    // Directory with sample images
    samplesDir: join('public', 'samples'),

    // Image shown on all the displays after a calibration
    calibratedImageOptions: {
	source: join('public', 'images', 'grid.png'),
	width: 1024,
	height: 768
    },

    // Image shown on a display whose marker was not found
    errorImageOptions: {
	source: join('public', 'images', 'error.png'),
	width: 1024,
	height: 768
    },

    // Marker images
    markerImageOptions: {
	sourceFormat: join('public', 'markers', 'bch_large', 'BchThin_%04d.png'),
	width: 1000,
	height: 1000
    },
 
    // Database directory
    databaseDir: join('private', 'database'),

    // Directory with jumbotron directories (with images and icons)
    viewsDir: join('private', 'views'),

    // Handle log, warning, and error messages
    logging: {
	// Log messages to the console
	useConsole: true,

	// Log messages to a file
	useFile: true,
	filename: join('private', 'logs', 'output.log'),

	// Rotating log file details
	maxFileSize: 10 * 1024 * 1024, // Maximum number of bytes per file 
	backups: 10,               // How many files to keep
	pollInterval: 60          // Seconds between checking the file size
    },

    // Python script(s)
    pythonPath: '/usr/local/bin:/usr/bin',
    python: 'python',
    calibrateScript: join('python', 'calibrate.py'),

    // SMTP server info (override in paramsLocal.js)
    email: {
	smtpServer: 'smtp.myserver.com',
	user: 'jumbotronuser@myserver.com',
	pwd:  'mypass',
	ssl: true,
	port: 465,
	debug: false
    },

    // The server that will receive emails of the form 
    // [jumbotron-name]@thiserver.com.  Override this in paramLocal.js
    imageReceiveServer: 'thisserver.com',
	
    // Debug flags
    debug: true
};

// Merge in local changes, if any
var utils = require('./utils');
try {
    var local = require('./paramsLocal');
    utils.extend(module.exports, local);
    // Save the local parameters so we can log about them later
    module.exports.localParams = local;
}
catch (exception) {
    if (! utils.isStartsWith(exception.message, 'Cannot find module'))
	throw exception;
}
