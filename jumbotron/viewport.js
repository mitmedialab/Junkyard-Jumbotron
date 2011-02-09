// ======================================================================
// Viewport

// Constructor
function Viewport(options) {
    options = options || {};

    // Position
    this.x = options.x || 0;
    this.y = options.y || 0;

    // Size
    this.width  = options.width  || 0;
    this.height = options.height || 0;

    // Rotation: 0=up 1=90deg 2=180deg 3=270deg
    this.rotation = options.rotation || 0;
}

// Members
Viewport.prototype = {

    set: function set(x, y, width, height, rotation) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	if (rotation)
	    this.rotation = rotation;
    },

    copy: function copy(other) {
	this.x = other.x;
	this.y = other.y;
	this.width = other.width;
	this.height = other.height;
	this.rotation = other.rotation;
    },

    clone: function clone() {
	return new Viewport(this);
    },

    translate: function translate(x, y) {
	this.x += x;
	this.y += y;
    },

    scale: function scale(x, y, ox, oy) {
	ox = ox || 0;
	oy = oy || 0;
	this.x = (this.x - ox) * x + ox;
	this.y = (this.y - oy) * y + oy;
	this.width *= x;
	this.height *= y;
    },

    toString: function toString() {
	return (this.x + ',' + this.y
		+ ' ' + this.width + 'x' + this.height
		+ ' (' + this.rotation + ')');
    },

    equals: function equals(other) {
	return (this.x == other.x && this.y == other.y &&
		this.width == other.width && this.height == other.height &&
		this.rotation == other.rotation);
    },

    isEmpty: function isEmpty() {
	return this.width <= 0 || this.height <= 0;
    },

    isSideways: function isSideways() {
	return this.rotation == 1 || this.rotation == 3;
    },

    // Return a new, cropped version of this viewport,
    // where 'crop' is a normalized viewport.
    //     vp.cropped(new Viewport(0, 0, 1, 1)) == vp
    cropped: function cropped(crop) {
	var round = Math.round;
	return new Viewport({ x: round(crop.x * this.width + this.x),
			      y: round(crop.y * this.height + this.y),
			      width: round(crop.width  * this.width),
			      height: round(crop.height * this.height),
			      rotation: this.rotation });
    },

    // Return a new viewport of which this viewport is a crop, where
    // 'crop' is a normalized viewport. The inverse of cropped().
    //     vp.uncropped(vp.cropped(crop)) == vp
    uncropped: function uncropped(crop) {
	var round = Math.round;
	var width  = this.width  / crop.width;
	var height = this.height / crop.height;
	return new Viewport({ x: round(this.x - crop.x * width),
			      y: round(this.y - crop.y * height),
			      width: round(width),
			      height: round(height),
			      rotation: this.rotation });
    },

    // Return a new viewport which is a subset or superset of this
    // viewport and has a given aspect ratio.
    // 'fitMode' tells how:
    //		maximize: new viewport is completely contained in old
    //		minimize: new viewport completely contains old
    //		horizontal: new viewport has same width as old
    //		vertical: new viewport has same height as old
    //		stretch: no change, the viewport will be stretched
    fitted: function fitted(dstAr, fitMode) {
	var thisAr = this.width / this.height;

	if (! fitMode || fitMode == 'maximize')
	    fitMode = (thisAr > dstAr ? 'vertical' : 'horizontal');
	else if (fitMode == 'minimize')
	    fitMode = (thisAr < dstAr ? 'vertical' : 'horizontal');

	var vp = this.clone();
	if (fitMode == 'horizontal') {
	    vp.height = this.width / dstAr;
	    vp.y += Math.round(0.5 * (this.height - vp.height));
	}
	else if  (fitMode == 'vertical') {
	    vp.width = this.height * dstAr;
	    vp.x += Math.round(0.5 * (this.width - vp.width));
	}
	// else (fitMode == 'stretch'), don't do anything

	return vp;
    }
};

// Export
module.exports = Viewport;
