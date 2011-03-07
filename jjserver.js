/*
TODO: From the express web page:
 To alter the environment we can set the NODE_ENV environment variable, for example:
 $ NODE_ENV=production node app.js
 This is very important, as many caching mechanisms are only enabled when in production.
*/

// Node.js core libs
var http = require('http');
var assert = require('assert');
var path = require('path');
var url = require('url');
var fs = require('fs');

// 3rd party add-on libs
var io = require('socket.io');
var formidable = require('formidable');
var express = require('express');
var mailparser = require('mailparser');
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
var Store = jumbotron.Store;
var x = jumbotron.messages.translate;

var log = utils.log;
var debug = utils.debug;
var error = utils.error;

// ======================================================================
// Augment the http and socket classes

http.ServerResponse.prototype.sendStatus = function(status, args) {
    status = status || 'ok';
    if (status != 'ok') {
	// If 'status' is an exception, print the stack trace
	if (status.stack) {
	    error('#>', status.message);
	    error('#>', status.stack);
	    status = status.message;
	}
	// If 'status' looks like an exception, print a stack trace 
	else if (status.split(/\s+/).length > 3) {
	    error('#>', status);
	    error('#>', utils.stackTrace());
	}
	// Otherwise just print it
	else {
	    error('#>', status);
	}
    }
    else if (args)
	debug('#>', status, args);
    this.send({ status: status, args: args },  { 'Content-Type': 'text/plain' });
};

// ======================================================================
// Server

function Server() {
    this.init();
}

Server.prototype = {

    init: function init() {
	// Initialize
	this.initLogging();
	this._store = new Store();
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

    // ----------------------------------------------------------------------
    // HTML Server
	
    initServer: function initServer() {
	log('Starting server --------------------------------------------------');

	// Create server with the given middleware
	var server = this._server = express.createServer(
	    // Decode cookies
	    express.cookieDecoder(),
	    
	    // Decode forms and body
	    express.bodyDecoder(),

	    // Intercept requests for static files
	    staticProvider(__dirname + '/public')
	);

	// Add middleware for dev mode
	server.configure('development', function() {
	    server.use(express.logger());
	    server.use(express.errorHandler({ dumpExceptions: true,
					      showStack: true }));
	});

	// Add middleware for production mode
	server.configure('production', function(){
	    server.use(express.errorHandler());
	});

	// Catch all exceptions in production mode
	if (server.set('env') == 'production') {
	    process.on('uncaughtException', function (err) {
		error('ERROR: UNCAUGHT', err);
	    });
	}

	// Template options
	server.set('views', params.viewsDir);
	server.set('view engine', 'jade');
	server.set('view options', { layout: null } );

	// Routes
	server.get('/', function(req, res) {
	    res.render('index');
	});
	server.get('/:jumbotron', this.handleJoin.bind(this));
	server.post('/:cmd' , this.handleHtmlMessage.bind(this));
    },

    // ----------------------------------------------------------------------
    // Routes

    // Make sure every client has a jjid cookie, and return it
    ensureJJID: function ensureJJID(req, res) {
	// Seems like only lower-case cookies work, hence no jjID or jjId
	var jjid = req.cookies.jjid;
	if (! jjid) {
	    jjid = req.cookies.jjid = utils.uid(24);
	    res.cookie('jjid', jjid);
	}
	return jjid;
    },
	
    handleJoin: function handleJoin(req, res) {
	var name = req.params.jumbotron;
	var jjid = this.ensureJJID(req, res);

	this._store.getJumbotron(name, function(err, jumbotron) {
	    if (! err && ! jumbotron)
		err = "no jumbotron";
	    if (err) {
		error(err, name);
		return res.redirect('/#jjJoin');
	    }
	    res.render('display');
	}.bind(this));
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
	    this.commitJumbotron(jumbotron);
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
	this._store.getController(jName, clientId, cb);
    },

    disconnectController: function disconnectController(req, res) {
	delete req.cookies.jjname;
	res.clearCookie('jjname');
    },

    // ----------------------------------------------------------------------

    handleHtmlMessage: function handleHtmlMessage(req, res) {

	// Make sure every client has a jjid cookie
	this.ensureJJID(req, res);

	// Get command handler
	var cmd = req.params.cmd;
	if (req.body)
	    debug('#<', cmd, req.body);
	else
	    debug('#<', cmd);
	var handler = this.htmlMsgHandlers[cmd];
	if (! handler)
	    return res.sendStatus('bad command', cmd);

	// Get connected jumbotron, if any, and call handler
	this.getConnectedController(req, res, function(err, controller) {
	    // Ignore errors and missing controller
	    var status = handler.call(this, req, res, controller);
	    if (! utils.isUndefined(status))
		res.sendStatus(status);
	}.bind(this));
    },

    htmlMsgHandlers: {

	create: function create(req, res, controller) {
	    var options = { name : req.body.name,
			    pwd  : req.body.pwd,
			    email: req.body.email };
	    this.createJumbotron(options, function(err, jumbotron) {
		var status = 'ok';
		if (err)
		    status = err;
		else
		    this.createController(req, res, jumbotron);
		res.sendStatus(status, jumbotron);
	    }.bind(this));
	},

	control: function control(req, res, controller) {
	    // TODO: remove old controller if any?
	    var name = req.body.name;
	    this._store.getJumbotron(name, function(err, jumbotron) {
		var status = 'ok';
		if (err)
		    status = err;
		else if (! jumbotron) 
		    status = 'no jumbotron';
		else if (jumbotron.pwd != req.body.pwd)
		    status = 'bad password';
		else 
		    this.createController(req, res, jumbotron);
		res.sendStatus(status, jumbotron);
	    }.bind(this));
	},

	// TODO: combine recalibrate/endCalibrate into 'mode'
	setMode : function setMode(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;

	    var mode = req.body.mode;
	    if (! (mode in { image:1, calibrate:1 }))
		return 'bad mode';

	    jumbotron.mode = mode;
	    this.commitJumbotron(jumbotron);
	    this.sendJumbotronLoad(jumbotron);
	    return 'ok';
	},

	upload: function upload(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;

	    // Body might contain raw data (from phonegap Camera, for example)
	    if (req.body && req.body.data) {
		// Save to a temporary file
		var type = req.body.type;
		var file = utils.tmpFileName() + '.jpg';
		fs.writeFile(file, req.body.data, "base64", function(err) {
		    if (err)
			return res.sendStatus(err);
		    this.handleUpload(jumbotron, type, file,
				      res.sendStatus.bind(res));
		}.bind(this));
	    }

	    // Otherwise it's a multipart form
	    else {
		// Let formidable parse and save the data
		var form = new formidable.IncomingForm();
		form.keepExtensions = true;
		form.parse(req, function(err, fields, files) {
		    if (err)
 			return res.sendStatus(err);
		    var type = fields['type'];
		    var file = files['file'];
		    if (! file)
 			return res.sendStatus('no file');
		    this.handleUpload(jumbotron, type, file.path, 
				      res.sendStatus.bind(res));
		}.bind(this));
	    }
	},

	uploadMail: function uploadMail(req, res, controller) {

	    // TODO: limit file size
	    var msg = {};
	    var writeStream;

	    msg.reply = function(feedback) {
		mail.sendMail(msg.sender, feedback);
	    };

	    // TODO: check for no attachments
	    var mp = new mailparser.MailParser();
	    mp.on("headers", function(headers) {
		//debug('HEADER', headers);
		msg.sender = headers.addressesFrom[0].address;
		msg.receiver = headers.addressesTo[0].address;
	    });
	    mp.on("body", function(body){
		//debug('BODY', body);
	    });
	    mp.on("astart", function(id, headers){
		var filename = headers.filename;
		var ext = filename ? path.extname(filename) : '.jpg';
		msg.filename = utils.tmpFileName() + ext;
		writeStream = new fs.WriteStream(msg.filename);
	    });
	    mp.on("astream", function(id, buffer){
		writeStream.write(buffer);
	    });
	    mp.on('error', function(err) {
		error("uploadMail: mailparser:", err);
	    });
	    mp.on("aend", function(id){
		writeStream.end();
		//writeStream.destroy();
		this.handleMailUpload(msg);
	    }.bind(this));

	    // Parse the form and send all data to the mail parser
	    var form = new formidable.IncomingForm();
	    form.keepExtensions = true;
	    form.onPart = function(part) {
		// Let formidable handle all non-file parts
		if (! part.filename)
		    form.handlePart(part);
		// Send file data to mail parser
		else {
		    part.addListener('data', function(buffer) {
			var str = buffer.toString('ascii');
			str = str.replace(/^\n/gm, '\r\n');
			str = str.replace(/([^\r])\n/g, '$1\r\n');
			//debug('FORM data');
			mp.feed(str);
		    });
		    part.addListener('end', function() {
			//debug('FORM data end');
			mp.end();
		    });
		    part.addListener('error', function(err) {
			error('PART', err);
		    });
		}
	    };
	    form.on('error', function(err) {
		error("uploadMail: formidable:", err);
	    });
	    form.on('end', function() {
		res.sendStatus('ok');
	    });
	    form.parse(req);
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
	    this.commitJumbotron(jumbotron);
	    return 'ok';
	},

	slideshow: function slideshow(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;

	    var control = req.body.control;
	    switch (control) {
	    case 'interval':
		if (! jumbotron.isPlaying())
		    break;
		// Fall through to play
	    case 'play':
		var interval = req.body.interval * 1000;
		interval = utils.isNumber(interval) ? Math.round(interval) : 5000;
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
	this.sendJumbotronLoad(jumbotron);
    },

    // ----------------------------------------------------------------------
    // Upload handlers

    handleMailUpload: function handleMailUpload(msg) {

	// Extract jumbotron name from email address "Foo Bar <jumbotron@jj.brownbag.me>"
	var jName = new RegExp('([^<"]+)@').exec(msg.receiver);
	if (! jName)
	    return msg.reply(x('bad email'));
	jName = jName[1];

	// Handle error messages that should be sent to user
	var err = msg.error;
	if (err) {
	    if (error == 'no attachments')
		return msg.reply(x('no attachments'));
	    return msg.reply(x('upload error', jName, err));
	}

	// Handle mailed images
	utils.debug('MAIL', '<', msg.sender, jName);
	var filename = msg.filename;
	this._store.getJumbotron(jName, function(err, jumbotron) {
	    if (err) {
		// Remove file and send feedback
		fs.unlink(filename);
		return msg.reply(x('upload error', jName, err));
	    }

	    if (! jumbotron) {
		// Remove file and send feedback
		fs.unlink(filename);
		return msg.reply(x('no jumbotron', jName));
	    }

	    var name = jumbotron.mode == "calibrate" ? "_calibrate_" : null;
	    jumbotron.uploadImageFile(filename, name, function(err, filename) {
		if (err)
		    return msg.reply(x('upload error', jName, err.toString()));

		if (jumbotron.mode == "calibrate") {
		    this.calibrateJumbotron(jumbotron, filename, function(err, numFound, expected) {
			var reply = null;
			if (err) 
			    reply = x(err, jName, numFound, expected);
			else 
			    reply = x('calibrated', jName);
			msg.reply(reply);
		    });
		}

		else {
		    this.uploadToJumbotron(jumbotron, filename, function(err) {
			var reply = null;
			if (err)
			    reply = x('upload error', jName, err.toString());
			else
			    reply = x('uploaded', jName);
			msg.reply(reply);
		    });
		}
	    }.bind(this));

	}.bind(this));
    },

    handleUpload: function handleUpload(jumbotron, type, filename, cb) {
	var name = type == 'calibrate' ? '_calibrate_' : '';
	jumbotron.uploadImageFile(filename, name, function(err, filename) {
	    if (err)
		return cb(err);
	    if (type == 'calibrate')
		this.calibrateJumbotron(jumbotron, filename, cb);
	    else
		this.uploadToJumbotron(jumbotron, filename, cb);
	}.bind(this));
    }, 



    // ======================================================================
    // Socket

    initSocket: function initSocket() {
	// This maps sockets to clients (displays and controllers)
	this._socketMap = [];

	// Listen and handle new connections
	this._socketio = io.listen(this._server, { log: utils.log });
	this._socketio.on('connection', this.handleSocketConnect.bind(this));
    },

    handleSocketConnect: function handleSocketConnect(socket) {
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

		// Log
		if (client)
		    debug('<', client.type, client.jumbotron.name, client.idx,
			  data.cmd, data.args);
		else
		    debug('<', socket.sessionId,
			  data.cmd, data.args);

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
		var status = handler.call(this, socket, client, data.args);

		// Handler returns an error message on error
		if (! utils.isUndefined(status))
		    this.sendSocketError(client, status);

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

    sendSocketMsg: function sendSocketMsg(socket, cmd, args) {
	socket.send(JSON.stringify({ cmd: cmd, args: args }));
    },

    sendSocketError: function sendSocketError(socket, err) {
	error('>', socket.sessionId, err);
	this.sendSocketMsg(socket, 'error', err);
    },

    sendClientMsg: function sendDisplayMsg(client, cmd, args) {
	var jName = client.jumbotron ? client.jumbotron.name : "UNATTACHED";
	debug('>', jName, client.idx, cmd, args);
	this.sendSocketMsg(client.socket, cmd, args);
    },

    sendDisplayLoad: function sendDisplayLoad(display) {
	var jumbotron = display.jumbotron;
	var src       = jumbotron.getDisplayImage(display).source;
	var viewport  = jumbotron.getDisplayViewport(display);
	var frozen    = jumbotron.getDisplayFrozen(display);
	if (utils.isStartsWith(src, params.resourceDir))
	    src = src.substring(params.resourceDir.length + 1); // +1 for '/'
	this.sendClientMsg(display, 'load', { src: src,
					      vp: viewport,
 					      frozen: frozen });
    },

    sendDisplayViewport: function sendDisplayViewport(display) {
	var jumbotron = display.jumbotron;
	var viewport = jumbotron.getDisplayViewport(display);
	this.sendClientMsg(display, 'vp', viewport);
    },

    sendDisplayId: function sendDisplayViewport(display) {
	var jumbotron = display.jumbotron;
	this.sendClientMsg(display, 'id', { id: display.idx,
					     name: jumbotron.name });
    },

    sendDisplayShow: function sendDisplayShow(display, options) {
	this.sendClientMsg(display, 'show', options);
    },

    sendJumbotronMsg: function sendJumbotronMsg(jumbotron, msgFn, arg, ignoredDisplay) {
	var displays = jumbotron.displays;
	for (var d in displays) {
	    var display = displays[d];
	    if (display != ignoredDisplay && display.isActive())
		msgFn.apply(this, [display, arg]);
	}
    },

    sendJumbotronLoad: function sendJumbotronLoad(jumbotron) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayLoad);
    },

    sendJumbotronViewport: function sendJumbotronViewport(jumbotron, ignoredDisplay) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayViewport,
			      null, ignoredDisplay);
    },

    sendJumbotronShow: function sendJumbotronShow(jumbotron, options) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayShow, options);
    },

    // ----------------------------------------------------------------------
    // Map sockets to clients
    
    setSocketClient: function setSocketClient(socket, client) {
	debug("Connecting", socket.sessionId, "to",
	      client.type, client.jumbotron.name, client.idx);
	this._socketMap[socket.sessionId] = { jName: client.jumbotron.name,
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
	this._store[getter](item.jName, item.clientId, function(err, client) {
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
 	    delete this._socketMap[socket.sessionId];
	    var getter = (item.type == "display")
		? 'getDisplay' : 'getController';
	    this._store[getter](item.jName, item.clientId, function(err, client) {
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
	this.sendDisplayId(display);
	this.sendDisplayLoad(display);
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
	log: function log(socket, client, args) {
	    var logger = { 'error': error,
			   'debug': debug,
			   'info' : log }[args.level] || log;
	    if (client)
		logger(client.type, client.jumbotron.name,
		       client.idx, args.msg);
	    else
		logger(socket.sessionId, args.msg);
	}
    },

    // Handlers for messages from displays
    displaySocketMsgHandlers: {

	connect: function connect(socket, display, args) {
	    var jName = args.jjname;
	    var type = args.type;

	    this._store.getJumbotron(jName, function(err, jumbotron) {
		if (err)
		    return this.sendSocketError(socket, err);
		if (! jumbotron)
		    return this.sendSocketError(socket, 'no jumbotron');

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
		this.sendDisplayViewport(display);
	    }
	},

	// Display viewport changed. Propagate to jumbotron and other displays.
	vp: function vp(socket, display, args) {
	    if (! display.viewport)
		return 'no display viewport';

	    var vp = new Viewport(args);
	    vp = vp.uncropped(display.viewport);
	    this.setJumbotronViewport(display.jumbotron, vp, display);
	}
    },

    // Handlers for messages from controllers
    controllerSocketMsgHandlers: {
	connect: function connect(socket, controlelr, args) {
	}
    },

    // ----------------------------------------------------------------------
    // Core functions

    createJumbotron: function createJumbotron(options, cb) {
	if (! Jumbotron.isValidName(options.name))
	    return cb && cb('bad jumbotron name');

	var jumbotron = new Jumbotron(options);
	this._store.addJumbotron(jumbotron, function(err) {
	    if (err)
		return cb && cb(err);
	    fs.mkdir(jumbotron.getDirectory(), 0755, function() {
		// Ignore directory-exists error 
		cb && cb(null, jumbotron);
	    });
	});
    },

    commitJumbotron: function commitJumbotron(jumbotron, cb) {
	this._store.commitJumbotron(jumbotron, cb);
    },

    calibrateJumbotron: function calibrateJumbotron(jumbotron, file, cb) {
	// Image will be reoriented in calibrate.
	calibrate.calibrate(jumbotron, file, function(err, numFound) {
	    if (err)
		return cb(err);
	    var expected = jumbotron.numActiveDisplays();
	    log(numFound, expected);
	    if (! numFound)
		err = 'no displays';
	    else if (numFound < expected)
		err = 'few displays';
	    else if (numFound > expected)
		err = 'more displays';
	    this.commitJumbotron(jumbotron);
	    cb(err, numFound, expected);
	}.bind(this));
    },

    uploadToJumbotron: function uploadToJumbotron(jumbotron, file, cb) {
	var image = new Image({ source: file });
	image.init(function(err) {
	    if (err)
		return cb && cb(err);
	    jumbotron.addImage(image);
	    jumbotron.fitImage("maximize", image);
	    jumbotron.setCurrentImage(image);
	    cb && cb(null);
	}.bind(this));
    },

    setJumbotronViewport: function setJumbotronViewport(jumbotron, vp,
							originatingDisplay) {
	jumbotron.getCurrentImage().viewport = vp;
	this.sendJumbotronViewport(jumbotron, originatingDisplay);
	this.commitJumbotron(jumbotron);
    },

    fitJumbotronViewport: function fitJumbotronViewport(jumbotron, fitMode) {
	jumbotron.fitImage(fitMode);
	this.commitJumbotron(jumbotron);
	this.sendJumbotronViewport(jumbotron);
    },

    identifyDisplays: function identifyDisplays(jumbotron, on) {
	this.sendJumbotronShow(jumbotron, { id: on });
    }
};

// ======================================================================

var server = new Server();
//server._store.clear();

