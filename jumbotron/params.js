// ======================================================================
// Params - global parameters

var join = require('path').join;

module.exports = {

    // Server listens on this port. NOTE: If you change this, also
    // change it in the apache configs and in jjclient.js.
    port: 8077,

    // Regexp for allowable jumbotron names
    jumbotronRegExp:  /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,

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

    // File for log, warning, and error messages
    logFile: join('private', 'logs', 'output.log'),

    // Python scripts
    pythonPath: '/usr/local/bin:/usr/bin',
    python: 'python',
    calibrateScript: join('python', 'calibrate.py'),
    mailScript: join('python', 'mail.py'),

    // Email server info
    email: {
	mboxUser: 'jj',
	mboxPath: '/var/mail/jj', // unix specific
	smtpServer: 'smtp.gmail.com',
	smtpUser: 'jj.brownbag@gmail.com',
	smtpPwd:  'Br0wnB@g',
	debug: true
    },

    // Debug flags
    // TODO: better logging controls (see python's logging package)
    debug: true,
};

// Merge in local changes, if any
var utils = require('./utils');
try {
    var local = require('./paramsLocal');
    utils.extend(module.exports, local);
    utils.log("WARNING: Using local parameters (paramsLocal.js)");
}
catch (exception) {
    if (! utils.isStartsWith(exception.message, 'Cannot find module'))
	throw exception;
}
