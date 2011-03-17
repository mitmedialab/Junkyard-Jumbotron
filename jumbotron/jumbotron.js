// ======================================================================
// Jumbotron

var assert	= require('assert');
var path	= require('path');
var fs		= require('fs');

var params	= require('./params');
var utils	= require('./utils');
var calibrate	= require('./calibrate');
var Base	= require('./base');
var Viewport	= require('./viewport');
var Controller	= require('./controller');
var Display	= require('./display');
var Image	= require('./image');

// Constructor
function Jumbotron(options) {
    Base.call(this, options);

    options = options || {};

    // Unique name
    this.name = options.name;
    // Password for access control (Unused for now)
    this.pwd = options.pwd;
    // Email, for retrieving lost password (Unused for now)
    this.email = options.email;
    // The server emails should be sent to
    this.imageReceiveServer = params.imageReceiveServer;

    // Mode: calibrate, image, ...
    this.mode = options.mode || "calibrate";
    // Aspect ratio
    this.aspectRatio = options.aspectRatio || 1;

    // All connected controllers, keyed by clientId
    this.controllers = {};
    // All connected displays, keyed by clientId
    this.displays = {};
    // All attached images, keyed by index
    this.images = [];

    // options.controllers|displays|images are generic Objects from
    // JSON.parse that need to be converted and added.
    for (var c in options.controllers)
	this.addController(new Controller(options.controllers[c]));
    for (var d in options.displays)
	this.addDisplay(new Display(options.displays[d]));
    for (var i in options.images)
	this.addImage(new Image(options.images[i]));

    // Set current image
    this.setFrame(0);

    // Slide show timer
    this.playTimer = null;
}

// Subclass and Members
Jumbotron.prototype = utils.inherits(Base, { 

    // Everything but the curImage and playTimer
    fieldsToSerialize: ['name', 'pwd', 'email',
			'mode', 'aspectRatio', 'imageReceiveServer',
			'images', 'displays', 'controllers'],

    isActive: function isActive() {
	return utils.any(this.displays, function(display) {
	    return display.isActive();
	});
    },
    
    numActiveDisplays: function numActiveDisplays() {
	return utils.filter(this.displays, function(display) {
	    return display.isActive();
	}).length;
    },

    getDirectory: function getDirectory() {
	return path.join(params.jumbotronsDir, this.name);
    },

    // ----------------------------------------------------------------------

    getController: function getController(id) {
	var controller = this.controllers[id];
	if (controller)
	    controller.touch();
	return controller;
    },

    addController: function addController(cont) {
	if (cont.idx < 0) {
	    var idx = -1;
	    for (var d in this.conts)
		idx = Math.max(idx, this.conts[d].idx);
	    cont.idx = idx + 1;
	}
	this.controllers[cont.clientId] = cont;
	cont.jumbotron = this;
    },
    
    removeController: function removeController(cont) {
	delete this.controllers[cont.clientId];
	cont.idx = -666;
	cont.jumbotron = null;
    },

    // ----------------------------------------------------------------------

    getDisplay: function getDisplay(id) {
	var display = this.displays[id];
	if (display)
	    display.touch();
	return display;
    },

    addDisplay: function addDisplay(display) {
	// The display index is one more than the max
	if (display.idx < 0) {
	    var idx = -1;
	    for (var d in this.displays)
		idx = Math.max(idx, this.displays[d].idx);
	    display.idx = idx + 1;
	}
	this.displays[display.clientId] = display;
	display.jumbotron = this;
    },

    removeDisplay: function removeDisplay(display) {
	delete this[display.clientId];
	display.idx = -666;
	display.jumbotron = null;
    },

    // ----------------------------------------------------------------------
    // TODO: make this an EventEmitter than emits "imageChanged"?

    setCurrentImage: function setCurrentImage(image) {
	assert.ok(!!image);
	if (this.curImage != image) {
	    var oldImage = this.curImage;
	    this.curImage = image;
	    if (Jumbotron.listener)
		Jumbotron.listener(this, oldImage);
	}
    },

    getCurrentImage: function getCurrentImage() {
	var image = this.curImage;
	image.touch();
	return image;
    },

    getImage: function getImage(which) {
	var image = this.image[which];
	image.touch();
	return image;
    },

    addImage: function addImage(image) {
	this.images.push(image);
	image.jumbotron = this;

	// If this is the first image, use it
	if (this.images.length == 1)
	    this.setFrame(0);

	return this.images.length - 1;
    },

    uploadImageFile: function saveImageFile(file, name, cb) {
	name = name || utils.uniqueFileName();
	var ext = path.extname(file);
	var dst = path.join(this.getDirectory(), name + ext);
	fs.rename(file, dst, function(err) {
	    cb(err, dst);
	});
    },

    _deleteImage: function _deleteImage(image) {
	// Delete path
	if (utils.isStartsWith(image.source, this.getDirectory()))
	    fs.unlink(image.source);
    },

    removeImage: function removeImage(image) {
	var idx = this.images.indexOf(image);
	if (idx >= 0) {
	    this.images.splice(idx, 1);
	    image.jumbotron = null;

	    // If this was the current image, use the next
	    if (this.curImage == image)
		this.setFrame(idx + 1);

	    this._deleteImage(image);
	}
    },

    removeImages: function removeImages() {
	var images = this.images;
	this.images = [];
	this.setFrame(0);

	for (var i in images) {
	    var image = images[i];
	    image.jumbotron = null;
	    this._deleteImage(image);
	}
    },

    fitImage: function fitImage(fitMode, image) {
	image = image || this.getCurrentImage();
	var vp = new Viewport({ width: image.width, height: image.height });
	vp = vp.fitted(this.aspectRatio, fitMode);
	image.viewport = vp;
    },

    // ----------------------------------------------------------------------
    // Slideshow

    play: function play(ms) {
	this.stop();
	this.playTimer = setInterval(this.step.bind(this, 1), ms);
    },

    isPlaying: function isPlaying() {
	return !! this.playTimer;
    },

    stop: function stop() {
	if (this.playTimer) {
	    clearInterval(this.playTimer);
	    this.playTimer = null;
	}
    },

    step: function step(inc) {
	this.setFrame(this.getFrame() + inc);
    },

    numFrames: function numFrames() {
	return this.images.length;
    },

    getFrame: function getFrame() {
	return this.images.indexOf(this.curImage);
    },

    setFrame: function setFrame(which) {
	var image = null;
	var numFrames = this.numFrames();
	if (numFrames) {
	    image = this.images[Math.mod(which, numFrames)];
	    this.setCurrentImage(image);
	}
	else if (! this.curImage ||
		 this.curImage.source != params.calibratedImageOptions.source) {
	    this.setCurrentImage(Image.getCalibratedImage());
	}
    },

    // ----------------------------------------------------------------------

    getDisplayImage: function getDisplayImage(display) {
	var image = this.getCurrentImage();
	if (this.mode == "calibrate")
	    image = calibrate.getMarkerImage(display.idx);
	else if (display.viewport.isEmpty())
	    image = Image.getErrorImage();
	return image;
    },

    getDisplayViewport: function getDisplayViewport(display) {
	var image = this.getDisplayImage(display);
	var viewport = image.viewport;
	if (this.mode == "calibrate" || display.viewport.isEmpty())
	    viewport = viewport.fitted(display.aspectRatio, "minimize");
	else
	    viewport = viewport.cropped(display.viewport);
	return viewport;
    },

    getDisplayFrozen:  function getDisplayFrozen(display) {
	return this.mode == "calibrate" || display.viewport.isEmpty();
    }

});


// Class Members

// Listens for frame changes to all jumbotrons. We could make each jumbotron
// an EventEmitter, but we'd have to make sure to set a listener each
// time a jumbotron was created. This is easier for now.
Jumbotron.listener = null;

Jumbotron.isValidName = function isValidName(name) {
    return params.jumbotronRegExp.test(name) &&
	! (name in params.jumbotronReserved);
};

// Export

module.exports = Jumbotron;

