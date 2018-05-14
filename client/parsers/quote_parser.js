var yhApi = require('../api/yahoo_fin_api.js')
var Quotation = require('../models/Quotation.js')

function getQuotation(ticker, callback){
  yhApi.quoteYahooFinance(ticker, ['summaryDetail','price'],function(quote){
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
module.exports = getQuotation