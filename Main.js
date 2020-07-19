console.log('Starting');
const Binance = require('binance-api-node').default;
const { fork } = require('child_process');
const client = Binance();
const fs = require('fs');
//Globals
let stream = fs.createWriteStream("log.txt", {flags:'a'}); //Log buys & sells
let noBuy = [];

start(noBuy); //Kick off event loop
function start(noBuy){
    //Just to be sure
    //console.log(JSON.stringify(noBuy));
    let count = 0;
    let IDs = [];
    let pairs = [];
    //Remove a pair from noBuy after 3 hours
    let currentTime = new Date().valueOf();
    //console.log('The time is ' + currentTime);
    for (let i in noBuy){
        if(noBuy[i].time <= currentTime){
            noBuy.splice(i, 1);
            i = -1; continue; //restart loop
        }
    }
    //console.log(JSON.stringify(noBuy));
    client.dailyStats().then(result =>{
        for(let i in result){
            //if(result[i].symbol.endsWith('BTC')){
                let pairObject = {};
                pairObject.symbol = result[i].symbol;
                pairObject.priceChangePercent = result[i].priceChangePercent;
                pairObject.lastPrice = result[i].lastPrice;
                pairObject.bidPrice = result[i].bidPrice;
                pairObject.askPrice = result[i].askPrice;
                pairObject.quoteVolume = result[i].quoteVolume;
                pairs.push(pairObject);    
            //}
        }
        //console.log(JSON.stringify(pairs));
        pairs.sort(compare);
        let quote = ['BTC', 'USDT'];
        let bestTradingPairs = getBestTradingPairs(noBuy, pairs, quote);
        //console.log(bestTradingPairs);
        let bases = [];
        for(let i in bestTradingPairs){
            if(bestTradingPairs[i].endsWith(quote[0])){
                bases.push(bestTradingPairs[i].slice(0,-quote[0].length));
            }
            else if(bestTradingPairs[i].endsWith(quote[1])){
                bases.push(bestTradingPairs[i].slice(0,-quote[1].length));
            }
        }
        const forks = [];
        for(let i in bases){
            if (i<10){
                forks[i] = fork('Binance.js', [bases[i], quote[0]]);
            }
            else if (i>=10){
                forks[i] = fork('Binance.js', [bases[i], quote[1]]);
            }
            forks[i].on('message', (message) => {
                console.log(message);
                if(checkPair(message)){ //Check if we just sold a pair
                    messageArray = message.split(' ');
                    let noPair = {
                        time : parseInt(messageArray[0]),
                        pair : messageArray[1] 
                    };
                    noBuy.push(noPair);
                    //console.log('Pair added to no buy');
                    if(count === 0){ //make sure array is empty too
                        //let currentTime = new Date().valueOf();
                        //Clean up
                        for(let i in bases){
                            forks[i].kill();
                        }
                        console.log('Restarting; no more assets to monitor');
                        try {
                            clearInterval(timer);
                        } catch (error) {
                            console.log(error);
                        }
                        start(noBuy);
                    }
                }
                if(message.includes('Hello from')){
                    let m = message.indexOf('with ID') + 8;
                    let id = message.substring(m);
                    IDs.push(id);
                    //if(IDs.length >= 20)
                      //  console.log(IDs);
                }
                if(message.includes('Buy') && !(message.includes('Infinity')) && !(message.includes('NaN'))){
                    count++;
		            stream.write(message + "\n");
                    let m = message.indexOf('with ID') + 8;
                    let id = message.substring(m);
                    for(let j = 0; j < IDs.length; j++){ 
                        if (IDs[j] == id) {
                            IDs.splice(j, 1); 
                        }
                    }
                }
		        if(message.includes('P/L')) {
		            stream.write(message + "\n");
                }
                if(message.includes('Order closed')){
                    count--;
                }
                /*if(message.includes('Sell')){
                   // count--;
		            //stream.write(message + "\n");
                    /*let m = message.indexOf('with ID') + 8;
                    let id = message.substring(m);
                    /*for(let j = 0; j < IDs.length; j++){ 
                        if (IDs[j] == id) {
                        IDs.splice(j, 1); 
                        }
                    }
                }*/
                if(count >= 4){
                    console.log('Reached ' + count + ' assets');
                    //console.log(IDs);
                    for(let k = 0; k < IDs.length; k++){
                        try{
                            process.kill(IDs[k]);
                            //console.log("Killing " + IDs[k]);
                            //IDs.splice(k,1);
            
                        } catch(error) {
                            console.log(error + " " + IDs[k]); //Notify the user an error occured but, continue
                        }
                    }
                    //console.log(IDs);
                }
            });
            forks[i].on('uncaughtException', function (error) {
                console.log('An error occured');
                if(error.includes('IP')){
                    process.exit();
                }
                let id = forks[i].pid
                console.log(error + id);
                console.log('exiting from ' + id);
                process.kill(id);
                /*for(let j = 0; j < IDs.length; j++){ 
                    if (IDs[j] == id) {
                    IDs.splice(j, 1); 
                    }
                }*/
            });
            /*forks[i].on('close', (code, signal) => {
                if(code != null){
                    let id = forks[i].pid;
                    console.log(`child process ${id} terminated due to receipt of signal ${signal} with code ${code}`);
                }
              });*/
        }
        let timer = setTimeout(() => {
            if(count === 0){
                for(let i in forks){
                    /*forks[i].on('close', (code, signal) => {
                        let id = forks[i].pid;
                        console.log(`child process ${id} terminated due to receipt of signal ${signal} with code ${code}`);
                    });*/
                    try {
                        process.kill(forks[i].pid);
                    } catch (error) {
                        console.log(error);
                    }
                }
                console.log('Restarting; timed out');
                start(noBuy);
            }
        }, 900000); //15 minutes
    }).catch(error => {
        console.log(error);
        process.exit();
    })
}
function getBestTradingPairs(noBuy, pairs, quote){
    let tradingPairs = [];
    let noSymbols = [];
    let badPair = false;
    for (let i in noBuy){
        noSymbols[i] = noBuy[i].pair; //get list of pairs not to trade
    }
    for(let i in pairs){
        badPair = false;
        for(let j in noSymbols){
            if(pairs[i].symbol == noSymbols[j]){ //check if the current pair is bad
                badPair = true;
                console.log('Bad pair ' + noSymbols[j]);
            }
        }
        if(!badPair && (pairs[i].symbol.endsWith(quote[0])) && ((pairs[i].symbol != 'ETHBTC')|| 
        (pairs[i].symbol != 'USDCUSDT') || (pairs[i].symbol != 'BUSDUSDT') 
        || (pairs[i].symbol != 'PAXUSDT') || (pairs[i].symbol != 'TUSDUSDT') || (pairs[i].symbol != 'USDSUSDT'))){
            let spread = (pairs[i].askPrice - pairs[i].bidPrice)/pairs[i].lastPrice;
            if(spread <= 0.005){ //0.5%
                tradingPairs.push(pairs[i].symbol);
                if(tradingPairs.length == 10){
                    break;
                }
            }
        }
    }
    for(let i in pairs){
        badPair = false;
        for(let j in noSymbols){
            if(pairs[i].symbol == noSymbols[j]){ //check if the current pair is bad
                badPair = true;
                console.log('Bad pair ' + noSymbols[j]);
            }
        }
        if(!badPair && (pairs[i].symbol.endsWith(quote[1])) && ((pairs[i].symbol != 'ETHBTC')|| 
        (pairs[i].symbol != 'USDCUSDT') || (pairs[i].symbol != 'BUSDUSDT') 
        || (pairs[i].symbol != 'PAXUSDT') || (pairs[i].symbol != 'TUSDUSDT') || (pairs[i].symbol != 'USDSUSDT'))){
            let spread = (pairs[i].askPrice - pairs[i].bidPrice)/pairs[i].lastPrice;
            if(spread <= 0.003){ //0.3%
                tradingPairs.push(pairs[i].symbol);
                if(tradingPairs.length == 20){
                    break;
                }
            }
        }
    }
    return tradingPairs;
}
function getDate(){
    let today = new Date();
    let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let dateTime = date+' '+time;
    return dateTime;
}

function compare(a,b) {
    return b.quoteVolume - a.quoteVolume;
    //return b.priceChangePercent - a.priceChangePercent; //top
    //return a.priceChangePercent - b.priceChangePercent;
}
//Function to check if the message is 'time' & 'pair'
function checkPair(name) {
    let NAME = name.value;
    let values = name.split(' ').filter(function(v){return v!==''});
    if (values.length == 2) {
        return true;
    } else {
        return false;
    }
}

/*function checkCount(count, noBuy, forks){
    if(count === 0){
        for(let i in forks){
            forks[i].kill();
        }
        console.log('Restarting; timed out');
        start(noBuy);
    }
        
}*/
  
