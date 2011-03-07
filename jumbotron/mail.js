// ======================================================================
// Calibration

var cp = require('child_process');
var fs = require('fs');
var params = require('./params');
var utils = require('./utils');

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

module.exports = {

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
