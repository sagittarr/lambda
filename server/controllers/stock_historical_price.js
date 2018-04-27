var yahooFinance = require('yahoo-finance');
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
module.exports = async  (ctx, next) => {
  if (ctx.query.source == 'AlphaV') {
    var args = parseURLArg(ctx.request.url);
    console.log(args)
    ctx.redirect(compositeAlphaVantageURL(args.ticker, args.freq))
  }
  else if(ctx.query.source = 'YHOO'){
    console.log(JSON.parse(ctx.query.symbols))
    // await yahooFinance.historical({
    //   symbols: ["SQ", "NFLX", "NVDA", "BABA", "ATVI", "SPY"],
    //   from: '2018-01-01',
    //   to: '2018-02-25',
    //   period: 'd',
    //   // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    // }, function (err, quotes) {
    //   console.log(quotes)
    // });
    await yahooFinance.historical({
      symbols: JSON.parse(ctx.query.symbols),
      from: ctx.query.from,
      to: ctx.query.to,
      period: ctx.query.period,
      // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    }, function (err, quotes) {
      if (err) {
        console.err(err)
        return
      }
      console.log(quotes)
      ctx.state.data = quotes
    });
  }
}



