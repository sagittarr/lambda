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

function callIEXApi(apiUrl, source, callback){
  var options1 = {
    url: config.service.stockHistoryUrl,
    data: { source: source, apiUrl: apiUrl },
    success(result) {
      // util.showSuccess('请求成功完成')
      // callback(result.data.data)
      console.log(result)
    }
  }
  // util.showBusy('请求中...');
  wx.request(options1);
}

module.exports = { quoteYahooFinance: quoteYahooFinance, callIEXApi: callIEXApi}