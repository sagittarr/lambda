var api = require('../api/data_api.js')
var Quotation = require('../models/Quotation.js')
var MinuteData = require('../models/MinuteData.js')
var KlineData = require('../models/KLineData.js')
const config = require('../config')
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

function getMinuteData(ticker, option, callback, source = 'IEX'){
    let iexQuote
    let iexChartData
    function handle(){
        if(iexQuote && iexChartData){
            var minutes = []
            var preClose = iexQuote.previousClose
            iexChartData.map(minute => {
                minutes.push(new MinuteData(
                    parseInt(minute.minute.replace(':', '')),
                    parseFloat(minute.marketClose) * 1000,
                    parseFloat(minute.marketAverage) * 1000,
                    parseInt(minute.marketVolume),
                    parseInt(minute.marketNotional)))
                if (isNaN(parseFloat(minute.marketClose))) { //skip NaN data
                    var time = minutes[minutes.length - 1].time
                    minutes[minutes.length - 1] = minutes[minutes.length - 2]
                    minutes[minutes.length - 1].time = time
                }
            })
            callback({ close: preClose * 1000, goods_id: 10000, market_date: parseInt(iexChartData[0].date), minutes: minutes })
        }
    }
    api.callIEXFinance('https://api.iextrading.com/1.0/stock/'+ticker+'/quote', '', function (_iexQuote) {
        iexQuote = _iexQuote
        console.log(_iexQuote)
        handle()
    })
    api.callIEXFinance('https://api.iextrading.com/1.0/stock/'+ticker+'/chart/'+option.range, option.freq, function (_iexChartData) {
        iexChartData = _iexChartData
        console.log(_iexChartData)
        handle()
    })
}

function getKlineData(ticker, option, callback, source= 'IEX'){
    // if(option.range === '5y'){
      console.log(option)
        var options = {
          url: config.service.db_handler,
          data: { operation: 'READ_HISTORY', ticker: ticker, source : 'iex', option: option },
          success(result) {
            console.log("read LOAD", result.data.data)
              var kline = []
              result.data.data.map(data=>{
                  var klineData = new KlineData(parseInt(data.date.replace(/-/g,'')), parseFloat(data.open)*1000, parseFloat(data.high)*1000, parseFloat(data.low)*1000, parseFloat(data.close)*1000, parseFloat(data.vwap)*1000,undefined,undefined,parseFloat(data.volume),parseFloat(data.close)*1000,parseFloat(data.volume) )
                  kline.push(klineData)
              })
              callback(kline)
          },
          fail(error) {
            util.showModel('请求失败', error);
            console.log('request fail', error);
          }
        }
        wx.request(options);
        return
    // }
    // api.callIEXFinance('https://api.iextrading.com/1.0/stock/aapl/chart/'+option.range, source, option.freq, function (iexChartData) {
    //     console.log('kline', iexChartData)
    //     console.log(option)
    //     var kline = []
    //     iexChartData.map(data=>{
    //         var klineData = new KlineData(parseInt(data.date.replace(/-/g,'')), parseFloat(data.open)*1000, parseFloat(data.high)*1000, parseFloat(data.low)*1000, parseFloat(data.close)*1000, parseFloat(data.vwap)*1000,undefined,undefined,parseFloat(data.volume),parseFloat(data.close)*1000,parseFloat(data.volume) )
    //         kline.push(klineData)
    //     })
    //     callback(kline)
    // })
}
module.exports = { getQuotation: getQuotation, getMinuteData: getMinuteData, getKlineData: getKlineData}