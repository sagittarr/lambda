var yahooFinance = require('yahoo-finance');
var Promise = require('promise')
var _u = require('underscore');
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
  ts.values = aggregation.dailyPctChange.slice(left,right)
  ts.left = left
  ts.right = right
  return ts
}
function concat_ts(samples){
  var values = []
  var dateIndex = []
  // samples[0].values.map(v => { values.push(v)})
  var phases = []
  for(var i= 0; i< samples.length; i++){
    samples[i].values.map(v => { values.push(v) })
    samples[i].dateIndex.map(v => { dateIndex.push(v) })
    phases.push({ from: samples[i].dateIndex[0], to: samples[i].dateIndex[samples[i].dateIndex.length - 1]})
  }
  return {values: values, dateIndex : dateIndex, phases : phases}
}

async function build_strategy_ts_from_id(productId, tickers, inception_date) {
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
async function build_strategy_ts(inputs){
  var slices = []
  return new Promise(function (res, rej) {
    inputs.map((input, i) => {
      load_historical_data(input.tickers).then(function (dataset) {
        var agg = aggregateStockData(dataset)
        slices.push(cut_off(agg, input.from, input.to))
        if (slices.length == inputs.length) {
          var final_ts = concat_ts(slices)
          res(final_ts)
        }
      })
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
    try {
      tickers.forEach(function (t) {
        knex('historical_data').select('*').where({ ticker: t }).then(function (rows) {
          if (rows.length === 0) {
            var request = { symbol: t, from: from, to: to, period: 'd' }
            quote_historical2(request).then(function (ts) {
              let last_update = Date.now() / 1000
              insert_historical(t, JSON.stringify(ts), last_update);
              ts.map(t => { t.date = util.date2Str(new Date(t.date))})
              var stockData = processStockData(ts, t)
              stockData.last_update = last_update
              stockData.isBenchmark = t == 'SPY' ? true : false;
              dataset.push(stockData)
              if (dataset.length == tickers.length) {
                res(dataset)
              }
            }
            )
          }
          else {
            var stockData = processStockData(JSON.parse(rows[0].data), t)
            stockData.last_update = rows[0].last_update
            stockData.isBenchmark = t == 'SPY' ? true : false;
            dataset.push(stockData)
            console.log('found records of ', t)
            if (dataset.length == tickers.length) {
              res(dataset)
            }
          }
        }).catch(function (err) { rej(err) });
      })
    }
    catch (err) {
      rej(err);
    }
  })
}
function computeDailyReturns(stockData) {
  var returns = [1]
  for (var i = 1; i < stockData.values.length; i++) {
    returns.push(stockData.values[i] / stockData.values[i - 1])
  }
  return returns;
};

function processStockData(stock_ts, ticker, benchmark_ticker = 'SPY') {
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
      isBenchmark: ticker == benchmark_ticker? true: false,
      show: false
    }
  stockData.values.map((v, i) => stockData.valuesWithDate[dates[i]] = v )
  // stockData.dailyPctChange = computeDailyReturns(stockData);
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
    let avg = all.reduce((previous, current) => current += previous) / all.length;
    aggSeries.push(avg);
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
  var inception = parseInt(aggregation.inceptionDate)
  var idx = aggregation.dateIndex.indexOf(inception)
  if (idx >= 0) {
    aggregation.returnSinceInception = _u.last(aggregation.values) / aggregation.values[idx]
    aggregation.avgDlyRtnSinceInception = Math.pow(aggregation.returnSinceInception, 1. / (aggregation.dateIndex.length - idx))
  } 
  return aggregation
}

function computeQuantMetrics(aggregation){
  var ab = Calculator.computeAlphaBeta(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
  var sharp = Calculator.computeSharpRatio(aggregation.dailyPctChange, aggregation.benchmark.dailyPctChange)
  var mdd = Calculator.computeMDD(aggregation.values)
  var voli = Calculator.computeVolatility(aggregation.dailyPctChange)
  var total_return = (aggregation.values[aggregation.values.length - 1] / aggregation.values[0] - 1.)
  aggregation.quant = { '1y': { alpha: ab.alpha, beta: ab.beta, sharp: sharp, mdd: mdd, voli: voli, total_return: total_return}}
}

function timeRangeSlice(aggregation, inception_date, benchmark_ticker ='SPY',time_range = ['1y','3m','30d','10d','inception']){
  var ts_dataset = {}
  var ranges = time_range.map(rangeId => {
    var holdingPct = []
    var index = undefined;
    if (rangeId != 'inception') {
      index = util.dateIndexPicker(aggregation.dateIndex, rangeId)
    }
    else{
      index = util.dateIndexPicker(aggregation.dateIndex, inception_date)
      aggregation.dataset.map(stock => { if (!stock.isBenchmark) { 
        // console.log(stock.adjClose.length - 1, index[0], stock.adjClose)
        let totalPct = stock.adjClose[stock.adjClose.length - 1] / stock.adjClose[index[0]]; 
        holdingPct.push({ ticker: stock.ticker, value: totalPct}) }})
    }
    var dates = index.map(i => { return aggregation.dateIndex[i].toString() })
    var values = index.map(i => { return aggregation.values[i] })
    var benchmark = index.map(i => { return aggregation.benchmark.values[i] })
    var series = [{ ticker: aggregation.ticker, data: values }, { ticker: benchmark_ticker, data: benchmark }]

    return { range: rangeId, dates: dates, series, holdingPct : holdingPct }
  })
  return ranges
}

// function historical_callback(rows, call_back) {
//   if (rows.length === 0) {
//     console.log('quote api data', ticker)
//     api.quote_historical(
//       { symbol: ticker, from: '2018-01-01', to: '2018-04-17', period: 'd' },
//       function (x) {
//         api.insert_historical(ticker, JSON.stringify(x), Date.now() / 1000);
//       });
//   }
//   else {
//     console.log('use db data', ticker)
//     // callback(rows)
//     return rows
//   }
// }
// function handle_historical_request(ticker, callback){
//   knex('historical_data').select('*').where({ ticker: ticker }).then(function (rows) {
//     if (rows.length === 0) {
//       console.log('quote api data', ticker)
//       quote_historical(
//         { symbol: ticker, from: '2018-01-01', to: '2018-04-17', period: 'd' },
//         function (x) {
//           insert_historical(ticker, JSON.stringify(x), Date.now() / 1000);
//           callback(x);
//         });
//     }
//     else {
//       console.log('use db data', ticker)
//       // callback(rows)
//       return rows;
//     }
//   });
// }
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
      period: request.period,
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
function insertPortfolioProfile(){
  knex('historical_data').where('ticker', ticker).update({ data: data, last_update: time_stamp, update_time: new Date().toISOString() }).then(function (result) { console.log(result) })
}
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
  // quote_historical: quote_historical,
  quote_historical2: quote_historical2,
  insert_historical: insert_historical,
  read_historical: read_historical,
  build_strategy_ts: build_strategy_ts,
  build_strategy_ts_from_id: build_strategy_ts_from_id,
  retryer: retryer
  // handle_historical_request: handle_historical_request,
  // historical_callback: historical_callback
};

