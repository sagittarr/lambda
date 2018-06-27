var _ = require('underscore');
var Calculator = require('./QuantCalculater')

function StockData () {
    this.ticker = ''
    this.adjClose = []
    this.dateIndex = []
    this.dailyPctChange = []
    this.values = []
    this.valuesWithDate = {}
    this.isBenchmark = false
    this.last_update = NaN
    this.quant = {}
}
// StockData.prototype.computeQuantMetric = function(){
//     // var ab = Calculator.computeAlphaBeta(this.dailyPctChange, this.benchmark.dailyPctChange)
//     // var sharp = Calculator.computeSharpRatio(this.dailyPctChange, this.benchmark.dailyPctChange)
//     var mdd = Calculator.computeMDD(this.values)
//     var voli = Calculator.computeVolatility(this.dailyPctChange)
//     let totalReturn = (this.values[this.values.length - 1] / this.values[0]) - 1
//     let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (this.dateIndex.length - 1)) - 1
//     this.quant = {
//         mdd: mdd,
//         voli: voli,
//         totalReturn: totalReturn*100,
//         avgDlyReturn: avgDlyReturn*100,
//         numOfDays: this.dateIndex.length}
// }
function StockDataFactory(){}
StockDataFactory.prototype.build = function(input, ticker, lastUpdate=NaN, benchmarkTicker = 'SPY'){
    var prices = []
    var dates = []
    for (var i = 0; i < input.length; i++) {
        prices.push(input[i]['adjClose'])
        dates.push(parseInt(input[i].date.slice(0, 10).replace(/-/g, '')))
    }
    prices = prices.reverse()
    dates = dates.reverse()

    var stk = new StockData()
    stk.ticker = ticker
    stk.dateIndex = dates
    stk.adjClose = prices
    stk.dailyPctChange = prices.map((v, i) => { return i > 0 ? v / prices[i - 1] : 1 })
    stk.values = prices.map((v) => v / prices[0])
    stk.values.map((v, i) => { stk.valuesWithDate[dates[i]] = v; return })
    stk.isBenchmark = ticker === benchmarkTicker
    stk.last_update = lastUpdate
    return stk
}
function Aggregation(name){
    this.ticker = name
    this.values = []
    this.dateIndex = []
    this.dataset = []
    this.avgDlyRtn
    this.dailyPctChange = []
    this.inceptionDate = ''
    this.debugInfo = []
    this.phaseInfo = undefined //optional
    this.numOfDays = NaN
    this.quant = {}
}
// Aggregation.prototype.computeQuantMetric = function(){
//     this.quant['inception'] = Calculator.computeAll(this.values)
// }

function AggregationFactory(){}

AggregationFactory.prototype.build = function(stocks, spy, inceptionDate=undefined){
    stocks.map(stock => {
        if(stock.dateIndex.length<spy.dateIndex.length){
            let tmp = []
            spy.dateIndex.map(v => { tmp.push(stock.valuesWithDate[v])})
            stock.values = tmp
        }
    })
    var info = []
    var cumvalues = []
    for (var i = 0; i < spy.dateIndex.length; i++) {
        let all = []
        stocks.map(stock => { all.push(stock.values[i])})
        all = _.compact(all)
        if(all.length == 0){
            if(cumvalues.length>0){
                cumvalues.push(_.last(cumvalues));
            }
            else{
                cumvalues.push(1.);
            }
        }
        else{
            let avg = all.reduce((previous, current) => current += previous) / all.length;
            cumvalues.push(avg);
        }
        info.push(all)
    }
    var aggregation = new Aggregation('Portfolio')
    aggregation.values = cumvalues
    aggregation.dateIndex = spy.dateIndex
    aggregation.dataset = stocks
    aggregation.avgDlyRtn = Math.pow(_.last(cumvalues), 1. / (cumvalues.length - 1))
    aggregation.dailyPctChange = cumvalues.map((v, i) => { return i > 0 ? v / cumvalues[i - 1] : 1. })
    // info = [_.last(cumvalues, 2)]
    aggregation.debugInfo = [_.last(info, 2)]
    if(inceptionDate){
        aggregation.inceptionDate = parseInt(inceptionDate)
    }
    // aggregation.benchmark = benchmark
    return aggregation
}
module.exports = {
    StockData:StockData,
    StockDataFactory: StockDataFactory,
    Aggregation: Aggregation,
    AggregationFactory:AggregationFactory
}
