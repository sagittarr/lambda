var STK = require('./StockData')
function CutOff(aggregation, from, to, offset = 0){
    var left = aggregation.dateIndex.indexOf(from)
    var right = aggregation.dateIndex.indexOf(to) + offset
    var ts = {}
    if(to == undefined){
        ts.dateIndex = aggregation.dateIndex.slice(left)
        ts.dailyPctChange = aggregation.dailyPctChange.slice(left)
    }
    else{
        ts.dateIndex = aggregation.dateIndex.slice(left, right)
        ts.dailyPctChange = aggregation.dailyPctChange.slice(left,right)
    }
    ts.left = left
    ts.right = right
    return ts
}
function concat_ts(samples){
    var dailyPct = []
    var dateIndex = []
    var phaseInfo = []
    for(var i= 0; i< samples.length; i++){
        samples[i].dailyPctChange.map(v => { dailyPct.push(v) })
        samples[i].dateIndex.map(v => { dateIndex.push(v) })
        phaseInfo.push({ from: samples[i].dateIndex[0], to: samples[i].dateIndex[samples[i].dateIndex.length - 1]})
    }

    // var values = dailyPct.map((pct, i) => {cumProd = cumProd*pct; return cumProd})
    var result = new STK.Aggregation('Strategy')
    result.dateIndex = dateIndex
    result.dailyPctChange = dailyPct
    let cumProd = 1
    result.values = dailyPct.map(pct => {cumProd = cumProd*pct; return cumProd})
    result.phaseInfo = phaseInfo
    return result
}

function StrategyBuilder(numOfPhases = -1){
    this.slices = []
    this.numOfPhases = numOfPhases
}
StrategyBuilder.prototype.addSlice = function (aggregation, from, to){
    if(to == -1){
        this.slices.push(CutOff(aggregation, from))
    }
    else{
        this.slices.push(CutOff(aggregation, from, to))
    }
}
StrategyBuilder.prototype.build =  function () {
    return concat_ts(this.slices)
}
function Phase(){
    this.from
    this.to
    this.tickers = []
}
module.exports = StrategyBuilder