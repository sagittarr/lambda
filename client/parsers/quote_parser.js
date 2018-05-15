var api = require('../api/data_api.js')
var Quotation = require('../models/Quotation.js')
var MinuteData = require('../models/MinuteData.js')
function getQuotation(ticker, callback){
  api.quoteYahooFinance(ticker, ['summaryDetail','price'],function(quote){
        // console.log(quote)
        var quotePrice = quote.price
        var quoteDetail = quote.summaryDetail
        var result = new Quotation(
            quotePrice.regularMarketPrice,
            quotePrice.regularMarketChange,
            quotePrice.regularMarketChangePercent,
            quotePrice.regularMarketOpen,
            quotePrice.regularMarketDayHigh,
            quotePrice.regularMarketDayLow,
            NaN,
            NaN,
            NaN,
            quoteDetail.volume,
            NaN,
            (parseInt(quoteDetail.marketCap / 1000000)).toString()+'M',
            NaN,
            NaN,
            NaN,
            quotePrice.regularMarketTime,
            quotePrice.regularMarketTime,
            'brown',
            ticker
            )
        callback(result)
    })
}

function getMinuteData(ticker, callback, source = 'IEX'){
  api.callIEXFinance('https://api.iextrading.com/1.0/stock/aapl/quote', source, function (iexQuote) {
    api.callIEXFinance('https://api.iextrading.com/1.0/stock/aapl/chart/1d', source, function (iexChartData) {
      // console.log(iexChartData)
      var minutes = []
      var preClose = iexQuote.previousClose
      // console.log(iexQuote)
      iexChartData.map(minute => {
        minutes.push(new MinuteData(parseInt(minute.minute.replace(':', '')), parseFloat(minute.close) * 1000, parseFloat(minute.average) * 1000, parseInt(minute.volume), parseInt(minute.volume)))
        if (isNaN(parseFloat(minute.close))) {
          var time = minutes[minutes.length - 1].time
          minutes[minutes.length - 1] = minutes[minutes.length - 2]
          minutes[minutes.length - 1].time = time
        }
      })
      callback({ close: preClose * 1000, goods_id: 10000, market_date: parseInt(iexChartData[0].date), minutes: minutes })
    })
  })

}
module.exports = { getQuotation: getQuotation, getMinuteData: getMinuteData}