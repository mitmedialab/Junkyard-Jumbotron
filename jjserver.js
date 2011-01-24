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

// Use our own until connect.staticProvider makes clearCache accessible
// https://github.com/senchalabs/connect/issues/issue/187
var staticProvider = require('./jumbotron/staticProvider');

// Jumbotron libs
var jumbotron  = require('./jumbotron');
var utils = jumbotron.utils;
var params = jumbotron.params;
var calibrate = jumbotron.calibrate;
var Mail = jumbotron.Mail;
var Viewport = jumbotron.Viewport;
var Display = jumbotron.Display;
var Controller = jumbotron.Controller;
var Image = jumbotron.Image;
var Jumbotron = jumbotron.Jumbotron;
var Store = jumbotron.Store;

var log = utils.log;
var debug = utils.debug;
var error = utils.error;

http.ServerResponse.prototype.sendStatus = function(status, args) {
    status = status || 'ok';
    if (status != 'ok') {
	// Change status to exception format if necessary
	var err = status.message ? status : { message: status };
	// Build stack or rebuild for useless one-line stacks
	if (! err.stack || err.stack.indexOf("\n") == -1)
	    Error.captureStackTrace(err,
				    http.ServerResponse.prototype.sendStatus);
	error('#>', err.stack);
	status = err.message;
    }
    else if (args)
	debug('#>', status, args);
    this.send({ status: status, args: args },  { 'Content-Type': 'text/plain' });
};

// ======================================================================
// Server

function Server(debug) {
    this._socketMap = []; // maps sockets to displays

    this._store = new Store();
    this.debug = debug;
}

Server.prototype = {

    init: function init() {
	this.initServer();
	this.initSocket();
	this.initMail();

	// Listen for Jumbotron changes
	Jumbotron.listener = this.handleImageChange.bind(this);

	log('Starting server --------------------------------------------------');
	this._server.listen(81);
    },

    // ----------------------------------------------------------------------
    // HTML Server
	
    initServer: function initServer() {
	// Create server with the given middleware
	var server = this._server = express.createServer(
	    // Decode cookies
	    express.cookieDecoder(),
	    
	    // Decode forms and body
	    express.bodyDecoder(),

	    // Intercept requests for static files
	    // TODO: rewrite staticProvider to reap old cache elements
	    staticProvider(__dirname + '/public')
	);

	// Add middleware for dev mode
	server.configure('development', function() {
	    //server.use(express.logger());
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
	server.set('views', 'private');
	server.set('view engine', 'jade');
	server.set('view options', { layout: null } );

	// Routes
	server.get('/', function(req, res) {
	    res.render('index');
	});
	server.get('/_test', function(req, res) { res.render('test'); });
	server.get('/:jumbotron', this.handleJoin.bind(this));
	server.post('/:cmd' , this.handleCommand.bind(this));
    },

    // ----------------------------------------------------------------------
    // Mail handler

    initMail: function initMail() {
	this._mail = new Mail(this.handleMail.bind(this));
	this._mail.start();
    },

    feedbackMsgs: {
	error:       ("Can't upload file to '{0}'\n" +
		      "{1}"),

	noJumbotron: ("No jumbotron called '{0}'\n" +
		      "Whoops, there is no jumbotron named '{0}'"),
	
	noDisplays:  ("No displays found while calibrating '{0}'\n" +
		      "Whoops, I didn't find any displays in the image you emailed."),

	fewDisplays: ("Not enough displays found calibrating '{0}'\n" +
		      "I found only {1} display(s) in the image you emailed, " +
		      "but there are {2} displays attached to your Junkyard Jumbotron '{0}'."),

	moreDisplays: ("Too many displays found calibrating '{0}'\n" +
		      "I found only {1} display(s) in the image you emailed, " +
		      "but there are {2} displays attached to your Junkyard Jumbotron '{0}'."),

	calibrated:  ("Calibrated '{0}'!\n" +
		      "Junkyard Jumbotron '{0}' has been successfully calibrated."),

	uploaded:    ("Image uploaded to '{0}'!\n" +
		      "Image has been successfully uploaded to Junkyard Jumbotron '{0}'.")
    },

    handleMail: function handleMail(msg) {
	var jName = msg.jumbotron;
	var filename = msg.filename;
	var feedback = this.feedbackMsgs;

	this._store.getJumbotron(jName, function(err, jumbotron) {
	    if (err)
		return msg.reply(feedback.error.format(jName));

	    if (! jumbotron)
		return msg.reply(feedback.noJumbotron.format(jName));

	    var name = jumbotron.mode == "calibrating" ? "_calibrate" : null;
	    jumbotron.uploadImageFile(filename, name, function(err, filename) {
		if (err)
		    return msg.reply(feedback.error.format(jName, err.toString()));

		if (jumbotron.mode == "calibrating") {
		    this.calibrateJumbotron(jumbotron, filename, function(err, numFound) {
			var reply = null;
			var expected = jumbotron.numActiveDisplays();
			if (err)
			    reply = feedback.error.format(jName, err.toString());
			else if (! numFound)
			    reply = feedback.noDisplays.format(jName);
			else if (numFound < expected)
			    reply = feedback.fewDisplays.format(jName, numFound, expected);
			if (numFound > expected)
			    reply = feedback.moreDisplays.format(jName, numFound, expected);
			else
			    reply = feedback.calibrated.format(jName);
			msg.reply(reply);
		    });
		}

		else {
		    this.uploadToJumbotron(jumbotron, filename, function(err) {
			var reply = null;
			if (err)
			    reply = feedback.error.format(jName, err.toString());
			else
			    reply = feedback.calibrated.format(jName);
			msg.reply(reply);
		    });
		}
	    }.bind(this));

	}.bind(this));
    },

    // ----------------------------------------------------------------------
    
    initTest: function initTest() {
	this.createJumbotron({ name: 'foo'}, function(err, jumbotron) {
	    if (err)
		return error(err);
	    jumbotron.mode = 'image';
	    this.createImage(
		'http://www.blep.com/images/med/KNEP_Brian_HealingPool_01.jpg',
		jumbotron, function(err, image) {
		    assert.ifError(err);
		    jumbotron.setFrame(0);
		});
	}.bind(this));
    },

    // ----------------------------------------------------------------------
    // Routes

    // Make sure every client has a jjid cookie, and return it
    ensureJJID: function ensureJJID(req, res) {
	// Seems like only lower-case cookies work, hence no jjID or jjId
	var jjid = req.cookies.jjid;
	if (! jjid) {
	    jjid = req.cookies.jjid = utils.uid();
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
	    if (err)
		return res.redirect('/?err='+err+'#jjJoin');
	    res.render('display');
	}.bind(this));
    },

    handleCommand: function handleCommand(req, res) {

	// Make sure every client has a jjid cookie
	this.ensureJJID(req, res);

	// Get command handler
	var cmd = req.params.cmd;
	if (req.body)
	    debug('#<', cmd, req.body);
	else
	    debug('#<', cmd);
	var handler = this.commandHandlers[cmd];
	if (! handler)
	    return res.sendStatus('unknown command', cmd);

	// Get connected jumbotron, if any, and call handler
	this.getConnectedController(req, res, function(err, controller) {
	    // Ignore errors and missing controller
	    var status = handler.call(this, req, res, controller);
	    if (! utils.isUndefined(status))
		res.sendStatus(status);
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

    commandHandlers: {

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
	
	calibrate: function calibrate(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';

	    var jumbotron = controller.jumbotron;
	    this.parseUpload(req, res, jumbotron, '_calibrate_',
				 function(err, filename) {
		if (err)
		    res.sendStatus(err);
		this.calibrateJumbotron(jumbotron, filename, function(err) {
		    res.sendStatus(err);
		});
	    }.bind(this));
	},

	recalibrate: function recalibrate(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';

	    var jumbotron = controller.jumbotron;
	    jumbotron.mode = 'calibrating';
	    this.commitJumbotron(jumbotron);
	    this.sendJumbotronLoad(jumbotron);

	    return 'ok';
	},

	endCalibrate: function endCalibrate(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;

	    jumbotron.mode = 'image';
	    this.commitJumbotron(jumbotron);
	    this.sendJumbotronLoad(jumbotron);

	    return 'ok';
	},

	upload: function upload(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;

	    this.parseUpload(req, res, jumbotron, '', function(err, filename) {
		if (err)
		    res.sendStatus(err);
		this.uploadToJumbotron(jumbotron, filename, function(err) {
		    res.sendStatus(err);
		});
	    }.bind(this));
	},

	remove: function remove(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    jumbotron.removeImage(jumbotron.getCurrentImage());
	    this.commitJumbotron(jumbotron);
	},

	removeAll: function removeAll(req, res, controller) {
	    if (! controller)
		return 'no jumbotron';
	    var jumbotron = controller.jumbotron;
	    jumbotron.stop();
	    jumbotron.removeImages();
	    this.commitJumbotron(jumbotron);
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
	    oldImage.source != params.calibratedImageFile) {
	    express.staticProvider.clearCache(oldImage.source);
	}
	this.sendJumbotronLoad(jumbotron);
    },

    parseUpload: function parseUpload(req, res,
				      jumbotron, name, cb)  {

	// Check if upload is base64 data
	if (req.body && req.body.data) {
	    jumbotron.uploadImageData(req.body.data, name, cb);
	}

	// Otherwise it's form data
	else {
	    var form = new formidable.IncomingForm();
	    form.keepExtensions = true;
	    form.parse(req, function(err, fields, files) {
		if (err)
		    return cb(err);
		var file = files['file'];
		if (! file)
		    return cb('no file');
		jumbotron.uploadImageFile(file.path, name, cb);
	    }.bind(this));
	}
    },

    // ======================================================================
    // Socket

    initSocket: function initSocket() {
	this._socketio = io.listen(this._server);
	this._socketio.on('connection', this.handleSocketConnect.bind(this));
    },

    handleSocketConnect: function handleSocketConnect(socket) {
	socket.on('message',
		  this.handleSocketMessage.bind(this, socket));
	socket.on('disconnect',
		  this.handleSocketDisconnect.bind(this, socket));
    },

    handleSocketMessage: function handleSocketMessage(socket, msg) {
	// Wrap the entire thing in a try/catch because socket.io can't
	try {
	    var data = JSON.parse(msg);

	    // Get handler
	    var cmd = data.cmd;
	    debug('<', socket.sessionId, data.cmd, data.args);
	    var handler = this.socketMsgHandlers[cmd];
	    if (! handler)
		return error('Unknown socket command', cmd);

	    // Get connected display, if any, and call handler
	    this.getConnectedDisplay(socket, function(err, display) {
		// Ignore errors and missing display
		var status = handler.call(this, socket, display, data.args);
		if (! utils.isUndefined(status))
		    this.sendSocketError(socket, status);
	    }.bind(this));
	}
	catch (exception) {
	    error(exception);
	}
    },

    handleSocketDisconnect: function handleSocketDisconnect(socket) {
	this.disconnectDisplay(socket);
    },
    
    sendSocketMsg: function sendSocketMsg(socket, cmd, args) {
	debug('>', cmd, args);
	socket.send(JSON.stringify({ cmd: cmd, args: args }));
    },

    sendSocketError: function sendSocketError(socket, err) {
	error(socket.sessionId, err);
	this.sendSocketMsg(socket, 'errorMsg', err);
    },

    sendDisplayLoad: function sendDisplayLoad(display) {
	var jumbotron = display.jumbotron;
	var src       = jumbotron.getDisplayImage(display).source;
	var viewport  = jumbotron.getDisplayViewport(display);
	var frozen    = jumbotron.getDisplayFrozen(display);
	if (utils.isStartsWith(src, params.resourceDir))
	    src = src.substring(params.resourceDir.length + 1); // +1 for '/'
	this.sendSocketMsg(display.socket, 'load', { src: src,
						     vp: viewport,
 						     frozen: frozen });
    },

    sendDisplayViewport: function sendDisplayViewport(display) {
	var jumbotron = display.jumbotron;
	var viewport = jumbotron.getDisplayViewport(display);
	this.sendSocketMsg(display.socket, 'vp', viewport);
    },

    sendDisplayId: function sendDisplayViewport(display) {
	var jumbotron = display.jumbotron;
	this.sendSocketMsg(display.socket, 'id', { id: display.idx,
						   name: jumbotron.name });
    },

    sendDisplayShow: function sendDisplayShow(display, options) {
	this.sendSocketMsg(display.socket, 'show', options);
    },

    sendJumbotronMsg: function sendJumbotronMsg(jumbotron, msgFn, arg) {
	var displays = jumbotron.displays;
	for (var d in displays) {
	    if (displays[d].isActive())
		msgFn.apply(this, [displays[d], arg]);
	}
    },

    sendJumbotronLoad: function sendJumbotronLoad(jumbotron) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayLoad);
    },

    sendJumbotronViewport: function sendJumbotronViewport(jumbotron) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayViewport);
    },

    sendJumbotronShow: function sendJumbotronShow(jumbotron, options) {
	this.sendJumbotronMsg(jumbotron, this.sendDisplayShow, options);
    },

    // ----------------------------------------------------------------------
    // Socket-to-display map
    
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
	debug("Connecting display");
	this.connectDisplay(socket, display);

	// Send id and load image onto display
	this.sendDisplayId(display);
	this.sendDisplayLoad(display);
    },

    connectDisplay: function createConnectedDisplay(socket, display) {
	this._socketMap[socket.sessionId] = { jName: display.jumbotron.name,
					      clientId: display.clientId };
	display.socket = socket;
    },

    getConnectedDisplay: function getConnectedDisplay(socket, cb) {
	var item = this._socketMap[socket.sessionId];
	if (! item)
	    return cb(null, null);
	this._store.getDisplay(item.jName, item.clientId, function(err, display) {
	    if (! err && display && display.socket != socket) {
		if (display.socket)
		    error("Socket mismatch", display, display.socket, socket);
		display.socket = socket;
	    }
	    cb(err, display);
	});
    },

    disconnectDisplay: function disconnectDisplay(socket) {
	var item = this._socketMap[socket.sessionId];
	if (item) {
 	    delete this._socketMap[socket.sessionId];
	    this._store.getDisplay(item.jName, item.clientId, function(err, display) {
		if (! err && display && display.socket == socket)
		    display.socket = null;
	    });
	}
    },

    // ----------------------------------------------------------------------
    // Socket message handlers

    socketMsgHandlers: {

	connect: function connect(socket, display, args) {
	    var jName = args.jjname;
	    
	    this._store.getJumbotron(jName, function(err, jumbotron) {
		if (err)
		    return this.sendSocketError(socket, err);
		if (! jumbotron)
		    return this.sendSocketError(socket, 'no jumbotron');

		// Create display
		this.createDisplay(socket, args, jumbotron);
	    }.bind(this));
	},

	size: function size(socket, display, args) {
	    // Ignore. Sometimes size message arrives before connect message.
	    if (! display)
		return;

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
	    if (! display)
		return 'no display';
	    if (! display.viewport)
		return 'no display viewport';

	    var vp = new Viewport(args);
	    vp = vp.uncropped(display.viewport);
	    this.setJumbotronViewport(display.jumbotron, vp);
	},

	// Log an error message from the display
	errorMsg: function errorMsg(socket, display, args) {
	    error('Client', socket.sessionId, args.msg);
	},

	// Log an informational message from the display
	infoMsg: function infoMsg(socket, display, args) {
	    log('Client', socket.sessionId, args.msg);
	},

	// Log a debugging message from the display
	debugMsg: function debugMsg(socket, display, args) {
	    if (this.debug)
		debug('Client', socket.sessionId, args.msg);
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
	calibrate.calibrate(jumbotron, file, function(err) {
	    if (err)
		return cb(err);
	    jumbotron.mode = 'image';
	    this.commitJumbotron(jumbotron);
	    this.sendJumbotronLoad(jumbotron);
	    cb(null);
	}.bind(this));
    },

    uploadToJumbotron: function uploadToJumbotron(jumbotron, file, cb) {
	var image = new Image({ source: file });
	image.init(function(err) {
	    if (err)
		return cb && cb(err);
	    jumbotron.addImage(image);
	    this.fitJumbotronViewport(jumbotron, "maximize");
	    this.commitJumbotron(jumbotron);
	    jumbotron.setCurrentImage(image);
	    cb && cb(null);
	}.bind(this));
    },

    setJumbotronViewport: function setJumbotronViewport(jumbotron, vp) {
	jumbotron.getCurrentImage().viewport = vp;
	this.sendJumbotronViewport(jumbotron);
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
server.init();
//server._store.clear();
//server.initTest();

