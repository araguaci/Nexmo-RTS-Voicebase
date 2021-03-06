// events are: sentiment, engineState, keywords, nlp, transcript
const io = require('socket.io-client')
const request = require('request')
const url = require('url')
const uuidv1 = require('uuid/v1');

function getBearerToken (asrUrl, clientKey, clientSecret, callback) {
  request({
    url: url.resolve(asrUrl, '/oauth2/token'),
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

  this.defaultControlMessage = { language: 'en-US', sampleRate: '16000' }
  this.transcript = []
  this.text = ''
  this.events = []
  this.socket = null

  self.setup = function (asrUrl, clientKey, clientSecret, callback) {
    getBearerToken(asrUrl, clientKey, clientSecret, (err, bearerToken) => {
      if (err) {
        return callback(err)
      }

      self.socket = io.connect(asrUrl, {
        secure: true,
        transports: [ 'websocket' ],
        extraHeaders: {
          Authorization: 'Bearer ' + bearerToken
        }
      })

      self.socket.on('connect_error', (error) => {
        console.log('websocket connect error ', error.description, ' (',
          error.type, ') to ', asrUrl)
        console.log(error.message)
      })

      self.socket.on('disconnect', () => {
        console.log('disconnected')
        self.endOfAudio()
      })

      self.socket.on('engine state', (msg) => {
        console.log('Engine state message: ', msg)
        self.emit('engineState', msg)   // ready means start streaming
      })

      self.socket.on('sentiment event', (msg) => {
        let x = JSON.parse(msg)[0]
        console.log('sentiment: ', x)
        self.emit('sentiment', x)
      })

      self.socket.on('basic keywords event', (msg) => {
        let x = JSON.parse(msg)
        console.log('basic keywords event: ', x)
        self.emit('keywords', x)
      })

      self.socket.on('spot keywords event', (msg) => {
        let x = JSON.parse(msg)
        self.emit('keywordSpotter', x)
      })

      self.socket.on('nlp event', (msg) => {
        let x = JSON.parse(msg)
        self.emit('nlp', x)
      })

      self.socket.on('churnPredictor event', (msg) => {
        let x = JSON.parse(msg)
        self.emit('churnPredictor', x)
      })

      self.socket.on('salesPredictor event', (msg) => {
        let x = JSON.parse(msg)
        self.emit('salesPredictor', x)
      })

      self.socket.on('transcript segment', (msg) => {
        let x
        try {
          x = JSON.parse(msg)
        } catch (err) {
          console.log('json parse err ', err)
          console.log(' and msg is:', msg, ':')
          x = { words: [] }
        }

        
        self.emit('transcript-segment', x)

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
            self.transcript.push(item)
          })

          // extract just the text for dsiplay and replace the silence tag with ellipses
          var text = ''
          self.transcript.forEach((item, index, array) => {
            text = text + ' ' + item.w
          })
          var re = /<\/s> /gi
          text = text.replace(re, '... ')
          self.emit('transcript', text)
        } else {
          console.log('Empty transcript event!')
        }
      })

      self.subscribeEvent = function (eventName, fn) {
        self.events[eventName] = self.events[eventName] || []
        let token = uuidv1()
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
        // TODO: Check if asr engineis ready yet
        self.socket.emit('audio-packet', data)
      }

      self.endOfAudio = function () {
        console.log('sending stream end')
        self.socket.emit('stream-close', 'goodbye stream')
      }

      self.reserveAsr = function (controlMessage) {
        console.log('sending stream open')
        self.socket.emit('stream-open', JSON.stringify(controlMessage))
      }

      callback(null)
    })
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
