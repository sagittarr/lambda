var util = require('../../utils/util.js');
var config = require('../../config')
var conn = require('../../utils/connection.js').Connection;

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
};

function computeDailyReturns(stockData) {
  var returns = [1]
  for (var i = 1; i < stockData.values.length; i++) {
    returns.push(stockData.values[i] / stockData.values[i - 1])
  }
  return returns;
};
function buildPortfolio2(data,benchmark) {
  var portfolio = { aggregation: {}, holdings:{}, dates: [],benchmark: {}}
  Object.keys(data).forEach(function (ticker) {
    // [0] date [1] AdjClose
    if(portfolio.dates.length == 0){
      for(var i = 0; i<data[ticker].length ; i++){
        portfolio.dates.push(data[ticker][i][0])
      }
    }
    var prices = []
    for (var i = 0; i < data[ticker].length; i++) {
      prices.push(data[ticker][i][1])
    }
    var stockData =
      {
        ticker: ticker,
        prices: prices,
        values: prices.map(function (x) { return parseFloat(x) / parseFloat(prices[0]) }),
        returns: undefined,
        isBenchmark: benchmark == ticker ? true : false,
        show: false,
      }
    stockData.returns = computeDailyReturns(stockData);
    if (stockData.isBenchmark) {
      portfolio.benchmark = stockData;
    }
    else {
      portfolio.holdings.push(stockData);
    }
    var agg_value_ts = []
    portfolio.dates.forEach(
      function (_, i) {
        var agg_value = 0.;
        portfolio.holdings.forEach(
          function (stock) {
            agg_value += stock.values[i];
          }
        );
        agg_value = agg_value / portfolio.holdings.length;
        agg_value_ts.push(agg_value);
      }
    );
    portfolio.aggregation = {
      ticker: '投资组合',
      values: agg_value_ts,
      show: true
    };
    let cum_value = portfolio.aggregation.values[portfolio.aggregation.values.length - 1]
    portfolio.aggregation.avg_return = Math.pow(cum_value, 1. / (portfolio.dates.length - 1)) //日均
    portfolio.aggregation.returns = computeDailyReturns(portfolio.aggregation)
    return portfolio
  })
    ////////////
  //   var prices = []
  //   if (portfolio.dates.length == 0) {
  //     data[ticker].forEach(function (e, i, a) {
  //       portfolio.dates.push(e.date.substring(0, 10))
  //     });
  //     if (dateArgs.period) {
  //       portfolio.dates = portfolio.dates.slice(0, dateArgs.period)
  //     }
  //     portfolio.dates = portfolio.dates.reverse();
  //   }
  //   data[ticker].forEach(function (e, i, a) {
  //     prices.push(e.adjClose)
  //   });
  //   if (dateArgs.period) {
  //     prices = prices.slice(0, dateArgs.period)
  //   }
  //   prices = prices.reverse()
  //   var stockData =
  //     {
  //       ticker: ticker,
  //       prices: prices,
  //       values: prices.map(function (x) { return parseFloat(x) / parseFloat(prices[0]) }),
  //       returns: undefined,
  //       isBenchmark: benchmark == ticker ? true : false,
  //       show: false,
  //     }
  //   stockData.returns = computeDailyReturns(stockData);
  //   if (stockData.isBenchmark) {
  //     portfolio.benchmark = stockData;
  //   }
  //   else {
  //     portfolio.holdings.push(stockData);
  //   }
  // });
  // var cumReturns = []
  // portfolio.dates.forEach(
  //   function (date, i) {
  //     var cumReturn = 0.;
  //     portfolio.holdings.forEach(
  //       function (stock) {
  //         cumReturn += stock.values[i];
  //       }
  //     );
  //     cumReturn = cumReturn / portfolio.holdings.length;
  //     cumReturns.push(cumReturn);
  //   }
  // );
  // portfolio.aggregation = {
  //   ticker: 'aggregation',
  //   values: cumReturns,
  //   show: true
  // };
  // let cum_value = portfolio.aggregation.values[portfolio.aggregation.values.length - 1]
  // portfolio.aggregation.avg_return = Math.pow(cum_value, 1. / (portfolio.dates.length - 1)) //日均
  // portfolio.aggregation.returns = computeDailyReturns(portfolio.aggregation)
}
function buildPortfolio(data, portfolio, dateArgs, benchmark) {
  Object.keys(data).forEach(function (ticker) {
    var prices = []
    if (portfolio.dates.length == 0) {
      data[ticker].forEach(function (e, i, a) {
        portfolio.dates.push(e.date.substring(0, 10))
      });
      if (dateArgs.period) {
        portfolio.dates = portfolio.dates.slice(0, dateArgs.period)
      }
      portfolio.dates = portfolio.dates.reverse();
    }
    data[ticker].forEach(function (e, i, a) {
      prices.push(e.adjClose)
    });
    if (dateArgs.period) {
      prices = prices.slice(0, dateArgs.period)
    }
    prices = prices.reverse()
    var stockData =
      {
        ticker: ticker,
        prices: prices,
        values: prices.map(function (x) { return parseFloat(x) / parseFloat(prices[0]) }),
        returns: undefined,
        isBenchmark: benchmark == ticker ? true : false,
        show: false,
      }
    stockData.returns = computeDailyReturns(stockData);
    if (stockData.isBenchmark) {
      portfolio.benchmark = stockData;
    }
    else {
      portfolio.holdings.push(stockData);
    }
  });
  var cumReturns = []
  portfolio.dates.forEach(
    function (date, i) {
      var cumReturn = 0.;
      portfolio.holdings.forEach(
        function (stock) {
          cumReturn += stock.values[i];
        }
      );
      cumReturn = cumReturn / portfolio.holdings.length;
      cumReturns.push(cumReturn);
    }
  );
  portfolio.aggregation = {
    ticker: 'aggregation',
    values: cumReturns,
    show: true
  };
  let cum_value = portfolio.aggregation.values[portfolio.aggregation.values.length - 1]
  portfolio.aggregation.avg_return = Math.pow(cum_value, 1./(portfolio.dates.length-1)) //日均
  portfolio.aggregation.returns = computeDailyReturns(portfolio.aggregation)
}

function apply_cutoff(portfolio, cutoff) {
  if (cutoff) {
    var tmp = []
    var cut = parseInt(cutoff)
    var idx = -1;
    for (var i = 0; i < portfolio.dates.length; i++) {
      var curr = parseInt(portfolio.dates[i])
      if (curr > cut) {
        console.log('cutoff', curr, cut)
        idx = i;
        break;
      }
    }
    if (idx == -1) {
      return;
    }
    portfolio.dates = portfolio.dates.slice(0, idx);
    portfolio.aggregation.returns = portfolio.aggregation.returns.slice(0, idx);
    portfolio.aggregation.values = portfolio.aggregation.values.slice(0, idx);
    portfolio.benchmark = portfolio.benchmark.slice(0, idx)
    portfolio.holdings.forEach(function (stock, i, a) {
      stock.prices = stock.prices.slice(0, idx);
      stock.values = stock.values.slice(0, idx);
      stock.returns = stock.returns.slice(0, idx);
    })
  }
}
// function processPortfolio(portfolio) {
//   var cumReturns = []
//   portfolio.dates.forEach(
//     function (date, i) {
//       var cumReturn = 0.;
//       portfolio.holdings.forEach(
//         function (stock) {
//           cumReturn += stock.values[i];
//         }
//       );
//       cumReturn = cumReturn / portfolio.holdings.length;
//       cumReturns.push(cumReturn);
//       // dates.push(date);
//     }
//   );
//   portfolio.aggregation = {
//     ticker: 'aggregation',
//     values: cumReturns,
//     returns: undefined,
//     show: true
//   };
//   portfolio.aggregation.returns = computeDailyReturns(portfolio.aggregation)
// }

function concatPortfolios2Strategy(portfolio_arr, offset = 1) {
  var values = []
  var dateArr = []
  var benchmarkDlyRtn = []
  var benchmarkCumVal = []
  portfolio_arr.sort(function (a, b) {
    return parseFloat(a.phaseID) - parseFloat(b.phaseID);
  });
  portfolio_arr.forEach(function (eachP) {
    if (values.length != 0) {
      values = values.concat(eachP.aggregation.values.slice(offset))
    }
    else {
      values = eachP.aggregation.values
    }
  })
  console.log(values)
  // return {
  //   'stategyTimeSeries': { 'dates': dateArr, 'dlyRtnTs': dlyRtnTs, 'cumVals': cum_values, 'benchmarkDlyRtn': benchmarkDlyRtn, 'benchmarkCumVal': benchmarkCumVal },
  //   'portfolioArray': portfolio_arr
  // }
}

//////////////////////////////////////////////////////////
class PortfolioUtils {
  constructor() {
  };

  static quoteYahooFinance(ticker, modules, callback) {
    var options1 = {
      url: config.service.stockDataQuote,
      data: { ticker: ticker, modules: modules },
      success(result) {
        callback(result.data.data)
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    wx.request(options1);
  };

  static getStockProfile(tickers, asset, callback) {
    var yhModuleName = 'summaryProfile'
    tickers.forEach(function (ticker, i, a) {
      if (!ticker.startsWith('B:')) {
        PortfolioUtils.quoteYahoofinance(ticker, [yhModuleName],
          function (result) {
            asset[ticker] = {};
            asset[ticker]['sector'] = result[yhModuleName]['sector']
          })
      }
    })
  };

  static getHistoricalData(tickers, dateArgs, callback) {
    var options1 = {
      url: config.service.stockHistoryUrl,
      data: { source: 'YHOO', symbols: tickers, from: dateArgs.startDate, to: dateArgs.endDate, period: dateArgs.freq.toLowerCase() },
      success(result) {
        // util.showSuccess('请求成功完成')
        callback(result.data.data)
      }
    }
    // util.showBusy('请求中...');
    wx.request(options1);

  }

  static loadPortfoliofromYF(tickers, benchmark, dateArgs, callback) {
    var that = this;
    var portfolio = {
      holdings: [],
      dates: [],
      aggregation: {},
      benchmark: undefined,
    }
    var _tickers = []
    _tickers = _tickers.concat(tickers)
    _tickers.push(benchmark)
    PortfolioUtils.getHistoricalData(_tickers, dateArgs, function (data) {
      buildPortfolio(data, portfolio, dateArgs, benchmark);
      // apply_cutoff(portfolio, cutoff)
      callback(portfolio)
    });
  }

  static readPortolioHistoryfromDB(id, callback) {
    var options = {
      url: config.service.portfolioUrl,
      data: { operation: 'RH', id: id },
      success(result) {
        callback(result.data.data)
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    wx.request(options);
  }

  static combineMultiPortfolio(phase_arr, callback) {
    var today = (new Date()).toISOString().slice(0, 10);
    var portfolio_arr = []
    var dates = []
    var counter = phase_arr.length;
    phase_arr.forEach(function (e, i, a) {
      dates.push(e.date)
    })
    dates.push(today)
    var offset = 1; // load one more day, since yahoo finance doesn't return enddate.
    phase_arr.forEach(function (e, i, a) {
      var dateArgs = {
        timeSeriesType: 'p',
        startDate: dates[i],
        endDate: Date.parse(dates[i + 1]).add(1).days().toString('yyyy-MM-dd'),
        range: '10D',
        period: undefined,
        freq: 'D'
      }
      PortfolioUtils.loadPortfoliofromYF(JSON.parse(e.holds), 'SPY', dateArgs, function (p) {
        p.phaseID = e.phaseID
        portfolio_arr.push(p)
        counter -= 1;
        if (counter == 0) {
          callback(concatPortfolios2Strategy(portfolio_arr, offset))
        }
      })
    })
  };

  static realtime_price(tickers, callback, retry = 3) {
    if(retry <= 0){
      return;
    }
    if(typeof tickers == 'object'){
      tickers = tickers.join(',')
    }
    tickers = tickers.slice(0, tickers.length)
    var options = {
      url: config.service.realtime_price,
      data: { tickers: tickers },
      success(result) {
        if (result.data.data.query){
          callback(result.data.data.query.results.quote)                  
        }
        else{
          console.error("quote real time fails: ", retry, tickers)
          sleep(50); 
          PortfolioUtils.realtime_price(tickers, callback, retry-1);
        }
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    wx.request(options);
  }
}

module.exports = PortfolioUtils;