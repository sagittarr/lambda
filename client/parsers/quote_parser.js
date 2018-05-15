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
            quoteDetail.marketCap,
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
    api.callIEXFinance('', source, function(quote){
        // console.log(quote)
        var minutes = []
        quote.map(minute=>{
            minutes.push(new MinuteData(parseInt(minute.minute.replace(':', '')), parseInt(minute.close)*10, parseInt(minute.average)*10, parseInt(minute.volume), parseInt(minute.volume)))
        })
        callback({close:1800, goods_id: 0, market_date:20180514, minutes: minutes})
        // console.log(minutes)
    })
}
module.exports = { getQuotation: getQuotation, getMinuteData: getMinuteData}