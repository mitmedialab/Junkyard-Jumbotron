/*
TODO: From the express web page:
 To alter the environment we can set the NODE_ENV environment variable, for example:
 $ NODE_ENV=production node app.js
 This is very important, as many caching mechanisms are only enabled when in production.
*/

// Node.js core libs
var os = require('os');
var http = require('http');
var assert = require('assert');
var path = require('path');
var urlParse = require('url').parse;
var fs = require('fs');
var exec = require('child_process').exec;

// 3rd party add-on libs
var io = require('socket.io');
var formidable = require('formidable');
var express = require('express');
var log4js = require('log4js')(); //note the need to call the function

// Use our own until connect.staticProvider makes clearCache accessible
// https://github.com/senchalabs/connect/issues/issue/187
var staticProvider = require('./jumbotron/staticProvider');

// Jumbotron libs
var jumbotron  = require('./jumbotron');
var utils = jumbotron.utils;
var params = jumbotron.params;
var calibrate = jumbotron.calibrate;
var mail = jumbotron.mail;
var Viewport = jumbotron.Viewport;
var Display = jumbotron.Display;
var Controller = jumbotron.Controller;
var Image = jumbotron.Image;
var Jumbotron = jumbotron.Jumbotron;
var Manager = jumbotron.Manager;
var x = jumbotron.messages.translate;

var error = utils.error;
var info  = utils.info;
var debug = utils.debug;
var trace = utils.trace;

// ======================================================================
// Server

function Server() {
    this.init();
}

Server.prototype = {

    init: function init() {
	// Initialize logging
	this.initLogging();
	info('\n----------------------------------------------------------------------');
	this.logEnvironment();
	this.logOsStats();
	if (params.debug)
	    setInterval(this.logOsStats, 10 * 60 * 1000); // Every 10 minutes

	// Initialize server and socket
	this._manager = new Manager();
	this.initServer();
	this.initSocket();

	// Listen for Jumbotron changes
	Jumbotron.listener = this.handleImageChange.bind(this);

	// Startup server
	this._server.listen(params.port);
    },

    // ----------------------------------------------------------------------
    // Logging

    initLogging: function initLogging() {
	// Format logs (log4js.patternLayout crashes and doesn't log exceptions)

	// Format an exception
	function layoutException(loggingEvent) {
	    if (loggingEvent.exception.stack)
		return loggingEvent.exception.stack;
	    else
		return loggingEvent.exception.name + ': '+ loggingEvent.exception.message;
	}
	// Format with timestamp, for log file
	function layout (loggingEvent) {
	    var timestamp = loggingEvent.startTime.toFormattedString("MM-dd hh:mm:ss.SSS: ");
	    var output = timestamp + loggingEvent.message;
	    if (loggingEvent.exception)
		output += '\n' + timestamp + layoutException(loggingEvent);
	    return output;
	}
	// Format with no timestamp, for console
	function layoutSimple (loggingEvent) {
	    var output = loggingEvent.message;
	    if (loggingEvent.exception)
		output += '\n' + layoutException(loggingEvent);
	    return output;
	}

	// Log to console and/or file
	var config = params.logging;
	log4js.clearAppenders();
	if (config.useConsole)
	    log4js.addAppender(log4js.consoleAppender(layoutSimple));
	if (config.useFile)
	    log4js.addAppender(log4js.fileAppender(config.filename, layout,
						   config.maxFileSize, config.backups,
						   config.pollInterval));

	// Set logging level, and clear out debug function for speed
	var logger = log4js.getLogger();
	logger.setLevel(params.debug ? 'DEBUG' : 'INFO');
	if (! params.debug)
	    debug = utils.debug = function() {};
    },

    logEnvironment: function logEnvironment() {
	exec("ulimit -a", function(err, stdout, stderr) {
		if (err)
		    error("Can't run ulimit:", stderr);
	    else {
		info('Limits:');
		info(stdout.replace(/^/mg, '\t').replace(/\n\s$/g, ''));
	    }
	});
	if (params.localParams) {
	    info("WARNING: Using local parameters from 'paramsLocal.js'");
	    for (var param in params.localParams)
		info('\t', param, '\t', params.localParams[param]);
	}
	info('Environment:');
	for (var env in process.env)
	    info('\t', env, '\t', process.env[env]);
	info('Host: {0} ({1}:{2})'.format(os.hostname(), os.type(), os.release()));
    },

    logOsStats: function logOsStats() {
	utils.osStats(function(stats) {
	    info(utils.osStatsToString(stats));
	});
    },

    // ----------------------------------------------------------------------
    // HTML Server
	
    initServer: function initServer() {
	info('Starting Junkyard Jumbotron Server');

	// Create server with the given middleware
	var server = this._server = express.createServer(
	    // Decode cookies
	    express.cookieDecoder(),
	    
	    // Decode forms and body
	    express.bodyDecoder(),

	    // Intercept thumbnail requests.
	    function(req, res, next) {
		if (! req.query.tn)
		    return next();

		var url = urlParse(req.url);
		if (url.pathname.indexOf('..') != -1)
		    return next();

		var filename = path.join(params.resourceDir, url.pathname);
		Image.makeThumbnail(filename, 80, function(err, filename) {
		    if (err) {
			res.send(err, 404);
		    }
		    else {
			req.url = filename.slice(params.resourceDir.length);
			next(); // pass to static provider
		    }
		});
	    },

	    // Intercept requests for static files
	    staticProvider(path.join(__dirname, params.resourceDir))
	);

	// Add middleware for dev mode
	server.configure('development', function() {
	    //server.use(express.logger());
	    server.use(express.errorHandler({ dumpExceptions: true,
					      showStack: true }));
	});

	// Add middleware for production mode
	server.configure('production', function(){
	    server.use(express.errorHandler({ dumpExceptions: true,
					      showStack: true }));
	});

	// Catch all exceptions
	process.on('uncaughtException', function (err) {
	    error('UNCAUGHT EXCEPTION', err);
	});

	// Template options
	server.set('views', params.viewsDir);
	server.set('view engine', 'jade');
	server.set('view options', { layout: null } );

	// Routes
	server.get('/', function(req, res) {
	    res.render('index');
	});
	server.get('/admin'     , this.handleAdmin      .bind(this));
	server.get('/:jumbotron', this.handleJoin       .bind(this));
	server.post('/:cmd'     , this.handlePostMessage.bind(this));
    },

    // ----------------------------------------------------------------------
    // Routes

    // Make sure every client has a jjid cookie, and return it
    ensureJJID: function ensureJJID(req, res) {
	// Seems like only lower-case cookies work, hence no jjID or jjId
	var jjid = req.cookies.jjid;
	if (! jjid) {
	    jjid = req.cookies.jjid = utils.uid(24);
	    var expires = new Date();
	    expires.setFullYear(expires.getFullYear() + 1);
	    res.cookie('jjid', jjid, { expires: expires });
	}
	return jjid;
		      },
	
    handleJoin: function handleJoin(req, res) {
	var name = req.params.jumbotron;
	var jjid = this.ensureJJID(req, res);

	this._manager.getJumbotron(name, function(err, jumbotron) {
	    if (! err && ! jumbotron)
		err = "no jumbotron";
	    if (err) {
		error(req.cookies.jjid, err, name);
		return res.redirect('/#join');
	    }
	    res.render('display');
	}.bind(this));
    },

    handleAdmin: function handleAdmin(req, res) {
	// Util methods
	function vpToString(vp) {
	    if (vp.isEmpty()) return 'not-found';
	    var x = vp.x.toFixed(1);
	    var y = vp.y.toFixed(1);
	    var w = vp.width.toFixed(1);
	    var h = vp.height.toFixed(1);
	    var r = ['',' <',' >',' V'][vp.rotation];
	    return x + ',' + y + ' ' + w + 'x' + h + r;
	}
	function nameToString(name, limit) {
	    limit = limit || 8;
	    if (! name)
		name = '[error]';
	    else if (name.length > limit)
		name = name.substring(0, limit) + "&hellip;";
	    return name;
	}

	var options = { filter : req.query.filter || 'tried',
			period : req.query.period || 'all',
			sortKey: req.query.sort   || 'name',
			reverse: req.query.reverse && req.query.reverse == 'true',
			start  : parseInt(req.query.start  || 0),
			num    : parseInt(req.query.num    || 100)
		      };

	this._manager.getAllJumbotrons(options, function(err, jumbotrons, fullLength) {
	    // Display em
	    utils.osStats(function(stats) {
		res.render('admin', {
		    locals: { jumbotrons: jumbotrons,
			      fullLength: fullLength,
			      timeToString: utils.timeToString,
			      spanToString: utils.spanToString,
			      vpToString: vpToString,
			      nameToString: nameToString,
			      osStatsString : utils.osStatsToString(stats) } } );
	    });
	});
    },


    // ----------------------------------------------------------------------
    // Handle controller messages

    createController: function createController(req, res, jumbotron) {
	var clientId = req.cookies.jjid;

	// If no controller, create one
	var cont = jumbotron.getController(clientId);
	if (! cont) {
	    cont = new Controller({ clientId: req.cookies.jjid });
	    jumbotron.addController(cont);
	    this.commitJumbotron(jumbotron, true);
	}

	// Connect client to controller
	this.connectController(req, res, cont);
    },

    connectController: function connectController(req, res, controller) {
	var jName = controller.jumbotron.name;

	// Save jumbotron name in client cookie
	req.cookies.jjname = jName;
	res.cookie('jjname', jName);
    },

    getConnectedController: function getConnectedController(req, res, cb) {
	// Get info from cookies
	var jName = req.cookies.jjname;
	var clientId = req.cookies.jjid;

	// Check if this client hasn't been connected to a jumbotron yet
	if (! jName)
	    return cb(null, null);

	// Get connected controller
	this._manager.getController(jName, clientId, cb);
    },

    disconnectController: function disconnectController(req, res) {
	delete req.cookies.jjname;
	res.clearCookie('jjname');
    },

    // ----------------------------------------------------------------------

    handlePostMessage: function handlePostMessage(req, res) {

	// Make sure every client has a jjid cookie
	this.ensureJJID(req, res);


	// Get connected jumbotron, if any, and call handler
	this.getConnectedController(req, res, function(err, controller) {
	    
	    // Get command handler
	    var cmd = req.params.cmd;
	    var handler = this.postMsgHandlers[cmd];
	    if (controller)
		debug(controller.jumbotron.name, controller.type, controller.idx,
		      '<', cmd, req.body);
	    else
		debug(req.cookies.jjid, '<', cmd, req.body);
	    if (! handler)
		return this.sendPostResponse(res, controller,
					     'bad command', x('bad command', cmd));

	    // Ignore errors and missing controller
	    var status = handler.call(this, req, res, controller);
            if (! utils.isUndefined(status))
		this.sendPostResponse(res, controller, status);
	}.bind(this));
    },

    sendPostResponse: function sendPostResponse(res, controller, status, args) {
	status = status || 'ok';
	var controllerStr = controller
	    ? [controller.jumbotron.name, controller.type, controller.idx].join(' ')
	    : 'Unknown controller';
	if (status != 'ok') {
	    // If 'status' is an exception, print the stack trace
	    if (status.stack) {
		error(controllerStr, '>', status.stack);
		status = status.message;
	    }

	    // Otherwise just print it
	    else if (! utils.isUndefined(args))
		error(controllerStr, '>', status, args);
	    else
		error(controllerStr, '>', status);
	}
	else if (args)
	    debug(controllerStr, '>', args);

	res.send({ status: status, args: args },
		 { 'Content-Type': 'text/plain' });
    },

    postMsgHandlers: {

	create: function create(req, res, controller) {
	    var options = { name : req.body.name,
			    pwd  : req.body.pwd,
			    email: req.body.email };
	    this.createJumbotron(options, function(err, jumbotron) {
		var status = err || 'ok';
		if (! err)
		    this.createController(req, res, jumbotron);
		this.sendPostResponse(res, controller, status, jumbotron);
	    }.bind(this));
	},

	control: function control(req, res, controller) {
	    // TODO: remove old controller if any?
	    var name = req.body.name;
	    this._manager.getJumbotron(name, function(err, jumbotron) {
		var status = 'ok';
		if (err)
		    status = err;
		else if (! jumbotron) 
		    status = 'no jumbotron';
		else if (jumbotron.pwd != req.body.pwd)
		    status = 'bad password';
		else 
		    this.createController(req, res, jumbotron);
		this.sendPostResponse(res, controller, status, jumbotron);
	    }.bind(this));
	},

	setMode : function setMode(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';

	    var jumbotron = controller.jumbotron;

	    var mode = req.body.mode;
	    if (! (mode in { image:1, calibrate:1 }))
		return 'bad mode';

	    jumbotron.mode = mode;
	    this.commitJumbotron(jumbotron);
	    jumbotron.broadcastLoad();
	    return 'ok';
	},

	upload: function upload(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    var maxSize = params.maxFileSize * 1024 * 1024; // Mb to bytes

	    // Body might contain raw data (from phonegap Camera, for example)
	    if (req.body && req.body.data) {
		// Limit size. (1.4 for base64 inflation)
		if (req.header("content-length") > maxSize * 1.4)
		    return this.sendPostResponse(res, controller,
						 'too big', x('too big'));

		// Save to a temporary file
		var type = req.body.type;
		var file = utils.tmpFileName() + '.jpg';
		fs.writeFile(file, req.body.data, "base64", function(err) {
		    if (err)
			return this.sendPostResponse(res, controller, err);
		    this.handleUpload(jumbotron, type, file,
				      this.sendPostResponse.bind(this, res, controller));
		}.bind(this));
	    }

	    // Otherwise it's a multipart form
	    else {
		// Limit size.
		if (req.header("content-length") > maxSize)
		    return this.sendPostResponse(res, controller,
						 'too big', x('too big'));

		// Let formidable parse and save the data
		var form = new formidable.IncomingForm();
		form.keepExtensions = true;
		form.parse(req, function(err, fields, files) {
		    if (err)
 			return this.sendPostResponse(res, controller, err);
		    var type = fields['type'];
		    var file = files['file'];
		    if (! file)
 			return this.sendPostResponse(res, controller, 'no file');
		    this.handleUpload(jumbotron, type, file.path, 
				      this.sendPostResponse.bind(this, res, controller));
		}.bind(this));
	    }
	},

	uploadMail: function uploadMail(req, res, controller) {

	    mail.parseForm(req, function(err, msg) {
		if (! err && ! (msg && msg.filename))
		    err =  'no attachments';
		if (err) {
		    // Avoid infinite recursion if mail accidentally
		    // arrives from the jumbotron server itself.
		    if (msg && msg.sender &&
			msg.sender.indexOf(params.imageReceiveServer) == -1) {
			mail.sendMail(msg.sender, x(err));
		    }
		    else {
			error('MAIL', err);
		    }
		}
		else {
		    this.handleMailUpload(msg, function (status, message) {
			mail.sendMail(msg.sender, message);
		    });
		}
		this.sendPostResponse(res, controller, 'ok');
	    }.bind(this));

	},

	remove: function remove(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    
	    var which = req.body.which;
	    if (which == 'current') {
		jumbotron.removeImage(jumbotron.getCurrentImage());
	    }
	    else if (which == 'all') {
		jumbotron.stop();
		jumbotron.removeImages();
	    }
	    else {
		return 'bad argument';
	    }
	    this.commitJumbotron(jumbotron, true);
	    return 'ok';
	},

	slideshow: function slideshow(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    var oldMode = jumbotron.mode;

	    var control = req.body.control;
	    switch (control) {
	    case 'interval':
		if (! jumbotron.isPlaying())
		    break;
		// Fall through to play
	    case 'play':
		var interval = req.body.interval;
		interval = utils.isNumber(interval) ? interval : 5;
		jumbotron.play(interval);
		break;
	    case 'stop' :
		jumbotron.stop();
		break;
	    case 'next' :
		jumbotron.stop();
		jumbotron.step(1);
		break;
	    case 'prev' :
		jumbotron.stop();
		jumbotron.step(-1);
		break;
	    case 'first':
		jumbotron.stop();
		jumbotron.setFrame(0);
		break;
	    case 'last' :
		jumbotron.stop();
		jumbotron.setFrame(jumbotron.numFrames() - 1);
		break;
	    default:
		return 'bad command';
	    }

	    // If mode changes, commit
	    if (oldMode != jumbotron.mode)
		this.commitJumbotron(jumbotron);

	    return 'ok';
	},

	fit: function fit(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    this.fitJumbotronViewport(jumbotron, req.body.mode);
	    return 'ok';
	},

	identify: function identify(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    var on = req.body.on.toLowerCase() == 'true';
	    this.identifyDisplays(jumbotron, on);
	    return 'ok';
	}
    },

    handleImageChange: function handleImageChange(jumbotron, oldImage) {
	// Remove the old image from the static cache, otherwise it
	// will stay around forever.
	if (oldImage &&
	    oldImage != jumbotron.getCurrentImage() &&
	    oldImage.source != params.calibratedImageOptions.source) {
	    staticProvider.clearCache(oldImage.source);
	}
	// Don't bother sending changes if calibrating
	if (jumbotron.mode != 'calibrate')
	    jumbotron.broadcastLoad();
    },

    // ----------------------------------------------------------------------
    // Upload handlers


    handleMailUpload: function handleMailUpload(msg, cb) {
	var sender = msg.sender;
	var jName = msg.jName;
	var filename = msg.filename;

	debug('MAIL', '<', sender, jName);

	this._manager.getJumbotron(jName, function(err, jumbotron) {
	    if (err) 
		return cb('upload error', x('upload error', err));
	    if (! jumbotron) 
		return cb('no jumbotron', x('no jumbotron', msg.jName));
	    this.handleUpload(jumbotron, jumbotron.mode, filename, cb);

	}.bind(this));
    },

    handleUpload: function handleUpload(jumbotron, type, filename, cb) {
	if (type == 'calibrate') {
	    jumbotron.calibrate(filename, function(err, numFound) {
		if (err) 
		    return cb(err, x(err, jumbotron.name));
		if (! numFound) {
		    // Save the calibration image (jumbotron.calibImages)
		    this.commitJumbotron(jumbotron, true);
		    return cb('no displays', x('no displays', jumbotron.name));
		}

		// We don't know the number of legitimate, connected
		// displays, so messages about 'too-many' or 'too-few'
		// display are often incorrect. Instead, just tell the
		// user how many where found.
		jumbotron.mode = "image";
		jumbotron.fitImage("maximize");
		this.commitJumbotron(jumbotron, true);
		jumbotron.broadcastLoad();
		cb(null, x('calibrated', jumbotron.name, numFound));
	    }.bind(this));
	}
	else {
	    jumbotron.addImageFromFile(filename, function(err, image) {
		if (err)
		    return cb(err, x(err, jumbotron.name));
		this.commitJumbotron(jumbotron, true);
		jumbotron.setCurrentImage(image);
		cb(null, x('uploaded', jumbotron.name));
	    }.bind(this));
	}
    }, 

    // ======================================================================
    // Socket

    initSocket: function initSocket() {
	// This maps sockets to clients (displays and controllers)
	this._socketMap = [];

	// Listen and handle new connections
	this._socketio = io.listen(this._server, {
	    log: utils.debug,
	    transportOptions: {
		'flashsocket': { 
		},
		'websocket': { 
		},
		'htmlfile': { 
		},
		'xhr-multipart': { 
		},
		'xhr-polling': { 
		},
		'jsonp-polling': { 
		} 
	    }
	});
	this._socketio.on('connection', this.handleSocketConnect.bind(this));
    },

    handleSocketConnect: function handleSocketConnect(socket) {
	// Add some methods to the socket 
	// Must do it here because socket.io does not expose the Client class
	socket.sendMsg = function sendMsg(cmd, args) {
	    this.send(JSON.stringify({ cmd: cmd, args: args }));
	};


	// Setup socket handlers
	socket.on('message',
		  this.handleSocketMessage.bind(this, socket));
	socket.on('disconnect',
		  this.handleSocketDisconnect.bind(this, socket));
    },

    handleSocketMessage: function handleSocketMessage(socket, msg) {
	// Wrap the entire thing in a try/catch because socket.io can't
	try {
	    // Parse the msg and get the command
	    var data = JSON.parse(msg);
	    var cmd = data.cmd;

	    // Get client mapped to this socket, if any
	    this.getSocketClient(socket, function(err, client) {

		// Log (not 'log' commands since the handler will display them)
		if (data.cmd != 'log')  {
		    if (client)
			trace(client.jumbotron.name, client.type, client.idx,
			      '<', data.cmd, data.args);
		    else
			trace(socket.sessionId,
			      '<', data.cmd, data.args);
		}

		// Get generic command handler
		var handler = this.socketMsgHandlers[cmd];

		// Or get specific command handler
		if (! handler && client)
		    handler = (client.type == 'display')
		        ? this.displaySocketMsgHandlers[cmd]
		        : this.controllerSocketMsgHandlers[cmd];

		// No handler is an error
		if (! handler)
		    return error('bad command', cmd);

		// Handle
		handler.call(this, socket, client, data.args);

	    }.bind(this));
	}
	catch (exception) {
	    error(exception);
	}
    },

    handleSocketDisconnect: function handleSocketDisconnect(socket) {
	this.clearSocketClient(socket);
    },

    // ----------------------------------------------------------------------
    // Map sockets to clients
    
    setSocketClient: function setSocketClient(socket, client) {
	debug("Connecting", client.jumbotron.name, client.type, client.idx,
	      "with socket", socket.sessionId);
	this._socketMap[socket.sessionId] = { jName: client.jumbotron.name,
					      idx: client.idx,
					      clientId: client.clientId,
					      type: client.type };
	client.socket = socket;
    },

    getSocketClient: function getSocketClient(socket, cb) {
	var item = this._socketMap[socket.sessionId];
	if (! item)
	    return cb(null, null);
	var getter = (item.type == "display")
	    ? 'getDisplay'
	    : 'getController';
	this._manager[getter](item.jName, item.clientId, function(err, client) {
	    if (! err && client && client.socket != socket) {
		if (client.socket)
		    error("Socket mismatch", client, client.socket, socket);
		client.socket = socket;
	    }
	    cb(err, client);
	});
    },

    clearSocketClient: function clearSocketClient(socket) {
	var item = this._socketMap[socket.sessionId];
	if (item) {
	    debug("Disconnecting", item.jName, item.type, item.idx,
		  "from", socket.sessionId);
 	    delete this._socketMap[socket.sessionId];
	    var getter = (item.type == "display")
		? 'getDisplay' : 'getController';
	    this._manager[getter](item.jName, item.clientId, function(err, client) {
		if (! err && client && client.socket == socket)
		    client.socket = null;
	    });
	}
    },

    // ----------------------------------------------------------------------
    // Clients
    
    createDisplay: function createDisplay(socket, args, jumbotron) {
	var clientId = args.jjid;
	var jName = args.jjname;
	var aspectRatio = args.width / args.height;

	// If no display, create one
	var display = jumbotron.getDisplay(clientId);
	if (! display) {
	    display = new Display({ clientId: clientId });
	    display.aspectRatio = aspectRatio;
	    jumbotron.addDisplay(display);
	    this.commitJumbotron(jumbotron);
	}

	// Update aspect ratio on existing display, if necessary
	else if (display.aspectRatio != aspectRatio) {
	    display.aspectRatio = aspectRatio;
	    this.commitJumbotron(jumbotron);
	}

	// Connect client with display
	this.setSocketClient(socket, display);

	// Send id and load image onto display
	display.sendId();
	display.sendLoad();
    },

/*
    createController: function createController(req, res, jumbotron) {
	var clientId = req.cookies.jjid;

	// If no controller, create one
	var cont = jumbotron.getController(clientId);
	if (! cont) {
	    cont = new Controller({ clientId: req.cookies.jjid });
	    jumbotron.addController(cont);
	    this.commitJumbotron(jumbotron);
	}

	// Connect client to controller
	this.connectController(req, res, cont);
    },
*/

    // ----------------------------------------------------------------------
    // Handle socket messages from clients

    // Handlers for messages common to both displays and controllers
    socketMsgHandlers: {

	connect: function connect(socket, client, args) {
	    var jName = args.jjname;
	    var type = args.type;
	    var handlers = (type == "display")
		? this.displaySocketMsgHandlers
		: this.controllerSocketMsgHandlers;
	    handlers.connect.call(this, socket, client, args);
	},

	// Log a message from the display
	log: function info(socket, client, args) {
	    var logger = { 'error': utils.error,
			   'debug': utils.debug,
			   'info' : utils.info }[args.level] || utils.info;
	    if (client)
		logger(client.jumbotron.name, client.type,
		       client.idx, ':', args.msg);
	    else
		logger(socket.sessionId, ':', args.msg);
	}
    },

    // Handlers for messages from displays
    displaySocketMsgHandlers: {

	connect: function connect(socket, display, args) {
	    var jName = args.jjname;
	    var type = args.type;

	    this._manager.getJumbotron(jName, function(err, jumbotron) {
		if (! err && ! jumbotron)
		    err = 'no jumbotron';
		if (err)
		    return error('In display connect:', err, jName);

		// Create client
		this.createDisplay(socket, args, jumbotron);
	    }.bind(this));
	},

	size: function size(socket, display, args) {
	    // Update aspect ratio, if necessary
	    var aspectRatio = args.width / args.height;
	    if (display.aspectRatio != aspectRatio) {
		display.aspectRatio = aspectRatio;
		this.commitJumbotron(jumbotron);
		display.sendViewport();
	    }
	},

	// Display viewport changed. Propagate to jumbotron and other displays.
	vp: function vp(socket, display, args) {
	    if (! display.viewport) {
		error('no display viewport');
		return;
	    }

	    var vp = new Viewport(args);
	    vp = vp.uncropped(display.viewport);
	    this.setJumbotronViewport(display.jumbotron, vp, display);
	}
    },

    // Handlers for messages from controllers
    controllerSocketMsgHandlers: {
	connect: function connect(socket, controller, args) {
	}
    },

    // ----------------------------------------------------------------------
    // Core functions

    createJumbotron: function createJumbotron(options, cb) {
	if (! Jumbotron.isValidName(options.name))
	    return cb && cb('bad name');

	var jumbotron = new Jumbotron(options);
	this._manager.addJumbotron(jumbotron, function(err) {
	    if (err)
		return cb && cb(err);
	    fs.mkdir(jumbotron.getDirectory(), 0755, function() {
		// Ignore directory-exists error 
		cb && cb(null, jumbotron);
	    });
	});
    },

    commitJumbotron: function commitJumbotron(jumbotron, force) {
	this._manager.commitJumbotron(jumbotron, force);
    },

    setJumbotronViewport: function setJumbotronViewport(jumbotron, vp,
							originatingDisplay) {
	jumbotron.getCurrentImage().viewport = vp;
	jumbotron.broadcastViewport(originatingDisplay);
	this.commitJumbotron(jumbotron);
    },

    fitJumbotronViewport: function fitJumbotronViewport(jumbotron, fitMode) {
	jumbotron.fitImage(fitMode);
	jumbotron.broadcastViewport();
	this.commitJumbotron(jumbotron);
    },

    identifyDisplays: function identifyDisplays(jumbotron, on) {
	jumbotron.broadcastShow({ id: on });
    }
};

// ======================================================================

var server = new Server();
//server._manager.clear();

