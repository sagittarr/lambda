var STK = require('./StockData')
const _ = require('underscore')
function CutOff(aggregation, from, to, offset = 0){
    var left = aggregation.dateIndex.indexOf(from)
    var right = aggregation.dateIndex.indexOf(to) + offset
    var slice = {}
    if(to == undefined){
        slice.dateIndex = aggregation.dateIndex.slice(left)
        slice.dailyPctChange = aggregation.dailyPctChange.slice(left)
    }
    else{
        slice.dateIndex = aggregation.dateIndex.slice(left, right)
        slice.dailyPctChange = aggregation.dailyPctChange.slice(left,right)
    }
    slice.tickers = aggregation.dataset.map(stock=>stock.ticker)
    // slice.dataset = aggregation.dataset
    slice.debugInfo = aggregation.debugInfo
    slice.left = left
    slice.right = right
    return slice
}
function combine(slices){
    var dailyPct = []
    var dateIndex = []
    var phaseInfo = []
    for(var i= 0; i< slices.length; i++){
        slices[i].dailyPctChange.map(v => { dailyPct.push(v) })
        slices[i].dateIndex.map(v => { dateIndex.push(v) })
        phaseInfo.push({ tickers: slices[i].tickers, from: slices[i].dateIndex[0], to: slices[i].dateIndex[slices[i].dateIndex.length - 1]})
    }

    // var values = dailyPct.map((pct, i) => {cumProd = cumProd*pct; return cumProd})
    var result = new STK.Aggregation('Strategy')
    result.dateIndex = dateIndex
    result.dailyPctChange = dailyPct
    result.numOfDays = dailyPct.length
    let cumProd = 1
    result.values = dailyPct.map(pct => {cumProd = cumProd*pct; return cumProd})
    result.phaseInfo = phaseInfo
    result.debugInfo = _.last(slices).debugInfo
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
    return combine(this.slices)
}
function Phase(){
    this.from
    this.to
    this.tickers = []
}
module.exports = StrategyBuilder