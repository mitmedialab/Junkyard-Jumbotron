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

if (isUndefined(console)) {
    var console = { debug: function() {},
		    log: function() {} };
}

// ======================================================================
// Base class for Display and Controller.

function Client() {
    this.debug = true;
}

Client.prototype = {

    initSocket: function initSocket() {
	var socket = this.socket = new io.Socket(null, { port: 8077 });

	// socket.90 v0.6.8: timeout doesn't work very well
	socket.on('connect', bind(this, function() {
	    console.log('Connected', this.socket);
	    this.unscheduleConnect(); 
	    this.sendInitMsg();
	}));
	socket.on('message', bind(this, this.handleMsg));
	socket.on('connect_failed', bind(this, function() {
	    console.log("Connection failed", this.socket);
	    this.scheduleConnect();
	}));
	socket.on('disconnect', bind(this, function() {
	    console.log("Disconnected", this.socket);
	    this.scheduleConnect();
	}));
	this.connectSocket();
    },

    connectSocket: function connectSocket() {
	console.log('Connecting...', this.socket);
	this.socket.connect();
	this.scheduleConnect();
    },

    scheduleConnect: function scheduleConnect() {
	this.connectTimeout = setTimeout(bind(this, this.connectSocket), 10000);
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
	if (this.debug)
	    console.log(">", cmd, args);
	this.socket.send(JSON.stringify({cmd: cmd, args: args}));
    },

    sendErrorMsg: function sendErrorMsg(msg) {
	msg = stringify(msg);
	console.log("ERROR", msg);
	this.sendMsg('errorMsg', {msg: msg});
    },

    sendInfoMsg: function sendInfoMsg(msg) {
	msg = stringify(msg);
	console.log(msg);
	this.sendMsg('infoMsg', {msg: msg});
    },

    sendDebugMsg: function sendDebugMsg(msg) {
	if (this.debug) {
	    msg = stringify(msg);
	    console.log(msg);
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
		console.log("<", data.cmd, data.args);
	    var handler = this.msgHandlers[data.cmd];
	    if (! handler)
		return this.sendErrorMsg("Unknown command: " + data.cmd);
	    handler.call(this, data.args);
	}
	catch (exception) {
	    this.sendErrorMsg(exception.message);
	    console.log(exception.stack);
	}
    }
};
