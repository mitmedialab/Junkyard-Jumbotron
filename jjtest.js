
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');

var params = require('./jumbotron/params');
var utils = require('./jumbotron/utils');
var Image = require('./jumbotron/image');


Image.getSampleImageFiles(function(err, files) {
    console.log(err, files);
    Image.getIconImageFile(files[0], function(err, iconFile) {
	console.log(err, iconFile);
    });
});


