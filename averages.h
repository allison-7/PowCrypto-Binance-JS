#ifndef AVERAGES_H
#define AVERAGES_H
#include<node.h>
#include <v8.h>
#include <uv.h>
#include<vector>
#include<string>
#include<stdlib.h>
//#include <algorithm> 
#include "Candle.h"
std::vector<Average> calculateMovingAverages(std::vector<Candle> &candle_array);
void pack_average_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, Average &result);
#endif