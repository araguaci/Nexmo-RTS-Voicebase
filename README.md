# Nexmo-RTS-Voicebase
This is a demo of using a [Nexmo Websocket](https://developer.nexmo.com/voice/voice-api/guides/websockets) to transcribe audio in real-time using VoiceBase. 

To view a live version of the demo, go to https://nexmo-vb.herokuapp.com/ and dial the phone number listed on the page. Then, begin speaking. You will see the transciption of the speech at the bottom of the page. On the left, you will see the sentiment of the conversation. When positive words are spoken ('happy','joy', 'exite'..etc), the sentiment line will move higher. When negitive words are spoken, this line will decrease. On the right, shows a graph of keywords spoken in the conversation.


In order to run this demo, you will need a few things:

- Create an application in Nexmo
- set the `event_url` to {your-url}/events and `answer_url` to {your-url}/answer.
- save the application_id to your enviroment variables..
- copy the private key and save to a file, name in `private.key` and save this into the `server` folder
- purchase a nexmo phone number
- assign this phone number to this application
- create a `.env` file will the following variables

```
API_KEY={NEXMO-API-KEY}
API_SECRET={NEXMO-API-SECRET}
APPLICATION_ID={NEXMO-APPLICATION-ID}
NEXMO_NUMBER={NEXMO PHONE NUMBER ASSIGNED TO APPLICATION
NEXMO_DEBUG=true
WEB_SOCKET_URL={URL OF WEBSOCKET}
CONFERENCE_NAME={NAME OF CONFERENCE}
PRIVATE_KEY_PATH={PATH TO PRIVATE KEY}
```

Finally, run `npm start` to begin the server

The `WS-node` is the webocket server.  In this folder, create a `.env` file with the following 

```
ASR_URL={VOICEBASE_URL}
ASR_CLIENT_KEY={VOICEBASE_CLIENT_KEY}
ASR_CLIENT_SECRET={VOICEBASE_CLIENT_SECRET}
```

# Links to Voicebase coming soon

Finally, run `npm start` inside the `WS-node` folder and navigate to the url on your browser.




