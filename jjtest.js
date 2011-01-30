
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var cp = require('child_process');

var utils =  require('./jumbotron/utils');
var params = require('./jumbotron/params');
var Mail = require('./jumbotron/mail');
var Image = require('./jumbotron/image');

var mail = new Mail(function(msg) {
    console.log(msg);
});
mail.start();
