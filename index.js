var request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser'),
  Queue = require('firebase-queue'),
  Firebase = require('firebase'),
  gcm = require('node-gcm'),
  FirebaseTokenGenerator = require('firebase-token-generator');
var app = express();
app.use(bodyParser.json());

var sender = new gcm.Sender('YOUR_API_KEY_HERE');

var tokenGenerator;
var queue;

if (process.argv.indexOf('development') > 1) {
  console.log(process.env.WORKER_DEV_FIRE_TOKEN);
  tokenGenerator = new FirebaseTokenGenerator(process.env.WORKER_DEV_FIRE_TOKEN);
} else {
  tokenGenerator = new FirebaseTokenGenerator(process.env.WORKER_PROD_FIRE_TOKEN);
}

function startInviteQueue() {
  console.log('Starting Firebase GCM Invite Queue');
  var ref = new Firebase('https://flickering-heat-6442.firebaseio.com/queue/invite');
  queue = new Queue(ref, function(data, progress, resolve, reject) {
    // Read and process task data
    console.log(data);
    progress(10);

    if (typeof data.groupName !== 'undefined' && typeof data.inviter !== 'undefined' && typeof data.inviter !== 'undefined') {

      var message = new gcm.Message({
        collapseKey: 'invite',
        priority: 'high',
        contentAvailable: true,
        delayWhileIdle: true,
        timeToLive: 3,
        restrictedPackageName: "io.yeomans.echelon",
        dryRun: true,
        data: {
          groupName: data.groupName,
          inviter: data.inviter,
          invitee: data.invitee
        },
        notification: {
          title: 'Echelon Invite',
          icon: "ic_launcher",
          body: "This is a notification that will be displayed ASAP."
        }
      });

      var regTokens = ['YOUR_REG_TOKEN_HERE'];

      progress(50);

      sender.send(message, {
        registrationTokens: regTokens
      }, function(err, response) {
        if (err) {
          console.error(err);
          reject();
        } else {
          console.log(response);
          resolve();
        }
      });
    } else {
      reject('Proper data not provided');
    }
  });
}

app.get('/spotify-auth/', function(req, res) {
  res.send('This api is meant to be accessed using a POST request.');
});

app.post('/spotify-auth/', function(req, res) {
  data_json = req.body;
  request({
    headers: {
      "Authorization": "Bearer " + data_json.access_token
    },
    uri: 'https://api.spotify.com/v1/me',
    method: 'GET'
  }, function(err, res2, body) {
    if (err !== null) {
      jbody = JSON.parse(body);
      if (jbody.error === 'undefined' || (jbody.id + '_spotify') !== data_json.uid) {
        res.send('The provided Spotify Access Token is not valid');
      } else {
        var token = tokenGenerator.createToken({
          uid: data_json.uid,
          access_token: data_json.access_token
        });
        res.send(token);
      }
    } else {
      res.send('And error has occurred, try again later');
    }
  });
});

app.listen(3002, function() {
  console.log('Echelon API listening on port 3002!');
  startInviteQueue();
});

process.on('SIGINT', function() {
  console.log('Starting queue shutdown');
  queue.shutdown().then(function() {
    console.log('Finished queue shutdown');
    process.exit(0);
  });
});
