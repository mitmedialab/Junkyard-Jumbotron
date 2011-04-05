// ======================================================================
// Manager

var Image = require('./image');
var Store = require('./store');
var utils = require('./utils');

// ----------------------------------------------------------------------
// Manager

function Manager(options) {
    this._store = new Store(options);
}

// Subclass and Members
Manager.prototype = utils.inherits(Store, { 
    
    // ----------------------------------------------------------------------
    // Deal with storage

    // Return the named jumbotron
    getJumbotron: function getJumbotron(name, cb) {
	this._store.getJumbotron(name, cb);
    },

    // Adds a jumbotron. "duplicate" error if a jumbotron
    // with the same name exists.
    addJumbotron: function addJumbotron(jumbotron, cb) {
	this._store.addJumbotron(jumbotron, cb);
    },
	    
    removeJumbotron: function removeJumbotron(jumbotron, cb) {
	this._store.removeJumbotron(jumbotron, cb);
    },

    commitJumbotron: function commitJumbotron(jumbotron, cb) {
	this._store.commitJumbotron(jumbotron, cb);
    },

    // Get all jumbotrons plus get their calibration images
    getAllJumbotrons: function getAllJumbotrons(cb) {
	this._store.getAllJumbotrons(function(err, jumbotrons) {
	    if (err)
		return cb(err);

	    var todo = jumbotrons.length;
	    function getCalibrationImages(jumbotron) {
		jumbotron.getCalibrationImages(function(err, images) {
		    // Ignore errors
		    utils.log(jumbotron.name, images);
		    jumbotron.calibImages = images;
		    if (--todo == 0)
			cb(null, jumbotrons);
		});
	    }

	    utils.each(jumbotrons, getCalibrationImages);
	});

    },

    // ----------------------------------------------------------------------
    // Easy access to displays and controllers

    // Return the display with the given clientId, if any
    getDisplay: function getDisplay(jName, clientId, cb) {
	this.getJumbotron(jName, function(err, jumbotron) {
	    if (err)
		return cb(err);
	    if (! jumbotron)
		return cb("no jumbotron");
	    cb(null, jumbotron.getDisplay(clientId));
	});
    },

    // Return the controller with the given clientId, if any
    getController: function getController(jName, clientId, cb) {
	this.getJumbotron(jName, function(err, jumbotron) {
	    if (err)
		return cb(err);
	    if (! jumbotron)
		return cb("no jumbotron");
	    cb(null, jumbotron.getController(clientId));
	});
    }
});

module.exports = Manager;
