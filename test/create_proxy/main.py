import js as window
from polyscript.js_modules import d3, dc
from polyscript.js_modules.crossfilter import default as crossfilter

chart = dc.BarChart.new("#test")

experiments = d3.csvParse(d3.select('pre#data').text())

for x in experiments:
    x.Speed = int(x.Speed)

ndx = crossfilter(experiments)
runDimension = ndx.dimension(lambda d,*_: int(d.Run))

reduce_sum = lambda d,*_: d.Speed * int(d.Run) / 1000
speedSumGroup = runDimension.group().reduceSum(reduce_sum)

def click(e, d):
    window.console.log("click!", d)

def renderlet(chart):
    chart.selectAll('rect').on("click", click)

chart.width(768)
chart.height(480)
chart.x(d3.scaleLinear().domain([6,20]))
chart.brushOn(False)
chart.yAxisLabel("This is the Y Axis!")
chart.dimension(runDimension)
chart.group(speedSumGroup)
chart.on('renderlet', renderlet)
chart.render()
