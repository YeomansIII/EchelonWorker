/* jshint node: true */
'use strict';

var request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    Queue = require('firebase-queue'),
    firebase = require('firebase'),
    FCM = require('fcm-node');
var app = express();
app.use(bodyParser.json());

firebase.initializeApp({
    serviceAccount: "Echelon-0199929916f3.json",
    databaseURL: "https://flickering-heat-6442.firebaseio.com"
});

var db = firebase.database();

var serverKey = 'AIzaSyAf9V9Nsx5qG2BFzQYzMzokMFULNt0j8VI';
var fcm = new FCM(serverKey);

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
        if (typeof data.group_name !== 'undefined' && typeof data.inviter !== 'undefined' && typeof data.invitee !== 'undefined') {
            db.ref('users/' + data.invitee + '/devices').once('value', function (snapshot) {
                progress(30);
                var regTokens = [];
                snapshot.forEach(function (device) {
                    regTokens.push(device.val().messagingId);
                });
                var message = {
                    registration_ids: regTokens,
                    collapse_key: 'invite',
                    priority: 'high',
                    content_available: true,
                    delay_while_idle: true,
                    time_to_live: 10000,
                    restricted_package_name: "io.yeomans.echelon",
                    data: {
                        join_group: true,
                        group_name: data.group_name,
                        inviter: data.inviter,
                        inviter_display_name: data.inviter_display_name,
                        invitee: data.invitee
                    },
                    notification: {
                        title: 'Echelon Invite',
                        icon: "ic_launcher",
                        body: data.inviter_display_name + ' has invited you to join the group "' + data.group_name + '" on Echelon'
                    }
                };

                progress(60);

                console.log('Reg Tokens: ', regTokens);

                fcm.send(message, function (err, response) {
                    if (err) {
                        console.error('Error: ', err);
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
app.options('/spotify-auth/', function (req, res) {
    var data_json = req.body;
    console.log(data_json);
    if (data_json.development) {
        res.header('Access-Control-Allow-Origin', 'localhost:9000');
    } else {
        res.header('Access-Control-Allow-Origin', 'echelonapp.io');
    }
    res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
});

app.get('/spotify-auth/', function (req, res) {
    var data_json = req.body;
    console.log(data_json);
    if (data_json.development) {
        res.header('Access-Control-Allow-Origin', 'localhost:9000');
    } else {
        res.header('Access-Control-Allow-Origin', 'echelonapp.io');
    }
    res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
});

app.post('/spotify-auth/', function (req, res) {
    var data_json = req.body;
    console.log(data_json);
    if (data_json.development) {
        res.header('Access-Control-Allow-Origin', 'localhost:9000');
    } else {
        res.header('Access-Control-Allow-Origin', 'echelonapp.io');
    }
    res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    request({
        headers: {
            "Authorization": "Bearer " + data_json.access_token
        },
        uri: 'https://api.spotify.com/v1/me',
        method: 'GET'
    }, function (err, res2, body) {
        if (err === null) {
            var jbody = JSON.parse(body);
            console.log(jbody);
            if (jbody.error === 'undefined' || (jbody.id + '_spotify') !== data_json.uid) {
                res.send({error: 'Provided Spotify Auth Token is not valid'});
            } else {
                var token;
                token = firebase.auth().createCustomToken(data_json.uid, {
                    access_token: data_json.access_token
                });
                if (token !== undefined && token !== null && token !== 'undefined') {
                    res.send({token: token});
                }
            }
        } else {
            console.log(err);
            res.send({error: 'An error has occurred, try again later'});
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

process.on('SIGINT', function () {
    console.log('Starting queue shutdown');
    queue.shutdown().then(function () {
        console.log('Finished queue shutdown');
        process.exit(0);
    });
});
