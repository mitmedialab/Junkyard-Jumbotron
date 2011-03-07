// ======================================================================
// Client

var utils = require('./utils');
var Base = require('./base');

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
}

// Subclass and Members
Client.prototype = utils.inherits(Base, {

    // Serialize everything but the jumbotron and socket
    fieldsToSerialize: ['clientId'],

    // Client is active if there is a connected socket
    isActive: function isActive() {
	return !! this.socket;
    }

});

// Export
module.exports = Client;
