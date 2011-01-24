// ----------------------------------------------------------------------
// Utilities, some mirrored from node.js, connect, underscore, and string

//var nutils = require('util');
var nutils = require('sys');
var cutils = require('connect/utils');
var _  = require('underscore');
_.mixin(require('underscore.string'));

// Return string version of an object
function stringify(obj) {
    if (obj === null)		return "null";
    if (_.isUndefined(obj))	return "undefined";
    if (_.isFunction(obj))	return "[Function]";
    if (_.isString(obj))	return obj;
    if (obj.message)		return obj.message; // For Exceptions
    if (_.isArguments(obj))
	return _.toArray(obj).map(stringify).join(": ");
    return nutils.inspect(obj, false, 0).replace(/\n/g, "");
}

module.exports = {

    stringify: stringify,
    inspect: nutils.inspect,
    uid: cutils.uid,

    printStack: function printStack() {
	var err = {};
	Error.captureStackTrace(err, this.printStack);
	this.error(err.stack);
    },

    error: function error() {
	var msg = "ERROR: " + stringify(arguments);
	if (console)
	    console.log(msg);
	nutils.error(msg);

	for (var a in arguments) {
	    if (arguments[a].stack)
		nutils.error(arguments[a].stack);
	}
    },

    log: function log() {
	var msg = stringify(arguments);
	nutils.log(msg);
    },

    debug: function debug() {
	var msg = stringify(arguments);
	nutils.debug(msg);
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
	var formatted = "";
	for (var a in arguments)
            formatted = this.replace('{' + a + '}', arguments[a]);
	return formatted;
    }
});

// Math.mod to deal correctly with negative numbers
Object.defineProperty(Math, 'mod', {
    value: function mod(a, b) {
	return ((a % b) + b) % b;
    }
});
