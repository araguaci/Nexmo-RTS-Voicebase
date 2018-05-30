require('dotenv').config()

var Nexmo = require('nexmo');
var Promise = require('bluebird');

var executed = false;
var didStart = false
var USER_NUMBER = ""
var WEB_SOCKET = 'ws://' + process.env.WEB_SOCKET_URL + '/socket';

var SMS_TEXT = "View the transcription service here: " + "http://" + process.env.WEB_SOCKET_URL;
var converstationIDs = [];
var connectedUsers = [];

var nexmo = new Nexmo({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    applicationId: process.env.APPLICATION_ID,
    privateKey: __dirname + '/' + process.env.PRIVATE_KEY_PATH
},
    { debug: process.env.NEXMO_DEBUG }
);

var calls = Promise.promisifyAll(nexmo.calls);



const answer = (req, res) =>  { 
    console.log('info', 'answer route called', req.body);
    reset()
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    connectedUsers.push(query.from);
    console.log('debug', 'adding user to sms list', connectedUsers);
    if (process.env.SINGLE_USER) {
        console.log('debug', 'In single user mode');
        var json = [
            {
                "action": "connect",
                "eventUrl": [
                    "http://" + req.headers.host + "/events-ws"
                ],
                "from": process.env.NEXMO_NUMBER,
                "endpoint": [
                    {
                        "type": "websocket",
                        "uri": WEB_SOCKET,
                        "content-type": "audio/l16;rate=16000",
                        "headers": {
                            "app": "audiosocket"
                        }
                    }
                ]
            }
        ]
        console.log('info', 'conference JSON', json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(json));
        return
    }
   
    if (process.env.TO_NUMBER) {
        var json = [
            {
                "action": "talk",
                "text": "Calling user"
            },
            {
                "action": "conversation",
                "name": process.env.CONFERENCE_NAME,
                "endOnExit": "true"
            }
        ]

        var to = {
            type: 'phone',
            number: process.env.TO_NUMBER,
        }
        console.log('info', 'answer JSON', json);
        dial(to, process.env.NEXMO_NUMBER, req.headers.host, function (result) {
            console.log('info', 'dial result', result);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(json));
        })

    } else {
        var baseURL = "http://" + req.headers.host;
        var json = [
            {
                "action": "talk",
                "text": "Please enter a phone number to call, press the pound key when complete",
                "bargeIn": "false"
            },
            {
                "action": "input",
                "submitOnHash": true,
                "timeOut": 60,
                "maxDigits": 20,
                "eventUrl": [baseURL + "/events_ivr"]
            },
            {
                "action": "conversation",
                "name": process.env.CONFERENCE_NAME,
                "endOnExit": "true",
            }
        ]

        console.log('info', 'answer JSON', json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(json));
    }
}


const conference = (req, res) =>  { 
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var json = [
        {
            "action": "talk",
            "text": "Dialing into the conference now",
        },
        {
            "action": "conversation",
            "name": process.env.CONFERENCE_NAME,
            "startOnEnter": "false"
        }
    ]
    console.log('info', 'conference JSON', json);
    // res.send(json)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(json));
}



const events_ivr = (req, res) =>  { 
    console.log('info', 'events_ivr', req.body);

    var baseURL = req.headers.host;
    var number = req.body.dtmf;
    var from = req.body.from;

    USER_NUMBER = number

    if (number == '' || number.length < 11) {
        console.log('debug', 'could not get dtmf number', number);
        var json = [
            {
                "action": "talk",
                "text": "Sorry, I did not get that phone number. Goodbye"
            }
        ]
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(json));
    } else {
        var to = {
            type: 'phone',
            number: number,
        }
        dial(to, process.env.NEXMO_NUMBER, baseURL, function (result) {
            console.log('info', 'IVR Dial result', result);
        })

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(json));
    }

};


const events = (req, res) =>  { 
    console.log('info', 'events', req.body);

    var baseURL = req.headers.host;
    req.body = JSON.parse(req.body);

    var from = req.body.from;

    if (req.body.status == "answered") {
        converstationIDs.push(req.body.uuid);
        console.log('debug', 'adding converstaion uuid', converstationIDs);

        if (req.body.to != process.env.NEXMO_NUMBER && req.body.to != WEB_SOCKET) {
            connectedUsers.push(req.body.to);
            console.log('debug', 'adding user to sms list', connectedUsers);
        }

        if (req.body.to == USER_NUMBER || req.body.to == process.env.TO_NUMBER) {

            var to = {
                type: 'websocket',
                uri: WEB_SOCKET,
                "content-type": "audio/l16;rate=16000",
                "headers": {
                    "app": "audiosocket"
                }
            }
            console.log('debug', 'calling websocket', req.body);
            dial(to, from, baseURL, function (result) {
                console.log('debug', 'called websocket', result);
                sendAllSms(SMS_TEXT, function () {
                    console.log('info', 'all sms sent');
                })
            })
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end();
            return

        }
    }
    else if (req.body.status == "completed") {
        console.log('debug', 'called ended', req.body);
        console.log('debug', 'calling hangup');
        performHangup()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
};

const eventsWS = (req, res) => {
    console.log('eventsWS', req.body);
}

var performHangup = (function () {
    return function () {
        console.log('debug', "executed " + executed + " didStart " + didStart)
        if (!executed && !didStart) {
            didStart = true
            hangupCalls(function () {
                executed = true;
                console.log('info', 'hangup complete');
            })
        }
    };
})();

process.on('unhandledRejection', (reason) => {
    console.log('error', 'unhandledRejection', reason)
});

function dial(to, from, serverURL, callback) {
    var json = {
        to: [to],
        from: {
            type: 'phone',
            number: from
        },
        answer_url: ['http://' + serverURL + '/conference'],
        event_url: ['http://' + serverURL + '/events', 'http://' + process.env.WEB_SOCKET_URL + '/events']
    }
    winston.debug('debug', 'dial JSON', json);
    calls.createAsync(json).then(function (res) {
        console.log('debug', 'call created', res)
        callback(res)
    })
}

function hangupCalls(callback) {
    Promise.each(converstationIDs, function (converstationID) {
        return new Promise(function (resolve, reject) {
            calls.updateAsync(converstationID, { action: 'hangup' })
                .then(function (resp) {
                    setTimeout(function () {
                        console.log('info', 'hangup result: for id: ' + converstationID, resp)
                        resolve();
                    }, 2000)

                })
        });

    })
        .then(function (allItems) {
            console.log('debug', 'all items', allItems)
            callback();
        })
}

function terminate(callback) {
    console.log('debug', 'calling terminate');
    var request = require('request');
    request({
        url: 'http://' + process.env.WEB_SOCKET_URL + '/terminate',
        method: 'POST',
        json: true,
        headers: { 'content-type': 'application/json' },
    }, (err, res, body) => {
        console.log('debug', 'terminate called');
        callback()
    })
}

function sendAllSms(message, callback) {

    Promise.each(connectedUsers, function (phoneNumber) {
        return new Promise(function (resolve, reject) {
            sendSMS(phoneNumber, SMS_TEXT, function (resp) {
                setTimeout(function () {
                    console.log('info', 'sending sms to phoneNumber: ' + phoneNumber, resp)
                    resolve();
                }, 1000)
            })
        });
    })
        .then(function (allItems) {
            console.log('debug', 'all items', allItems)
            callback();
        })
}

function sendSMS(phoneNumber, message, callback) {
    var https = require('https');
    var data = JSON.stringify({
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET,
        to: phoneNumber,
        from: process.env.NEXMO_NUMBER,
        text: message
    });

    var options = {
        host: 'rest.nexmo.com',
        path: '/sms/json',
        port: 443,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    var req = https.request(options);

    req.write(data);
    req.end();

    var responseData = '';
    req.on('response', function (res) {
        res.on('data', function (chunk) {
            responseData += chunk;
        });

        res.on('end', function () {
            callback(JSON.parse(responseData))
        });
    });
}

function reset() {
    connectedUsers.length = 0
    converstationIDs.length = 0;
    executed = false;
    didStart = false
}

module.exports.answer = answer
module.exports.conference = conference
module.exports.events_ivr  = events_ivr
module.exports.events = events
module.exports.eventsWS = eventsWS