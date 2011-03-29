// ======================================================================
// Calibration

var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var params = require('./params');
var utils = require('./utils');

var formidable = require('formidable');
var mailparser = require('mailparser');
var mailer = require('nodemailer');
mailer.SMTP = {
    host: params.email.smtpServer,
    port: params.email.port,
    ssl: params.email.ssl,
    use_authentication: true,
    user: params.email.user,
    pass: params.email.pwd
};

function MailParser(cb) {
    this._cb = cb;
    this.msg = {};
    var mp = this._parser = mailparser.MailParser();
    var size = 0;
    var maxSize = params.maxFileSize * 1024 * 1024;

    mp.on("headers", function(headers) {
	if (this._error)
	    return;
	this.msg.sender = headers.addressesFrom[0].address;
	// Parser jumbotron name from address
	var jName = new RegExp('([^<"]+)@')
	    .exec(headers.addressesTo[0].address);
	if (! jName)
	    this.error('bad email');
	this.msg.jName = jName[1];
    }.bind(this));

    mp.on("astart", function(id, headers){
	if (this._error)
	    return;
	var filename = headers.filename;
	var ext = filename ? path.extname(filename) : '.jpg';
	this.msg.filename = utils.tmpFileName() + ext;
	this._stream = new fs.WriteStream(this.msg.filename);
    }.bind(this));

    mp.on("astream", function(id, buffer){
	if (this._error)
	    return;
	size += buffer.length;
	if (size > maxSize) {
	    this.error('too big');
	    return;
	}
	this._stream.write(buffer);
    }.bind(this));

    mp.on('error', function(err) {
	this.error(err);
    }.bind(this));

    mp.on("aend", function(id){
	if (this._error)
	    return;
	if (this._stream) {
	    this._stream.end();
	    this._stream = null;
	}
	this._cb(null, this.msg);
    }.bind(this));
}

MailParser.prototype = {

    feed: function feed(buffer) {
	if (this._error)
	    return;
	// Convert buffer to ascii and \n to \r\n
	var str = buffer.toString('ascii');
	if (str.indexOf('\r\n') == -1)
	    str = str.replace(/\n/g, '\r\n');
	try {
	    this._parser.feed(str);
	}
	catch (exception) {
	    utils.error('bad email headers', this._parser.headers);
	    this.error('bad email');
	}
    },

    end: function end() {
	if (this._error)
	    return;
	this._parser.end();
    },

    error: function error(err) {
	if (this._error)
	    return;
	this._error = err;
	if (this._stream) {
	    this._stream.end();
	    this._stream = null;
	    if (this.msg.filename)
		fs.unlink(this.msg.filename);
	}
	this._cb(err, this.msg);
    }
};

module.exports = {

    parseForm: function parseForm(req, cb) {
	var parser = MailParser(cb);

	// Parse the form and send all data to the mail parser
	var form = new formidable.IncomingForm();
	form.onPart = function(part) {
	    part.addListener('data' , parser.feed .bind(parser));
	    part.addListener('end'  , parser.end  .bind(parser));
	    part.addListener('error', parser.error.bind(parser));
	};
	form.on('error', parser.error.bind(parser));
	form.parse(req);
    },

    sendMail: function sendMail(receiver, subject, body) {

	// If no body, split subject at first newline
	if (! body) {
	    var idx = subject.indexOf('\n');
	    if (idx >= 0) {
		body = subject.substring(idx+1);
		subject = subject.substring(0, idx);
	    }
	}

	utils.debug('MAIL', '>', receiver, subject, body);

	mailer.send_mail({ sender: 'noreply@jj.brownbag.me',
			   to: receiver,
			   subject: subject,
			   body: body,
			   debug: params.email.debug },
			 function(err, success){
			     utils.debug("Message "+(success?"sent":"failed"));
			 });
    }
};
