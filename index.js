var request = require('request'),
  express = require('express'),
  Queue = require('firebase-queue'),
  Firebase = require('firebase');
var app = express();


function startQueue() {
  console.log('Starting Firebase GCM Queue');
  var ref = new Firebase('https://<your-firebase>.firebaseio.com/queue');
  var queue = new Queue(ref, function(data, progress, resolve, reject) {
    // Read and process task data
    console.log(data);

    // Do some work
    progress(50);

    // Finish the task asynchronously
    setTimeout(function() {
      resolve();
    }, 1000);
  });
}


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
  console.log('Echelon API listening on port 3000!');
  startQueue();
});
