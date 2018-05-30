var socket = io();
var actionItems = []
var beginTakingAction = false

var strOut;
socket.on('transcript', function(x) {
  var div = $('div.transcription')
  div.html(x);
  // console.log("transcript " + x);
  if (!scrolling) {
      div.scrollTop(div[0].scrollHeight);
    }

    // //find the world action
    // if (!beginTakingAction) {
    //   var actionIndex = x.lastIndexOf("action")
    //   console.log("actionIndex " + actionIndex);
    //   if(actionIndex > 0) {
    //     beginTakingAction = true
    //     strOut = x.substr(actionIndex);
    //     console.log("strOut " + strOut);

    //     if (strOut.lastIndexOf("<br /><br />") > 0) {
    //       console.log('saving action');
    //       beginTakingAction = false
    //       actionItems.push(strOut)
    //       $('div.action').html(actionItems[actionItems.length-1]);
    //     }
    //   }
    // }
    
})

socket.on('action', function(x) {
  console.log('sending action',x);
  actionItems.push(x)
  $('div.action').html(actionItems[actionItems.length-1]);

})
socket.on('sentiment', function(x) {
  // console.log("x", x)
  sentimentChart.update(x)
})

socket.on('nlp', function(x) {
  wordLengthDistChart.update(x.wordLenghDist);
  posTagDistChart.update(x.posTagDist);
})

socket.on('keywords', function(x) {
    keywordChart.update(x)
})

socket.on('status', function(status) {
    $('div.status').html("status: " + status);

    if (status == "connected") {
      sentimentChart.reset()
      keywordChart.reset()
      wordLengthDistChart.reset()
      posTagDistChart.reset()
      $('div.transcription').html('');
    }

})