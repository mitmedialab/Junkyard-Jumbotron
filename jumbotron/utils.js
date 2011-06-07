// ----------------------------------------------------------------------
// Utilities, some mirrored from node.js, connect, underscore, and string

var os = require('os');
var path = require('path');
var exec = require('child_process').exec;
var log4js = require('log4js')();
var logger = log4js.getLogger();
var nutils = require('util');
var params = require('./params');
var _  = require('underscore');

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

function timeToString(ms) {
    if (ms <= 0)
	return "never";
    var date = new Date(ms);
    return [date.getMonth() + 1, date.getDate()].join('/');
}

function spanToString(ms) {
    if (ms <= 0)
	return "never";
    var d = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (d) return d + ' days';
    var h = Math.floor(ms / (1000 * 60 * 60));
    if (h) return h + ' hrs';
    var m = Math.floor(ms / (1000 * 60));
    if (m) return m + ' mins';
    var s = Math.floor(ms / 1000);
    if (s) return s + ' secs';
    return ms + ' ms';
}

function osStatsToString(stats) {
    return ('Uptime: {0}, Disk: {1}%, Memory: {2}%, Load: {3}%'.format
	    (stats.uptime, stats.diskUsage, stats.memUsage, stats.loadAvg));
}

var _lastLevel;
var _lastMessage = null;
var _lastMessageCount = 0;
function _log(level, message) {
    if (level == _lastLevel && message == _lastMessage) {
	_lastMessageCount++;
	return false;
    }

    if (_lastMessageCount) 
	logger.log(_lastLevel, _lastMessage + '[X' + _lastMessageCount + ']');
    _lastLevel = level;
    _lastMessage = message;
    _lastMessageCount = 0;
    logger.log(level, message);
    return true;
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
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charlen = chars.length;
	var buf = [];
	for (var i = 0; i < len; ++i)
	    buf.push(chars[Math.floor(Math.random() * charlen)]);
	return buf.join('');
    },

    error: function error() {
	if (_log(log4js.levels.ERROR, "ERROR: " + stringify(arguments))) {
	    for (var a in arguments) {
		var arg = arguments[a];
		if (arg && arg.stack)
		    logger.error(arg.stack);
	    }
	}
    },

    info: function info() {
	_log(log4js.levels.INFO, stringify(arguments));
    },

    debug: function debug() {
	if (logger.isLevelEnabled(log4js.levels.DEBUG))
	    _log(log4js.levels.DEBUG, stringify(arguments));
    },

    trace: function trace() {
	if (logger.isLevelEnabled(log4js.levels.TRACE))
	    _log(log4js.levels.TRACE, stringify(arguments));
    },

    timeToString: timeToString,
    spanToString: spanToString,
    osStatsToString: osStatsToString,

    osStats: function osStats(cb) {
	exec("df -h ~", function(err, stdout, stderr) {
	    var diskUsage = ! err && stdout && stdout.match(/([0-9]+)%/);

	    var stats = {
		uptime:
		  spanToString(os.uptime() * 1000),

		loadAvg: 
		  Math.round(100 * os.loadavg()[1]),

		memUsage: 
		  Math.round(100 * os.freemem() / os.totalmem()),

		diskUsage:
		  diskUsage ? diskUsage[1] : stderr
	    };
	    cb(stats);
	});
    },

    inherits: function inherits(superCtor, props) { 
	var prototype = Object.create(superCtor.prototype);
	prototype._super = superCtor;
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
    },
    
    // copied from underscore.strings
    isStartsWith: function(str, starts){
	return str.length >= starts.length && str.substring(0, starts.length) === starts;
    },

    // copied from underscore.strings
    sprintf: function(){

	var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
	while (f) {
	    if ((m = /^[^\x25]+/.exec(f))) {
		o.push(m[0]);
	    }
	    else if ((m = /^\x25{2}/.exec(f))) {
		o.push('%');
	    }
	    else if ((m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f))) {
                if (((a = arguments[m[1] || i++]) === null) || (a === undefined)) {
		    throw('Too few arguments.');
		}
		if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
		    throw('Expecting number but found ' + typeof(a));
		}
		switch (m[7]) {
		case 'b': a = a.toString(2); break;
		case 'c': a = String.fromCharCode(a); break;
		case 'd': a = parseInt(a); break;
		case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
		case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
		case 'o': a = a.toString(8); break;
		case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
		case 'u': a = Math.abs(a); break;
		case 'x': a = a.toString(16); break;
		case 'X': a = a.toString(16).toUpperCase(); break;
		}
		a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+'+ a : a);
		c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
		x = m[5] - String(a).length - s.length;
		p = m[5] ? this.str_repeat(c, x) : '';
		o.push(s + (m[4] ? a + p : p + a));
	    }
	    else {
		throw('Huh ?!');
	    }
	    f = f.substring(m[0].length);
	}
	return o.join('');
    },

    str_repeat: function (i, m) {
	var o = [];
	while (--m >= 0)
	    o[m] = i;
        return o.join('');
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
