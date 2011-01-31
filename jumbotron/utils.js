// ----------------------------------------------------------------------
// Utilities, some mirrored from node.js, connect, underscore, and string

var nutils = require('util');
var cutils = require('connect/utils');
var _  = require('underscore');
_.mixin(require('underscore.string'));

// Return string version of an object
function stringify(obj) {
    if (_.isFunction(obj))	return "[Function]";
    if (_.isString(obj))	return obj;
    if (obj.message)		return obj.message; // For Exceptions
    if (_.isArguments(obj))
	return _.toArray(obj).map(stringify).join(": ");
    return nutils.inspect(obj, false, 0, false).replace(/\n|( ) */g, '$1');
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// Feb 26 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
}

module.exports = {

    stringify: stringify,
    inspect: nutils.inspect,
    uid: cutils.uid,

    stack: function stack() {
	var err = {};
	Error.captureStackTrace(err, this.printStack);
	return err.stack;
    },

    error: function error() {
	var msg = [timestamp(), "ERROR", stringify(arguments)].join(': ');
	nutils.error(msg);
	for (var a in arguments) {
	    if (arguments[a].stack)
		nutils.error(arguments[a].stack);
	}
    },

    log: function log() {
	var msg = [timestamp(), stringify(arguments)].join(': ');
	nutils.puts(msg);	// asynchronous
    },

    debug: function debug() {
	var msg = [timestamp(), stringify(arguments)].join(': ');
	nutils.error(msg);	// synchronous
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
