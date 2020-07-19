//https://github.com/binance-exchange/binance-api-node
//Required
const Binance = require('binance-api-node').default;
let fs = require('fs');
let rll = require('read-last-lines');
const EventEmitter = require('events').EventEmitter;
const ee = new EventEmitter;
const technical_analysis = require('./build/Release/technical_analysis'); //node-gyp configure build
//Globals
const base = process.argv[2];
if(base === undefined){
  console.log('No pair');
  process.exit();
}
const quote = process.argv[3];
if(quote === undefined){
  console.log('No pair');
  process.exit();
}
const pair = base + quote;
process.send(getDate() + ' Hello from ' + pair + ' with ID ' + process.pid);
const candleInterval = '1h';
let candleArray = [];
let Alert = {
  time: 0,
  averageAlert: '',
  macdAlert: '',
  alert: ''
};
let candleNum = 200;
let alerts = [];
let BTCamount;
let assetCurrentValue = 0;
let assetOrderValue = 0;
let minimumValue = 0;
let stepSize = 0;
let maxGain = 0.6;
let maxLoss = -1.0;
let profitLoss = 0;
//Flags
let maxReached = false;
let orderPlaced = false;
let printNothing = false;

// Authenticated client, can make signed calls
const client = Binance({
  apiKey: '/* */',
  apiSecret: '/*  */',
});
//Get the initial balance
getBalance();
//We need to get the minimum order and lot sizes
client.exchangeInfo().then(result => {
  let symbols = result.symbols;
  for(let i in symbols){
    if(symbols[i].symbol == pair){
      symbolIndex = i;
      break;
    }
  }
  //Get rid of trailing zeros
  minimumValue = parseFloat(symbols[symbolIndex].filters[2].minQty);
  stepSize = parseFloat(symbols[symbolIndex].filters[2].stepSize);
});
//Get candles
client.candles({symbol: pair, interval: candleInterval, limit: candleNum}).then(candles => { //T OLHC V
  //let writeCandles = fs.createWriteStream('candles.txt');
  for(let i in candles){
    //Delete Unnecessary information
    delete candles[i].closeTime;
    delete candles[i].quoteVolume;
    delete candles[i].trades;
    delete candles[i].baseAssetVolume;
    delete candles[i].quoteAssetVolume;
    //Rename property
    candles[i].startTime = candles[i].openTime / 1000; //Convert to seconds
    /*delete candles[i].openTime;
    //let data = candles[i].startTime +' ' + candles[i].open + ' ' + candles[i].low + ' '
    + candles[i].high + ' ' + candles[i].close + ' '+ candles[i].volume + '\n';
    writeCandles.write(data);*/
  }
  //fs.close;
  candleArray = candles;
  //Populate alerts array with start times
  /*for(let i in candleArray){
    let alertsObject = Object.create(Alert);
    alertsObject.time = candleArray[i].startTime;
    alertsObject.averageAlert = ' ';
    alertsObject.macdAlert = ' ';
    alertsObject.alert = ' ';
    alerts.push(alertsObject);
  }*/
});
//Create a websocket to get the latest price
/*client.ws.trades(pair, trade =>{
  assetCurrentValue = trade.price;
  //console.log(assetCurrentValue);
});*/
//Setup web socket for candles
client.ws.candles(pair, candleInterval, candles => {
    //console.log(candles);
    //ee.emit('candleReady',candles);
    processCandles(candles);
   });
client.ws.partialDepth({symbol : pair, level : 5}, depth =>{
  assetCurrentValue = depth;
  //console.log(depth.bids[0].price);
});
  function processCandles(candles){
    delete candles.eventType;
    delete candles.eventTime;
    delete candles.symbol;
    delete candles.closeTime;
    delete candles.firstTradeId;
    delete candles.lastTradeId;
    delete candles.trades;
    delete candles.interval;
    delete candles.isFinal;
    delete candles.quoteVolume;
    delete candles.buyVolume;
    delete candles.quoteBuyVolume;
    candles.startTime = candles.startTime/1000;
    let lastStart = candleArray[candleArray.length-2].startTime; //Get the 2nd last start time 
    let currentStart = candleArray[candleArray.length-1].startTime; //Get the last start time
    candleArray.push(candles);
    //We need to remove the old candle of the same time stamp
    lastStart = candleArray[candleArray.length-2].startTime; //Get the 2nd last start time 
    currentStart = candleArray[candleArray.length-1].startTime; //Get the last start time
    if((lastStart === currentStart) ){ //Remove last element to update array
      candleArray.splice(candleArray.length-2,1);
    }
    if(candleArray.length > candleNum){ //Remove first element if we exceed candleNum + 1 elements
      candleArray.shift();
    }
    //writeCandles(candleArray);
    //calculateAverages(candleArray);
    //calculateMACD(candleArray);
    checkAlerts();
  }
  /*function writeCandles(candleArray){
    //Write the array to a file
    let candleData = '';
    for(let i in candleArray){
      candleData += candleArray[i].startTime +' ' + candleArray[i].open + ' ' + candleArray[i].low + ' '
      + candleArray[i].high + ' ' + candleArray[i].close + ' '+ candleArray[i].volume + '\n';
    }
    fs.writeFileSync('candles.txt',candleData,function(error){
      if(error) 
        throw error;
    });
  }*/
  /*function calculateAverages(candleArray){
    //Calculate moving averages
    let array = technical_analysis.movingAverage(candleArray, function(averageArray){
      globalAverageArray = averageArray;
      let averageData = '';
      //Assemble a long data string
      for(let i in averageArray){
        //Don't need to include close value in file
        averageData += averageArray[i].startTime + ' ' + averageArray[i].sma7 + ' ' + averageArray[i].sma25
          + ' ' + averageArray[i].sma99 + ' ' + averageArray[i].alert + '\n';
        //This part ensures the time lines up
         // let j = alerts.findIndex(a => a.time == averageArray[i].startTime); 
        alerts[i].averageAlert = averageArray[i].alert;
      }
      //Use Sync to prevent a blank file
      fs.writeFileSync('averages.txt', averageData, function(error){
        if(error) 
          throw error;
      });
    });
  }
  function calculateMACD(candleArray){
    technical_analysis.macd(candleArray, function(macdArray){
      globalMACDArray = macdArray;
      let macdData = '';
      for(let i in macdArray){
        //Don't need to include close value in file
        macdData += macdArray[i].startTime + ' ' + macdArray[i].macdLine + ' ' + macdArray[i].signalLine
          + ' ' + macdArray[i].histogram + ' ' + macdArray[i].alert + '\n';
        //This part enusres the time lines up
         // let j = alerts.findIndex(a => a.time == macdArray[i].startTime);
        alerts[i].macdAlert = macdArray[i].alert;
      }
      fs.writeFileSync('macd.txt', macdData, function(error){
        if(error)
          throw error;
      });
    });
  }*/
  function checkAlerts(){
    //Check if the array exists
    /*if(alerts.length){
      for(let i in alerts){
        if(alerts[i].averageAlert == 'buy' && alerts[i].macdAlert == 'buy'){
          alerts[i].alert = 'buy';
        }
        else{
          alerts[i].alert = 'sell';
        }
      }
      ee.emit('alertReady');
    }*/
    technical_analysis.alertsOnly(candleArray, function(result){
      alerts = result;
      orderTest();
    });
  }

  //Place an order when we are ready
  function orderTest(){
    let lastCandle = candleArray[candleArray.length - 1]; //Get the last candle
    /*let candleAlert;
    if(lastCandle.open < lastCandle.close){ //Check if the price is increasing
      candleAlert = true;
    } else {
      candleAlert = false;
    }*/
    let timeStamp = getDate() + ' for ' + pair;
    //Begin checking conditions
    if((alerts[alerts.length -1].alert == 'sell') && orderPlaced == false && printNothing == false ){
      printNothing = true;
      console.log(timeStamp + ' Nothing to do');
    }
    else if ((alerts[alerts.length -1].alert == 'sell') && orderPlaced == true){
      orderPlaced = false;
      process.send(timeStamp + ' Order closed based on analysis with P/L ' + profitLoss.toFixed(3) + '% ' + process.pid);
      console.log(timeStamp + ' exiting');
      process.send(timeStamp + ' Sell' + ' with ID ' + process.pid);
      let time = new Date().valueOf() + 10800000; //Add 3 hours
        process.send(time + " " + pair); 
      process.exit();
    }
    //We stay in this if statement while we monitor an asset
    else if((alerts[alerts.length -1].alert == 'buy') && orderPlaced === true){

      profitLoss = ((assetCurrentValue.bids[0].price - assetOrderValue)/assetOrderValue) * 100;
      console.log(timeStamp + ' P/L ' + profitLoss.toFixed(3) + '%'); //Log P/L
      if((profitLoss >= maxGain)  && (maxReached == false)){ //If the asset reached the max gain
        maxReached = true;
        maxGain = maxGain + 0.2;
      }
      else if((profitLoss >= maxGain) && (maxReached == true)){ 
        //Keep incrementing the max gain if the P/L is greater than it
        maxGain = maxGain + 0.2;
      }
      else if((profitLoss <= (maxGain - 0.2)) && (maxReached == true)){ //The P/L fell below the max gain
        orderPlaced = false;
        process.send(timeStamp + ' Order closed; max gain realized with P/L ' + profitLoss.toFixed(3) + '% ' + process.pid);
        console.log(timeStamp + ' exiting');
        process.send(timeStamp + ' Sell' + ' with ID ' + process.pid);
        let time = new Date().valueOf() + 10800000; //Add 3 hours
        process.send(time + " " + pair);
        process.exit();
      }
      else if (profitLoss <= maxLoss){ //We lost too much money
	      orderPlaced = false;
        process.send(timeStamp + ' Order closed; max loss realized with P/L ' + profitLoss.toFixed(3) + '% ' + process.pid);
        console.log(timeStamp + ' exiting');
        process.send(timeStamp + ' Sell' + ' with ID ' + process.pid);
        let time = new Date().valueOf() + 10800000; //Add 3 hours
        process.send(time + " " + pair);
        process.exit();	
      }
    }
    else if((alerts[alerts.length -1].alert == 'buy') && (alerts[alerts.length -2].alert == 'buy') 
      && orderPlaced === false && (typeof(assetCurrentValue) != 'undefined')){
      printClose = false;
      let precision = 0;
      if(stepSize != 1)
        precision = (stepSize + "").split(".")[1].length;
      else
        precision = 0;
      let quantitytoOrder = Number.parseFloat((1/assetCurrentValue.asks[0].price)*(BTCamount/5)).toFixed(precision);
      if(isFinite(quantitytoOrder)){
        if(quantitytoOrder < minimumValue)
          quantitytoOrder = minimumValue;
        orderPlaced = true;
        //assetOrderValue = assetCurrentValue; //Comes from trading websocket
        assetOrderValue = assetCurrentValue.asks[0].price;
        client.orderTest({
          symbol: pair,
          side: 'BUY',
          type: 'MARKET',
          quantity: quantitytoOrder,
          useServerTime: true
        })
        .catch(error =>{
          console.log(timeStamp + error);
          orderPlaced = false;
        });
        process.send(timeStamp + ' Buy ' + quantitytoOrder + base + ' with ID ' + process.pid); //Log order placement
      }
    }
    /*else { //TO DO create a function to make sure there is an order to close
      client.orderTest({
        symbol: pair,
        side: 'SELL',
        type: 'MARKET',
        quantity: quantitytoOrder
      });
      //Recheck our BTC balance
      BTCamount = getBalance();
    }*/
  }
  //See how much I have
  function getBalance(){
    client.accountInfo({useServerTime: true}).then(accountInfo => {
      let assets = accountInfo.balances;
      //Make a map so we can easily iterate over the assets
      let result = new Map(assets.map(i => [i.asset, i.free]));
      BTCamount = result.get(quote);
    })
      .catch(error =>{
        console.log(error);
        getBalance(); //Keep calling until the error is resolved
      });

  }
  function getDate(){
    let today = new Date();
    let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let dateTime = date+' '+time;
    return dateTime;
  }
//Events
ee.on('candleReady', processCandles); 
//ee.on('alertReady', orderTest);
//ee.on('averageReady', checkAlerts);
//ee.on('macdReady', macdAlerts);
//ee.on('writeToFile',writeToFile);
  /*
set terminal wxt size 3840,1940
set terminal wxt position -15,0
set style increment default
set multiplot
set size 1, 0.7
set origin 0, 0.3
set timefmt "%s"
set format x "%H:%M"
set xdata time
set lmargin at screen 0.04
set rmargin at screen 0.98
set datafile separator ","
set autoscale
unset key
set grid mxtics mytics
plot "candles.txt" using 1:2:3:4:5 with candlesticks
set size 1.0, 0.3
set origin 0.0, 0.0
set lmargin at screen 0.04
set rmargin at screen 0.98
set boxwidth 0.5
set style fill solid
unset key
set grid mxtics mytics
plot "candles.txt" using 1:6 with boxes

  */

/*client.ws.candles('ETHBTC', '1m', candle => {
  fs.appendFile('candles.txt', JSON.stringify(candle) + '\n', function (error) {
    if(error) throw error;
  }); 
  console.log(candle);
 });*/
/*client.ws.trades(['ETHBTC'], trade => {
   console.log(trade)
});*/
/*(client.ws.partialDepth({ symbol: 'BTCUSDT', level: 20 }, depth => {
    console.log(depth)
  })*/
/*
  client.ws.candles('ETHBTC', '1m', candle => {
   // let candleJSON = JSON.parse(candle);
    //let volume = candle.volume;
    //console.log(volume);
    console.log(candle);
  });*/
/*
const addon = require('./build/Release/addon'); //node-gyp configure build
console.time('c++');
let total =addon.sum();
console.timeEnd('c++');
console.log(total);*/
