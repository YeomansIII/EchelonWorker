/* jshint node: true */
'use strict';

var request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    Queue = require('firebase-queue'),
    firebase = require('firebase'),
    gcm = require('node-gcm');
var app = express();
app.use(bodyParser.json());

firebase.initializeApp({
    serviceAccount: "Echelon-0199929916f3.json",
    databaseURL: "https://flickering-heat-6442.firebaseio.com"
});

var db = firebase.database();

var sender = new gcm.Sender('YOUR_API_KEY_HERE');

var queue;

var env = process.env.EWORKER_ENV;
var prodSecrets = require('./secrets_prod.js');
var devSecrets = require('./secrets_dev.js');

function startInviteQueue() {
    console.log('Starting Firebase GCM Invite Queue');
    var qref = db.ref('queue/invites');
    queue = new Queue(qref, function (data, progress, resolve, reject) {
        // Read and process task data
        console.log(data);
        progress(10);
        if (typeof data.groupName !== 'undefined' && typeof data.inviter !== 'undefined' && typeof data.invitee !== 'undefined') {
            db.ref('users/' + data.invitee + '/devices').once('value', function (snapshot) {
                progress(30);
                var regTokens = [];
                snapshot.forEach(function (device) {
                    regTokens.push(device.val().gcmId);
                });
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
                        body: data.inviter + ' has invited you to join the group "' + data.groupName + '" on Echelon'
                    }
                });

                progress(60);

                sender.send(message, {
                    registrationTokens: regTokens
                }, function (err, response) {
                    if (err) {
                        console.error(err);
                        reject();
                    } else {
                        console.log(response);
                        resolve();
                    }
                });
            });
        } else {
            reject('Proper data not provided');
        }
    });
}

app.get('/spotify-auth/', function (req, res) {
    res.send('This api is meant to be accessed using a POST request.');
});

app.post('/spotify-auth/', function (req, res) {
    var data_json = req.body;
    request({
        headers: {
            "Authorization": "Bearer " + data_json.access_token
        },
        uri: 'https://api.spotify.com/v1/me',
        method: 'GET'
    }, function (err, res2, body) {
        if (err === null) {
            var jbody = JSON.parse(body);
            if (jbody.error === 'undefined' || (jbody.id + '_spotify') !== data_json.uid) {
                res.send('The provided Spotify Access Token is not valid');
            } else {
                var token;
                token = firebase.auth().createCustomToken(data_json.uid, {
                    access_token: data_json.access_token
                });
                if (token !== undefined && token !== null && token !== 'undefined') {
                    res.send(token);
                }
            }
        } else {
            console.log(err);
            res.send('An error has occurred, try again later');
        }
    });
});

if (module === require.main) {
    var server = app.listen(process.env.PORT || 8080, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log('App listening at http://%s:%s', host, port);
        startInviteQueue();
    });
}

module.exports = app;

process.on('SIGINT', function() {
  console.log('Starting queue shutdown');
  queue.shutdown().then(function() {
    console.log('Finished queue shutdown');
    process.exit(0);
  });
});
