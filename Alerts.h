#ifndef ALERTS_H
#define ALERTS_H
#include<node.h>
#include <v8.h>
#include <uv.h>
#include <vector>
#include "Candle.h"
#include "averages.h"
#include "macd.h"
std::vector<Alerts> getAlerts(std::vector<Candle> &candle_array);
void pack_alerts_result(v8::Isolate* isolate, v8::Local<v8::Object> &target, Alerts &result);
#endif