#include "averages.h"

std::vector<Average> calculateMovingAverages(std::vector<Candle> &candle_array){
    Average average;
    double movingAverage;
    std::vector<Average> averages;
    //SMA for 7 periods
    //unsigned int period = 6;
    for(unsigned int i = 0; i < candle_array.size(); i++){
        average.startTime = atof(candle_array[i].startTime.c_str());
        average.open = atof(candle_array[i].open.c_str());
        average.high = atof(candle_array[i].high.c_str());
        average.low = atof(candle_array[i].low.c_str());
        average.close = atof(candle_array[i].close.c_str());
        average.volume = atof(candle_array[i].volume.c_str());
        average.alert = "sell";
        double sum;
        //SMA for 7 periods
        if(i >= 6){
            sum = 0;
            for(unsigned int j = 0;  j != 7; j++){
                sum += atof(candle_array[i-j].close.c_str());
            }
            movingAverage = sum/(7);
            average.sma7 = movingAverage;
        }
        //SMA for 25 periods
        if(i >= 24){
            sum = 0;
            for(unsigned int j = 0;  j != 25; j++){
                sum += atof(candle_array[i-j].close.c_str());
            }
            movingAverage = sum/(25);
            average.sma25 = movingAverage;
        }
        //SMA for 99 periods
        if(i >= 98){
            sum = 0;
            for(unsigned int j = 0;  j != 99; j++){
                sum += atof(candle_array[i-j].close.c_str());
            }
            movingAverage = sum/(99);
            average.sma99 = movingAverage;
        }
        averages.push_back(average);
    }
    for(unsigned int i = 0; i < averages.size(); i++){
         //If the price is above 3 averages generate buy
        if(/*(1.002 * atof(averages[i].close.c_str()) > atof(averages[i].sma7.c_str())) &&*/ (averages[i].sma7
            > averages[i].sma25) && (averages[i].sma7 > averages[i].sma99)){
                averages[i].alert = "buy";
          //Make sure the averages are increasing
            /*if((averages[i].sma7 > averages[i-1].sma7) && (averages[i].sma25
                > averages[i-1].sma25) && (averages[i].sma99 > averages[i-1].sma99)){ 
                averages[i].alert = "buy";
            }*/
        }
    }
    return averages;
}
void pack_average_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, Average &result){
    //Convert to JSON object
    target->Set(v8::String::NewFromUtf8(isolate, "startTime"), v8::Number::New(isolate, result.startTime));
    target->Set(v8::String::NewFromUtf8(isolate, "open"), v8::Number::New(isolate, result.open));
    target->Set(v8::String::NewFromUtf8(isolate, "high"), v8::Number::New(isolate, result.high));
    target->Set(v8::String::NewFromUtf8(isolate, "low"), v8::Number::New(isolate, result.low));
    target->Set(v8::String::NewFromUtf8(isolate, "close"), v8::Number::New(isolate, result.close));
    target->Set(v8::String::NewFromUtf8(isolate, "volume"), v8::Number::New(isolate, result.volume));
    double test =  result.sma7;
    if(test == 0)
        target->Set(v8::String::NewFromUtf8(isolate, "sma7"), v8::String::NewFromUtf8(isolate, ""));
    else
        target->Set(v8::String::NewFromUtf8(isolate, "sma7"), v8::Number::New(isolate, test));
    test =  result.sma25;
    if(test == 0)
        target->Set(v8::String::NewFromUtf8(isolate, "sma25"), v8::String::NewFromUtf8(isolate, ""));
    else
        target->Set(v8::String::NewFromUtf8(isolate, "sma25"), v8::Number::New(isolate, test));
    test =  result.sma99;
    if(test == 0)
        target->Set(v8::String::NewFromUtf8(isolate, "sma99"), v8::String::NewFromUtf8(isolate, ""));
    else
        target->Set(v8::String::NewFromUtf8(isolate, "sma99"), v8::Number::New(isolate, test));
    target->Set(v8::String::NewFromUtf8(isolate, "alert"), v8::String::NewFromUtf8(isolate, result.alert.c_str()));
}