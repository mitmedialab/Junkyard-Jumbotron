// tests for chaos

var assert = require('assert')
  , db = require('./chaos')('databasetest')

var test = {}

test.hkeys = function() {
  db.del('john', function(err) {
    db.hset('john', 'last name', 'doe', function(err) {  
      db.hget('john', 'last name', function(err, val) {
        assert.equal(null, err)
        assert.equal('doe', val)
      })
    })
  })
  var test_many = {
    'john': 'doe'
  , 'mary': 'loo'
  }
  var test_many_keys = []
  for (var k in test_many) {
    test_many_keys.push(k)
  }
  var test_many_vals = []
  for (var k in test_many) {
    test_many_vals.push(test_many[k])
  }  
  
  db.del('persons', function(err) {
    db.hset('persons', 'john', 'doe', function(err) {
      db.hset('persons', 'mary', 'loo', function(err) {
        db.hgetall('persons', function(err, data) {
          assert.equal(null, err)
          assert.deepEqual(data, test_many)
        })
        db.hkeys('persons', function(err, data) {
          assert.equal(null, err)
          assert.deepEqual(data.sort(), test_many_keys.sort())
        })
        db.hvals('persons', function(err, data) {
          assert.equal(null, err)
          assert.deepEqual(data.sort(), test_many_vals.sort())
        })
      })
    })
  })
  
  db.del('will', function(err) {
    db.hset('will', 'delete', 'now', function(err) {  
      db.hget('will', 'delete', function(err, data) {
        assert.equal(null, err)
        db.hdel('will', 'delete', function(err) {
          db.hget('will', 'delete', function(err, data) {
            assert.notEqual(null, err)
            db.del('will', function() {
              db.hgetall('will', function(err, data) {
                assert.notEqual(null, err)
              })
            })
          })
        })
      })
    })
  })
}

test.watch = function() {
  db.watch('foo', function(err, data) {
    assert.equal('bar', data)
    db.unwatch('foo')
    db.set('foo', 'hey')
  })
  db.set('foo', 'bar')
  db.del('foobar', function(err) {
    db.watch('foobar', function(err, data) {
      //assert.equal(null, err)
      //assert.equal('', data)
      db.unwatch('foobar')
      db.hgetall('foobar', function(err, data) {
        assert.equal(null, err)
        assert.deepEqual({bar: 'bar'}, data)
      })
    })
    db.hset('foobar', 'bar', 'bar', function(err) {
      assert.equal(null, err)
    })
  })
}

test.jkeys = function() {
  db.jset('hello', { foo: 'bar' }, function(err) {
    db.jget('hello', function(err, data) {
      assert.deepEqual(data, { foo: 'bar' })
    })
  })
}

for (var k in test) {
  test[k]()
}
