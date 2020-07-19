#ifndef CANDLE_H
#define CANDLE_H
#include<string>
struct Candle{
    std::string startTime;
    std::string open;
    std::string high;
    std::string low;
    std::string close;
    std::string volume;
};
struct Average{
    double startTime;
    double open;
    double high;
    double low;
    double close;
    double volume;
    double sma7;
    double sma25;
    double sma99;
    std::string alert;
};
struct EMA{
    double startTime;
    double close;
    double ema12;
    double ema24;
};
struct MACD{
    double startTime;
    double close;
    double macdLine;
    double signalLine;
    double histogram; //Distance between MACD & signal line
    std::string alert;
};
struct Alerts{
    double startTime;
    std::string alert;
};
#endif