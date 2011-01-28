// ======================================================================
// Controller class

function Controller() {
    Client.call(this);
    //this.initSocket();
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

    checkStatus: function checkStatus(response) {
	if (response.status != 'ok')
	    alert('Unknown error ' + response.status);
    },

    convertFormData: function convertFormData(data) {
	var obj = {};
	for (var d = data.length; --d >= 0; )
	    obj[data[d].name] = data[d].value;
	return obj;
    },

    getValue: function getValue(field) {
	return $('#' + field).val();
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

    setMode: function setMode(mode) {
	switch(mode) {
	  case 'create':
	    $.mobile.changePage("#jjCreate");
	    break;
	  case 'calibrate':
	    if (! this.jumbotron)
		return setMode('create');
	    this.postMsg('recalibrate');
	    $.mobile.changePage("#jjCalibrate");
	    break;
	  case 'control':
	    if (! this.jumbotron)
		return setMode('create');
	    this.postMsg('endCalibrate');
	    $.mobile.changePage("#jjControl");
	    break;
	}
    },

    // ----------------------------------------------------------------------
    // Buttons, forms and other controls

    controlOptions: {

	jjCreateForm: {

	    beforeSubmit: function validate(data, form, options) { 
		var ok = false;
		data = this.convertFormData(data);
		var name = data.name;
		if (! name)
		    alert('Please enter a name for the Jumotron');
		else if (! this.isValidJumbotronName(name))
		    alert('Jumbotron names must begin with a letter or number'
			  + ' and may only contain letters, numbers, dashes, and underscores');
		else
		    ok = true;
		return ok;
	    },

	    success: function(response) {
		switch (response.status) {
		  case 'ok':
		    this.controlJumbotron(response.args);
		    break;
		  case 'duplicate':
		    if (confirm('A Jumbotron with that name already exists, would you like to control it?')) {
			name = this.getValue("jjCreateName");
			this.postMsg('control', { name: name  }, bind(this, function(response) {
			    this.controlJumbotron(response.args);
			}));
		    }
		    break;
		  default:
		    alert('Unknown error: ' + response.status);
		    break;
		}
	    }
	},

	jjCalibrateForm: {
	    beforeSubmit: function validate(data, form, options) { 
		var ok = true;
		data = this.convertFormData(data);
		var file = data.file;
		if (! file) {
		    // TODO: check if jumbotron has been calibrated yet
		    this.setMode('control');
		    ok = false;
		}
		return ok;
	    },
	    success: function success(response) {
		var status;
		if (response.status == "ok") {
		    status = 'Jumbotron calibrated!';
		    this.setMode('control');
		}
		else {
		    status = 'Unknown error: ' + response.status;
		}
		alert(status);
	    }
	},

	jjUploadForm: {
	    beforeSubmit: function validate(data, form, options) { 
		var ok = true;
		data = this.convertFormData(data);
		var file = data.file;
		if (! file) {
		    alert("Please browse for a file");
		    ok = false;
		}
		return ok;
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
			 interval: this.getValue('getSlideshowInterval') };
	    }
	},
	jjSlideshowInterval: {
	    action: 'slideshow',
	    args: function() {
		return { control: 'interval',
			 interval: this.getValue('getSlideshowInterval') };
	    }
	},

	jjFitMaximize: { action: 'fit', args: { mode: 'maximize' } },
	jjFitMinimize: { action: 'fit', args: { mode: 'minimize' } },
	jjFitStretch : { action: 'fit', args: { mode: 'stretch'  } },

	jjShowIdOn : { action: 'identify', args: { on: true  } },
	jjShowIdOff: { action: 'identify', args: { on: false } },

	jjDeleteOne: {
	    action: 'remove',
	    beforeSubmit: function() {
		return confirm("Delete the current image?");
	    }
	},
	jjDeleteAll: {
	    action: 'removeAll',
	    beforeSubmit: function() {
		return confirm("Delete ALL images?");
	    }
	}
    },

    controlJumbotron: function controlJumbotron(jumbotron) {
	this.jumbotron = jumbotron;
	if (jumbotron.mode == 'calibrating')
	    this.setMode('calibrate');
	else
	    this.setMode('control');

	var root = window.location.host;
	var name = jumbotron.name;
	$('.jjTitle').text(name);
	$('.jjDisplayUrl').text(root + '/' + name);
	$('.jjEmailUrl').text(name + '@jj.brownbag.me');
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
	    this.initControl(control, options);
	}

	var name = $.cookie('jjname');
	if (name)
	    $('#jjCreateName').val(name);

	$('.jjNavCreate').click(bind(this, function() {
	    this.setMode('create');
	}));
	$('.jjNavCalibrate').click(bind(this, function() {
	    this.setMode('calibrate');
	}));
	$('.jjNavControl').click(bind(this, function() {
	    this.setMode('control');
	}));
    }
});

// ----------------------------------------------------------------------

$(document).bind("mobileinit", function() {
    $.mobile.ajaxFormsEnabled = false;
    $.mobile.defaultTransition = 'none';
});

$(function() {
    var controller = new Controller();
    //setTimeout(function() {$.mobile.changePage("#jjControl")}, 1000);
});
