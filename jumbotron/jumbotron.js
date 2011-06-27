// ======================================================================
// Jumbotron

var assert	= require('assert');
var path	= require('path');
var fs		= require('fs');

var params	= require('./params');
var utils	= require('./utils');
var calib	= require('./calibrate');
var Base	= require('./base');
var Viewport	= require('./viewport');
var Controller	= require('./controller');
var Display	= require('./display');
var Image	= require('./image');

var trace = utils.trace;

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

    // Mode: calibrate, image, slideshow ...
    this.mode = options.mode || "calibrate";
    // how long to stay on each slide when in 'slideshow' mode
    this.slideDuration = options.slideDuration || 5;
    // Aspect ratio
    this.aspectRatio = options.aspectRatio || 1;

    // All connected controllers, keyed by clientId
    this.controllers = {};
    // All connected displays, keyed by clientId
    this.displays = {};
    // All attached images, keyed by index
    this.images = [];

    // Simple list of calibration images, for introspection
    this.calibImages = options.calibImages || [];

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
    if (this.mode == "slideshow")
	this.play(this.slideDuration);

    // Commit timer
    this.commitTimer = null;
}

// Subclass and Members
Jumbotron.prototype = utils.inherits(Base, { 

    // Serialize
    toJSON: function toJSON() {
	var ret = Base.prototype.toJSON.call(this);
	ret.name = this.name;
	ret.pwd = this.pwd;
	ret.email = this.email;
	ret.mode = this.mode;
	ret.slideDuration = this.slideDuration;
	ret.aspectRation = this.aspectRation;
	ret.images = this.images;
	//ret.calibImages = this.calibImages; // For now, recreate this on load
	ret.displays = this.displays;
	ret.controllers = this.controllers;

	// TODO: deal with this differently
	ret.imageReceiveServer = this.imageReceiveServer;
	return ret;
    },

    isActive: function isActive() {
	return utils.any(this.displays, function(display) {
	    return display.isActive();
	});
    },
    
    numActiveDisplays: function numActiveDisplays() {
	return utils.select(this.displays, function(display) {
	    return display.isActive();
	}).length;
    },
    
    lastActiveTime: function lastActiveTime() {
	return utils.reduce(this.displays, function(time, display) {
	    return Math.max(display.msgTime, time);
	}, 0);
    },

    aliveTime: function aliveTime() {
	return Math.max(0, this.lastActiveTime() - this.createTime);
    },

    getDirectory: function getDirectory() {
	return path.join(params.jumbotronsDir, this.name);
    },

    // ----------------------------------------------------------------------

    getController: function getController(id) {
	var controller = this.controllers[id];
	if (controller) {
	    this.touch();
	    controller.touch();
	}
	return controller;
    },

    addController: function addController(cont) {
	if (cont.idx < 0) {
	    var idx = -1;
	    for (var d in this.controllers)
		idx = Math.max(idx, this.controllers[d].idx);
	    cont.idx = idx + 1;
	}
	this.controllers[cont.clientId] = cont;
	cont.jumbotron = this;
	trace(this.name, cont.type, cont.idx, "added");
    },
    
    removeController: function removeController(cont) {
	delete this.controllers[cont.clientId];
	cont.idx = -666;
	cont.jumbotron = null;
    },

    numControllers: function numControllers() {
	return utils.size(this.controllers);
    },

    // ----------------------------------------------------------------------

    getDisplay: function getDisplay(id) {
	var display = this.displays[id];
	if (display) {
	    this.touch();
	    display.touch();
	}
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
	trace(this.name, display.type, display.idx, "added");
    },

    removeDisplay: function removeDisplay(display) {
	delete this[display.clientId];
	display.idx = -666;
	display.jumbotron = null;
    },

    numDisplays: function numDisplays() {
	return utils.size(this.displays);
    },

    numCalibratedDisplays: function numCalibratedDisplays() {
	return utils.size(utils.select(this.displays, function(display) {
	    return display.isCalibrated();
	}));
    },

    // ----------------------------------------------------------------------
    
    calibrate: function calibrate(src, cb) {
	var dst = path.join(this.getDirectory(),
			    '_calibrate_' + utils.uniqueFileName() + path.extname(src));
	fs.rename(src, dst, function(err) {
	    if (err)
		return cb && cb(err);

	    var image = new Image({ source: dst });
	    image.init(function(err) {
		if (err) {
		    fs.unlink(dst);
		    return cb && cb(err);
		}
		image.makeThumbnail(params.thumbnailImageSize);

		// Add to the list of calibration images
		this.calibImages.push(dst);

		calib.calibrate(this, dst, cb);
	    }.bind(this));
	}.bind(this));
    },

    getCalibrationImages: function getCalibrationImages(cb) {
	var dir = this.getDirectory();
	fs.readdir(dir, function(err, files) {
	    if (err)
		return cb && cb(err);
	    var images = [];
	    for (var f in files) {
		var file = files[f];
		if (file.indexOf('calibrate') != -1)
		    images.push(path.join(dir, file));
	    }
	    cb && cb(null, images);
	});
    },

    isCalibrated: function isCalibrated() {
	return utils.any(this.displays, function(display) {
	    return display.isCalibrated();
	});
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
	this.touch();
	image.touch();
	return image;
    },

    getImage: function getImage(which) {
	var image = this.image[which];
	if (image) {
	    this.touch();
	    image.touch();
	}
	return image;
    },

    addImage: function addImage(image) {
	this.images.push(image);
	image.jumbotron = this;

	// If this is the first image, use it
	if (this.images.length == 1)
	    this.setFrame(0);

	trace(this.name, "image", this.images.length-1, "added");

	return this.images.length - 1;
    },

    addImageFromFile: function addImageFromFile(src, cb) {
	var dst = path.join(this.getDirectory(),
			    utils.uniqueFileName() + path.extname(src));
	fs.rename(src, dst, function(err) {
	    if (err)
		return cb && cb(err);
	    var image = new Image({ source: dst });
	    image.init(function(err) {
		if (err) {
		    fs.unlink(dst);
		    return cb && cb(err);
		}
		image.makeThumbnail(params.thumbnailImageSize);
		this.fitImage("maximize", image);
		var frame = this.addImage(image);
		cb && cb(null, image, frame);
	    }.bind(this));
	}.bind(this));
	
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

	    trace(this.name, "image", idx, "removed");
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
	return vp;
    },

    // ----------------------------------------------------------------------
    // Slideshow

    play: function play(duration) {
	this.slideDuration = duration;
	this.stop();
	this.playTimer = setInterval(this.step.bind(this, 1), duration * 1000);
	if (this.mode == 'image')
	    this.mode = 'slideshow';
    },

    isPlaying: function isPlaying() {
	return !! this.playTimer;
    },

    stop: function stop() {
	if (this.playTimer) {
	    clearInterval(this.playTimer);
	    this.playTimer = null;
	    if (this.mode == 'slideshow')
		this.mode = 'image';
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
		 this.curImage.source !=
		 params.calibratedImageOptions.source) {
	    this.setCurrentImage(Image.getCalibratedImage());
	}
    },

    // ----------------------------------------------------------------------

    getDisplayImage: function getDisplayImage(display) {
	var image = this.getCurrentImage();
	if (this.mode == "calibrate")
	    image = calib.getMarkerImage(display.idx);
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
    },

    // ----------------------------------------------------------------------
    // Convenient loopers

    _forEachClient: function _forEachClient(clients, iterator, context, activeOnly) {
	for (var c in clients) {
	    var client = clients[c];
	    if (! activeOnly || client.isActive())
		iterator.call(context, client);
	}
    },

    forEachDisplay: function forEachDisplay(iterator, context, activeOnly) {
	this._forEachClient(this.displays, iterator, context, activeOnly);
    },

    forEachController: function forEachController(iterator, context, activeOnly) {
	this._forEachClient(this.controllers, iterator, context, activeOnly);
    },

    // ----------------------------------------------------------------------
    // Broadcast messages to clients

    broadcastUpload: function broadcastUpload(what, status) {
	this.forEachController(function(controller) {
	    controller.sendMsg('upload', { what: what, status: status });
	}, null, true);
    },

    broadcastJumbotron: function broadcastJumbotron() {
	this.forEachController(function(controller) {
	    controller.sendJumbotron();
	}, null, true);
    },

    broadcastLoad: function broadcastLoad() {
	this.forEachDisplay(function(display) {
	    display.sendLoad();
	}, null, true);
    },

    broadcastViewport: function broadcastViewport(ignoredDisplay) {
	this.forEachDisplay(function(display) {
	    if (display != ignoredDisplay)
		display.sendViewport();
	}, null, true);
    },

    broadcastShow: function broadcastShow(options) {
	this.forEachDisplay(function(display) {
	    display.sendShow(options);
	}, null, true);
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

