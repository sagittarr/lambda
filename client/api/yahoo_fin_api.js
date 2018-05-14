var util = require('../utils/util.js');
var config = require('../config.js')

function quoteYahooFinance(ticker, modules, callback)
{
    var options1 = {
        url: config.service.stockDataQuote,
        data: {ticker: ticker, modules: modules},
        success(result) {
            callback(result.data.data)
            // console.log(result)
        },
        fail(error) {
            console.log('request fail', error);
        }
    }
    wx.request(options1);
}
module.exports.quoteYahooFinance = quoteYahooFinance