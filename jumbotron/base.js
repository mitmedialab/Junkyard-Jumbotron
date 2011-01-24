// ======================================================================
// Base class for jumbotrons, displays, controllers, images

function Base(options) {
    options = options || {};

    // Time of creation.
    this.createTime = options.createTime || Date.now();

    // Time of last access.
    this.accessTime = options.accessTime  || Date.now();
}

Base.prototype = {

    // Subclasses should override fieldsToSerialize for custom JSON behavior
    toJSON: function toJSON() {
	var ret = { createTime : this.createTime,
		    accessTime : this.createTime };
	var fields = this.fieldsToSerialize;
	for (var f = 0; f < fields.length; f++) {
	    var field = fields[f];
	    ret[field] = this[field];
	}
	return ret;
    },

    touch: function touch() {
	this.accessTime = Date.now();
    }
};

// Export
module.exports = Base;
