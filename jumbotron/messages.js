// ======================================================================
// Feedback and error messages.
// Can be exended to be locale-specific.

var params = require('./params');

var messages = {
    'unknown error'     : ("Unknown error '{0}'"),
    'unknown message'   : ("Unknown message '{0}'"),

    'upload error'      : ("Can't upload file to '{0}'\n" +
                           "{1}"),

    'bad command'       : ("Unknown POST command '{1}'"),

    'bad email'         : ("Badly formatted message\n" +
                           "Sorry, we can't understand your email message."),
    'no attachments'    : ("No attached images\n" +
                           "Whoops, your message had no attached images."),
    'multiple attachments': ("Too many attached images\n" +
                           "Sorry, we can only handle one image per message."),

    'too big'           : ("File too big\n" +
			   "Whoops, you're file was too big. " +
			   "We limit uploads to " + params.maxFileSize + "Mb."),

    'bad image'		: ("Can't handle file uploaded to '{0}'\n" +
			   "Currently we only support images (no movies) " +
			   "in jpeg, png and gif formats."),

    'no jumbotron'      : ("No Junkyard Jumbotron called '{0}'\n" +
                           "Whoops, there is no jumbotron named '{0}'"),

    'no displays'       : ("No displays found while calibrating '{0}'\n" +
                           "Whoops, we didn't find any displays in the calibration image."),

    'calibrate error'   : ("Can't calibrate '{0}'\n" +
                           "Sorry, something bad happened while calibrating. " +
                           "We're working to make it better."),

    'calibrated'        : ("Calibrated '{0}'!\n" +
                           "Junkyard Jumbotron '{0}' has been successfully calibrated. " +
			   "We found {1} display(s)."),

    'uploaded'          : ("Image uploaded to '{0}'!\n" +
                           "Image has been successfully uploaded to Junkyard Jumbotron '{0}'.")
};


module.exports.translate = function(which) {
    var msg = messages[which];
    if (! msg)
	return messages['unknown message'].format(which);
    arguments = [].splice.call(arguments, 1); // Remove first
    return msg.format.apply(msg, arguments);
};
