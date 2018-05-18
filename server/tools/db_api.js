var yahooFinance = require('yahoo-finance');
var Promise = require('promise')
var _u = require('underscore');
const _  = _u;
const axios = require('axios')
var STK = require('./StockData.js')
var StockData = STK.StockData;
var StockDataFactory = STK.StockDataFactory;
var AggregationData = STK.Aggregation;
var AggregationFactory = STK.AggregationFactory
var StrategyBuilder = require('./StrategyBuilder')

var knex = require('knex')({
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        // password: 'Quant2018$$',
        password: 'wx2155a0a67e766226',
        database: 'lambda'
    }
});
var util = require('./Util.js')
// var Calculator = require('./QuantCalculater')

async function handler(query){
    // var mode = query.mode
    var phases = query.phases
    if(typeof(phases) == typeof("str")){
        phases = JSON.parse(phases)
    }
    // var inceptionDate = parseInt(query.inception.replace(/-/g, ''))
    var toUpdateDB = query.toUpdateDB
    var id = query.id

    return new Promise(function(resolve, reject){
        try {
            if (!phases && !id) {
                resolve('no Id no Phase')
            }
            else if (phases && phases.length > 0) {
                if(!_u.last(phases).to) {
                    _u.last(phases).to = -1
                }
                buildStrategyFromPhases(phases).then(function (result) {
                    resolve(result)
                }).catch(function(err){reject(err)})
            }
            else if (id) {
                buildStrategyFromId(id, toUpdateDB).then(function (result) {
                    resolve(result)
                }).catch(function (err) {
                    reject(err)
                })
            }
            else {
                resolve('Error')
            }
        }
        catch(err){
            reject(err)
        }
    })
}

async function buildStrategyFromId (productId, toUpdateTblDB = false, debug = false) {
    return new Promise(function (resolve, reject) {
        knex('portfolio_metadata').select('*').where({ id: productId }).then(function (rows) {
            if (rows.length == 0) {
                resolve("no record found");
            }
            else {
                var phases = JSON.parse(rows[0].phases)
                phases.map((row, i) => {
                    if (i != 0) {
                        phases[i - 1].to = parseInt(row.from);
                    }
                    if (i == phases.length - 1) {
                        row.to = -1
                    }
                })
                // console.log(phases)
                buildStrategyFromPhases(phases).then(function (result) {
                    if(toUpdateTblDB){
                        updateProfileCalculationData(productId, result.quant, result.dataset.numOfDays)
                    }
                    resolve(result)
                }).catch(function (err) {
                    reject(err)
                })
            }
        })
    })
}

async function buildStrategy(phases, spy, inceptionDate){
    if(typeof(phases) == typeof("str")){
        phases = JSON.parse(phases)
    }
    return new Promise(function (resolve, rej) {
      var builder = new StrategyBuilder(phases.length)
        phases.map((phase, i) => {
            loadMultipleStockData(phase.tickers).then(function (stocks) {
                var agg = new AggregationFactory().build(stocks, spy)
                agg.inceptionDate = inceptionDate
                builder.addSlice(agg, phase.from, phase.to)
                if (builder.slices.length == phases.length) {
                    resolve(builder.build())
                }
            })
        })
    })
}
function SplitTimeRange(timeIds, dateIndex, aggValues, spy, inception){
    var timeRange = timeIds.map(timeId => {
        var index = util.dateIndexPicker(dateIndex, timeId)
        var start = spy.dateIndex.indexOf(dateIndex[0])
        var spyValues = spy.values.slice(start)
        var dates = index.map(i => { return  dateIndex[i] })
        var values = index.map(i => { return aggValues[i] / aggValues[index[0]] })
        var benchmark = index.map(i => { return spyValues[i] / spyValues[index[0]] })
            // , firstIndex: index[0], first:comparision[index[0]], firstDate: dates[0], last: comparision[_u.last(index)], idx: index
        return { timeId: timeId == inception ? 'inception' : timeId, index: dates, values: values, benchmark: benchmark, spyValues: spyValues}
    })
    return timeRange
}

async function buildStrategyFromPhases(phases){
    return new Promise(function (resolve, reject) {
        loadSingleStockData('SPY', 'yahoo').then(function (spy) {
            buildStrategy(phases, spy, phases[0].from).then(function (strategyData) {
                var timeIds = ['1y', '3m', '30d', '10d', phases[0].from]
                var timeRange = SplitTimeRange(timeIds, strategyData.dateIndex, strategyData.values, spy, phases[0].from)
                strategyData.benchmark = spy
                strategyData.inceptionDate = phases[0].from
                strategyData.computeQuantMetric()
                var result = {}
                result.benchmark = spy;
                result.dataset = strategyData
                result.timeRange = timeRange
                result.quant = strategyData.quant
                resolve(result)
            })
        }).catch(function (err) {
            reject(err)
        })
    })
}
async function loadSingleStockData(ticker, source){
    return new Promise(function (resolve, reject){
        smartLoadStockHistory(ticker, 'yahoo').then(function(data){
            var stockData = new StockDataFactory().build(data, ticker)
            resolve(stockData)
        }).catch(function (err) {
            reject(err)
        })
    })
}

async function smartLoadStockHistory(ticker, source){
    return new Promise(function(resolve, reject){
        readHistoricalFromDB(ticker, source).then(function (rows) {
            if (rows.length === 0) {
                if(source === 'yahoo') {
                    let dts = util.yearAgo2Today()
                    let quoteTo = dts.to;
                    let quoteFrom = dts.from
                    var request = {ticker: ticker, from: quoteFrom, to: quoteTo, freq: 'd'}
                    getHistoricalDataFromYahoo(request).then(function (ts) {
                            let lastUpdate = Date.now() / 1000
                            insert_historical(ticker, JSON.stringify(ts), lastUpdate, 'yahoo');
                            ts.map(t => {
                                t.date = util.date2Str(new Date(t.date))
                            })
                            resolve(ts)
                        }
                    )
                }
                else if(source === 'iex'){
                    var request = {ticker: ticker, source: 'iex', range: '5y', freq: 'd'}
                    getHistoricalDataFromIEX(request).then(function(ts){
                        let lastUpdate = Date.now() / 1000
                        insert_historical(ticker, JSON.stringify(ts), lastUpdate, 'iex');
                        resolve(ts)
                    }).catch(function (err) {
                        reject(err)
                    })
                }
            }
            else {
                resolve(JSON.parse(rows[0].data))
            }
        })
    })
}
async function loadMultipleStockData(tickers) {
    return new Promise(function (res, rej) {
        var stocks = []
        tickers.forEach(function (t) {
            loadSingleStockData(t, 'yahoo').then(function (stockData) {
                stocks.push(stockData)
                if (stocks.length == tickers.length) {
                    res(stocks)
                }
            })
        })
    })
}

// function computeQuantMetrics(aggregation){
//     var ab = Calculator.computeAlphaBeta(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
//     var sharp = Calculator.computeSharpRatio(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
//     var mdd = Calculator.computeMDD(aggregation.values)
//     var voli = Calculator.computeVolatility(aggregation.dailyPctChange)
//     let totalReturn = (aggregation.values[aggregation.values.length - 1] / aggregation.values[0]) - 1
//     let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (aggregation.dateIndex.length - 1)) - 1
//     aggregation.quant = { '1y': { alpha: ab.alpha, beta: ab.beta, sharp: sharp, mdd: mdd, voli: voli, totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: aggregation.dateIndex.length}}
//     var incpIndex = _u.indexOf(aggregation.dateIndex, aggregation.inceptionDate, true)
//     if(incpIndex!=-1){
//         let totalReturn = _u.last(aggregation.values) / aggregation.values[incpIndex] - 1
//         let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (aggregation.dateIndex.length - incpIndex - 1)) - 1
//         aggregation.quant['inception'] = { totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: aggregation.dateIndex.length - incpIndex}
//     }
//     else{
//         aggregation.quant['inception'] = [aggregation.inceptionDate, aggregation.dateIndex]
//     }
//
// }



async function deleteProfile(profile, response) {
    knex('portfolio_metadata')
        .where({ id: profile.id })
        .del().then(function(res){response.data =res})
}
async function createNewProfile(profile, response) {
    knex('portfolio_metadata').select('*').where({ id: profile.id }).then(function (rows) {
        if(rows.length >0){
            response.data = 'profile existing'
        }
        else{
            knex('portfolio_metadata').insert({ id: profile.id, name: profile.name, desp: profile.desp, inception: profile.inception, last_update: profile.last_update, publisher: profile.publisher, curr_holds: JSON.stringify(profile.curr_holds), ratiosTable: JSON.stringify(profile.ratiosTable), visible: 1 , phases: JSON.stringify(profile.phases)}).then(function (data) {
                console.log(data);
            })
            response.data = 'creation success'
        }
    })
}

function updateProfileCalculationData(id, table, numOfDays) {
    if (id) {
        console.log('updating profile calculation data')
        knex('portfolio_metadata').where('id', '=', id).update({ ratiosTable: JSON.stringify(table) , numOfDays : numOfDays}).then(function (result) { console.log(result) })
    }
}
async function updateProfile(profile, response) {
  knex('portfolio_metadata').where('id', '=', profile.id).update({ id: profile.id, name: profile.name, desp: profile.desp, inception: profile.inception, last_update: profile.last_update, publisher: profile.publisher, curr_holds: JSON.stringify(profile.curr_holds), ratiosTable: JSON.stringify(profile.ratiosTable), phases: JSON.stringify(profile.phases) }).then(function (data) {
    console.log(data);
    response.data = data
  })
}

async function readHistoricalFromDB(ticker, source){
    return new Promise(function (resolve, reject) {
        if (ticker == null) {
            // knex('historical_data').select('*')
            knex('historical_data').distinct('ticker').select().then(function (data) {
                console.log('read all from db', data);
                resolve(data)
            });
        }
        else{
            var where = source == null ? {ticker: ticker} : {ticker: ticker, source : source}
            knex('historical_data').select('*').where(where).then(function (data) {
                console.log('read db', data);
                resolve(data)
            });
        }
    })

}

async function reTryer(retries, info, call){
  var i = 0;
  var success = false;
  while(i<retries){
    i+=1
    // console.log('wrapper retry ', info,  i)
    if(!success){
      await call().then(function(value){success = value; console.log(info, success, i)})
    }
    else{
      break
    }
  }
}

async function getHistoricalDataFromIEX(request) {
    return new Promise(function (resolve, reject) {
        // try{
            axios.get('https://api.iextrading.com/1.0/stock/'+request.ticker.toLowerCase() + '/chart/'+ request.range).then(function(response){
                var data = response.data
                // insert_historical(request.ticker, JSON.stringify(data), Date.now() / 1000, 'iex')
                console.log('iex', data)
                resolve(data)
            })
        // }catch (e) {
        //     reject(e)
        // }
    });
}
async function getHistoricalDataFromYahoo(request) {
    return new Promise(function (resolve, reject) {
        yahooFinance.historical({
            symbol: request.ticker,
            from: request.from,
            to: request.to,
            period: request.freq
            // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
        }, function (err, quotes) {
            if (err) {
                resolve(err);
            }
            else{
                resolve(quotes);
            }
        });
    });
}

function insert_historical(ticker, data, time_stamp, source, update_time = null) {
    knex('historical_data').select()
        .where({'ticker': ticker, 'source' : source})
        .then(function (rows) {
            if (rows.length === 0) {
                // no matching records found
                console.log('try insert', ticker)
                return knex('historical_data').insert({ ticker: ticker, data: data, last_update: time_stamp, update_time: new Date().toISOString() ,  source: source})
            } else {
                console.log('try update', ticker)
                knex('historical_data').where('ticker', ticker).update({ data: data, last_update: time_stamp, update_time: new Date().toISOString() , source: source}).then(function (result) { console.log(result) })
            }
        })
        .catch(function (ex) {
            console.error(ex)
        })
}

function convertIEXData(iexArr){
    var open = iexArr[0].open
    var date = iexArr[0].date
    var close = _.last(iexArr).close
    var highArr = []
    var lowArr = []
    var volumeArr = []
    iexArr.map(day=>{highArr.push(day.high); lowArr.push(day.low); volumeArr.push(day.volume)})
    return {date: date, open : open, high: _.max(highArr), low: _.min(lowArr), close: close, volume : volumeArr.reduce((a, b) => a + b, 0)}
}
function convertHistoricalData(dlyData, freq){
    if(freq === 'W'){
        var weeklyData = []
        for(var i = 0; i<dlyData.length; i+=5){
            var fiveDays = dlyData.slice(i,i+5)
            weeklyData.push(convertIEXData(fiveDays))
        }
        return weeklyData
    }
    else if(freq ==='M'){
        var monthlyData = []
        var i = 1
        var currMonth = dlyData[0].date.replace(/-/g,'').slice(4,6)
        var dayArr = [dlyData[0]]
        while(i < dlyData.length){
            var month = dlyData[i].date.replace(/-/g,'').slice(4,6)
            if( month != currMonth){
                currMonth = month
                monthlyData.push(convertIEXData(dayArr))
                dayArr = []
            }
            dayArr.push(dlyData[i])
            i+=1
        }
        return monthlyData
    }
    else{
        return dlyData
    }
}
module.exports = {
    handler: handler,
    smartLoadStockHistory: smartLoadStockHistory,
    getHistoricalDataFromYahoo: getHistoricalDataFromYahoo,
    getHistoricalDataFromIEX: getHistoricalDataFromIEX,
    insert_historical: insert_historical,
    read_historical: readHistoricalFromDB,
    updateProfile:updateProfile,
    createNewProfile: createNewProfile,
    retryer: reTryer,
    deleteProfile:deleteProfile,
    convertHistoricalData:convertHistoricalData
};

