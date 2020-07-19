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
set autoscale
unset key
set grid mxtics mytics
set mytics 5
set mytics 5
plot "candles.txt" using 1:2:3:4:5 with candlesticks, "averages.txt" using 1:2 with lines, "averages.txt" using 1:3 with lines, "averages.txt" using 1:4 with lines
set size 1.0, 0.3
set origin 0.0, 0.0
set lmargin at screen 0.04
set rmargin at screen 0.98
set boxwidth 0.5
set style fill solid
unset key
set grid mxtics mytics
set mytics 5
set mytics 5
plot "candles.txt" using 1:6 with boxes
#plot "macd.txt" using 1:2 with lines, "macd.txt" using 1:3 with lines, "macd.txt" using 1:4 with boxes
unset multiplot
pause 1
reset
reread