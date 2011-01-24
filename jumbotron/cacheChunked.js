// ======================================================================
// Cache

function Cache(options) {
    options = options || {};

    // Reap stale items (might actually survive for 2 * minAge seconds)
    var minAge = options.minAge || 2 * 60 * 60 * 1000; // 2 hours
    setInterval(this.reap.bind(this), minAge);
    this.reapCB = options.reapCB;

    this._cache  = {};
    this._limbo = {};
}

Cache.prototype = {

    get: function(key) {
	// If item is in cache, we're done
	var value = this._cache[key];
	if (value === undefined) {
	    // Otherwise if item is in limbo, move to cache
	    value = this._limbo[key];
	    if (value !== undefined) {
		delete this._limbo[key];
		this._cache[key] = value;
	    }
	}
	return value;
    },

    set: function(key, value) {
	// If item is in limbo, remove it (ok to delete if not present)
	delete this._limbo[key]; 
	// Save item in cache
	this._cache[key] = value;
    },

    del: function(key) {
	// If item is in cache, remove it and notify listener
	var value = this._cache[key];
	if (value !==  undefined) {
	    delete this._cache[key];
	    this.reapCB && this.reapCB(value, true);
	}
	else {
	    // Otherwise if in item is in limbo, remove it and notify listener
	    value = this._limbo[key];
	    if (value !== undefined) {
		delete this._limbo[key];
		this.reapCB && this.reapCB(value, true);
	    }
	}
    },
    
    clear: function() {
	// Restart from scratch
	this._cache = {};
	this._limbo = {};
    },

    // Reap items
    reap: function reap(){
	// Move cached elements to limbo, and limbo elements to a 'dead' list
	var dead  = this._limbo;
	this._limbo = this._cache;
	this._cache = {};

	// If there's a listener, call it for each dead element
	var reapCB = this.reapCB;
	if (reapCB) {
	    var cache = this._cache;
	    for (var key in dead) {
		var value = dead[key];
		// If the listener returns true, move the item to the cache
		if (reapCB(value))
		    cache[key] = value;
	    }
	}
    }
};

// Export
module.exports = Cache;
