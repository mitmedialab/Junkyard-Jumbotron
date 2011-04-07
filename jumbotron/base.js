// ======================================================================
// Base class for jumbotrons, clients, and images

function Base(options) {
    options = options || {};

    // Time of creation.
    this.createTime = options.createTime || Date.now();

    // Time of last access.
    this.accessTime = options.accessTime  || Date.now();
}

Base.prototype = {

    // Serialize
    toJSON: function toJSON() {
	return  { createTime : this.createTime,
		  accessTime : this.accessTime };
    },

    // Update access time
    touch: function touch() {
	this.accessTime = Date.now();
    }
};

// Export
module.exports = Base;
