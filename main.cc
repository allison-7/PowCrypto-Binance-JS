#include<node.h>
#include <v8.h>
#include "averages.h"
#include "macd.h"
#include "Alerts.h"
//Declare our asynchronous helper functions
struct Work {
  uv_work_t  request;
  v8::Persistent<v8::Function> callback;
  std::vector<Candle> candles;
  std::vector<Average> averages;
  std::vector<MACD> macd;
  std::vector<Alerts> alerts;
};
static void WorkAsyncAverages(uv_work_t *req)
{
    Work *work = static_cast<Work *>(req->data);
    work->averages = calculateMovingAverages(work->candles);
    // this is the worker thread, lets build up the results
    // allocated results from the heap because we'll need
    // to access in the event loop later to send back
}
// called by libuv in event loop when async function completes
static void WorkAsyncCompleteAverages(uv_work_t *req,int status)
{
    v8::Isolate* isolate = v8::Isolate::GetCurrent();

    // Fix for Node 4.x - thanks to https://github.com/nwjs/blink/commit/ecda32d117aca108c44f38c8eb2cb2d0810dfdeb
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Array> result_list = v8::Array::New(isolate);
    Work *work = static_cast<Work *>(req->data);

    // the work has been done, and now we pack the results
    // vector into a Local array on the event-thread's stack.

    for (unsigned int i = 0; i < work->averages.size(); i++ ) {
      v8::Local<v8::Object> result = v8::Object::New(isolate);
      pack_average_result(isolate, result, work->averages[i]);
      result_list->Set(i, result);
    }
    // set up return arguments
   v8::Handle<v8::Value> argv[] = { result_list };
    
    // execute the callback
    v8::Local<v8::Function>::New(isolate, work->callback)->Call(isolate->GetCurrentContext()->Global(), 1, argv);
    
   // Free up the persistent function callback
    work->callback.Reset();
   
    delete work;
}
static void WorkAsyncMACD(uv_work_t *req)
{
    Work *work = static_cast<Work *>(req->data);
    work->macd = calculateMACD(work->candles);
    // this is the worker thread, lets build up the results
    // allocated results from the heap because we'll need
    // to access in the event loop later to send back
}
// called by libuv in event loop when async function completes
static void WorkAsyncCompleteMACD(uv_work_t *req,int status)
{
    v8::Isolate* isolate = v8::Isolate::GetCurrent();

    // Fix for Node 4.x - thanks to https://github.com/nwjs/blink/commit/ecda32d117aca108c44f38c8eb2cb2d0810dfdeb
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Array> result_list = v8::Array::New(isolate);
    Work *work = static_cast<Work *>(req->data);

    // the work has been done, and now we pack the results
    // vector into a Local array on the event-thread's stack.

    for (unsigned int i = 0; i < work->macd.size(); i++ ) {
      v8::Local<v8::Object> result = v8::Object::New(isolate);
      pack_macd_result(isolate, result, work->macd[i]);
      result_list->Set(i, result);
    }
    // set up return arguments
   v8::Handle<v8::Value> argv[] = { result_list };
    
    // execute the callback
    v8::Local<v8::Function>::New(isolate, work->callback)->Call(isolate->GetCurrentContext()->Global(), 1, argv);
    
   // Free up the persistent function callback
    work->callback.Reset();
   
    delete work;
}
static void WorkAsyncAlerts(uv_work_t *req)
{
    Work *work = static_cast<Work *>(req->data);
    work->alerts = getAlerts(work->candles);
    // this is the worker thread, lets build up the results
    // allocated results from the heap because we'll need
    // to access in the event loop later to send back
}
// called by libuv in event loop when async function completes
static void WorkAsyncCompleteAlerts(uv_work_t *req,int status)
{
    v8::Isolate* isolate = v8::Isolate::GetCurrent();

    // Fix for Node 4.x - thanks to https://github.com/nwjs/blink/commit/ecda32d117aca108c44f38c8eb2cb2d0810dfdeb
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Array> result_list = v8::Array::New(isolate);
    Work *work = static_cast<Work *>(req->data);

    // the work has been done, and now we pack the results
    // vector into a Local array on the event-thread's stack.

    for (unsigned int i = 0; i < work->alerts.size(); i++ ) {
      v8::Local<v8::Object> result = v8::Object::New(isolate);
      pack_alerts_result(isolate, result, work->alerts[i]);
      result_list->Set(i, result);
    }
    // set up return arguments
   v8::Handle<v8::Value> argv[] = { result_list };
    
    // execute the callback
    v8::Local<v8::Function>::New(isolate, work->callback)->Call(isolate->GetCurrentContext()->Global(), 1, argv);
    
   // Free up the persistent function callback
    work->callback.Reset();
   
    delete work;
}
//Unpack the JSON candle into a C++ object
static void unpack_candle(Work *work, v8::Isolate * isolate, const v8::FunctionCallbackInfo<v8::Value>& args){
    Candle candle;
    v8::Handle<v8::Array> candle_array =  v8::Handle<v8::Array>::Cast(args[0]); //Candle array
    std::vector<Candle> unpacked_candle_array;
    unsigned int candle_count = candle_array->Length();
    for(unsigned int i = 0; i < candle_count; i++){
        //Go through all the elements of every candle object in the array
        v8::Handle<v8::Object> jsElement = v8::Handle<v8::Object>::Cast(candle_array->Get(i));
        v8::Handle<v8::Value> startTime_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "startTime"));
        v8::Handle<v8::Value> open_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "open"));
        v8::Handle<v8::Value> high_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "high"));
        v8::Handle<v8::Value> low_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "low"));
        v8::Handle<v8::Value> close_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "close"));
        v8::Handle<v8::Value> volume_value = jsElement->Get(v8::String::NewFromUtf8(isolate, "volume"));
        v8::String::Utf8Value startTime_utf(startTime_value);
        candle.startTime = std::string(*startTime_utf);
        v8::String::Utf8Value open_utf(open_value);
        candle.open = std::string(*open_utf);
        v8::String::Utf8Value high_utf(high_value);
        candle.high = std::string(*high_utf);
        v8::String::Utf8Value low_utf(low_value);
        candle.low = std::string(*low_utf);
        v8::String::Utf8Value close_utf(close_value);
        candle.close = std::string(*close_utf);
        v8::String::Utf8Value volume_utf(volume_value);
        candle.volume = std::string(*volume_utf);
        work->candles.push_back(candle);
        //unpacked_candle_array.push_back(candle);
    }
    //return unpacked_candle_array;
}
//Our methods to be exported
void MovingAverage(const v8::FunctionCallbackInfo<v8::Value> & args){
    v8::Isolate* isolate = args.GetIsolate();
    Work *work = new Work();
    work->request.data = work;
    unpack_candle(work, isolate, args);
    // store the callback from JS in the work package so we can
    // invoke it later
    v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(args[1]);
    work->callback.Reset(isolate, callback);
     // kick of the worker thread
    uv_queue_work(uv_default_loop(),&work->request,WorkAsyncAverages,WorkAsyncCompleteAverages);
    args.GetReturnValue().Set(Undefined(isolate));
}
void MACD(const v8::FunctionCallbackInfo<v8::Value> & args){
    v8::Isolate* isolate = args.GetIsolate();
    Work *work = new Work();
    work->request.data = work;
    unpack_candle(work, isolate, args);
    // store the callback from JS in the work package so we can
    // invoke it later
    v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(args[1]);
    work->callback.Reset(isolate, callback);
     // kick of the worker thread
    uv_queue_work(uv_default_loop(),&work->request,WorkAsyncMACD,WorkAsyncCompleteMACD);
    args.GetReturnValue().Set(Undefined(isolate));
}
void AlertsOnly(const v8::FunctionCallbackInfo<v8::Value> & args){
     v8::Isolate* isolate = args.GetIsolate();
    Work *work = new Work();
    work->request.data = work;
    unpack_candle(work, isolate, args);
    // store the callback from JS in the work package so we can
    // invoke it later
    v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(args[1]);
    work->callback.Reset(isolate, callback);
     // kick of the worker thread
    uv_queue_work(uv_default_loop(),&work->request,WorkAsyncAlerts,WorkAsyncCompleteAlerts);
    args.GetReturnValue().Set(Undefined(isolate));
}
void Initialize(v8::Handle <v8::Object> exports, v8::Handle<v8::Object> module){
    NODE_SET_METHOD(exports, "movingAverage", MovingAverage);
    NODE_SET_METHOD(exports, "macd", MACD);
    NODE_SET_METHOD(exports, "alertsOnly", AlertsOnly);
}
NODE_MODULE(technical_analysis, Initialize) //targetname