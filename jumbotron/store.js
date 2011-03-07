// ======================================================================
// Store

var fs = require('fs');
var params = require('./params');
var utils = require('./utils');
var Cache = require('./cacheChunked'); // memory store
var Chaos = require('chaos'); // simple disk store
var Image = require('./image');
var Display = require('./display');
var Jumbotron = require('./jumbotron');

function Store(options) {
    options = options || {};

    this._memStore = new Cache({ reapCB: this._reapCB.bind(this) });
    this._diskStore = new Chaos(params.databaseDir);
    this._diskStore.__hash = function(key) { return key; };
}

Store.prototype = {

    _reapCB: function _reapCB(jumbotron, force) {
	// Keep live jumbotrons around
	// TODO: clean up old displays and controllers here?
	if (! force && jumbotron.isActive())
	    return true;
	jumbotron.stop();
	return false;
    },

    // ----------------------------------------------------------------------

    clear: function clear(cb) {
	this._memStore.clear();
	this._diskStore.__rmdir(params.databaseDir, function(err) {
	    if (err)
		return cb && cb(err);
	    fs.mkdir(params.databaseDir, 0777, cb);
	});
    },

    // ----------------------------------------------------------------------
    // Jumbotrons

    _jumbotronToString: function _jumbotronToString(jumbotron) {
	return JSON.stringify(jumbotron, null, '\t');
    },

    _jumbotronFromString: function _jumbotronFromString(string) {
	return new Jumbotron(JSON.parse(string));
    },

    // Return the named jumbotron
    getJumbotron: function getJumbotron(name, cb) {
	// Look in memory store
	var jumbotron = this._memStore.get(name);
	if (jumbotron) {
	    // Update access time and callback
	    jumbotron.touch();
	    return cb(null, jumbotron);
	}

	// Look in persistent store
	this._diskStore.get(name, function(err, data) {
	    // err from diskStore means not found
	    if (err || ! data)
		return cb(null, null);

	    try {
		// Parse and add to memstore
		jumbotron = this._jumbotronFromString(data);
		this._memStore.set(name, jumbotron);
	    }
	    catch (exception) {
		// Ignore badly formatted jumbotron file
		utils.error(exception);
		return cb(null, null);
	    }

	    // Update access time and callback
	    jumbotron.touch();
	    cb(null, jumbotron);
	}.bind(this));
    },

    // Adds a jumbotron. "duplicate" error if a jumbotron
    // with the same name exists.
    addJumbotron: function addJumbotron(jumbotron, cb) {
	var name = jumbotron.name;

	// Check if existant in memory store
	var storedJumbotron = this._memStore.get(name);
	if (storedJumbotron)
	    return cb("duplicate", storedJumbotron);

	// Add to persistent store.
	// getorsetget sets the value only if it doesn't already exist.
	var data = this._jumbotronToString(jumbotron);
	this._diskStore.getorsetget(name, data, function(err, data) {
	    if (err)
		return cb(err);

	    // Check if existant in persistent store
	    try {
		var storedJumbotron = this._jumbotronFromString(data);
		if (storedJumbotron.pwd != jumbotron.pwd ||
		    storedJumbotron.createTime != jumbotron.createTime)
		    return cb("duplicate", storedJumbotron);
	    }
	    catch (exception) {
		// Ignore badly formatted jumbotron file
		this._diskStore.set(name, data, function(err) {
		    if (err)
			return cb(err);

		    // Add to memory store
		    this._memStore.set(name, jumbotron);

		    // Callback
		    cb(null, jumbotron);
		}.bind(this));
		return;
	    }

	    // Add to memory store
	    this._memStore.set(name, jumbotron);

	    // Callback
	    cb(null, jumbotron);
	}.bind(this));
    },
	    
    removeJumbotron: function removeJumbotron(jumbotron, cb) {
	// Remove from memory store
	this._memStore.del(jumbotron.name);

	// Remove from persistent store
	this._diskStore.del(jumbotron.name, cb);
    },

    commitJumbotron: function commitJumbotron(jumbotron, cb) {
	// Commit in persistent store
	this._diskStore.set(jumbotron.name,
			    this._jumbotronToString(jumbotron), cb);
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
};

module.exports = Store;
