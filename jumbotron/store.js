// ======================================================================
// Store

var fs = require('fs');
var params = require('./params');
var utils = require('./utils');
var Cache = require('./cacheChunked'); // memory store
var Chaos = require('chaos'); // simple disk store
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

    getAllJumbotrons: function getAllJumbotrons(cb) {
	fs.readdir(params.databaseDir, function(err, files) {
	    if (err)
		return cb(err);
	    var jumbotrons = [];
	    
	    var done = 0;
	    for (var f in files) {
		if (files[f][0] == '.') { // ignore . files
		    done++
		    continue;
		}
		this.getJumbotron(files[f], function(err, jumbotron) {
		    if (! err && jumbotron)
			jumbotrons.push(jumbotron);
		    if (++done == files.length)
			cb(null, jumbotrons);
		}, true);
	    }

	    /*
	    function getNext(which) {
		this.getJumbotron(files[which], function(err, jumbotron) {
		    if (! err && jumbotron)
			jumbotrons.push(jumbotron);
		    if (++which < files.length)
			setTimeout(getNext.bind(this, which), 0);
		    else
			cb(null, jumbotrons);
		}.bind(this), true);
	    }
	    getNext(0);
	    */

	}.bind(this));
    },

    // Return the named jumbotron
    // If 'stealth' is true, this access is not recorded.
    // Stealth is used for introspection (admin page)
    getJumbotron: function getJumbotron(name, cb, stealth) {
	// Look in memory store
	var jumbotron = this._memStore.get(name);
	if (jumbotron) {
	    if (! stealth) {
		// Update access time and callback
		jumbotron.touch();
	    }
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
		if (! stealth) 
		    this._memStore.set(name, jumbotron);
	    }
	    catch (exception) {
		// Ignore badly formatted jumbotron file
		utils.error(exception);
		return cb(null, null);
	    }

	    if (! stealth) {
		// Update access time and callback
		jumbotron.touch();
	    }
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

    commitJumbotron: function commitJumbotron(jumbotron, force, cb) {
	// If no commit delay, commit immediately
	if (force || params.commitDelay <= 0) {
	    utils.debug('Committing', jumbotron.name);
	    if (jumbotron.commitTimer) {
		clearTimeout(jumbotron.commitTimer);
		jumbotron.commitTimer = null;
	    }
	    // Commit in persistent store
	    this._diskStore.set(jumbotron.name,
				this._jumbotronToString(jumbotron), cb);
	}

	// Otherwise schedule a commit if not already scheduled
	else if (! jumbotron.commitTimer) {
	    utils.debug('Scheduling commit for', jumbotron.name);
	    jumbotron.commitTimer = setTimeout(
		this.commitJumbotron.bind(this, jumbotron, true, cb),
		params.commitDelay * 1000);
	}
    }
};

module.exports = Store;
