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

function computeDailyReturns(stockData){
  var returns = [1]
  for (var i = 1; i < stockData.values.length; i++) {
    returns.push(stockData.values[i] / stockData.values[i - 1])
  }
  return returns;
}

class PortfolioLoader {
  checkAVDate(res, prices, dates, args){
    var colName = "Time Series (Daily)"
    if(args.freq.toUpperCase() === 'W'){
      colName = "Weekly Time Series"
    }
    else if(args.freq.toUpperCase() === 'M'){
      colName = "Monthly Time Series"
    }
    if(args.timeSeriesType.toUpperCase() === 'R'){
      let endDate = new Date(args.endDate);
      let startDate = new Date(args.startDate);
      for (var dateStr in res[colName]) {
        let currDate = new Date(dateStr);
        if (currDate <= endDate && currDate >= startDate) {
          dates.push(dateStr);
          prices.push(res[colName][dateStr]["4. close"]);
        }
        if (currDate < startDate) {
          break;
        }
      }
    }
    else if (args.timeSeriesType.toUpperCase() === 'P'){
      let endDate = new Date(args.endDate);
      let counter = args.period;
      for (var dateStr in res[colName]) {
        let currDate = new Date(dateStr);
        if (currDate <= endDate) {
          dates.push(dateStr);
          prices.push(res[colName][dateStr]["4. close"]);
        }
        counter -= 1;
        if (counter == 0) {
          break;
        }
      }
    }
  }

  processDatafromAV(res, isBenchmark, dateArgs, portfolio) {
    // console.log(res)
    var prices = [];
    var dates = [];
    this.checkAVDate(res, prices, dates, dateArgs)
    var prices = prices.reverse();
    var stockData =
      {
        ticker: res['Meta Data']['2. Symbol'],
        dates: dates.reverse(),
        data: prices,
        values: prices.map(function (x) { return parseFloat(x) / parseFloat(prices[0]) }),
        isBenchMark: isBenchmark,
        show: false,
      }
    stockData.returns = computeDailyReturns(stockData);
    console.log(stockData)
    if (isBenchmark) {
      portfolio.benchmark = stockData;
    }
    else {
      portfolio.holdings.push(stockData);
    }
    console.log("loadAlphaVantageStockData " + stockData.ticker + " success");
    portfolio.counter -= 1;
  };

  load(tickers, dateArgs, dataSource, callback) {
    var that = this;
    util.showBusy('请求中...')
    var portfolio = {
      holdings: [],
      benchmark: undefined,
      counter: tickers.length
    }
    tickers.forEach(function (ticker, i, a) {
      var tokens = ticker.split(":");
      var isBenchMark = false;
      if (tokens.length == 2) {
        isBenchMark = true;
        ticker = tokens[1];
      }
      var options = {
        url: config.service.stockHistoryUrl,
        login: false,
        data: {
          ticker: ticker,
          timeSeriesType: dateArgs.timeSeriesType,
          startDate: dateArgs.startDate,
          endDate:dateArgs.endDate,
          period: dateArgs.period,
          freq: dateArgs.freq,
          dataSource: dataSource
        },
        success(result) {
          that.processDatafromAV(result.data, isBenchMark, dateArgs, portfolio)
          that.aggregate(portfolio, callback)
          console.log(result.data)
        },
        fail(error) {
          util.showModel('请求失败', error);
          console.log('request fail', error);
        }
      }
      wx.request(options);
    })
  }

  aggregate(portfolio, callback) {
    if (portfolio.counter == 0) {
      util.showSuccess('请求成功完成')
      var dates = [];
      var cumReturns = [];
      portfolio.holdings[0].dates.forEach(
        function (date, i) {
          var cumReturn = 0.;
          portfolio.holdings.forEach(
            function (stock) {
              cumReturn += stock.values[i];
            }
          );
          cumReturn = cumReturn / portfolio.holdings.length;
          cumReturns.push(cumReturn);
          dates.push(date);
        }
      );
      portfolio.aggregation = {
        ticker: 'aggregation',
        dates: dates,
        values: cumReturns,
        show: true
      };
      portfolio.aggregation.returns = computeDailyReturns(portfolio.aggregation)
      console.log(portfolio);
      callback(portfolio)
    }
  }
}

class PortfolioUtils {
  constructor() {
  };
  // static loader;
  static loadPortfolio(tickers, dateArgs, dataSource, callback) {
    if (tickers.length > 0) {
      tickers.push('B:SPY');
    }
    var loader = new PortfolioLoader(tickers.length);
    loader.load(tickers, dateArgs, dataSource, callback);
  }
}

module.exports = PortfolioUtils;