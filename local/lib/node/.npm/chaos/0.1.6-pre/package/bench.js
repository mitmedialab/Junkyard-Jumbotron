// bench for chaos

var db = require('./chaos')('benchtest')
  , assert = require('assert')

var best = {writes: 0, hwrites:0, jwrites:0, reads: 0, hreads: 0, jreads: 0 }
  , avg = {writes: 0, writesCnt: 0, hwrites: 0, hwritesCnt: 0, jwrites: 0, jwritesCnt: 0
          , reads: 0, readsCnt: 0, hreads: 0, hreadsCnt: 0, jreads:0, jreadsCnt: 0
          }

db.maxOpenFiles = 30
  
var big = []
for (var i=1000; i--; ) {
  big.push(i)
}

var objects = [
  JSON.stringify('tiny')
  
, JSON.stringify('hello I am a medium sized string')

, JSON.stringify({
    there: 'is'
  , only: 'chaos'
  , butterfly: ['says', ['there', 'is', 'only', 'chaos']]
  , pi: Math.PI  
  })
  
, JSON.stringify({
    there: 'is'
  , only: 'chaos'
  , butterfly: ['says', ['there', 'is', 'only', 'chaos']]
  , pi: Math.PI
  , big: big
  })
]

function bench(obj, what, num, cb) {
  console.log(' obj length:', obj.length)
  console.log(' operations:', num)
  console.log('-------------------')
  
  switch (what) {
    case 'all':
      sets(obj, num, function() {
        gets(obj, num, function() {
          hsets(obj, num, function() {
            hgets(obj, num, function() {
              jsets(JSON.parse(obj), num, function() {
                jgets(JSON.parse(obj), num, function() {
                  console.log('')
                  cb()
                })
              })
            })
          })
        })
      })
      break
    case 'sets':
      sets(obj, num, function() {
        console.log('')
        cb()
      })
      break
    case 'gets':
      gets(obj, num, function() {
        console.log('')
        cb()
      })
      break
    case 'hsets':
      hsets(obj, num, function() {
        console.log('')
        cb()
      })
      break
    case 'hgets':
      hgets(obj, num, function() {
        console.log('')
        cb()
      })
      break      
    case 'jsets':
      jsets(JSON.parse(obj), num, function() {
        console.log('')
        cb()
      })
      break
    case 'jgets':
      jgets(JSON.parse(obj), num, function() {
        console.log('')
        cb()
      })
      break      
    default:
      cb()
      break
  }
}

function sets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.set(i, obj, function(err) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.writes) best.writes = result
        avg.writes += result
        avg.writesCnt += 1
        console.log('writes:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

function gets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.get(i, function(err, data) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.reads) best.reads = result
        avg.reads += result
        avg.readsCnt += 1
        console.log('reads:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

function hsets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.hset('hkey', i, obj, function(err) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.hwrites) best.hwrites = result
        avg.hwrites += result
        avg.hwritesCnt += 1
        console.log('hkey writes:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

function hgets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.hget('hkey', i, function(err, data) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.hreads) best.hreads = result
        avg.hreads += result
        avg.hreadsCnt += 1
        console.log('hkey reads:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

function jsets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.jset(i, obj, function(err) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.jwrites) best.jwrites = result
        avg.jwrites += result
        avg.jwritesCnt += 1
        console.log('jkey writes:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

function jgets(obj, num, cb) {
  var done = 0
    , clients = 0
    , timer = new Date()

  for (var i=num; i--; ) {
    db.jget(i, function(err, data) {
      done++
      if (done === num) {
        var result = ( (num) / ((new Date() - timer) / 1000))
        if (result > best.jreads) best.jreads = result
        avg.jreads += result
        avg.jreadsCnt += 1
        console.log('jkey reads:', result.toFixed(2) + '/s')
        cb()
      }
    })
  }
}

var scenario = [

  ['all', 2000]
, ['all', 2000]
//, ['all', 1000]
//, ['all', 2000]
//, ['sets', 5000]
//, ['sets', 10000]

//, ['gets', 5000]
//, ['gets', 10000]

]

var scenarioLen = scenario.length

var next = function(i, o) {
  if (i < scenarioLen) {
    bench(objects[o], scenario[i][0], scenario[i][1], function() {
      setTimeout(function() {
        next(++i, o)
      }, scenario[i][1] / 3) // give some time for the hd to breath
    })
  } else {
    o++
    if (o===objects.length) {
      console.log('---------------------')
      console.log('version:', db.version)
      console.log('max open files:', db.maxOpenFiles)
      console.log('')
      console.log('best writes:', best.writes.toFixed(2) + '/s')
      console.log('best hkey writes:', best.hwrites.toFixed(2) + '/s')
      console.log('best jkey writes:', best.jwrites.toFixed(2) + '/s')
      console.log('best reads:', best.reads.toFixed(2) + '/s')
      console.log('best hkey reads:', best.hreads.toFixed(2) + '/s')
      console.log('best jkey reads:', best.jreads.toFixed(2) + '/s')
      console.log('avg writes:', (avg.writes / avg.writesCnt).toFixed(2) + '/s')
      console.log('avg hwrites:', (avg.hwrites / avg.hwritesCnt).toFixed(2) + '/s')
      console.log('avg jwrites:', (avg.jwrites / avg.jwritesCnt).toFixed(2) + '/s')
      console.log('avg reads:', (avg.reads / avg.readsCnt).toFixed(2) + '/s')
      console.log('avg hreads:', (avg.hreads / avg.hreadsCnt).toFixed(2) + '/s')
      console.log('avg jreads:', (avg.jreads / avg.jreadsCnt).toFixed(2) + '/s')
      console.log('---------------------')
      console.log('')
      console.log('all done!')
    } else {
      next(0, o)
    }
  }
}

var consistency = function(cb) {
  var done = 0
    , num = 100
  
  console.log('writes...')
  for (var i=num; i--; ) {
    db.set(i, '1234567890', function(err) {
      done++
      if (done===num) {
        done = 0
        console.log('reads...')
        for (var i=num; i--; ) {
          db.get(i, function(err, data) {
            done++
            assert.equal(data, '1234567890', 'Consistency error!')
            if (done===num) {
              doesitwork(cb)
            }
          })
        }
      }
    })
  }
}

var doesitwork = function(cb) {
  var cnt = 0
    , max = 6
    
  var cntincr = 0
  db.del('incr', function(err) {
    for (var i=50; i--; ) {
      db.incr('incr', function(err, number) {
        cntincr++
        if (cntincr == 50) {
          console.log('incr test:', number)
          cnt++
          if (cnt === max) cb()
        }
      })
    }
  })
  var cntdecr = 0
  db.del('decr', function(err) {
    for (var i=50; i--; ) {
      db.decr('decr', function(err, number) {
        cntdecr++
        if (cntdecr == 50) {
          console.log('decr test:', number)
          cnt++
          if (cnt === max) cb()
        }
      })
    }
  })
  db.getorsetget('getorsetget', 'ok', function(err, data) {
    cnt++
    console.log('getorsetget:', 'ok')
    if (cnt === max) cb()    
  })
  db.set('getset', 'hello', function(err) {
    db.getset('getset', 'world', function(err, data) {
      cnt++
      console.log('getset:', data)
      if (cnt === max) cb()      
    })
  })
  db.set('getdel', 'hello', function(err) {
    db.getdel('getdel', function(err, data) {
      db.get('getdel', function(err, data2) {
        cnt++
        console.log('getdel:', data, data2)
        if (cnt === max) cb()
      })
    })
  })
  
  var cntmass = 0
  for (var i=50; i--;) {
    db.set('mass', 'writes', function(err) {
      cntmass++
      if (err) throw err
      if (cntmass===50) {
        db.get('mass', function(err, data) {
          console.log('mass:', data)
          cnt++
          if (cnt === max) cb()
        })
      }
    })
  }
}

var start = function() {
  if (!db.ready) {
    setTimeout(function() { start() }, 1000)
  } else {
    console.log('checking consistency...')
    consistency(function() {
      console.log('done.')
      console.log('=====================')
      console.log('benchmark starting...')
      console.log('')
      next(0, 0)
    })
  }
}

start()
