// ======================================================================
// Calibration

var cp = require('child_process');
var path = require('path');
var params = require('./params');
var utils = require('./utils');
var Viewport = require('./viewport');
var Image = require('./image');

// Marker images for the calibrator. Cached since they can be shared.
var markerImages = [];

module.exports = {

    // Return the artoolkit glyph corresponding to the given index.
    getMarkerImage: function getMarkerImage(idx) {
	if (! markerImages[idx]) {
	    var options = params.markerImageOptions;
	    var source = utils.sprintf(options.sourceFormat, idx);
	    markerImages[idx] = new Image({ source: source,
					    width: options.width,
					    height: options.height });
	}
	return markerImages[idx];
    },

    calibrate: function calibrate(jumbotron, source, cb) {
	// Convert relevant jumbotron info to JSON
	var jData = { name: jumbotron.name,
		      displays: utils.values(jumbotron.displays) };
	jData = "'" + JSON.stringify(jData) + "'";

	var cmd = [params.python, params.calibrateScript, source, jData].join(" ");
	cp.exec(cmd, {env: {PATH: params.pythonPath}}, function(err, stdout, stderr) {
	    if (err)
		return cb && cb(err);
	    utils.debug(jData);
	    utils.debug(stdout);
	    var res = JSON.parse(stdout);
	    jumbotron.aspectRatio = res.aspectRatio;
	    var numFound = 0;
	    for (var d in res.displays) {
		var resDisplay = res.displays[d];
		var display = jumbotron.getDisplay(resDisplay.clientId);
		display.viewport = new Viewport(resDisplay.viewport);
		numFound++;
	    }
	    cb && cb(null, numFound);
	});
    }
};
