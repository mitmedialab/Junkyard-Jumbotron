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

    _filterJumbotrons: function _filterJumbotrons(jumbotrons, filter) {
	var filterFn;
	switch (filter) {
	case 'all':
	    break;
	case 'tried':
	    filterFn = function(jumbotron) {
		return (jumbotron.calibImages &&
			jumbotron.calibImages.length);
	    };
	    break;
	case 'failed':
	    filterFn = function(jumbotron) {
		return (jumbotron.calibImages &&
			jumbotron.calibImages.length &&
			! jumbotron.isCalibrated());
	    };
	    break;
	case 'calibrated':
	    filterFn = function(jumbotron) {
		return jumbotron.isCalibrated();
	    };
	    break;
	case 'uploaded':
	    filterFn = function(jumbotron) {
		return jumbotron.numFrames() > 0;
	    };
	    break;
	}
	if (filterFn)
	    jumbotrons = utils.filter(jumbotrons, filterFn);
	return jumbotrons;
    },

    _sortJumbotrons: function _sortJumbotrons(jumbotrons, key, reverse) {
	jumbotrons = jumbotrons.sort(function(a, b) {
	    a = a[key];
	    b = b[key];
	    return a>b ? 1 : a<b ? -1 : 0;
	});
	if (reverse)
	    jumbotrons = jumbotrons.reverse();
	return jumbotrons;
    },

    _getAllJumbotrons: function _getAllJumbotrons(cb) {
	fs.readdir(params.databaseDir, function(err, files) {
	    if (err)
		return cb && cb(err);
	    var jumbotrons = [];
	    var todo = files.length;
	    for (var f in files) {
		if (files[f][0] == '.') { // ignore . files
		    --todo;
		}
		else {
		    this.getJumbotron(files[f], function(err, jumbotron) {
			--todo;
			if (! err && jumbotron) {
			    jumbotrons.push(jumbotron);
			    if (todo === 0)
				cb && cb(null, jumbotrons);
			}
		    }, true);
		}
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

    getAllJumbotrons: function getAllJumbotrons(options, cb) {
	this._getAllJumbotrons(function(err, jumbotrons) {
	    if (err)
		return cb && cb(err);
	    if (options.filter)
		jumbotrons = this._filterJumbotrons(jumbotrons,
						    options.filter);
	    var fullLength =jumbotrons.length;
	    if (options.sortKey)
		jumbotrons = this._sortJumbotrons(jumbotrons,
						  options.sortKey,
						  options.reverse);
	    if (options.start || options.num) {
		var start = options.start || 0;
		var end   = start + (options.num || 100);
		jumbotrons = jumbotrons.slice(start, end);
	    }
	    cb && cb(null, jumbotrons, fullLength);
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
		// Update access time
		jumbotron.touch();
	    }
	    return cb(null, jumbotron);
	}
	// Look in persistent store
	this._diskStore.get(name, function(err, data) {
	    // err from diskStore means not found
	    if (err || ! data) {
		// Callback error
		return cb(null, null);
	    }

	    try {
		// Parse and add to memstore
		jumbotron = this._jumbotronFromString(data);
		this._memStore.set(name, jumbotron);
	    }
	    catch (exception) {
		// Ignore badly formatted jumbotron file
		utils.error(exception);
		// Callback error
		return cb(null, null);
	    }

	    // Get list of calibration images
	    // TODO: save these in the store
	    jumbotron.getCalibrationImages(function(err, images) {
		// Ignore errors
		jumbotron.calibImages = images;
		// Update access time
		if (! stealth)
		    jumbotron.touch();
		// Callback ok
		cb(null, jumbotron);
	    });

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
