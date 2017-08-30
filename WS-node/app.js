
require('dotenv').config()

var WebSocketServer = require('websocket').server;

var http = require('http');
var HttpDispatcher = require('httpdispatcher');
var dispatcher     = new HttpDispatcher();
const fs = require('fs');
const winston = require('winston')
winston.level = process.env.LOG_LEVEL || 'info'
var transcriptionInterval = null;
var isActiveInterval = null;


var connections = []

var gSpeech = require('./lib/gSpeech.js')

//Create a server
var server = http.createServer(function(req, res) {
    handleRequest(req,res);
});

// Loading socket.io
var io = require('socket.io').listen(server);

// When a client connects, we note it in the console
io.sockets.on('connection', function (socket) {
    winston.log('info','A client is connected!');
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
        winston.log('info', 'handleRequest',request.url);
        //Dispatch
        dispatcher.dispatch(request, response);
    } catch(err) {
        console.log(err);
    }
}
dispatcher.setStatic('/public');
dispatcher.setStaticDirname('public');
dispatcher.onGet("/", function(req, res) {
  winston.log('info', 'loading index');
  winston.log('info', 'port', process.env.PORT)
   fs.readFile('./public/index.html', 'utf-8', function(error, content) {
        winston.log('debug', 'loading Index');
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});
// Serve the ncco
dispatcher.onGet("/ncco", function(req, res) {
    fs.readFile('./ncco.json', function(error, data) {
        winston.log('debug', 'loading ncco');
       res.writeHead(200, { 'Content-Type': 'application/json' });
       res.end(data, 'utf-8');
    });
});

dispatcher.onPost("/terminate", function(req, res) {
     winston.log('info', 'terminate called');
     wsServer.closeAllConnections();
  
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
});

wsServer.on('connect', function(connection) {
    connections.push(connection);

    winston.log('info', (new Date()) + ' Connection accepted' + ' - Protocol Version ' + connection.webSocketVersion);
    connection.on('message', function(message) {

        if (message.type === 'utf8') {
            try {
              var json = JSON.parse(message.utf8Data);
              winston.log('info', "json", json['app']);

              if (json['app'] == "audiosocket") {
                io.sockets.emit('status',  "connected");
                gSpeech.streamingMicRecognize()
                transcriptionInterval = setInterval(updateTranscription,5000)
                isActiveInterval =  setInterval(isActive,5000)
                winston.log('info', 'connecting to GSpeech');
              }
              
            } catch (e) {
              winston.log('error', 'message error catch', e)
            }
            winston.log('info', "utf ",message.utf8Data);
        }
        else if (message.type === 'binary') {
            // Reflect the message back
            // connection.sendBytes(message.binaryData);
            gSpeech.sendData(message.binaryData);
        }
    });
  

    connection.on('close', function(reasonCode, description) {
        winston.log('info', (new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        wsServer.closeAllConnections();
        clearInterval(transcriptionInterval);
        clearInterval(isActiveInterval);

    });
});

wsServer.on('close', function(connection) {
  winston.log('info', 'socket closed');
    io.sockets.emit('status',  "disconnected");
    clearInterval(transcriptionInterval);
    clearInterval(isActiveInterval);
})

wsServer.on('error', function(error) {
  winston.log('error', 'Websocket error', error);
  clearInterval(transcriptionInterval);
  clearInterval(isActiveInterval);
})

var port = process.env.PORT || 8000
server.listen(port, function(){
    winston.log('info', "Server listening on :%s", port);
});

function updateTranscription() {
    console.log("updateTranscription");
    var text = gSpeech.getTranscription()
    if (text != null) {
        io.sockets.emit('transcript', text);
    }
}

function isActive() {
    var active = gSpeech.isConnectionActive();
    if (!active) {
        gSpeech.recognizeStream = null;
        clearInterval(transcriptionInterval);
        clearInterval(isActiveInterval);
        
        transcriptionInterval = setInterval(updateTranscription,5000)
        isActiveInterval =  setInterval(isActive,5000)
        gSpeech.streamingMicRecognize();
    }
}