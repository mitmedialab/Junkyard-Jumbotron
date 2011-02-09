// ======================================================================
// Display

var utils = require('./utils');
var Base = require('./base');
var Viewport = require('./viewport');

// Constructor
function Display(options) {
    this._super(options);

    options = options || {};

    // Parent pointer
    this.jumbotron = options.jumbotron;

    // Unique id, from the client's jjID
    this.clientId = options.clientId || 0;

    // Aspect Ratio
    this.aspectRatio = options.aspectRatio || 1;

    // Index within the jumbotron, used for calibration
    this.idx = options.idx || -1;

    // Where this display is in the jumbotron, normalized
    this.viewport = new Viewport(options.viewport);

    // Socket
    this.socket = options.socket;
}

// Subclass and Members
Display.prototype = utils.inherits(Base, {

    // Serialize everything but the jumbotron and socket
    fieldsToSerialize: ['clientId', 'aspectRatio', 'idx', 'viewport'],

    // Display is active if there is a connected socket
    isActive: function isActive() {
	return !! this.socket;
    }

});

// Export
module.exports = Display;
