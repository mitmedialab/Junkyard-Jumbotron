// ======================================================================
// Utilities

function getValue(field) {
    return $('#' + field).val();
}


// ======================================================================
// Localization
// TODO: optionally include each language

var localizeTable = {
    'unknown error'	: "Can't {0}\n({1})",
    'localize error'	: "Can't localize {0}",

    'need name'	: "Please enter a name for the Jumbotron",
    'bad name'	: "Jumbotron names must begin with a letter or number"
	+ " and may contain only letters, numbers, dashes, and underscores",
    'duplicate'	: "A Jumbotron named {0} already exists, would you like to control it?",
    'no jumbotron': "No Jumbotron named {0} exists, would you like to create one?",

    'need file' : "Please choose an image file to upload", 
    'bad image'	: "Can't understand that image, please try another",

    'delete'	: "Delete the current image?",
    'delete all': "Delete ALL images?"
};

function x(status) {
    var msg = this.localizeTable[status];
    if (! msg)
	msg = this.localizeTable['localize error'];

    arguments[0] = msg;
    return format.apply(null, arguments);
}

// ======================================================================
// Controller class

function Controller() {
    Client.call(this);
    this.initControls();
    this.jumbotron = null;
}

Controller.prototype = new Client();

$.extend(Controller.prototype, {

    // ----------------------------------------------------------------------
    // Utilites

    isValidJumbotronName: function isValidJumbotronName(name) {
	var regExp = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
	return regExp.test(name);
    },

    checkJumbotronName: function checkJumbotronName(name) {
	var ok = false;
	if (! name) 
	    alert(x('need name'));
	else if (! this.isValidJumbotronName(name)) 
	    alert(x('bad name'));
	else
	    ok = true;
	return ok;
    },

    checkStatus: function checkStatus(response) {
	if (response.status != 'ok')
	    alert(x('unknown error', 'complete', response.status));
    },

    convertFormData: function convertFormData(data) {
	var obj = {};
	for (var d = data.length; --d >= 0; )
	    obj[data[d].name] = data[d].value;
	return obj;
    },

    getPicture: function getPicture(src, success) {
	if (navigator.camera) {
	    var camera = navigator.camera;
	    src = (src == "camera"
		   ? camera.PictureSourceType.CAMERA
		   : camera.PictureSourceType.PHOTOLIBRARY);
	    var options = { quality: 5,
			    destinationType: camera.DestinationType.DATA_URL,
			    sourceType: src };
	    camera.getPicture(success,
			      function(err) {
				  alert("error: " + err);
			      },
			      options);
	}
    },

    postMsg: function postMsg(cmd, args, success, dataType) {
	$.post(cmd, args, success || this.checkStatus, dataType || 'json');
    },

    changePage: function changePage(which) {
	$.mobile.changePage("#" + which);
    },

    setMode: function setMode(mode) {
	//console.log("Setting mode to " + mode);
	this.postMsg('setMode', { mode: mode });
    },
    setCalibrateMode: function setCalibrateMode(mode) {
	this.setMode('calibrate');
    },
    setImageMode: function setImageMode(mode) {
	this.setMode('image');
    },
    
    // ----------------------------------------------------------------------
    // Buttons, forms and other controls

    controlOptions: {

	jjJoinForm: {

	    beforeSubmit: function validate(data, form, options) { 
		var name = getValue("jjJoinName");
		if (this.checkJumbotronName(name))
		    window.location = name;
		return false;
	    }

	},

	jjCreateForm: {

	    beforeSubmit: function validate(data, form, options) { 
		return this.checkJumbotronName(getValue("jjCreateName"));
	    },

	    success: function(response) {
		var status = response.status;
		switch (status) {
		  case 'ok':
		    this.controlJumbotron(response.args);
		    break;
		  case 'duplicate':
		    var name = getValue("jjCreateName");
		    if (confirm(x('duplicate', name))) {
			this.postMsg('control', { name: name  },
				     bind(this, function(response) {
					 this.controlJumbotron(response.args);
				     }));
		    }
		    break;
		  default:
		    alert(x('unknown error', 'create', status));
		    break;
		}
	    }
	},

	jjControlForm: {
	    beforeSubmit: function validate(data, form, options) { 
		return this.checkJumbotronName(getValue("jjControlName"));
	    },
	    success: function(response) {
		var status = response.status;
		switch (status) {
		  case 'ok':
		    this.controlJumbotron(response.args);
		    break;
		  case 'no jumbotron':
		    var name = getValue("jjControlName");
		    if (confirm(x('no jumbotron', name))) {
			this.postMsg('create', { name: name  },
				     bind(this, function(response) {
			    this.controlJumbotron(response.args);
			}));
		    }
		    break;
		  default:
		    alert(x('unknown error', 'control', status));
		    break;
		}
	    }
	},

	jjCalibrateForm: {
	    beforeSubmit: function validate(data, form, options) { 
		var ok = true;
		data = this.convertFormData(data);
		var file = data.file;
		if (! file)  {
		    alert(x('need file'));
		    ok = false;
		}
		return ok;
	    },
	    success: function success(response) {
		var status = response.status;
		console.log(response);
		if (status == 'ok')
		    this.changePage('success');
		else
		    this.changePage('failure');
	    }
	},

	jjUploadForm: {
	    beforeSubmit: function validate(data, form, options) { 
		var ok = true;
		data = this.convertFormData(data);
		var file = data.file;
		if (! file) {
		    alert(x('need file'));
		    ok = false;
		}
		return ok;
	    },
	    success: function success(response) {
		var status = response.status;
		var feedback = response.args || status;
		alert(feedback);
	    }
	},

	jjSlideshowFirst: { action: 'slideshow', args: { control: 'first' } },
	jjSlideshowLast : { action: 'slideshow', args: { control: 'last'  } },
	jjSlideshowPrev : { action: 'slideshow', args: { control: 'prev'  } },
	jjSlideshowNext : { action: 'slideshow', args: { control: 'next'  } },
	jjSlideshowStop : { action: 'slideshow', args: { control: 'stop'  } },
	jjSlideshowPlay: {
	    action: 'slideshow',
	    args: function() {
		return { control: 'play',
			 interval: getValue('getSlideshowInterval') };
	    }
	},
	jjSlideshowInterval: {
	    action: 'slideshow',
	    args: function() {
		return { control: 'interval',
			 interval: getValue('getSlideshowInterval') };
	    }
	},

	jjFitMaximize: { action: 'fit', args: { mode: 'maximize' } },
	jjFitMinimize: { action: 'fit', args: { mode: 'minimize' } },
	jjFitStretch : { action: 'fit', args: { mode: 'stretch'  } },

	jjShowIdOn : { action: 'identify', args: { on: true  } },
	jjShowIdOff: { action: 'identify', args: { on: false } },

	jjDeleteOne: {
	    action: 'remove',
	    args: { which: 'current' },
	    beforeSubmit: function() {
		return confirm(x('delete'));
	    }
	},
	jjDeleteAll: {
	    action: 'remove',
	    args: { which: 'all' },
	    beforeSubmit: function() {
		return confirm(x('delete all'));
	    }
	}

    },

    controlJumbotron: function controlJumbotron(jumbotron) {
	if (! this.socket)
	    this.initSocket();

	this.jumbotron = jumbotron;
	
	if (jumbotron.mode == 'calibrate') {
	    this.changePage('setup');
	}
	else {
	    this.changePage('control');
	}

	var root = window.location.host;
	var name = jumbotron.name;
	$('.jjTitle').text(name);
	$('.jjDisplayUrl').text(root + '/' + name);
	$('.jjEmailUrl').text(name + jumbotron.imageReceiveServer);
    },

    initButton: function initButton(button, options) {
	button.click(bind(this, function() {
	    var args = isFunction(options.args)
		? options.args() : options.args;
	    if (! options.beforeSubmit || options.beforeSubmit(args))
		this.postMsg(options.action, args,
			     options.success, options.dataType);
	}));
    },

    initText: function initText(text, options) {
	text.keyup(bind(this, function(event) {
	    if(event.keyCode == 13) { // "return" key
		var args = isFunction(options.args)
		    ? options.args() : options.args;
		if (options.beforeSubmit && options.beforeSubmit(args))
		    this.postMsg(options.action, args,
				 options.success, options.dataType);
	    }
	}));
    },

    initForm: function initForm(form, options) {
	form.ajaxForm(options);
    },

    initControl: function initControl(control, options) {
	if (control.is('form'))
	    this.initForm(control, options);
	else if (control.is('input'))
	    this.initText(control, options);
	else
	    this.initButton(control, options);
    },

    initControls: function initControls() {
	for (var controlId in this.controlOptions) {
	    // Massage arguments
	    var options = this.controlOptions[controlId];

	    if (isFunction(options.args))
		options.args = bind(this, options.args);
	    if (isFunction(options.beforeSubmit))
		options.beforeSubmit = bind(this, options.beforeSubmit);
	    if (! options.success)
		options.success = bind(this, this.checkStatus);
	    else if (isFunction(options.success))
		options.success = bind(this, options.success);
	    options.dataType = options.dataType || 'json';

	    // Get and bind control
	    var control = $('#' + controlId);
	    if (control)
		this.initControl(control, options);
	}

	var name = $.cookie('jjname');
	if (name) {
	    $('#jjCreateName').val(name);
	    $('#jjControlName').val(name);
	}

	$('#setup').bind('pageshow', bind(this, this.setCalibrateMode));
	$('#calibrate').bind('pageshow', bind(this, this.setCalibrateMode));
	$('#success').bind('pageshow', bind(this, this.setImageMode));
	$('#failure').bind('pageshow', bind(this, this.setCalibrateMode));
	$('#control').bind('pageshow', bind(this, this.setImageMode));

	$('.jjButton').button()
	    .siblings('.ui-btn-inner')
	    .css({ padding: "4px 0" });
    },

    // ----------------------------------------------------------------------
    // Communication 

    sendInitMsg: function sendInitMsg() {
	var id = $.cookie('jjid');
	var name = this.getJumbotronName();
	this.sendMsg('connect', { jjid: id, jjname: name, type: 'controller' });
    },

    msgHandlers : {
    }
});

// ----------------------------------------------------------------------

$(document).bind("mobileinit", function() {
    $.mobile.defaultTransition = 'none';
});

$(function() {
    var controller = new Controller();
    $('.jsOnly').css({ display: 'block' });

});
