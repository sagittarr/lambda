const util = require('../../utils/util.js');
const StockItem =require('../../models/StockItem.js')
const config = require('../../config')
const parser = require('../../parsers/quote_parser.js')
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
};
//////////////////////////////////////////////////////////
class PortfolioUtils {
    constructor() {
    };
    static quoteRealTimePriceCallback(result, tickers) {
      let list = []
      tickers.map(ticker => {
        list.push(parser.parseStockItemFromIEX(result[ticker].quote))
      })
      return list
    }

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
    static realtime_price(tickers, callback, retry = 3) {
        if(retry <= 0){
            return;
        }
        if(typeof tickers == 'object'){
            tickers = tickers.join(',')
        }
        tickers = tickers.slice(0, tickers.length)
        // console.log(tickers)
        var options = {
            url: config.service.realtime_price,
            data: { tickers: tickers },
            success(result) {
                if (result.data.data.query){
                    if (result.data.data.query.results===null) console.log('t',tickers)
                    else callback(result.data.data.query.results.quote)
                }
                else{
                    if (retry == 1){
                        console.error("quote real time fails: ", tickers)
                    }
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