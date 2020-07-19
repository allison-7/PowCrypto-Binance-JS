#include "Alerts.h"

std::vector<Alerts> getAlerts(std::vector<Candle> &candle_array){
    std::vector<Average> averages_Local = calculateMovingAverages(candle_array);
    std::vector<MACD> macd_Local = calculateMACD(candle_array);
    std::vector<Alerts> alerts_Local;
    Alerts alert_Local;
    //Both arrays should be the same size
    for(unsigned int i = 0; i<averages_Local.size(); i++){
        alert_Local.startTime = averages_Local[i].startTime;
        if((averages_Local[i].alert == "buy") && macd_Local[i].alert == "buy"){
            alert_Local.alert = "buy";
        } else{
            alert_Local.alert = "sell";
        }
        alerts_Local.push_back(alert_Local);
    }
    return alerts_Local;
}
void pack_alerts_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, Alerts &result){
    //Convert to JSON object
    target->Set(v8::String::NewFromUtf8(isolate, "startTime"), v8::Number::New(isolate, result.startTime));
    target->Set(v8::String::NewFromUtf8(isolate, "alert"), v8::String::NewFromUtf8(isolate, result.alert.c_str()));
}