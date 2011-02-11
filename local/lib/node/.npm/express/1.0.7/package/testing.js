
/**
 * Module dependencies.
 */

var express = require('./')
  , app = express.createServer();


var path = '/Users/tj/downloads/bunny.m4v';

app.get('/movie', function(req, res){
  res.download(path);
});

app.listen(3000);

var http = require('http')
  , client = http.createClient(3000, 'localhost')
  , req = client.request('HEAD', '/movie', { Host: 'localhost', Range: 'bytes=1-100' });

req.on('response', function(res){
  console.log(res.headers);
  res.on('data', function(chunk){
    console.log(chunk.length);
  });
}).end();