// ======================================================================
// Display

var utils = require('./utils');
var Client = require('./client');
var Viewport = require('./viewport');

// Constructor
function Display(options) {
    Client.call(this, options);

    options = options || {};

    // Aspect Ratio
    this.aspectRatio = options.aspectRatio || 1;

    // Where this display is in the jumbotron, normalized
    this.viewport = new Viewport(options.viewport);
}

// Subclass and Members
Display.prototype = utils.inherits(Client, {

    type: "display",

    // Serialize
    fieldsToSerialize: ['aspectRatio', 'idx', 'viewport'].concat(Client.prototype.fieldsToSerialize)

});

// Export
module.exports = Display;
