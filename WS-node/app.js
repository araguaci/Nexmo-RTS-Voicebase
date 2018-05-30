
require('dotenv').config()

var WebSocketServer = require('websocket').server;

var http = require('http');
var HttpDispatcher = require('httpdispatcher');
var nexmoApp = require('./nexmo-app')
var dispatcher     = new HttpDispatcher();
const fs = require('fs');
const winston = require('winston')
winston.level = 'silly'
var AsrClient = require('./lib/asrClient')
var asrActive = false
var myAsrClient;
var engineStartedMs;
var connections = []

//Create a server
var server = http.createServer(function(req, res) {
    handleRequest(req,res);
});

// Loading socket.io
var io = require('socket.io').listen(server);

// When a client connects, we note it in the console
io.sockets.on('connection', function (socket) {
    console.log('info','A client is connected!');
});


var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true,
    binaryType: 'arraybuffer'
});


//Lets use our dispatcher
function handleRequest(request, response){
    try {
        //log the request on console
        console.log('info', 'handleRequest',request.url);
        //Dispatch
        dispatcher.dispatch(request, response);
    } catch(err) {
        console.log(err);
    }
}
dispatcher.setStatic('/public');
dispatcher.setStaticDirname('public');
dispatcher.onGet("/", function(req, res) {
  console.log('info', 'loading index');
  console.log('info', 'port', process.env.PORT)
   fs.readFile('./public/index.html', 'utf-8', function(error, content) {
        console.log('debug', 'loading Index');
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});
// Serve the ncco
dispatcher.onGet("/ncco", function(req, res) {
    fs.readFile('./ncco.json', function(error, data) {
        console.log('debug', 'loading ncco');
       res.writeHead(200, { 'Content-Type': 'application/json' });
       res.end(data, 'utf-8');
    });
});

dispatcher.onPost("/terminate", function(req, res) {
     console.log('info', 'terminate called');
     wsServer.closeAllConnections();
  
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
});


dispatcher.onGet("/answer", function(req, res) {
    return nexmoApp.answer(req, res)

});

dispatcher.onGet("/conference", function(req, res) {
    return nexmoApp.conference(req, res)
});

dispatcher.onGet("/events_ivr", function(req, res) {
    return nexmoApp.events_ivr(req, res)
});

dispatcher.onPost("/events", function(req, res) {
    return nexmoApp.events(req, res)
});

dispatcher.onPost("/events-ws", function(req, res) {
    return nexmoApp.eventsWS(req, res)
});

  

wsServer.on('connect', function(connection) {
    connections.push(connection);

    console.log('info', (new Date()) + ' Connection accepted' + ' - Protocol Version ' + connection.webSocketVersion);
    connection.on('message', function(message) {

        if (message.type === 'utf8') {
            try {
              var json = JSON.parse(message.utf8Data);
              console.log('info', "json", json['app']);

              if (json['app'] == "audiosocket") {
                VBConnect();
                console.log('info', 'connecting to VB');
              }
              
            } catch (e) {
              console.log('error', 'message error catch', e)
            }
            console.log('info', "utf ",message.utf8Data);
        }
        else if (message.type === 'binary') {
            // Reflect the message back
            // connection.sendBytes(message.binaryData);
            if (myAsrClient != null && asrActive) {  
              myAsrClient.sendData(message.binaryData)
            }
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log('info', (new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        wsServer.closeAllConnections();

    });
});

wsServer.on('close', function(connection) {
  console.log('info', 'socket closed');
  if (asrActive) {
      io.sockets.emit('status',  "disconnected");
      console.log('info', 'trying to close ASR client');
      myAsrClient.close();
      myAsrClient = null;
      asrActive = false;
  }
  else {
    console.log('info', 'asr not active, cant close');
  }
})

wsServer.on('error', function(error) {
  console.log('error', 'Websocket error', error);
})

var port = process.env.PORT || 8000
server.listen(port, function(){
    console.log('info', "Server listening on :%s", port);
});

function VBConnect() {

    console.log('debug', 'load AsrClient');
    myAsrClient = new AsrClient()
    var url = process.env.ASR_URL;
        client_key = process.env.ASR_CLIENT_KEY;
        client_secret = process.env.ASR_CLIENT_SECRET;
    myAsrClient.setup(url, client_key, client_secret, (err) => {
      if (err) {
        return console.error('AsrClient error:', err)
      }
    var controlMessage = {}
      controlMessage.language = 'en-US' // default starting value 
      controlMessage.targetSampleRate = '8' // default starting value 
      controlMessage.sampleRate = '16000'
      controlMessage.windowSize = 10
      myAsrClient.reserveAsr(controlMessage)
      console.log('debug', "sending control message", controlMessage);

      myAsrClient.subscribeEvent('engineState', (msg) => {
        console.log('info', 'Engine State Event', msg)
        if (msg === 'ready') {
          asrActive = true
          engineStartedMs = Date.now()
          console.log('info', 'Setting asrActive to true: ', asrActive, ' this.asrActive ', this.asrActive)
          io.sockets.emit('status',  "connected");
        }
      })

      myAsrClient.subscribeEvent('transcript', (msg) => {
        console.log('debug', 'transcript', msg);
        io.sockets.emit('transcript', msg);
      })

      myAsrClient.subscribeEvent('sentiment', (msg) => {
        console.log('debug', 'sentiment', msg);
        io.sockets.emit('sentiment', msg);

      })

      myAsrClient.subscribeEvent('nlp', (msg) => {
          console.log('debug', 'nlp', msg);
          io.sockets.emit('nlp', msg);
      })

      myAsrClient.subscribeEvent('keywords', (msg) => {
          console.log('info', 'keywords', msg);
          io.sockets.emit('keywords', msg);
      })


       myAsrClient.subscribeEvent('latency', (msg) => {
          console.log('info', 'latency', msg);
          io.sockets.emit('latency', msg);
      })
    })
}