
var log = console.log;
var host = "http://localhost/";

// Is a given value a function? From underscore.js
function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
}

function isValidJumbotronName(name) {
  var regExp = /^[a-zA-Z0-9_-]+$/;
  return regExp.test(name);
}

function checkJumbotronName(name) {
    if (! name)
	return 'Please enter a name for the Jumotron';
    if  (! isValidJumbotronName(name))
	return 'Jumbotron names may contain only numbers, letters, dashes, and underscores';
    return null;
}

function checkStatus(data) {
    if (data.status != 'ok')
	alert('Unknown error ' + data.status);
}

function convertFormData(data) {
    console.log("data", data);
    var obj = {};
    for (var d in data) 
	obj[data[d].name] = data[d].value;
    return obj;
}

var formOptions = {
    jjCreateForm : {
	beforeSubmit: function validate(data, form, options) { 
	    data = convertFormData(data);
	    var name = data.name;
	    var err = checkJumbotronName(name);
	    if (err) {
		alert(err);
		return false;
	    }
	    return true;
	},
	success: function success(response, status, xhr, form) {
	    switch (response.status) {
	    case 'ok':
		status = 'Jumbotron created!';
		form.clearForm();
		$.mobile.changePage('#jjCalibrate');
		break;
	    case 'duplicate':
		status = 'A Jumbotron with that name already exists.';
		break;
	    default:
		status = 'Unknown error: ' + response.status;
		break;
	    }
	    alert(status);
	}
    },

    jjControlForm : {
	beforeSubmit: function validate(data, form, options) { 
	    data = convertFormData(data);
	    var name = data.name;
	    var err = checkJumbotronName(name);
	    if (err) {
		alert(err);
		return false;
	    }
	    return true;
	},
	success: function success(response, status, xhr, form) {
	    switch (response.status) {
	    case 'ok':
		status = 'Jumbotron controlled!';
		form.clearForm();
		$.mobile.changePage('#jjUpload');
		break;
	    case 'no jumbotron':
		status = 'No Jumbotron with that name exists.';
		break;
	    default:
		status = 'Unknown error: ' + response.status;
		break;
	    }
	    alert(status);
	}
    },

    jjJoinForm : {
	beforeSubmit: function validate(data, form, options) { 
	    data = convertFormData(data);
	    var name = data.name;
	    var err = checkJumbotronName(name);
	    if (err) {
		alert(err);
		return false;
	    }
	    location.href = name;
	    return false;
	},
    },

    jjCalibrateForm : {
	success: function success(response, status, xhr, form) {
	    if (response.status == "ok") {
		status = 'Jumbotron calibrated!';
		form.clearForm();
		$.mobile.changePage('#jjUpload');
	    }
	    else {
		status = 'Unknown error: ' + response.status;
	    }
	    alert(status);
	}
    },

    jjUploadForm : {
	success: function success(response, status, xhr, form) {
	    if (response.status == "ok") {
		status = 'Image uploaded!';
		form.clearForm();
		$.mobile.changePage('#jjUpload');
	    }
	    else {
		status = 'Unknown error: ' + response.status;
	    }
	    alert(status);
	}
    }
};

function getSlideshowInterval() {
    return $("#jjSlideshowInterval").val();
}

function sendMsg(cmd, args, success) {
    $.post(cmd, args, success || checkStatus, 'json');
}

var elementOptions = {
//    jjFoo: function() { sendMsg('fit', args: { mode: 'maximize' })
    jjFitMaximize: { command: 'fit', args: { mode: 'maximize' } },
    jjFitMinimize: { command: 'fit', args: { mode: 'minimize' } },
    jjFitStretch : { command: 'fit', args: { mode: 'stretch'  } },

    jjSlideshowFirst    : { command: 'slideshow', args: { control: 'first' } },
    jjSlideshowPrev     : { command: 'slideshow', args: { control: 'prev'  } },
    jjSlideshowPlay     : { command: 'slideshow', args: function() {
	return { control: 'play', interval: getSlideshowInterval() };
    } },
    jjSlideshowStop     : { command: 'slideshow', args: { control: 'stop'  } },
    jjSlideshowNext     : { command: 'slideshow', args: { control: 'next'  } },
    jjSlideshowLast     : { command: 'slideshow', args: { control: 'last'  } },
    jjSlideshowInterval : { command: 'slideshow', args: function() {
	return { control: 'interval', interval: getSlideshowInterval() };
    } },

    jjRecalibrate: { command: 'recalibrate', args: null }
};

function massageButton(button, options) {
    button.click(function() {
	var args = isFunction(options.args) ? options.args() : options.args;
	$.post(host + options.command, args,
	       options.success, options.dataType);
    });
}

function massageText(text, options) {
    text.keyup(function(event) {
	if(event.keyCode == 13) { // Return
	    var args = isFunction(options.args) ? options.args() : options.args;
	    $.post(host + options.command, args,
		   options.success, options.dataType);
	}
    });
}

function massageForms() {
    for (var formId in formOptions) {
	var form = $('#' + formId);
	var action = form.attr('action');
	form.attr('action', host + action);
	var options = formOptions[formId];
	options.success = options.success || checkStatus;
	options.dataType = options.dataType || 'json';
	form.ajaxForm(options);
    }
}

function getPicture(src, success) {
    if (navigator.camera) {
	var camera = navigator.camera;
	src = (src == "camera"
	       ? camera.PictureSourceType.CAMERA : camera.PictureSourceType.PHOTOLIBRARY);
	var options = { quality: 5,
			destinationType: camera.DestinationType.DATA_URL,
			sourceType: src };
	camera.getPicture(success,
			  function(err) {
			      alert("error: " + err);
			  },
			  options);
    }
}

function massageElements() {
    for (var elementId in elementOptions) {
	var element = $('#' + elementId);
	var options = elementOptions[elementId];
	options.success = options.success || checkStatus;
	options.dataType = options.dataType || 'json';
	if (element.is("a"))
	    massageButton(element, options);
	else
	    massageText(element, options);
    }

    element = $('#jjUploadAlbum');
    element.click(function() {
	getPicture("album", function(data) {
	    $.post("http://localhost/upload", { data: data }, function(response) {
		var status;
		if (response.status == "ok") {
		    status = 'Image uploaded!';
		    $.mobile.changePage('#jjUpload');
		}
		else {
		    status = 'Unknown error: ' + response.status;
		}
		alert(status);
	    });
	});
    });
    element = $('#jjCalibrateAlbum');
    element.click(function() {
	getPicture("album", function(data) {
	    $.post("http://localhost/upload", { data: data }, function(response) {
		var status;
		if (response.status == "ok") {
		    status = 'Jumbotron calibrated';
		    $.mobile.changePage('#jjUpload');
		}
		else {
		    status = 'Unknown error: ' + response.status;
		}
		alert(status);
	    });
	});
    });
}

$(function() {
    $.mobile.ajaxFormsEnabled = false;
    $.mobile.defaultTransition = 'none';
    $.fn.ajaxSubmit.debug = true;
    massageForms();
    massageElements();
});
