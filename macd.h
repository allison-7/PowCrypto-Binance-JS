#ifndef MACD_H
#define MACD_H
#include<node.h>
#include <v8.h>
#include <uv.h>
#include <vector>
#include "Candle.h"
std::vector<EMA> calculateEMA(std::vector<Candle> candle_array);
std::vector<MACD> calculateMACD(std::vector<Candle> candle_array);
void pack_macd_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, MACD &result);
#endif 