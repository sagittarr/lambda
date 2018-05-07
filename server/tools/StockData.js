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
}

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
    this.benchmark = undefined
    this.phaseInfo = undefined //optional
    this.quant = {}
}
Aggregation.prototype.computeQuantMetric = function(){
    var ab = Calculator.computeAlphaBeta(this.dailyPctChange, this.benchmark.dailyPctChange)
    var sharp = Calculator.computeSharpRatio(this.dailyPctChange, this.benchmark.dailyPctChange)
    var mdd = Calculator.computeMDD(this.values)
    var voli = Calculator.computeVolatility(this.dailyPctChange)
    let totalReturn = (this.values[this.values.length - 1] / this.values[0]) - 1
    let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (this.dateIndex.length - 1)) - 1
    this.quant = { '1y': { alpha: ab.alpha, beta: ab.beta, sharp: sharp, mdd: mdd, voli: voli, totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: this.dateIndex.length}}
    var incpIndex = _.indexOf(this.dateIndex, this.inceptionDate, true)
    if(incpIndex!=-1){
        let totalReturn = _.last(this.values) / this.values[incpIndex] - 1
        let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (this.dateIndex.length - incpIndex - 1)) - 1
        this.quant['inception'] = { totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: this.dateIndex.length - incpIndex}
    }
    else{
        this.quant['inception'] = ['Error', this.inceptionDate, this.dateIndex]
    }
}

function AggregationFactory(){}

AggregationFactory.prototype.build = function(stocks, inceptionDate=undefined){
    var benchmark;
    stocks.map(stock=> {if(stock.isBenchmark) benchmark = stock} )
    stocks.map(stock => {
        if(!stock.isBenchmark && stock.dateIndex.length<benchmark.dateIndex.length){
            let tmp = []
            benchmark.dateIndex.map(v => { tmp.push(stock.valuesWithDate[v])})
            stock.values = tmp
        }
    })

    var aggSeries = []
    for (var i = 0; i < benchmark.dateIndex.length; i++) {
        let all = []
        stocks.map(stock => { if (!stock.isBenchmark) { all.push(stock.values[i])}  })
        all = _.compact(all)
        if(all.length == 0){
            aggSeries.push(1.);
        }
        else{
            let avg = all.reduce((previous, current) => current += previous) / all.length;
            aggSeries.push(avg);
        }
    }
    var aggregation = new Aggregation('Portfolio')
    aggregation.values = aggSeries
    aggregation.dateIndex = benchmark.dateIndex
    aggregation.dataset = stocks
    aggregation.avgDlyRtn = Math.pow(_.last(aggSeries), 1. / (aggSeries.length - 1))
    aggregation.dailyPctChange = aggSeries.map((v, i) => { return i > 0 ? v / aggSeries[i - 1] : 1. })
    if(inceptionDate){
        aggregation.inceptionDate = inceptionDate
    }
    aggregation.benchmark = benchmark
    return aggregation
}
module.exports = {
    StockData:StockData,
    StockDataFactory: StockDataFactory,
    Aggregation: Aggregation,
    AggregationFactory:AggregationFactory
}
