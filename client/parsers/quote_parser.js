var api = require('../api/data_api.js')
var Quotation = require('../models/Quotation.js')
var MinuteData = require('../models/MinuteData.js')
var KlineData = require('../models/KLineData.js')
const NewsItem = require('../models/NewsItem.js')
const SectorPerf = require('../models/SectorPerformance.js')
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
    getSectorPerformanceFromALV(function (result) {
        console.log(result)
    })
}

function getBatchDataFromIEX(tickers, quote, callback){
    var url = 'https://api.iextrading.com/1.0/stock/market/batch?symbols=' + tickers.join(',') +'&types='+ quote
    api.call3rdPartyAPI('IEX', url, {}, function (batchResult) {
        callback(batchResult)
    })
}

function getSectorPerformanceFromALV(callback){
    var url = 'https://www.alphavantage.co/query?function=SECTOR&apikey=demo'
    api.call3rdPartyAPI('ALV', url, {}, function(result){
        // result[]
        // result['Rank A: Real-Time Performance']
        // result['Rank D: 1 Month Performance']
        // result['Rank G: 1 Year Performance']
        var sectorList = ['Consumer Discretionary', 'Consumer Staples', 'Energy', 'Financials', 'Health Care', 'Industrials', 'Information Technology', 'Materials', 'Real Estate', 'Telecommunication Services', 'Utilities']
        var table = {}
        table['realTime'] = sectorList.map(sectorName=>  new SectorPerf(sectorName, '', result['Rank A: Real-Time Performance'][sectorName]))
        table['1month'] = sectorList.map(sectorName=>   new SectorPerf(sectorName, '', result['Rank D: 1 Month Performance'][sectorName]))
        table['1year'] = sectorList.map(sectorName=>   new SectorPerf(sectorName, '', result['Rank G: 1 Year Performance'][sectorName]))
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
    api.call3rdPartyAPI("IEX",'https://api.iextrading.com/1.0/stock/'+ticker+'/quote', {}, function (_iexQuote) {
        iexQuote = _iexQuote
        console.log(_iexQuote)
        handle()
    })
    api.call3rdPartyAPI("IEX",'https://api.iextrading.com/1.0/stock/'+ticker+'/chart/'+option.range, {convertKLineChart: true, freq: option.freq}, function (_iexChartData) {
        iexChartData = _iexChartData
        console.log(_iexChartData)
        handle()
    })
}

function getKlineData(ticker, option, callback, source= 'IEX'){
    // if(option.range === '5y'){
    // console.log(option)
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
}
function getNewsItems(tickers, callback){
    var newsItems = {}
    getBatchDataFromIEX(tickers,'news', function(results){
        tickers.map(ticker=>{
            newsItems[ticker] = []
            results[ticker].news.map(newsData=>{
                newsItems[ticker].push(new NewsItem(newsData.url, newsData.source, '', newsData.datetime, '', newsData.headline, newsData.summary))
            })
        })
        callback(newsItems)
    })

}
module.exports = { getQuotation: getQuotation, getMinuteData: getMinuteData, getKlineData: getKlineData, getBatchDataFromIEX : getBatchDataFromIEX, getNewsItems: getNewsItems}