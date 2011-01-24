// ======================================================================
// Cache

function Cache(options) {
    options = options || {};

    // Reap stale items
    var maxAge       = options.maxAge       || 2 * 60 * 60 * 1000; // 2 hours
    var reapInterval = options.reapInterval || maxAge/2;
    if (reapInterval > 0)
        setInterval(function(self){ self.reap(maxAge); },
		    reapInterval, this);
    this.reapCB = options.reapCB;

    this._cache = {};
}

Cache.prototype = {

    get: function(key) {
	var item = this._cache[key];
	if (item) {
	    item.lastAccess = new Date();
	    return item.value;
	}
	return undefined;
    },

    set: function(key, value, locked) {
	this._cache[key] = { value: value,
			     lastAccess: new Date(),
			     locked: locked };
    },

    del: function(key) {
	if (key in this._cache) {
	    if (this.reapCB)
		this.reapCB(this._cache[key].value);
	    delete this._cache[key];
	}
    },
    
    clear: function() {
	this._cache = {};
    },

    // Reap items older than the given milliseconds.
    reap: function reap(ms){
	var cache = this._cache;
	var reapCB = this.reapCB;

	// Calculate oldest allowed date
	var curDate = new Date();
	var threshold = new Date(curDate.getTime() - ms);
	
	// Check each item
	for (var key in cache) {
	    var item = cache[key];
	    if (! item.locked && item.lastAccess < threshold) {
		if (reapCB && reapCB(item.value))
		    item.lastAccess = curDate;
		else
		    delete cache[key];
	    }
	}
    }
};

// Export
module.exports = Cache;
