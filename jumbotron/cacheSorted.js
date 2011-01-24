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
    this._head = null;
    this._tail = null;
}

Cache.prototype = {
    
    _touch: function _touch(item) {
	// Update access time
	item.lastAccess = new Date();

	// Move to head of list if not already there
	var prev = item.prev;
	if (prev) {
	    var next = item.next;
	    if (next) {
		prev.next = next;
		next.prev = prev;
	    }
	    else {
		prev.next = null;
		this._tail = prev;
	    }
	    item.prev = null;
	    item.next = this._head;
	    this._head = item;
	}
    },

    get: function(key) {
	// Look in cache
	var item = this._cache[key];
	if (item) {
	    this._touch(item);
	    return item.value;
	}
	return undefined;
    },

    set: function(key, value) {
	var item = this._cache[key];
	if (item) {
	    this._touch(item);
	    item.value = value;
	}
	else {
	    // Create new item at head of list
	    item = { value: value,
		     lastAccess: new Date(),
		     prev: null,
		     next: this._head };
	    this._head = item;
	    if (! this._tail)
		this._tail = item;

	    // Add to cache
	    this._cache[key] = item;
	}
    },

    del: function(key) {
	var item = this._cache[key];
	if (item) {
	    if (this.reapCB)
		this.reapCB(item.value);
	    
	    // Remove from list
	    var prev = item.prev;
	    var next = item.next;
	    if (prev) 
		prev.next = next;
	    else
		this._head = next;
	    if (next)
		next.prev = prev;
	    else
		this._tail = prev;

	    // Remove from cache
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
	var item = this._tail;
	if (reapCB) {
	    while (item && item.lastAccess < threshold) {
		var next = item.next;
		if (reapCB(item.value))
		    this._touch(item);
		item = next ? next.prev : this._tail;
	    }
	}
	else {
	    while (item && item.lastAccess < threshold) {
		item = item.prev;
	    }
	}

	// Remove all items below
	if (item)
	    item.next = null;
	else
	    this._head = null;
	this._tail = item;
    }
};

// Export
module.exports = Cache;
