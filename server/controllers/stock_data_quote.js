var yahooFinance = require('yahoo-finance');
module.exports = async (ctx, next) => {
    var ticker = ctx.query.ticker
    var dataModules = JSON.parse(ctx.query.modules)
    console.log(ticker + dataModules)
    await yahooFinance.quote(
        {
            symbol: ticker,
            modules: dataModules
        }
        , function (err, quotes) {
            if(err){
                ctx.state.data = err
            }
            else{
                ctx.state.data = quotes
            }
        })
}