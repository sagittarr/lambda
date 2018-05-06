var yahooFinance = require('yahoo-finance');
var Promise = require('promise')
var _u = require('underscore');
var StockData = require('./StockData.js')
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
var ss = require('simple-statistics')

class Calculator {
  static computeAlphaBeta(ts1, ts2) {
    var arr = []
    ts1.map((item, i) => { arr.push([ts1[i], ts2[i]]) })
    var res = ss.linearRegression(arr)
    return { alpha: res.b, beta: res.m }
    // console.log(ss.linearRegression(arr))
  }

  static computeSharpRatio(ts1, ts2) {
    return (ss.mean(ts1) - ss.mean(ts2)) / ss.standardDeviation(ts1);
  }

  static computeMDD(data) {
    var peak = 0.;
    var mdd = 1.;
    data.forEach(function (current, i, a) {
      if (current > peak) {
        peak = current;
      }
      // console.log( peak, current, mdd)
      if (current / peak < mdd) {
        mdd = current / peak;
      }
    })
    return mdd
  }

  static computeVolatility(returns) {
    // console.log(portfolio.aggregation.returns.map(Math.log))
    var N = returns.length;
    return Math.sqrt(N) * ss.standardDeviation(returns.map(Math.log))
  }
}
function cut_off(aggregation, from, to, offset = 0){
  var left = aggregation.dateIndex.indexOf(from) + offset
  var right = aggregation.dateIndex.indexOf(to)
  var ts = {}
  ts.dateIndex = aggregation.dateIndex.slice(left, right)
  ts.dailyPctChange = aggregation.dailyPctChange.slice(left,right)
  ts.left = left
  ts.right = right
  return ts
}
function concat_ts(samples){
  var dailyPct = []
  var dateIndex = []
  var phases = []
  for(var i= 0; i< samples.length; i++){
    samples[i].dailyPctChange.map(v => { dailyPct.push(v) })
    samples[i].dateIndex.map(v => { dateIndex.push(v) })
    phases.push({ from: samples[i].dateIndex[0], to: samples[i].dateIndex[samples[i].dateIndex.length - 1]})
  }
  let cumProd = 1.
  var values = dailyPct.map((pct, i) => {cumProd = cumProd*pct; return cumProd})
  return {values: values, dateIndex : dateIndex, phases : phases}
}

async function build_strategy_ts_from_id(productId, debug = false) {
  var samples = []
  return new Promise(function (resolve, rej) {
    knex('phases').select('*').where({ id: productId }).then(function (rows) {
      if (rows.length == 0) {
        resolve("no record found");
      }
      else {
        var inputs = []
        rows.map((row, i) => {
          row.tickers = JSON.parse(row.holds);
          row.from = parseInt(row.date);
          if (i != 0) {
            rows[i - 1].to = parseInt(row.date);
          }
          if (i == rows.length - 1) {
            //             row.to = 20180420
            row.to = parseInt(util.yearAgo2Today().to);
          }
        })
        build_strategy_ts(rows).then(function (result) { resolve(result) })
      }
    })
  })
}

// input = [{tickers, from, to}]
async function build_strategy_ts(phases){
  var slices = []
  if(typeof(phases) == typeof("str")){
    phases = JSON.parse(phases)
  }
  phases.map(input => { 
    if (_u.indexOf(input.tickers, 'SPY') == -1) {
      input.tickers.push('SPY')
    }
    input.from = parseInt(input.from)
    input.to = parseInt(input.to)
  })
  return new Promise(function (res, rej) {
    phases.map((input, i) => {
      load_historical_data(input.tickers).then(function (dataset) {
        var agg = aggregateStockData(dataset)
        slices.push(cut_off(agg, input.from, input.to))
        if (slices.length == phases.length) {
          var final_ts = concat_ts(slices)
          res(final_ts)
        }
      })
    })
  })
}
function applySlice(timeIds, dateIndex, aggValues, comparision, incpetion){
  var timeRange = timeIds.map(timeId => {
    var index = util.dateIndexPicker(dateIndex, timeId)
    index = _u.compact(index)
    var dates = index.map(i => { return  dateIndex[i] })
    var values = index.map(i => { return aggValues[i] / aggValues[index[0]] })
    var benchmark = index.map(i => { return comparision[i] / comparision[index[0]] })
    return { timeId: timeId == incpetion ? 'inception' : timeId, index: dates, values: values, benchmark: benchmark }
  })
  return timeRange
}

async function buildStrategyFromPhases(phases){
  var numOfPhase = phases.length
  return new Promise(function (resolve, reject) {
    build_strategy_ts(phases).then(function (dataset) {
      var finalData = {}
      loadSingleStock('SPY', phases[0].from, phases[numOfPhase - 1].to).then(function (spy) {
        finalData.benchmark = spy;
        finalData.dataset = dataset;
        var aggValues = dataset.values
        var timeIds = ['1y', '3m', '30d', '10d', phases[0].from]
        var timeRange = applySlice(timeIds, dataset.dateIndex, aggValues, spy.values, phases[0].from)
        finalData.timeRange = timeRange
        resolve(finalData)
      })
    })
  })
}
async function loadSingleStock(ticker, from, to){
  var dts = util.yearAgo2Today()
  var quoateTo = dts.to;
  var quoteFrom = dts.from

  return new Promise(function(resovle, reject){
    knex('historical_data').select('*').where({ ticker: ticker }).then(function (rows) {
      if (rows.length === 0) {
        var request = { symbol: ticker, from: quoteFrom, to: quoateTo, period: 'd' }
        quote_historical2(request).then(function (ts) {
          let last_update = Date.now() / 1000
          insert_historical(ticker, JSON.stringify(ts), last_update);
          ts.map(t => { t.date = util.date2Str(new Date(t.date)) })
          var stockData = processStockData(ts, ticker)
          stockData.last_update = last_update
          // stockData.isBenchmark = ticker == 'SPY' ? true : false;
          resovle(stockData)
        }
        )
      }
      else {
        var stockData = processStockData(JSON.parse(rows[0].data), ticker)
        stockData.last_update = rows[0].last_update
        // stockData.isBenchmark = ticker == 'SPY' ? true : false;
        console.log('found records of ', ticker)
        resovle(stockData)
      }
    })
  })
}
async function load_historical_data(tickers, inceptionDate, from = undefined) {
  var dataset = []
  dataset.inceptionDate = inceptionDate
  var dts = util.yearAgo2Today()
  var to = dts.to;
  if (from == undefined) {
    from = dts.from
  }
  return new Promise(function (res, rej) {
    tickers.forEach(function (t) {
      loadSingleStock(t, from, to).then(function (stockData) {
        stockData.isBenchmark = t == 'SPY' ? true : false;
        dataset.push(stockData)
        if (dataset.length == tickers.length) {
          res(dataset)
        }
      })
    })
  })
}

function computeDailyReturns(stockData) {
  var returns = [1]
  for (var i = 1; i < stockData.values.length; i++) {
    returns.push(stockData.values[i] / stockData.values[i - 1])
  }
  return returns;
};

function processStockData(stock_ts, ticker, benchmarkTicker = 'SPY') {
    var prices = []
    var dates = []
    for (var i = 0; i < stock_ts.length; i++) {
        prices.push(stock_ts[i]['adjClose'])
        dates.push(parseInt(stock_ts[i].date.slice(0, 10).replace(/-/g, '')))
    }
    prices = prices.reverse()
    dates = dates.reverse()
    var stockData =
        {
            ticker: ticker,
            adjClose: prices,
            dailyPctChange: prices.map((v, i) => { return i > 0 ? v / prices[i - 1] : 1. }),
            values: prices.map((v, i) =>  v / prices[0] ),
            valuesWithDate: {},
            dateIndex: dates,
            isBenchmark: ticker === benchmarkTicker,
            show: false
        }

    var stk = new StockData()
    stk.ticker = ticker
    stk.adjClose = prices
    stk.dailyPctChange = prices.map((v, i) => { return i > 0 ? v / prices[i - 1] : 1 })
    stk.cumulativeValue = prices.map((v) => v / prices[0])
    stk.cumulativeValue.map((v, i) => { stk.valuesWithDate[dates[i]] = v; return })
    stk.isBenchmark = ticker === benchmarkTicker
    stockData.values.map((v, i) => stockData.valuesWithDate[dates[i]] = v)
    stockData.dailyPctChange = computeDailyReturns(stockData);
    return stockData
}

function aggregateStockData(dataset) {
    var benchmark;
    dataset.map(stock=> {if(stock.isBenchmark) benchmark = stock} )
    dataset.map(stock => {
        if(!stock.isBenchmark && stock.dateIndex.length<benchmark.dateIndex.length){
            tmp = []
            benchmark.dateIndex.map((v, i) => { tmp.push(stock.valuesWithDate[v])})
            stock.values = tmp
        }
    })

    var aggSeries = []
    for (var i = 0; i < benchmark.dateIndex.length; i++) {
        let all = []
        dataset.map(stock => { if (!stock.isBenchmark) { all.push(stock.values[i])}  })
        all = _u.compact(all)
        if(all.length == 0){
            aggSeries.push(1.);
        }
        else{
            let avg = all.reduce((previous, current) => current += previous) / all.length;
            aggSeries.push(avg);
        }
    }

    var aggregation = {
        ticker: '投资组合',
        values: aggSeries,
        dateIndex : dataset[0].dateIndex,
        dataset : dataset,
        avgDlyRtn: Math.pow(_u.last(aggSeries), 1. / (aggSeries.length - 1)), //日均
        dailyPctChange: aggSeries.map((v, i) => { return i > 0 ? v / aggSeries[i - 1] : 1. }),
        show: true,
        inceptionDate : dataset.inceptionDate,
        benchmark: benchmark
    }
    return aggregation
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

function timeRangeSlice(aggregation, inception_date, benchmark_ticker ='SPY'){
  // var ts_dataset = {}
  var timeIds = ['1y', '3m', '30d', '10d', inception_date]
  var timeRange = applySlice(timeIds, aggregation.dateIndex, aggregation.values, aggregation.benchmark.values, inception_date)
  return timeRange
  // finalData.timeRange = timeRange

  // var ranges = time_range.map(timeId => {
  //   var holdingPct = []
  //   var index = undefined;
  //   if (timeId != 'inception') {
  //     index = util.dateIndexPicker(aggregation.dateIndex, timeId)
  //   }
  //   else{
  //     index = util.dateIndexPicker(aggregation.dateIndex, inception_date)
  //     // aggregation.dataset.map(stock => { if (!stock.isBenchmark) { 
  //     //   let totalPct = stock.adjClose[stock.adjClose.length - 1] / stock.adjClose[index[0]]; 
  //     //   holdingPct.push({ ticker: stock.ticker, value: totalPct}) }})
  //   }
  //   var dates = index.map(i => { return aggregation.dateIndex[i] })
  //   var values = index.map(i => { return aggregation.values[i]/aggregation.values[index[0]] })
  //   var benchmark = index.map(i => { return aggregation.benchmark.values[i] / aggregation.benchmark.values[index[0]] })
  //   // var series = [{ ticker: aggregation.ticker, data: values }, { ticker: benchmark_ticker, data: benchmark }]
  //   return { timeId: timeId, index: dates, values: values, benchmark: benchmark }


  //   // return { timeId: timeId, dates: dates, series: series, holdingPct: holdingPct}
  // })
  // return ranges
}

function updatePortfolioProfile(id, table) {
  if (id) {
    knex('portfolio_metadata').where('id', '=', id).update({ ratiosTable: JSON.stringify(table) }).then(function (result) { console.log(result) })
  }
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
  computeQuantMetrics: computeQuantMetrics,
  timeRangeSlice: timeRangeSlice,
  aggregateStockData: aggregateStockData,
  load_historical_data: load_historical_data,
  loadSingleStock: loadSingleStock,
  quote_historical2: quote_historical2,
  insert_historical: insert_historical,
  read_historical: read_historical,
  build_strategy_ts: build_strategy_ts,
  build_strategy_ts_from_id: build_strategy_ts_from_id,
  updatePortfolioProfile: updatePortfolioProfile,
  buildStrategyFromPhases: buildStrategyFromPhases,
  retryer: retryer
  // handle_historical_request: handle_historical_request,
  // historical_callback: historical_callback
};

