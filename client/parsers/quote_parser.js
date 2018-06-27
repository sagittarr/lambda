const api = require('../api/data_api.js')
const Quotation = require('../models/Quotation.js')
const MinuteData = require('../models/MinuteData.js')
const KlineData = require('../models/KLineData.js')
const StockItem = require('../models/StockItem')
const NewsItem = require('../models/NewsItem.js')
const SectorPerf = require('../models/SectorPerformance.js')
const config = require('../config')


function quoteSingleStockFromIEX(ticker, option, callback){
    var url = 'https://api.iextrading.com/1.0/stock/'+ticker+'/'+option
    api.call3rdPartyAPI('IEX', url, {}, function (result) {
        callback(result)
    })
}

function getQuotation(ticker, callback){
    api.quoteYahooFinance(ticker, ['summaryDetail','price'],function(quote){
        let quotePrice = quote.price;
        let quoteDetail = quote.summaryDetail;
        // console.log(quotePrice);
        let result = new Quotation(
            quotePrice.regularMarketPrice,
            quotePrice.regularMarketChange,
            quotePrice.regularMarketChangePercent,
            quotePrice.regularMarketOpen,
            quotePrice.regularMarketDayHigh,
            quotePrice.regularMarketDayLow,
            NaN,
            NaN,
            NaN,
            (parseInt(quoteDetail.volume / 1000000)).toFixed(1) + 'M',
            parseInt(quoteDetail.volume),
            NaN,
            (parseInt(quoteDetail.marketCap / 1000000000)).toFixed(1)+'B',
            NaN,
            NaN,
            NaN,
            quotePrice.regularMarketTime,
            quotePrice.preMarketTime,
            'gainsboro',
            ticker,
            quotePrice.marketState,
        );
        callback(result)
    })
}

function getStockItemList(tickers,callback) {
  getBatchDataFromIEX(tickers,'quote', '', function(res){
    callback(parseStockItemList(res, tickers))
  })
}

function getBatchDataFromIEX(tickers, quote, options, callback){
    var url = 'https://api.iextrading.com/1.0/stock/market/batch?symbols=' + tickers.join(',') +'&types='+ quote
    if(options && options!=''){
      options.map(kv=>{url = url + '&'+kv.key +'='+kv.value})
    }
    api.call3rdPartyAPI('IEX', url, {}, function (batchResult) {
        // console.log(batchResult)
        callback(batchResult)
    })
}

function parseStockItemList(result, tickers) {
  let list = []
  tickers.map(ticker => {
    // console.log(result[ticker].quote)
    list.push(parseStockItemFromIEX(result[ticker].quote))
  })
  return list
}

function parseStockItemFromIEX(item){
    return new StockItem(
      item.symbol, 
      item.companyName,
      item.changePercent,
      item.latestPrice
      );
}
function getStockListFromIEX(callback){
    var url = 'https://api.iextrading.com/1.0/stock/market/list/mostactive'
    api.call3rdPartyAPI('IEX', url, {}, function (result) {
        callback(result.map(item=>parseStockItemFromIEX(item)), 'active')
    })
    url = 'https://api.iextrading.com/1.0/stock/market/list/gainers'
    api.call3rdPartyAPI('IEX', url, {}, function (result) {
        callback(result.map(item=>parseStockItemFromIEX(item)), 'gainers')
    })
    url = 'https://api.iextrading.com/1.0/stock/market/list/losers'
    api.call3rdPartyAPI('IEX', url, {}, function (result) {
        callback(result.map(item=>parseStockItemFromIEX(item)), 'losers')
    })
    url = 'https://api.iextrading.com/1.0/stock/market/list/iexpercent'
    api.call3rdPartyAPI('IEX', url, {}, function (result) {
        callback(result.map(item=>parseStockItemFromIEX(item)), 'iexpercent')
    })
}

function buildSectorPerformanceObject(data){
    var sectorList = [
        {name: 'Consumer Discretionary', shorterName :'Consumer Disc', nameCN: '非必需消费品', desp : ''},
        {name: 'Consumer Staples',shorterName :'Consumer Stap', nameCN: '必需消费品', desp : ''},
        {name: 'Energy' ,shorterName :'Energy', nameCN: '能源', desp : ''},
        {name: 'Financials',shorterName :'Financials', nameCN: '金融', desp : ''},
        {name: 'Health Care' ,shorterName :'Health Care', nameCN: '医疗', desp : ''},
        {name: 'Industrials',shorterName :'Industrials', nameCN: '制造业', desp : ''},
        {name: 'Information Technology',shorterName :'Info Tech', nameCN: '信息技术', desp : ''},
        {name: 'Materials',shorterName :'Materials', nameCN: '材料', desp : ''},
        {name: 'Real Estate',shorterName :'Real Estate', nameCN: '房地产', desp : ''},
        {name: 'Telecommunication Services',shorterName :'Telecom Serv', nameCN: '电信服务', desp : ''},
        {name: 'Utilities',shorterName :'Utilities', nameCN: '公用事业', desp : ''}]
    return sectorList.map(sector=> new SectorPerf(sector.shorterName, sector.nameCN, sector.desp, data[sector.name]))
}

function getSectorPerformanceFromALV(callback){
    var url = 'https://www.alphavantage.co/query?function=SECTOR&apikey=demo'
    api.call3rdPartyAPI('ALV', url, {}, function(result){
        var table = {}
        table['realTime'] =  buildSectorPerformanceObject(result['Rank A: Real-Time Performance'])
        table['1month'] = buildSectorPerformanceObject(result['Rank D: 1 Month Performance'])
        table['1year'] = buildSectorPerformanceObject(result['Rank G: 1 Year Performance'])
        callback(table)
    })
}

function getMinuteData(ticker, option, callback, source = 'IEX'){
    let iexQuote
    let iexChartData
    function handle(){
        if(iexQuote && iexChartData){
            var minutes = []
            var preClose = iexQuote.previousClose
            var closeAttribute = 'close'
            iexChartData.map(minute => {
              if (!minute[closeAttribute]){
                closeAttribute = 'marketClose'
              }
                minutes.push(new MinuteData(
                    parseInt(minute.minute.replace(':', '')),
                    parseFloat(minute[closeAttribute]) * 1000,
                    0,
                    parseInt(minute.marketVolume),
                    parseInt(minute.marketNotional)))
                if (minute[closeAttribute] == 0 || isNaN(parseFloat(minute[closeAttribute]))) { //skip NaN/ 0 data
                    var time = minutes[minutes.length - 1].time
                    minutes[minutes.length - 1] = minutes[minutes.length - 2]
                    minutes[minutes.length - 1].time = time
                }
            })
            let avgSum = 0
            minutes.map((minData, i)=>{
              avgSum += minData.price 
              minData.avg = (avgSum/(i+1)).toFixed(2)
            });
            callback({ close: preClose * 1000, goods_id: 10000, market_date: parseInt(iexChartData[0].date), minutes: minutes })
        }
    }
    api.call3rdPartyAPI("IEX",'https://api.iextrading.com/1.0/stock/'+ticker+'/quote', {}, function (_iexQuote) {
        iexQuote = _iexQuote
        // console.log(_iexQuote)
        handle()
    })
    api.call3rdPartyAPI("IEX",'https://api.iextrading.com/1.0/stock/'+ticker+'/chart/'+option.range, {convertKLineChart: true, freq: option.freq}, function (_iexChartData) {
        iexChartData = _iexChartData
        // console.log(_iexChartData)
        handle()
    })
}

function getKlineData(ticker, option, callback, source= 'IEX'){
    var options = {
        url: config.service.db_handler,
        data: { operation: 'READ_HISTORY', ticker: ticker, source : 'iex', option: option },
        success(result) {
            // console.log("read LOAD", result.data.data);
            var kline = []
            result.data.data.map(data=>{
                let klineData = new KlineData(parseInt(data.date.replace(/-/g,'')), parseFloat(data.open)*1000, parseFloat(data.high)*1000, parseFloat(data.low)*1000, parseFloat(data.close)*1000, parseFloat(data.vwap)*1000,undefined,undefined,parseFloat(data.volume),parseFloat(data.close)*1000,parseFloat(data.volume) )
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
}
function getNewsItems(tickers, callback){
    var newsItems = {};
    getBatchDataFromIEX(tickers,'news', '', function(results){
        tickers.map(ticker=>{
            newsItems[ticker] = []
            results[ticker].news.map(newsData=>{
                newsItems[ticker].push(new NewsItem(newsData.url, newsData.source, '', newsData.datetime, '', newsData.headline.replace(new RegExp('&amp;','g'),'\&').replace(new RegExp('&apos;','g'),'\''), newsData.summary))
            })
        })
        callback(newsItems)
    })

}
module.exports = {
    getQuotation: getQuotation,
    getMinuteData: getMinuteData,
    getKlineData: getKlineData,
    getBatchDataFromIEX : getBatchDataFromIEX,
    getNewsItems: getNewsItems,
    getSectorPerformanceFromALV: getSectorPerformanceFromALV,
    getStockListFromIEX: getStockListFromIEX,
    parseStockItemFromIEX:parseStockItemFromIEX,
    getStockItemList: getStockItemList,
    // getCompanyInfo: getCompanyInfo,
    quoteSingleStockFromIEX: quoteSingleStockFromIEX};