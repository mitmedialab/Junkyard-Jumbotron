// ======================================================================
// Calibration

var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var params = require('./params');
var utils = require('./utils');

var formidable = require('formidable');
var mailparser = require('mailparser');
var Email = require('email').Email;

function MailParser() {
    mailparser.MailParser.call(this);
    this.msg = {};
    var maxSize = params.maxFileSize * 1024 * 1024;

    // Save sender and jumbotron name.
    this.on("headers", function(headers) {
	if (this.error)
	    return;
	this.msg.sender = headers.addressesFrom[0].address;
	// Parser jumbotron name from address (handle name+developer)
	var jName = new RegExp('([^<"\+]+)[\+@]')
	    .exec(headers.addressesTo[0].address);
	if (! jName)
	    this.emit('error', 'bad email');
	this.msg.jName = jName[1];
    }.bind(this));

    // Open file stream for the attachment data
    this.on("astart", function(id, headers){
	if (this.error)
	    return;
	// TODO: to handle multuple attachments, make filename an array
	if (this.msg.filename) {
	    this.emit('error', 'multiple attachments');
	    return;
	}
	var filename = headers.filename;
	var ext = filename ? path.extname(filename) : '.jpg';
	this.msg.filename = utils.tmpFileName() + ext;
	this._stream = new fs.WriteStream(this.msg.filename);
	this._size = 0;
    }.bind(this));

    // Save attachment data to file stream
    this.on("astream", function(id, buffer){
	if (this.error)
	    return;
	this._size += buffer.length;
	if (this._size > maxSize)
	    return this.emit('error', 'too big');
	this._stream.write(buffer);
    }.bind(this));

    // Close file stream
    this.on("aend", function(id) {
	if (this.error)
	    return;
	if (this._stream) {
	    this._stream.end();
	    this._stream = null;
	}
    }.bind(this));

    // Close file stream and delete file
    this.on('error', function(err) {
	this.error = err;
	if (this._stream) {
	    this._stream.end();
	    this._stream = null;
	    if (this.msg.filename)
		fs.unlink(this.msg.filename);
	}
    }.bind(this));
}

MailParser.prototype = utils.inherits(mailparser.MailParser, {

    // Store superclass methods for easy access
    _feed: mailparser.MailParser.prototype.feed,

    feed: function feed(buffer) {
	// Convert buffer to ascii and \n to \r\n
	// javascript (as of 1.5) doesn't support lookbehind, so do it ourselves
	var str = buffer.toString('ascii');
	var idx = str.indexOf('\n', 1);
	if (idx > 0 && str[idx-1] != '\r')
	    str = str.replace(/\n/g, '\r\n');
	try {
	    this._feed(str);
	}
	catch (exception) {
	    utils.error('bad email headers', exception);
	    utils.error('\t', this.headers);
	    this.emit('error', 'bad email');
	}
    },
});

module.exports = {

    parseForm: function parseForm(req, cb) {
	// Create mail parser and catch errors
	var parser = new MailParser(cb);
	parser.on('error', function(err) {
	    cb(err, parser.msg);
	});

	// Create form parser which sends all data to the mail parser
	var form = new formidable.IncomingForm();
	form.onPart = function(part) {
	    // Let formidable handle all non-file parts (shouldn't be any)
	    if (!part.filename)
		incomingForm.handlePart(part);
	    else {
		part.addListener('data', parser.feed.bind(parser));
		part.addListener('end' , parser.end .bind(parser));
	    }
	};
	form.on('end', function() {
	    if (! parser.error)
		cb(null, parser.msg);
	});
	form.on('error', function(err) {
	    cb(err, parser.msg);
	});

	// Do it
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
	    else {
		body = subject;
	    }
	}

	var msg = new Email({ from: params.emailReplyTo,
			      to: receiver,
			      subject: subject,
			      body: body });
	msg.send(function(err) {
	    if (err)
		utils.error('MAIL failed', '>', receiver, subject, body);
	    else
		utils.debug('MAIL', '>', receiver, subject, body);
	});
    }
};
