// events are: sentiment, engineState, keywords, nlp, transcript
const io = require('socket.io-client')
const request = require('request')
const url = require('url')
var socket;

function getBearerToken (asrUrl, clientKey, clientSecret, callback) {
  request({
    url: asrUrl+'/api/oauth2/token',
    method: 'POST',
    json: true,
    headers: { 'content-type': 'application/json' },
    auth: {
      user: clientKey,
      pass: clientSecret,
      sendImmediately: false
    },
    body: { 'grant_type': 'client_credentials' }
  }, (err, res, body) => {
    if (err) {
      return callback(new Error('Authentication to API error:' + err))
    }
    if (res.statusCode !== 200) {
      return callback(new Error('Authentication to API got error code: ' +
        res.statusCode))
    }
    if (body.token_type === 'Bearer') {
      var bearerToken = body.access_token
      return callback(null, bearerToken)
    }
    callback(new Error('Wrong Bearer token'))
  })
}

function AsrClient () {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  var self = this

  this.defaultControlMessage = { language: 'en-US', sampleRate: '16' }
  this.transcript = []
  this.text = ''
  this.events = []
  this.socket = null
  this.sendAction = false

  self.setup = function (asrUrl, clientKey, clientSecret, callback) {
    getBearerToken(asrUrl, clientKey, clientSecret, (err, bearerToken) => {
      if (err) {
        return callback(err)
      }

      socket = io.connect(asrUrl, {
        secure: true,
        extraHeaders: {
          Authorization: 'Bearer ' + bearerToken
        }
      })
      //console.log('new socket ', socket)

      socket.on('connect_error', (error) => {
        console.log('websocket connect error ', error.description, ' (',
          error.type, ') to ', asrUrl)
        console.log(error.message)
      })

      socket.on('disconnect', () => {
        console.log('disconnected')
        // self.sendEndOfStream()
      })

      socket.on('engine state', (msg) => {
        console.log('Engine state message: ', msg)
        if (msg === "ready") {
          engineStartedMs = Date.now()
       }
        self.emit('engineState', msg)   // ready means start streaming
      })

      socket.on('sentiment estimate', (msg) => {
        //console.log('sentiment: ', msg)
        let x = JSON.parse(msg)
        self.emit('sentiment', x)
      })

      socket.on('basic keywords event', (msg) => {
        //console.log('kw: ', msg)
        let x = JSON.parse(msg)
        self.emit('keywords', x)
      })

      socket.on('nlp event', (msg) => {
        //console.log('nlp: ', msg)
        let x = JSON.parse(msg)
        self.emit('nlp', x)
      })
      ''

      socket.on('transcript segment', (msg) => {
        var messageArrivedMs = Date.now()
        var tsinceEngineStarted = messageArrivedMs - engineStartedMs
        let x
        try {
          x = JSON.parse(msg)
        } catch (err) {
          //console.log('json parse err ', err)
          //console.log(' and msg is:', msg, ':')
          x = { words: [] }
        }

        // collect the transcript fragments into one long transcript array, removing old words as we go
        let tlen = self.transcript.length
        let xlen = x.words.length
        if (xlen > 0) {
          let xP0 = x.words[0].p
          if (tlen > 0) {
            let tPn = self.transcript[tlen - 1].p
            let nRemove = tPn - xP0 + 1
            if (nRemove > 0) {
              for (let i = 0; i < nRemove; i++) {
                self.transcript.pop()
              }
            }
          }
          
          x.words.forEach((item, index, array) => {
            var object = new Object()
            object.item = item.p
            object.time =   (tsinceEngineStarted -item.s)/1000.0
            console.log("item", item);

           

           
            
            self.emit('latency',object)
                                
            self.transcript.push(item)
          })

          var actionText = ''
          var newIndex
          // extract just the text for dsiplay and replace the silence tag with ellipses
          var text = ''
          self.transcript.forEach((item, index, array) => {
            text = text + ' ' + item.w
            console.log("item.w " + item.w); 
             if (item.w == "action" || item.w == "actions" ) {
                newIndex = index
            }

            if (index > newIndex) {
                actionText += item.w + ' '
            }

          })
          var re = /<\/s>/gi
          text = text.replace(re, '<br /><br />')

          self.emit('transcript', text)
          console.log('actionText ',actionText);

          if (actionText != '') {
              this.sendAction = true
              console.log('emmit action ', actionText);
              self.emit('action', actionText)
          }

        } else {
          console.log('Empty transcript event!')
        }
      })

      function WordCount(str) { 
        return str.split(" ").length;
      }


      self.subscribeEvent = function (eventName, fn) {
        self.events[eventName] = self.events[eventName] || []
        let token = 'uid_' + String(self.uid++)
        let item = { fn, token }
        self.events[eventName].push(item)
        return token
      }

      self.unsubscribeEvent = function (eventName, token) {
        if (self.events[eventName]) {
          for (var i = 0; i < self.events[eventName].length; i++) {
            if (self.events[eventName][i].token === token) {
              self.events[eventName].splice(i, 1)
              break
            }
          }
        }
      }

      // used internally only
      self.emit = function (eventName, data) {
         //console.log('emitting for eventName: ', eventName, ' and data ', data, ' ', self.events[eventName])
        if (self.events[eventName]) {
          self.events[eventName].forEach(item => {
            item.fn(data)
          })
        }
      }

      self.onAudio = function (data) {
          socket.emit('audio-packet', data)
      }

      self.endOfAudio = function () {
        console.log('sending stream end')
        socket.emit('stream-close', 'goodbye stream')
      }

      self.reserveAsr = function (controlMessage) {
        console.log('sending stream open')
        socket.emit('stream-open', JSON.stringify(controlMessage))
      }

      callback(null)
    })
  }

  self.sendData = function(data) {
    self.onAudio(data);
  }

  self.close = function() {
    self.endOfAudio()
  }
}

AsrClient.prototype.convertFloat32ToInt16 = (buffer) => {
  var l = buffer.length
  var buf = new Int16Array(l)
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF
  }
  return buf.buffer
}

module.exports = AsrClient
