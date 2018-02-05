var q = require('./quant.js')
// 登录授权接口
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
module.exports =  (ctx, next) => {
  var args = parseURLArg(ctx.request.url);
  console.log(args)
  ctx.redirect(compositeAlphaVantageURL(args.ticker, args.freq))
}



