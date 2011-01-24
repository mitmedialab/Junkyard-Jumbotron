/*
 Get files ready for phonegap
 For now just converts templates to html for phonegap.
 See Makefile
 */

util = require('util');
fs = require('fs');
jade = require('jade');

function jadeToHtml(src, dst) {
    util.log(['Converting', src, 'to', dst].join(' '));
    fs.writeFileSync(dst, jade.render(fs.readFileSync(src, 'utf8')));
}

var src = process.argv[2];
var dst = process.argv[3];
try {
    jadeToHtml(src, dst);
}
catch (exception) {
    util.error(exception);
}

process.exit(0);

