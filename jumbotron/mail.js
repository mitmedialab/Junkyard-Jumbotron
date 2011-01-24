// ======================================================================
// Calibration

var cp = require('child_process');
var params = require('./params');
var utils = require('./utils');

function Mail(cb) {
    this.process = null;
    this.cb = cb;
}

// Instance members

Mail.prototype = {

    // Return the artoolkit glyph corresponding to the given index.
    start: function start() {
	// Stop this, if already started (should never happen)
	this.stop();

	// Kill stranded mail checker, if any
	var killCmd = ["ps ax",
		       "grep '" + params.mailScript + "'",
		       "grep -v grep",
		       "awk '{print $1'}",
		       "xargs kill -s TERM"].join("|");
	cp.exec(killCmd, function(err, stdout, stderr) {

	    // Start new mail checker
	    utils.log('Starting mail checker');
	    var process = this.process =
		cp.spawn(params.python, [params.mailScript]);
	    process.stderr.on('data', this._handleStderr.bind(this));
	    process.stdout.on('data', this._handleStdout.bind(this));
	    process.stdin.write(JSON.stringify(params.email));
	    process.stdin.write('\n');

	}.bind(this));
    },

    stop: function stop() {
	if (this.process) {
	    utils.log('Stopping mail checker');
	    this.process.kill();
	}
    },

    send: function send(receiver, subject, body) {
	// If no body, split subject at first newline
	if (! body) {
	    var idx = subject.indexOf('\n');
	    if (idx >= 0) {
		body = subject.substring(idx+1);
		subject = subject.substring(0, idx);
	    }
	}
	var stdin = this.process.stdin;
	stdin.write(JSON.stringify({ receiver: receiver,
				     subject: subject,
				     body: body || "" }));
	stdin.write('\n');
	stdin.flush();
    },

    _handleStderr: function _handleError(data) {
	utils.error("Mail Checker", data.toString());
    },

    _handleStdout: function _handleError(data) {
	var msg = JSON.parse(data.toString());
	msg.reply = this.send.bind(this, msg.receiver);
	this.cb(msg);
    }
};

// Export

module.exports = Mail;
