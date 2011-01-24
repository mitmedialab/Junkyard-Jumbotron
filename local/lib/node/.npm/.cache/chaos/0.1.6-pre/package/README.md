chaos - a node.js database
==========================

Why chaos? Because we exploit the sha1 chaotic randomness to store the keys evenly in the filesystem.

## NEW VERSION WARNING

This version is incompatible with previous. No longer creates directories, as it turns out
it gets really slow and has no real gain over storing everything in the same directory.
New commands `jset` and `jget` are to be used when you want to store a lot of small values,
they perform better than regular keys and hkeys.

## Installation

    npm install chaos

## Usage

    var db = require('chaos')('your database path')

## Commands

### db.set(key, val, function(err) {})

Sets a key value pair.

### db.get(key, function(err, val) {})

Gets the value of a key.
  
### db.del(key, function(err) {})

Deletes a key.

### db.incr(key, function(err, new_number) {})
### db.decr(key, function(err, new_number) {})

Increment or decrement a key value by 1 and return the new number. If a key doesn't exist or its value isn't a number it will be created starting from 0. Therefore will return 1 or -1 respectively.
  
### db.getset(key, val, function(err, old_val) {})
Get a key value and set another afterwards.
  
### db.getdel(key, function(err, val) {})
Get a key value and delete it afterwards.

### db.getorsetget(key, default_value, function(err, val) {})
Get a key's value or if it doesn't exist, set the value and get it afterwards.
  
### db.hset(hkey, field, val, function(err) {})
Set a hkey field value.

### db.hget(hkey, field, function(err, val) {})
Get the value of a hkey field.

### db.hdel(hkey, field, function(err) {})
Delete a hkey field. 

_Warning:_ This deletes only a field, to delete the hkey itself, use `db.del`.

### db.hgetall(hkey, function(err, field_value_object) {})
Get all field value pairs from a hkey. Returns an object with fields as keys and their values.
  
### db.hkeys(hkey, function(err, fields_array) {})
Get all field names from a hkey. Returns an unsorted array with the field names.

### db.hvals(hkey, function(err, values_array) {})
Get all field values from a hkey. Returns an unsorted array with the field values.

### db.jset(key, val, function(err) {})
Set a jkey value pair.

### db.jget(key, function(err, val) {})
Gets the value of a jkey.

### db.watch(key, [options,] function(err, val) {})
Watch a key for changes and attempt a `db.get`. If options is provided, it is passed on to
`fs.watchFile` and it's an object. The default is `{persistent: true, interval: 0}`.

_Notes:_ This maps to fs.watchFile and thus is not very reliable as to when it's going to fire the callback. Don't trust it will fire on every key change.
Also on hkeys, it fires _only_ when a field is added or removed from the hkey, not when fields change.

### db.unwatch(key)
Stop watching a key.
  
## Future

* More commands
* Better tests
* Optimizations
* Who knows?

Contributions are welcome! :)

## Disclaimer

It's still just a proof of concept, no real life tests are done.

## Questions? 

Find me on Twitter @stagas and IRC freenode.net #node.js as stagas
