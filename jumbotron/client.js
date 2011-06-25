// ======================================================================
// Client - base class for displays and controllers

var utils = require('./utils');
var Base = require('./base');
var error = utils.error;
var debug = utils.debug;
var trace = utils.trace;

// Constructor
function Client(options) {
    Base.call(this, options);

    options = options || {};

    // Parent pointer
    this.jumbotron = options.jumbotron;

    // Unique index within the jumbotron, for identification
    this.idx = options.idx || -1;

    // Unique id, from the client's jjID
    this.clientId = options.clientId || 0;

    // Socket
    this.socket = options.socket;

    // Time of last communication.
    // If not messages, use last access time (for old db)
    this.msgTime = options.msgTime || options.accessTime;
}

// Subclass and Members
Client.prototype = utils.inherits(Base, {

    // Serialize everything but the jumbotron and socket
    toJSON: function toJSON() {
	var ret = Base.prototype.toJSON.call(this);
	ret.idx = this.idx;
	ret.clientId = this.clientId;
	ret.msgTime = this.msgTime;
	return ret;
    },

    // Client is active if there is a connected socket
    isActive: function isActive() {
	return !! this.socket;
    },

    // Send a command with arguments through the socket
    sendMsg: function sendMsg(cmd, args) {
	var jName = this.jumbotron ? this.jumbotron.name : "UNATTACHED";
	trace(jName, this.type, this.idx, '>', cmd, args);
	this.msgTime = Date.now();
	this.socket.sendMsg(cmd, args);
    },

    sendId: function sendId() {
	this.sendMsg('id', { id: this.idx,
			     name: this.jumbotron.name });
    }

});

// Export
module.exports = Client;
