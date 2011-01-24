// ======================================================================
// Controller

var utils = require('./utils');
var Base = require('./base');

// Constructor
function Controller(options) {
    this._super(options);

    options = options || {};

    // Parent pointer
    this.jumbotron = options.jumbotron;

    // Unique id, from the client's jjID
    this.clientId = options.clientId || 0;

}

// Subclass and Members
Controller.prototype = utils.inherits(Base, {

    // Serialize everything but the jumbotron
    fieldsToSerialize: ['clientId']

});

// Export
module.exports = Controller;
