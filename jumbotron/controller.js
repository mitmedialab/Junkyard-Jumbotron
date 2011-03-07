// ======================================================================
// Controller
// Basically nothig more than a Client right now

var utils = require('./utils');
var Client = require('./client');

// Constructor
function Controller(options) {
    Client.call(this, options);
}

// Subclass and Members
Controller.prototype = utils.inherits(Client, {

    type: "controller",

    // Serialize
    fieldsToSerialize: [].concat(Client.prototype.fieldsToSerialize)

});

// Export
module.exports = Controller;
