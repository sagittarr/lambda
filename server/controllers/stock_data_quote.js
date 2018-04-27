var yahooFinance = require('yahoo-finance');
module.exports = async (ctx, next) => {
  var ticker = ctx.query.ticker
  var data_modules = JSON.parse(ctx.query.modules)
  console.log(ticker + data_modules)
  await yahooFinance.quote(
    {
      symbol: ticker,
      modules: data_modules 
    }
  , function (err, quotes) {
    if(err){
      ctx.state.data = err
    }
    else{
      ctx.state.data = quotes
    }
  });
}