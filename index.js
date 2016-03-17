var request = require('request');
var express = require('express');
var app = express();

app.get('/spotify-auth/', function(req, res) {
  res.send('This api is meant to be accessed using a POST request.');
});

app.post('/spotify-auth/', function(req, res) {
  data_json = JSON.parse(req.body);

  request({
    headers: {
      "Authorization": "Bearer " + data_json.access_token
    },
    uri: 'https://api.spotify.com/v1/me',
    method: 'GET'
  }, function(err, res, body) {
    console.log(body);
  });

  res.send('Good job');
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
