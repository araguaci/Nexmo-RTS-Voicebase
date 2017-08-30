const Speech = require('@google-cloud/speech');
var transcription = '';
var isActive = false;

// Instantiates a client
const speech = Speech();
var recognizeStream;

exports.streamingMicRecognize = function () {
    isActive = true
    var self = this;

    // The encoding of the audio file, e.g. 'LINEAR16'
    const encoding = 'LINEAR16';

    // The sample rate of the audio file in hertz, e.g. 16000
    const sampleRateHertz = 16000;

    // The BCP-47 language code to use, e.g. 'en-US'
    const languageCode = 'en-US';

    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode
        },
        interimResults: false // If you want interim results, set this to true
    };

    // Create a recognize stream
    recognizeStream = speech.streamingRecognize(request)

    recognizeStream.on('error', function (error) {
        console.log('error', error)
    })
    recognizeStream.on('data', function (data) {
        if (data.results[0] && data.results[0].alternatives[0]) {
            transcription += data.results[0].alternatives[0].transcript
        } else {
            isActive = false
            transcription += " "
            console.log("Reached transcription time limit");
        }
        
        console.log(
            (data.results[0] && data.results[0].alternatives[0])
                ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
                : `\n\nReached transcription time limit, press Ctrl+C\n`)
    })
    console.log('Listening, press Ctrl+C to stop.');
}

exports.sendData = function (data) {
    recognizeStream.write(data)
}

exports.getTranscription = function() {
    return transcription
}

exports.isConnectionActive = function() {
    return isActive;
}