// ======================================================================
// Controller - basically nothig more than a Client right now

var utils = require('./utils');
var Client = require('./client');

// Constructor
function Controller(options) {
    Client.call(this, options);
}

// Subclass and Members
Controller.prototype = utils.inherits(Client, {
    
    // Client type
    type: "controller",

    sendJumbotron: function sendJumbotron() {
	this.sendMsg('setJumbotron', this.jumbotron);
    }

});

// Export
module.exports = Controller;
