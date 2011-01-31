// ======================================================================
// Calibration

var cp = require('child_process');
var fs = require('fs');
var params = require('./params');
var utils = require('./utils');

function Mail(cb) {
    this.process = null;
    this.cb = cb;
}

// Instance members

Mail.prototype = {

    start: function start() {
	// Stop this, if already started (should never happen)
	this.stop();

	// Kill stranded mail checker, if any
	var killCmd = ["ps -fe",
		       "grep '" + params.mailScript + "'",
		       "grep -v grep",
		       "awk '{print $2}'",
		       "xargs kill -s TERM"].join("|");
	cp.exec(killCmd, function(err, stdout, stderr) {

	    // Start new mail checker
	    utils.log('Starting mail-checker', params.email.mboxPath);
	    var process = this.process =
		cp.spawn(params.python, [params.mailScript],
			 {env: {PATH: params.pythonPath}});
	    process.stderr.on('data', this._handleStderr.bind(this));
	    process.stdout.on('data', this._handleStdout.bind(this));
	    process.stdin.write(JSON.stringify(params.email));
	    process.stdin.write('\n');
	    this.checkMail();
	    fs.watchFile(params.email.mboxPath,
			 { persistent: true, interval: 500 },
			 this._handleMboxChange.bind(this));
	}.bind(this));
    },

    stop: function stop() {
	if (this.process) {
	    utils.log('Stopping mail-checker');
	    this.process.kill();
	    fs.unwatchFile(params.email.mboxPath);
	}
    },

    _sendCmd: function _sendCmd(cmd, args) {
	var stdin = this.process.stdin;
	stdin.write(JSON.stringify({ cmd: cmd, args: args }));
	stdin.write('\n');
	stdin.flush();
    },

    checkMail: function checkMail() {
	//utils.debug("Checking mail");
	this._sendCmd("check");
    },

    sendMail: function send(receiver, subject, body) {
	// If no body, split subject at first newline
	if (! body) {
	    var idx = subject.indexOf('\n');
	    if (idx >= 0) {
		body = subject.substring(idx+1);
		subject = subject.substring(0, idx);
	    }
	}
	this._sendCmd("send", { receiver: receiver,
				subject: subject,
				body: body || "" });
    },

    _handleMboxChange: function _handleMboxChange(nStat, oStat) {
	if (nStat.size > 0 && nStat.mtime != oStat.mtime)
	    this.checkMail();
    },

    _handleStderr: function _handleStderr(data) {
	utils.error("Mail Checker", data.toString());
    },

    _handleStdout: function _handleStdout(data) {
	data = data.toString().split('\n');
	for (var d in data) {
	    var line = data[d];
	    if (! line)
		continue;
	    try {
		var msg = JSON.parse(line);
	    }
	    catch (exception) {
		utils.error("Bad JSON from Mail Checker", line);
		continue;
	    }
	    msg.reply = this.sendMail.bind(this, msg.sender);
	    this.cb(msg);
	}
    }
};

// Export

module.exports = Mail;
