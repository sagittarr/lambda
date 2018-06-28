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

function call3rdPartyAPI(source, apiUrl, arg, callback){
    if(source == 'IEX') {
        var options = {
            url: config.service.stockHistoryUrl,
            data: {
                source: 'IEX',
                apiUrl: encodeURIComponent(apiUrl),
                convertKLineChart: arg.convertKLineChart,
                convertFreq: arg.convertFreq
            },
            success(result) {
                if (result.data.code != 0) {
                    console.error(apiUrl, arg, result.data.error)
                }
                else {
                    callback(result.data.data)
                }
            }
        }
        // util.showBusy('请求中...');
        wx.request(options);
    }
    else if(source == 'ALV'){
        var options = {
            url: config.service.stockHistoryUrl,
            data: {
                source: 'ALV',
                apiUrl: encodeURIComponent(apiUrl),
            },
            success(result) {
                if (result.data.code != 0) {
                    console.error(apiUrl, arg, result.data.error)
                }
                else {
                    callback(result.data.data)
                }
            }
        }
        // util.showBusy('请求中...');
        wx.request(options);
    }
    else if(source == 'YHF'){
        var options1 = {
            url: config.service.stockDataQuote,
            data: {ticker: arg.ticker, modules: arg.modules},
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
    else if(source === 'YHD'){
        var opt = {
            url: config.service.stockHistoryUrl,
            data: {source: 'YHD', ticker: arg.ticker, module: arg.module},
            success(result) {
                callback(result)
            },
            fail(error) {
                console.log('request fail', error);
            }
        };
        wx.request(opt);
    }
    else{
        let option = {
            url: config.service.stockHistoryUrl,
            data: {
                source: '',
                apiUrl: encodeURIComponent(apiUrl)
            },
            success(result) {
                callback(result.data.data)
            },
            fail(error) {
                console.log('request fail', error);
            }
        }
        wx.request(option);
    }
}
module.exports = {quoteYahooFinance : quoteYahooFinance, call3rdPartyAPI: call3rdPartyAPI}