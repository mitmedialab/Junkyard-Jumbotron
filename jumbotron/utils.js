// ----------------------------------------------------------------------
// Utilities, some mirrored from node.js, connect, underscore, and string

var path = require('path');
var log4js = require('log4js')();
var logger = log4js.getLogger();
var nutils = require('util');
var _  = require('underscore');
_.mixin(require('underscore.string'));

// Return string version of an object
function stringify(obj) {
    if (obj === null)           return "null";	
    if (_.isUndefined(obj))     return "undefined";
    if (_.isFunction(obj))	return "[Function]";
    if (_.isString(obj))	return obj;
    if (obj.message)		return obj.message; // For Exceptions
    if (_.isArguments(obj))
	return _.toArray(obj).map(stringify).join(" ");
    return nutils.inspect(obj, false, 0, false).replace(/\n|( ) */g, '$1');
}

module.exports = {

    stringify: stringify,
    inspect: nutils.inspect,

    stackTrace: function stackTrace() {
	var err = {};
	Error.captureStackTrace(err, this.printStack);
	return err.stack;
    },

    uid: function uid(len) {
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	var charlen = chars.length;
	var buf = [];
	for (var i = 0; i < len; ++i)
	    buf.push(chars[Math.floor(Math.random() * charlen)]);
	return buf.join('');
    },

    error: function error() {
	logger.error("ERROR: " + stringify(arguments));
	for (var a in arguments) {
	    if (arguments[a].stack)
		logger.error(arguments[a].stack);
	}
    },

    log: function log() {
	logger.info(stringify(arguments));
    },

    debug: function debug() {
	logger.debug(stringify(arguments));
    },

    inherits: function inherits(superCtor, props) { 
	var prototype = Object.create(superCtor.prototype, {
	    _super : { value: superCtor, 
		       configurable: false, 
		       enumerable: false, 
		       writable: false } });
	if (props)
	    _.extend(prototype, props);
	return prototype;
    },

    uniqueFileName: function uniqueFileName() {
	return [Date.now().toString(36),
		(Math.random() * 0x100000000 + 1).toString(36)].join('.');
    },

    tmpFileName: function tmpFileName() {
	return path.join(params.tmpDir, this.uniqueFileName());
    },

    escapeForShell: function escapeForShell(str){
	return str.replace(/(?=[^a-zA-Z0-9_.\/\-\x7F-\xFF\n])/gm, '\\');
    }
};

// Add all of underscore
_.extend(module.exports, _);

// ----------------------------------------------------------------------
// Extend classes and prototypes
// Object.defineProperty makes them non-enumerable, etc.

// String.prototype.format
Object.defineProperty(String.prototype, 'format', {
    value: function format() {
	var parts = this.split(/\{([0-9]+)\}/);
	for (var p = 1; p < parts.length; p += 2)
	    parts[p] = arguments[parseInt(parts[p])];
	return parts.join('');
    }
});

// Math.mod to deal correctly with negative numbers
Object.defineProperty(Math, 'mod', {
    value: function mod(a, b) {
	return ((a % b) + b) % b;
    }
});
