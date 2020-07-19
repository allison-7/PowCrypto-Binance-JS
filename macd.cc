#include "macd.h"
#include <iostream>
//We need to populate our EMA vector first
std::vector<EMA> calculateEMA(std::vector<Candle> candle_array){
    EMA ema;
    std::vector<EMA> EMA_array;
    double weightingMultiplier12 = 2.0/(12.0+1.0); // 2/(number of periods + 1)
    double weightingMultiplier24 = 2.0/(24.0+1.0); // 2/(number of periods + 1)
    
    double sma12;
    double sma24;
    double sum = 0;
    //Calculate the initial value for the EMA calculation
    for(unsigned int i = 0; i<24; i++){
        sum += atof(candle_array[i].close.c_str());
        if(i==11)
            sma12 = sum/12.0;
        if(i==23)
            sma24 = sum/24.0;
    }
    for(unsigned int i = 0; i < candle_array.size(); i++){
        ema.startTime = atof(candle_array[i].startTime.c_str());
        ema.close = atof(candle_array[i].close.c_str());
        //EMA = (closing price - previous day's EMA) * weighting multiplier + previous day's EMA
        //The 1st EMA is the SMA
        if(i == 11){
            ema.ema12 = (atof(candle_array[i].close.c_str()) - sma12) * weightingMultiplier12 + sma12;
        }
        else if(i>11){
            ema.ema12 = (atof(candle_array[i].close.c_str()) - EMA_array[i-1].ema12)
            * weightingMultiplier12 + EMA_array[i-1].ema12; 
            if(i == 23){
                ema.ema24 = (atof(candle_array[i].close.c_str()) - sma24) * weightingMultiplier24 + sma24;
            }
            else if(i>23){
                ema.ema24 = (atof(candle_array[i].close.c_str()) - EMA_array[i-1].ema24) 
                * weightingMultiplier24 + EMA_array[i-1].ema24; 
            }
        }
        EMA_array.push_back(ema);
    }
    return EMA_array;
}
std::vector<MACD> calculateMACD(std::vector<Candle> candle_array){
    std::vector<MACD> MACD_array;
    std::vector<EMA> ema_array = calculateEMA(candle_array); //We need to calculate the EMA first
    MACD macd;
    for(unsigned int i = 0; i<ema_array.size(); i++){
        macd.startTime = ema_array[i].startTime;
        macd.close = ema_array[i].close;
        macd.alert = "sell"; //Set alert to sell before processing
        //Check if we have EMA values
        if(ema_array[i].ema24 != 0 && ema_array[i].ema12 != 0){
            //MACD = 12 period EMA - 24 period EMA
            macd.macdLine = ema_array[i].ema12 - ema_array[i].ema24;
        }
        MACD_array.push_back(macd);
    }
    double weightingMultiplier9 = 2.0/(9.0+1.0); // 2/(number of periods + 1)
    double sma9;
    double sum = 0;
    for(unsigned int i = 25; i < 34; i++){ //Our first EMA is at line 24
       sum += MACD_array[i].macdLine;
    }
    sma9 = sum/9.0;
    for(unsigned int i = 25; i < MACD_array.size(); i++){
        if(i==25){
            MACD_array[i].signalLine = (MACD_array[i].macdLine - sma9) 
                * weightingMultiplier9 - sma9;
        }
        else{
            MACD_array[i].signalLine = (MACD_array[i].macdLine 
                - MACD_array[i-1].signalLine) * weightingMultiplier9
                + MACD_array[i-1].signalLine; 
        }
        MACD_array[i].histogram = MACD_array[i].macdLine - MACD_array[i].signalLine;
        if(MACD_array[i].histogram > 0){
            MACD_array[i].alert = "buy";
        }
    }
    return MACD_array;
}
void pack_macd_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, MACD &result){
    //Convert to JSON object
    target->Set(v8::String::NewFromUtf8(isolate, "startTime"), v8::Number::New(isolate, result.startTime));
    target->Set(v8::String::NewFromUtf8(isolate, "close"), v8::Number::New(isolate, result.close));
    target->Set(v8::String::NewFromUtf8(isolate, "macdLine"), v8::Number::New(isolate, result.macdLine));
    target->Set(v8::String::NewFromUtf8(isolate, "signalLine"), v8::Number::New(isolate, result.signalLine));
    target->Set(v8::String::NewFromUtf8(isolate, "histogram"), v8::Number::New(isolate, result.histogram));
    target->Set(v8::String::NewFromUtf8(isolate, "alert"),v8::String::NewFromUtf8(isolate, result.alert.c_str()));
}