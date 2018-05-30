var keywordChart = (function(){
    var chart;
    var dps = []; // dataPoints



    var updateInterval = 100;
    var dataLength = 1000; // number of dataPoints visible at any point
    //window.onload = function () {

    //init
    chart = new CanvasJS.Chart("keywordContainer",{
    title :{
        text: "Keywords"
    },
    legend: {
        horizontalAlign: "center", // "center" , "right"
        verticalAlign: "top",  // "top" , "bottom"
        fontSize: 15
    }, 
    //axisY:{
    //    minimum: -1.0,
    //    maximum: 1.0,
    //},
        data: [
        {type: "bar", dataPoints: dps },
        ]
    }); 
    resetChart();  

   function resetChart() {
        //this.dps=[];
        dps.length=0
        chart.render();
    };

     function updateChart(kws) {
        dps.length=0;

        //console.log(kws);
        var arrayLength = kws.words.length;
        for (var i = 0; i < arrayLength; i++) {
            //console.log("   "+i+ " "+kws.words[i]);
            // workaround to get reasonably comparable
            if (kws.words[i][1] <0) {
                metric = 1.0 + kws.words[i][1]/100.0
            } else {
                metric =kws.words[i][1];
            }
            dps.push({
                label: kws.words[i][0],
                y: metric
            });       
        }
        chart.render();  

    };
  return {
      reset: resetChart,
      update: updateChart
  };
})();



var sentimentChart = (function(){
  var chart;
  var pos = []; // dataPoints
  var neg = []; // dataPoints
  var neu = []; // dataPoints
  var compound = []; // dataPoints


  var updateInterval = 100;
  var dataLength = 1000; // number of dataPoints visible at any point
  //window.onload = function () {

  //init
  chart = new CanvasJS.Chart("sentimentContainer",{
  title :{
      text: "Sentiment +/-"
  },
  legend: {
      horizontalAlign: "center", // "center" , "right"
      verticalAlign: "top",  // "top" , "bottom"
      fontSize: 15
  }, 
  axisY:{
      minimum: -1.0,
      maximum: 1.0,

  },
      data: [
    //   {type: "spline", legendText: "positive",  showInLegend: true, color: "green", lineThickness: 1, markerType: "none", dataPoints: pos },
    //   {type: "spline", legendText: "negative",  showInLegend: true, color: "red", lineThickness: 1, markerType: "none", dataPoints: neg },
    //   {type: "spline", legendText: "neutral",  showInLegend: true, color: "gray", lineThickness: 1, markerType: "none", dataPoints: neu },
      {type: "spline", legendText: "compound",  showInLegend: true, color: "blue", lineThickness: 3, markerType: "none", dataPoints: compound}
      ]
  }); 
  resetChart();  

 function resetChart() {
      //this.dps=[];
      compound.length=0
      pos.length=0
      neg.length=0
      neu.length=0
      chart.render();
  };

   function updateChart(sentiment) {
       sentiment = sentiment[0]
      pos.push({
          //x: sentiment.time,
          y: sentiment.pos
      });
      neg.push({
          //x: sentiment.time,
          y: sentiment.neg
      });
      neu.push({
          //x: sentiment.time,
          y: sentiment.neu
      });
      compound.push({
          //x: sentiment.time,
          y: sentiment.compound
      });
      if (compound.length > dataLength) {
          pos.shift();
          neg.shift();                
          neu.shift();
          compound.shift();                
             
      }
    //   console.log("pos", pos)
    //   console.log("neg", neg)

      chart.render();  

  };

 function updateChartToDate(sentimentList) {
      resetChart();
      for (var i = 0; i < sentimentList.length; i++) {

          sentiment =sentimentList[i];
          pos.push({
              //x: sentiment.time,
              y: sentiment.pos
          });
          neg.push({
              //x: sentiment.time,
              y: sentiment.neg
          });
          neu.push({
              //x: sentiment.time,
              y: sentiment.neu
          });
          compound.push({
              //x: sentiment.time,
              y: sentiment.compound
          });
          if (compound.length > dataLength) {
              pos.shift();
              neg.shift();                
              neu.shift();
              compound.shift();                
                 
          }
      }

      chart.render();  

  };
  return {
      reset: resetChart,
      updateChartToDate:updateChartToDate,
      update: updateChart
  };
})();

var wordLengthDistChart = (function(){
  var chart;
  var dps = []; // dataPoints

  var updateInterval = 100;
  var dataLength = 1000; // number of dataPoints visible at any point
  //window.onload = function () {

  //init
  chart = new CanvasJS.Chart("wordLengthDist",{
  title :{
      text: "Word Length Distribution"
  },
  legend: {
      horizontalAlign: "center", // "center" , "right"
      verticalAlign: "top",  // "top" , "bottom"
      fontSize: 15
  }, 
  //axisY:{
  //    minimum: -1.0,
  //    maximum: 1.0,
  //},
      data: [
      {type: "pie", dataPoints: dps },
      ]
  }); 
  resetChart();  

 function resetChart() {
      //this.dps=[];
      dps.length=0
      chart.render();
  };

   function updateChart(wordLengthDist) {
      dps.length=0;

      //console.log(kws);
      var arrayLength = wordLengthDist.length;
      for (var i = 0; i < arrayLength; i++) {
          //console.log("   "+i+ " "+kws.words[i]);
          dps.push({
              label: wordLengthDist[i][0],
              y: wordLengthDist[i][1]
          });       
      }
      chart.render();  

  };
  return {
    reset: resetChart,
    update: updateChart
  };
})();

var posTagDistChart = (function(){
    var chart;
    var dps = []; // dataPoints

    var updateInterval = 100;
    var dataLength = 1000; // number of dataPoints visible at any point
    //window.onload = function () {

    //init
    chart = new CanvasJS.Chart("posTagDist",{
    title :{
        text: "Part of Speech Tag Distribution"
    },
    legend: {
        horizontalAlign: "center", // "center" , "right"
        verticalAlign: "top",  // "top" , "bottom"
        fontSize: 15
    }, 
    //axisY:{
    //    minimum: -1.0,
    //    maximum: 1.0,
    //},
        data: [
        {type: "pie", dataPoints: dps },
        ]
    }); 
    resetChart();  

   function resetChart() {
        //this.dps=[];
        dps.length=0
        chart.render();
    };

     function updateChart(posTagDist) {
        dps.length=0;

        //console.log(kws);
        var arrayLength = posTagDist.length;
        for (var i = 0; i < arrayLength; i++) {
            //console.log("   "+i+ " "+kws.words[i]);
            dps.push({
                label: posTagDist[i][0],
                y: posTagDist[i][1]
            });       
        }
        chart.render();  

    };
  return {
      reset: resetChart,
      update: updateChart
  };
})();

