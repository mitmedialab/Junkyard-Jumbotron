// ======================================================================
// Feedback and error messages.
// Can be exended to be locale-specific.

var messages = {
    'unknown error'     : "Unknown error '{0}'",
    'unknown message'   : "Unknown message '{0}'",

    'upload error'      : ("Can't upload file to '{0}'\n" +
                           "{1}"),

    'bad email'         : ("Badly formatted mail message\n" +
                           "Whoops, I can't understand your email message."),
    'no attachments'    : ("No attachments\n" +
                           "Whoops, your message has no attachments."),

    'no jumbotron'      : ("No jumbotron called '{0}'\n" +
                           "Whoops, there is no jumbotron named '{0}'"),

    'no displays'       : ("No displays found while calibrating '{0}'\n" +
                           "Whoops, I didn't find any displays in the calibration image."),

    'few displays'      : ("Not enough displays found calibrating '{0}'\n" +
                           "I found only {1} display(s) in the calibration image, " +
                           "but there are {2} displays attached to " +
                           "your Junkyard Jumbotron '{0}'."),

    'more displays'     : ("Too many displays found calibrating '{0}'\n" +
                           "I found {1} displays in the calibration image, " +
                           "but there are only {2} display(s) attached to " +
                           "your Junkyard Jumbotron '{0}'."),

    'calibrate error'   : ("Can't Calibrate '{0}'\n" +
                           "Whoops, something bad happened while calibrating. " +
                           "We're working to make it better."),

    'calibrated'        : ("Calibrated '{0}'!\n" +
                           "Junkyard Jumbotron '{0}' has been successfully calibrated."),

    'uploaded'          : ("Image uploaded to '{0}'!\n" +
                           "Image has been successfully uploaded to Junkyard Jumbotron '{0}'.")
};

module.exports.translate = function(which) {
    var msg = messages[which];
    if (! msg)
	return messages['unknown message'].format(which);
    arguments = [].splice.call(arguments,1) // Remove first
    return msg.format.apply(msg, arguments);
};
