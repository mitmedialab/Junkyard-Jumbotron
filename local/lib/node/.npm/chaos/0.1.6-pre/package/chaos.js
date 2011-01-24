/*
 * chaos v0.1.6-pre
 *
 * by stagas
 *
 */
 
var sys
  , fs = require('fs')
  , path = require('path')  
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter

try {
  sys = require('util')
} catch (err) {
  sys = require('sys')
}

var VALID_FILENAME = new RegExp('([^a-zA-Z0-9 ])', 'g')

// to_array from mranney / node_redis
function to_array(args) {
    var len = args.length,
        arr = new Array(len), i;

    for (i = 0; i < len; i += 1) {
        arr[i] = args[i];
    }

    return arr;
}

// creationix's fast Queue
var Queue = function() {
  this.tail = [];
  this.head = to_array(arguments);
  this.offset = 0;
  // Lock the object down
  Object.seal(this);
}

Queue.prototype = {
  shift: function shift() {
    if (this.offset === this.head.length) {
      var tmp = this.head;
      tmp.length = 0;
      this.head = this.tail;
      this.tail = tmp;
      this.offset = 0;
      if (this.head.length === 0) return;
    }
    return this.head[this.offset++];
  },
  push: function push(item) {
    return this.tail.push(item);
  },
  get length() {
    return this.head.length - this.offset + this.tail.length;
  }
}

var Chaos = exports.Chaos = function(dbName) {
  if (!(this instanceof Chaos)) return new Chaos(dbName)

  EventEmitter.call(this)
  
  var self = this
  this.version = 'v0.1.6-pre'
  this.dbName = dbName
  this.ready = false
  
  path.exists(this.dbName, function(exists) {
    if (!exists) {
      self.__createDB(self.dbName)
    } else {
      self.ready = true
    }
  })

  this.__hashAlgo = 'sha1'
  this.__hashEnc = 'hex'

  this.maxOpenFiles = 30
  this.__openFiles = 0

  this.__queue__ = new Queue()
  this.__queued = false
 
  this.__busy__ = {}

  this.on('queue', function() {
    if (!self.__queued) {
      self.__queued = true
      self.__flush()
    }
  })
}

sys.inherits(Chaos, EventEmitter)
Chaos.Chaos = Chaos
module.exports = Chaos

Chaos.prototype.__busy = function(key) {
  this.__openFiles++
  this.__busy__[key] = true
}

Chaos.prototype.__free = function(key) {
  this.__openFiles--
  delete this.__busy__[key]
}

Chaos.prototype.__createDB = function(dir) {
  var self = this

  fs.mkdirSync(dir, 0777)
  self.ready = true
}

Chaos.prototype.__hash = function(key) {
  return crypto.createHash(this.__hashAlgo).update(key).digest(this.__hashEnc)
}

Chaos.prototype.__queue = function(a, b) {
  this.__queue__.push([a, b])
  
  this.emit('queue')
}

Chaos.prototype.__flush = function() {
  var oper

  if (this.__queue__.length) {
    if (this.ready && this.__openFiles < this.maxOpenFiles) {
      oper = this.__queue__.shift()
      this[oper[0]].apply(this, oper[1])
    }

    var self = this
    
    process.nextTick(function() {
      self.__flush()
    })
  } else {
    this.__queued = false
  }
}

Chaos.prototype.__rmdir = function(dirname, cb) {
  fs.readdir(dirname, function(err, files) {
    if (err) {
      if (cb) cb(err)
      return
    }

    var counter = files.length
    if (!counter) {
      fs.rmdir(dirname, cb)
      return
    }

    dirname += '/'

    for (var i=files.length; i--; ) {
      ;(function(file) {
        fs.unlink(dirname + file, function(err) {
          if (!--counter && cb) {
            fs.rmdir(dirname, cb)
          }
        })
      }(files[i]))
    }
  })
}

// COMMANDS

Chaos.prototype._set = function(key, val, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.set(key, val, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  if (typeof val != 'string') val = val.toString()

  this.__busy(key)
  
  fs.writeFile(filename, val, 'utf8', function(err) {
    self.__free(key)

    if (cb) cb(err)
  })
}

Chaos.prototype._get = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.get(key, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  this.__busy(key)

  fs.readFile(filename, 'utf8', function(err, data) {
    self.__free(key)
    if (cb) cb(err, data)
  })
}

Chaos.prototype._del = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.del(key, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)

  fs.stat(filename, function(err, stats) {
    if (err) {
      self.__free(key)
      if (cb) cb(err)
      return
    }
    if (stats.isFile()) {
      fs.unlink(filename, function(err) {
        self.__free(key)
        if (cb) cb(err)
      })
    } else if (stats.isDirectory()) {
      self.__rmdir(filename, function(err) {
        self.__free(key)
        if (cb) cb(err)
      })
    } else {
      self.__free(key)
      if (cb) cb(err)
    }
  })
}

Chaos.prototype._getset = function(key, val, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.getset(key, val, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  this.__busy(key)

  fs.readFile(filename, 'utf8', function(err, data) {
    if (typeof val != 'string') val = val.toString()
  
    fs.writeFile(filename, val, 'utf8', function(err) {
      self.__free(key)
      if (cb) cb(err, data)
    })
  })
}

Chaos.prototype._getdel = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.getdel(key, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  this.__busy(key)
  
  fs.readFile(filename, function(err, data) {
    fs.unlink(filename, function(err) {
      self.__free(key)
      if (cb) cb(err, data)
    })
  })
}

Chaos.prototype._getorsetget = function(key, val, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.getorsetget(key, val, cb)

  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  this.__busy(key)
  
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      if (typeof val != 'string') val = val.toString()

      fs.writeFile(filename, val, 'utf8', function(err) {
        self.__free(key)
        if (cb) cb(err, val)
      })
    } else {
      self.__free(key)
      if (cb) cb(err, data)
    }
  })
}

Chaos.prototype._incr = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.incr(key, cb)
  
  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)

  var num = 0
  fs.readFile(filename, 'utf8', function(err, data) {
    if (!err) {
      num = parseInt(data, 10)
      if (isNaN(num)) num = 0
    }
    
    num++
    
    fs.writeFile(filename, num.toString(), 'utf8', function(err) {
      self.__free(key)
      if (cb) cb(err, num)
    })
  })
}

Chaos.prototype._decr = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.decr(key, cb)
  
  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)

  var num = 0
  fs.readFile(filename, 'utf8', function(err, data) {
    if (!err) {
      num = parseInt(data, 10)
      if (isNaN(num)) num = 0
    }
    
    num--
    
    fs.writeFile(filename, num.toString(), 'utf8', function(err) {
      self.__free(key)
      if (cb) cb(err, num)
    })
  })
}

Chaos.prototype._hset = function(key, field, val, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hset(key, field, val, cb)
  
  if (typeof field != 'string') field = field.toString()
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)
    , filename = field.toString().replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }

  if (typeof val != 'string') val = val.toString()
  
  filename = dirname +'/'+ filename

  this.__busy(key)
  
  fs.mkdir(dirname, 0777, function(err) {
    fs.writeFile(filename, val, 'utf8', function(err) {
      self.__free(key)
      if (cb) cb(err)
    })
  })
}

Chaos.prototype._hget = function(key, field, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hget(key, field, cb)
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)
    , filename = field.toString().replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }
  
  filename = dirname +'/'+ filename

  this.__busy(key)
  
  fs.readFile(filename, 'utf8', function(err, data) {
    self.__free(key)
    if (cb) cb(err, data)
  })
}

Chaos.prototype._hdel = function(key, field, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hdel(key, field, cb)

  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)
    , filename = field.toString().replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }

  filename = dirname +'/'+ filename
  
  this.__busy(key)

  fs.unlink(filename, function(err) {
    self.__free(key)
    if (cb) cb(err)
  })
}

Chaos.prototype._hgetall = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hgetall(key, cb)
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)
  
  fs.readdir(dirname, function(err, files) {
    if (err) {
      self.__free(key)
      if (cb) cb(err)
      return
    }
    
    var counter = files.length
      , keyvals = {}
    
    if (!counter) {
      self.__free(key)
      return cb && cb(null, keyvals)
    }
    
    dirname += '/'
    
    for (var i=files.length; i--; ) {
      ;(function(file) {
        fs.readFile(dirname + file, 'utf8', function(err, data) {
          if (!err) keyvals[file] = data
          if (!--counter) {
            self.__free(key)
            cb && cb(null, keyvals)
          }
        })
      }(files[i]))
    }
  })
}

Chaos.prototype._hkeys = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hkeys(key, cb)
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)
  
  fs.readdir(dirname, function(err, files) {
    self.__free(key)
    if (cb) cb(err, files)
  })
}

Chaos.prototype._hrand = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hrand(key, cb)
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)
  
  fs.readdir(dirname, function(err, files) {
    self.__free(key)
    
    if (files.length) {
      var f = files[ Math.floor(Math.random() * files.length) ]
      return self.hget(key, f, cb)
    }
    
    if (cb) cb(err, null)
  })
}

Chaos.prototype._hvals = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.hvals(key, cb)
  
  var self = this
    , dirname = self.dbName +'/'+ this.__hash(key)

  this.__busy(key)
  
  fs.readdir(dirname, function(err, files) {
    if (err) {
      self.__free(key)
      if (cb) cb(err)
      return
    }
  
    var counter = files.length
      , vals = []
  
    dirname += '/'
    
    for (var i=files.length; i--; ) {
      ;(function(file) {
        fs.readFile(dirname + file, 'utf8', function(err, data) {
          if (!err) vals.push(data)
          if (!--counter && cb) {
            self.__free(key)
            cb(null, vals)
          }
        })
      }(files[i]))
    }
  })
}

Chaos.prototype.__append = function(filename, key, val, cb) {
  var buf = new Buffer(key + '\t' + JSON.stringify(val) + '\n')
  fs.open(filename, 'a+', 0777, function(err, fd) {
    fs.write(fd, buf, 0, buf.length, null, function(err, written) {
      fs.close(fd, cb)
    })
  })
}

Chaos.prototype._jset = function(key, val, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.jset(key, val, cb)

  var self = this
    , hash = this.__hash(key)
    , filename = self.dbName +'/'+ hash.substr(0, 3)
    
  this.__busy(key)
  
  this.__append(filename, key, val, function(err) {
    self.__free(key)
    
    if (cb) cb(err)
  })
}

Chaos.prototype._jget = function(key, cb) {
  if (typeof this.__busy__[key] != 'undefined') return this.jget(key, cb)

  var self = this
    , hash = this.__hash(key)
    , filename = self.dbName +'/'+ hash.substr(0, 3)
  
  this.__busy(key)
  
  var found = false
    , val = null
    , buffer = ''

  // this is loosely based on felixge's node-dirty (MIT LICENCED)

  var rs = fs.createReadStream(filename, {
    encoding: 'utf8'
  , flags: 'r'
  })
  
  rs.on('error', function(err) {
    self.__free(key)
    rs.destroy()
    if (cb) cb(err)
  })
  
  rs.on('data', function(chunk) {
    buffer += chunk
    buffer = buffer.replace(/([^\n]+)\n/g, function(m, rowStr) {
      var tabIndex = rowStr.indexOf('\t')
        , rowKey = rowStr.substring(0, tabIndex)

      if (rowKey != key) return ''
      
      var rowJson = rowStr.substring(tabIndex + 1)
        , rowVal
        
      try {
        val = JSON.parse(rowJson)
      } catch(err) {
        val = null
        return ''
      }
      
      found = true

      return ''
    })
  })
  
  rs.on('end', function() {
    self.__free(key)
    cb(null, val)
  })
}

Chaos.prototype._watch = function(key, opts, cb) {
  if (typeof opts == 'function') cb = opts, opts = {}
  
  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)

  fs.watchFile(filename, opts, function(curr, prev) {
    self.get(key, cb)
  })
}

Chaos.prototype._unwatch = function(key) {
  var self = this
    , filename = self.dbName +'/'+ this.__hash(key)
  
  fs.unwatchFile(filename)
}

;[ 'get', 'set', 'del'
 , 'getset', 'getdel', 'getorsetget'
 , 'incr', 'decr' 
 , 'hset', 'hget', 'hdel', 'hrand', 'hgetall', 'hkeys', 'hvals'
 , 'jset', 'jget',
 , 'watch', 'unwatch'
 ].forEach(function(command) {
  Chaos.prototype[command] = function() {
    this.__queue('_' + command, to_array(arguments))
  }
})
