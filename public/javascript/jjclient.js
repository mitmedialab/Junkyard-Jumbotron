// ======================================================================
// Utilities

function bind(instance, method) {
    return function() { return method.apply(instance, arguments); };
}

function isFunction(obj) {
    return !! (obj && obj.constructor && obj.call && obj.apply);
}

function isUndefined(obj) {
    return obj === void 0;
}

// Return string version of an object
function stringify(obj) {
    if (obj === null)
		return "null";
    if (isUndefined(obj))
		return "undefined";
    if (obj && obj.charCodeAt && obj.substr)
		return obj;  // string
    return JSON.stringify(obj);
}

// Format {0} and {1}
function format(str) {
    var parts = str.split(/\{([0-9]+)\}/);
    for (var p = 1; p < parts.length; p += 2)
		parts[p] = arguments[parseInt(parts[p]) + 1];
    return parts.join('');
}

if (isUndefined(console)) {
    var console = { debug: function() {},
					log: function() {} };
}

// Might be a really old browser without 'join' or 'var a in arguments'
function log() {
	var msg = '';
	var numArgs = arguments.length
		for (var a = 0; a < numArgs; a++) {
			msg += arguments[a];
			msg += ' ';
		}
	console.log(msg);
}

// ======================================================================
// Base class for Display and Controller.

function Client() {
	this.connectTimeout = null;
    this.debug = true;
}

Client.prototype = {

  initSocket: function initSocket() {
		var socket = this.socket = new io.Socket(null, { port: 8077,
														 transports: ['websocket', 'xhr-multipart', 'xhr-polling'],
														 //transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'],
														 rememberTransport: false});

		// socket.90 v0.6.8: timeout doesn't work very well
		socket.on('connect', bind(this, function() {
					var socket = this.socket;
					log('Connected', socket.transport.type);
					this.unscheduleConnect(); 
					this.sendInitMsg();
				}));
		socket.on('message', bind(this, this.handleMsg));
		socket.on('connect_failed', bind(this, function() {
					log("Connection failed", this.socket);
					this.scheduleConnect(0);
				}));
		socket.on('disconnect', bind(this, function() {
					log("Disconnected", this.socket);
					this.scheduleConnect(0);
				}));
		this.connectSocket();
    },

  connectSocket: function connectSocket() {
		var socket = this.socket;
		log('Connecting...', socket.host, socket.options.port);
		socket.connect();
		this.scheduleConnect(20000); // Keep trying every n seconds
    },

  scheduleConnect: function scheduleConnect(delay) {
        this.unscheduleConnect();
		this.connectTimeout = setTimeout(bind(this, this.connectSocket), delay);
    },

  unscheduleConnect: function unscheduleConnect() {
		if (this.connectTimeout) {
			clearTimeout(this.connectTimeout);
			this.connectTimeout = null;
		}
    },

  // ----------------------------------------------------------------------
  // Communication 

  sendMsg: function sendMsg(cmd, args) {
		var msg = JSON.stringify({cmd: cmd, args: args});
		if (this.debug)
			log(">", msg);
		this.socket.send(msg);
    },

  sendErrorMsg: function sendErrorMsg(msg) {
		msg = stringify(msg);
		log("ERROR", msg);
		this.sendMsg('errorMsg', {msg: msg});
    },

  sendInfoMsg: function sendInfoMsg(msg) {
		msg = stringify(msg);
		log(msg);
		this.sendMsg('infoMsg', {msg: msg});
    },

  sendDebugMsg: function sendDebugMsg(msg) {
		if (this.debug) {
			msg = stringify(msg);
			log(msg);
			this.sendMsg('debugMsg', {msg: msg});
		}
    },

  handleMsg: function handleMsg(msg) {
		try {
			var data = JSON.parse(msg);
		}
		catch (SyntaxError) {
			this.sendErrorMsg('Invalid JSON: ' + msg);
			return;
		}

		try {
			if (this.debug)
				log("<", data.cmd, data.args);
			var handler = this.msgHandlers[data.cmd];
			if (! handler)
				return this.sendErrorMsg("Unknown command: " + data.cmd);
			handler.call(this, data.args);
		}
		catch (exception) {
			this.sendErrorMsg(exception.message);
			log(exception.stack);
		}
    }
};
