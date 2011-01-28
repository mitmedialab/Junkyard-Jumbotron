
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var cp = require('child_process');
var params = require('./jumbotron/params');

//var params = require('./jumbotron/params');
//var utils = require('./jumbotron/utils');

console.log(process.env.PATH);
cp.exec(params.python, {env: {PATH: params.pythonPath}},
	function(err, stdout, stderr) {
	    if (err)
		console.log("ERROR:", err);
	    if (stdout)
		console.log(">", stdout);
	    if (stderr)
		console.log("err>", stderr);
	});
