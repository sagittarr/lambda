var yahooFinance = require('yahoo-finance');
var Promise = require('promise')
var _u = require('underscore');
var STK = require('./StockData.js')
var StockData = STK.StockData;
var StockDataFactory = STK.StockDataFactory;
var AggregationData = STK.Aggregation;
var AggregationFactory = STK.AggregationFactory
var StrategyBuilder = require('./StrategyBuilder')
// var Series = require('pandas-js').Series;
// var DataFrame = require('pandas-js').DataFrame;
// var DF = require('data-forge');
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
var Calculator = require('./QuantCalculater')

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
              console.log(phases)
              buildStrategyFromPhases(phases).then(function (result) {
                  resolve(result)
              })
          }
          else if (id) {
              build_strategy_ts_from_id(id, toUpdateDB).then(function (result) {
                  resolve(result)
              })
          }
          else {
              resolve('Error')
          }
      }
      catch(Err){
        resolve(Err)
      }
    })

}

async function build_strategy_ts_from_id(productId, toUpdateTblDB = false, debug = false) {
    return new Promise(function (resolve, rej) {
        knex('phases').select('*').where({ id: productId }).then(function (rows) {
            if (rows.length == 0) {
                resolve("no record found");
            }
            else {
                rows.map((row, i) => {
                    row.tickers = JSON.parse(row.holds);
                    row.from = parseInt(row.date);
                    if (i != 0) {
                        rows[i - 1].to = parseInt(row.date);
                    }
                    if (i == rows.length - 1) {
                      row.to = -1
                    }
                })
                buildStrategyFromPhases(rows).then(function (result) {
                    if(toUpdateTblDB){
                        updateRatiosTable(productId, result.quant)
                    }
                  resolve(result)
                })
            }
        })
    })
}

// input = [{tickers, from, to}]
async function build_strategy_ts(phases, inceptionDate){
    // var slices = []
    if(typeof(phases) == typeof("str")){
        phases = JSON.parse(phases)
    }
    phases.map(input => {
        if (_u.indexOf(input.tickers, 'SPY') == -1) {
            input.tickers.push('SPY')
        }
        // input.from = parseInt(input.from)
        // input.to = parseInt(input.to)
    })
    return new Promise(function (resolve, rej) {
      var builder = new StrategyBuilder(phases.length)
        phases.map((phase, i) => {
            load_historical_data(phase.tickers).then(function (stocks) {
                var agg = new AggregationFactory().build(stocks)
                agg.inceptionDate = inceptionDate
                builder.addSlice(agg, phase.from, phase.to)
                if (builder.slices.length == phases.length) {
                    resolve(builder.build())
                }
            })
        })
    })
}
function SplitTimeRange(timeIds, dateIndex, aggValues, comparision, inception){
  var timeRange = timeIds.map(timeId => {
    var index = util.dateIndexPicker(dateIndex, timeId)
    index = _u.compact(index)
    var dates = index.map(i => { return  dateIndex[i] })
    var values = index.map(i => { return aggValues[i] / aggValues[index[0]] })
    var benchmark = index.map(i => { return comparision[i] / comparision[index[0]] })
    return { timeId: timeId == inception ? 'inception' : timeId, index: dates, values: values, benchmark: benchmark }
  })
  return timeRange
}

async function buildStrategyFromPhases(phases){
    var numOfPhase = phases.length
    return new Promise(function (resolve, reject) {
        build_strategy_ts(phases, phases[0].from).then(function (strategyData) {
            loadSingleStock('SPY', phases[0].from, phases[numOfPhase - 1].to).then(function (spy) {
                var timeIds = ['1y', '3m', '30d', '10d', phases[0].from]
                var timeRange = SplitTimeRange(timeIds, strategyData.dateIndex, strategyData.values, spy.values, phases[0].from)
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
        })
    })
}

async function loadSingleStock(ticker, from, to){
    var dts = util.yearAgo2Today()
    var quoteTo = dts.to;
    var quoteFrom = dts.from
    return new Promise(function(resolve, reject){
        knex('historical_data').select('*').where({ ticker: ticker }).then(function (rows) {
            if (rows.length === 0) {
                var request = { symbol: ticker, from: quoteFrom, to: quoteTo, period: 'd' }
                quote_historical2(request).then(function (ts) {
                        let last_update = Date.now() / 1000
                        insert_historical(ticker, JSON.stringify(ts), last_update);
                        ts.map(t => { t.date = util.date2Str(new Date(t.date)) })
                        // var stockData = processStockData(ts, ticker)
                        var stockData =  new StockDataFactory().build(ts, ticker, last_update)
                        resolve(stockData)
                    }
                )
            }
            else {
                var stockData =  new StockDataFactory().build(JSON.parse(rows[0].data), ticker, rows[0].last_update)
                console.log('found records of ', ticker)
                resolve(stockData)
            }
        })
    })
}
async function load_historical_data(tickers, from = undefined) {
    var stocks = []
    var dts = util.yearAgo2Today()
    var to = dts.to;
    if (!from) {
        from = dts.from
    }
    return new Promise(function (res, rej) {
        tickers.forEach(function (t) {
            loadSingleStock(t, from, to).then(function (stockData) {
                stocks.push(stockData)
                if (stocks.length == tickers.length) {
                    res(stocks)
                }
            })
        })
    })
}

function computeQuantMetrics(aggregation){
    var ab = Calculator.computeAlphaBeta(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
    var sharp = Calculator.computeSharpRatio(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
    var mdd = Calculator.computeMDD(aggregation.values)
    var voli = Calculator.computeVolatility(aggregation.dailyPctChange)
    let totalReturn = (aggregation.values[aggregation.values.length - 1] / aggregation.values[0]) - 1
    let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (aggregation.dateIndex.length - 1)) - 1
    aggregation.quant = { '1y': { alpha: ab.alpha, beta: ab.beta, sharp: sharp, mdd: mdd, voli: voli, totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: aggregation.dateIndex.length}}
    var incpIndex = _u.indexOf(aggregation.dateIndex, aggregation.inceptionDate, true)
    if(incpIndex!=-1){
        let totalReturn = _u.last(aggregation.values) / aggregation.values[incpIndex] - 1
        let avgDlyReturn = Math.pow(totalReturn + 1, 1. / (aggregation.dateIndex.length - incpIndex - 1)) - 1
        aggregation.quant['inception'] = { totalReturn: totalReturn*100, avgDlyReturn: avgDlyReturn*100, numOfDays: aggregation.dateIndex.length - incpIndex}
    }
    else{
        aggregation.quant['inception'] = [aggregation.inceptionDate, aggregation.dateIndex]
    }

}

function timeRangeSlice(aggregation, inception_date, benchmark_ticker ='SPY') {
    var timeIds = ['1y', '3m', '30d', '10d', inception_date]
    var timeRange = SplitTimeRange(timeIds, aggregation.dateIndex, aggregation.values, aggregation.benchmark.values, inception_date)
    return timeRange
}

function updateRatiosTable(id, table) {
  if (id) {
    knex('portfolio_metadata').where('id', '=', id).update({ ratiosTable: JSON.stringify(table) }).then(function (result) { console.log(result) })
  }
}
async function updateProfile(profile){
    var profile = JSON.parse(profile)
    knex('portfolio_metadata').where('id', '=', profile.id).update({ id: profile.id, name: profile.name, desp: profile.desp, inception: profile.inception, last_update: profile.last_update, publisher: profile.publisher, curr_holds: JSON.stringify(profile.curr_holds), ratiosTable: JSON.stringify(profile.ratiosTable) }).then(function(data){
        console.log(data);
        knex('phases').insert({ phase_id: profile.newPhaseId, id: profile.id, date: profile.inception, holds: JSON.stringify(profile.curr_holds)})
        ctx.state.data = data
    })
}

async function read_historical(ticker){
  return new Promise(function (resolve, reject) {
    if (ticker == null) {
      knex('historical_data').select('*').then(function (data) {
        console.log('read all from db', data);
        resolve(data)
      });
    }
    else{
      knex('historical_data').select('*').where({ ticker: ticker }).then(function (data) {
        console.log('read db', data);
        resolve(data)
      });
    }
  })

}

async function retryer(retries, info, call){
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

async function quote_historical2(request) {
    return new Promise(function (resolve, reject) {
        yahooFinance.historical({
            symbol: request.symbol,
            from: request.from,
            to: request.to,
            period: request.period
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


// function quote_historical(request, callback){
//   yahooFinance.historical({
//     symbol: request.symbol,
//     from: request.from,
//     to: request.to,
//     period: request.period,
//     // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
//   }, function (err, quotes) {
//     if (err) {
//       console.err(err)
//       return
//     }
//     console.log(quotes)
//     callback(quotes)
//   });
// }



function insert_historical(ticker, data, time_stamp, update_time = null) {
  // knex('historical_data').insert({ ticker: ticker, data: data, last_update: time_stamp }).then(function (data) {
  //   console.log('insert data',ticker)  });

  knex('historical_data').select()
    .where('ticker', ticker)
    .then(function (rows) {
      if (rows.length === 0) {
        // no matching records found
        console.log('try insert', ticker)
        return knex('historical_data').insert({ ticker: ticker, data: data, last_update: time_stamp, update_time: new Date().toISOString() })
      } else {
        console.log('try update', ticker)
        knex('historical_data').where('ticker', ticker).update({ data: data, last_update: time_stamp, update_time: new Date().toISOString() }).then(function (result) { console.log(result) })
      }
    })
    .catch(function (ex) {
      console.error(ex)
      // you can find errors here.
    })
}
module.exports = {
    handler: handler,
    computeQuantMetrics: computeQuantMetrics,
    timeRangeSlice: timeRangeSlice,
    // aggregateStockData: aggregateStockData,
    load_historical_data: load_historical_data,
    loadSingleStock: loadSingleStock,
    quote_historical2: quote_historical2,
    insert_historical: insert_historical,
    read_historical: read_historical,
    build_strategy_ts: build_strategy_ts,
    build_strategy_ts_from_id: build_strategy_ts_from_id,
    updatePortfolioProfile: updateRatiosTable,
    buildStrategyFromPhases: buildStrategyFromPhases,
    updateProfile:updateProfile,
    retryer: retryer
    // handle_historical_request: handle_historical_request,
    // historical_callback: historical_callback
};

