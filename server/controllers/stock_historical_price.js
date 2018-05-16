var yahooFinance = require('yahoo-finance');
var _ = require('underscore');
var api = require('../tools/db_api.js')
const axios = require('axios');
function parseURLArg(url) {
    var urlapi = require('url');
    var parameters = urlapi.parse(url);
    var jsonArr = ['{'];
    parameters.query.split('&').map(function (x) {
        var kv = x.split('=');
        jsonArr.push('"' + kv[0] + '":"' + kv[1] + '"');
        jsonArr.push(',')
    });
    jsonArr[jsonArr.length - 1] = '}';
    var res = JSON.parse(jsonArr.join(''));
    // res.tickers = res.tickers.split('%2C');
    return res;
};
function compositeAlphaVantageURL(ticker, freq) {
    var alphaVantageKey = "WLM4RKKDFEXZAQK6";
    var tsFreq = ''
    if (freq.toUpperCase() === 'D'){
        tsFreq = 'TIME_SERIES_DAILY'
    }
    else if (freq.toUpperCase() === 'W'){
        tsFreq = 'TIME_SERIES_WEEKLY'
    }
    else{
        tsFreq = 'TIME_SERIES_MONTHLY'
    }
    return "https://www.alphavantage.co/query?function=" + tsFreq +"&symbol=" + ticker + "&apikey=" + alphaVantageKey;
};

module.exports = async (ctx, next) => {
    if (ctx.query.source === 'AlphaV') {
        var args = parseURLArg(ctx.request.url)
        console.log(args)
        ctx.redirect(compositeAlphaVantageURL(args.ticker, args.freq))
    } else if (ctx.query.source === 'IEX') {
        var args = parseURLArg(ctx.request.url)
        args.apiUrl = args.apiUrl.replace(/%3A/g, ':').replace(/%2F/g,'/')
        console.log(args.freq,args.apiUrl)
        await axios.get(args.apiUrl)
            .then(function(response){
                console.log(response)
                ctx.state.data = api.convertHistoricalData(response.data, args.freq)
                console.log(ctx.state.data, args.freq,args.apiUrl)
            });
    } else if (ctx.query.source === 'YHOO') {
        console.log(JSON.parse(ctx.query.symbols))
        await yahooFinance.historical({
            symbols: JSON.parse(ctx.query.symbols),
            from: ctx.query.from,
            to: ctx.query.to,
            period: ctx.query.period
            // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
        }, function (err, quotes) {
            if (err) {
                console.err(err)
                return
            }
            ctx.state.data = quotes
        })
    }
    else {
        ctx.state.data = 'unexpected source'
    }
}
// function convertIEXData(iexArr){
//     var open = iexArr[0].open
//     var date = iexArr[0].date
//     var close = _.last(iexArr).close
//     var highArr = []
//     var lowArr = []
//     var volumeArr = []
//     iexArr.map(day=>{highArr.push(day.high); lowArr.push(day.low); volumeArr.push(day.volume)})
//     return {date: date, open : open, high: _.max(highArr), low: _.min(lowArr), close: close, volume : volumeArr.reduce((a, b) => a + b, 0)}
// }
// function convertHistoricalData(dlyData, freq){
//     if(freq === 'W'){
//         var weeklyData = []
//         for(var i = 0; i<dlyData.length; i+=5){
//             var fiveDays = dlyData.slice(i,i+5)
//             weeklyData.push(convertIEXData(fiveDays))
//         }
//         return weeklyData
//     }
//     else if(freq ==='M'){
//         var monthlyData = []
//         var i = 1
//         var currMonth = dlyData[0].date.replace(/-/g,'').slice(4,6)
//         var dayArr = [dlyData[0]]
//         while(i < dlyData.length){
//             var month = dlyData[i].date.replace(/-/g,'').slice(4,6)
//             if( month != currMonth){
//                 currMonth = month
//                 monthlyData.push(convertIEXData(dayArr))
//                 dayArr = []
//             }
//             dayArr.push(response.data[i])
//             i+=1
//         }
//         return monthlyData
//     }
//     else{
//         return dlyData
//     }
// }
// axios.get('https://api.iextrading.com/1.0/stock/aapl/chart/5y')
//     .then(function(response){
//         var weeklyData = []
//         for(var i = 0; i<response.data.length; i+=5){
//             var fiveDays = response.data.slice(i,i+5)
//             weeklyData.push(convertIEXData(fiveDays))
//         }
//         console.log(weeklyData.length)
//         var monthlyData = []
//         var i = 1
//         var currMonth = response.data[0].date.replace(/-/g,'').slice(4,6)
//         var dayArr = [response.data[0]]
//         while(i < response.data.length){
//             var month = response.data[i].date.replace(/-/g,'').slice(4,6)
//             if( month != currMonth){
//                 currMonth = month
//                 // console.log(dayArr.length, dayArr[0], _.last(dayArr))
//                 monthlyData.push(convertIEXData(dayArr))
//                 dayArr = []
//             }
//             dayArr.push(response.data[i])
//             i+=1
//         }
//         console.log(monthlyData)
//     });