var yahooFinance = require('yahoo-finance');
var _ = require('underscore');
var api = require('../tools/db_api.js')
const axios = require('axios');
const YahooFinanceAPI = require('yahoo-finance-data');
const yhfd = new YahooFinanceAPI({
    key: 'dj0yJmk9N29ibVZ0ZkRncGFnJmQ9WVdrOWIxUm5Wemt4TldVbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD03YQ--',
    secret: 'aca598741b22f2b8355dec4d3bf891f97efe3bca'
});

module.exports = async (ctx, next) => {
    if (ctx.query.source === 'ALV') {
        var apiUrl = decodeURIComponent(ctx.query.apiUrl)
        console.log(apiUrl)
        await axios.get(apiUrl)
            .then(function(response){
                console.log(response.data)
                ctx.state.data = response.data
            });
    } else if (ctx.query.source === 'IEX') {
        // var args = parseURLArg(ctx.request.url)
        var apiUrl = decodeURIComponent(ctx.query.apiUrl)
        console.log(apiUrl)
        await axios.get(apiUrl)
            .then(function(response){
                console.log(response.data)
                if(ctx.query.convertKLineChart === true){
                    ctx.state.data = api.convertHistoricalData(response.data, ctx.query.convertFreq)
                }
                else{
                    ctx.state.data = response.data
                }

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
    else if(ctx.query.source === 'YHD'){
        let ticker = ctx.query.ticker;
        if(ctx.query.module === 'getHeadlinesByTicker'){
            await yhfd.getHeadlinesByTicker(ticker)
                .then(data => console.log(ctx.state.data = data.query.results))
                .catch(err => console.log(err));
        }
    }
    else {
        let apiUrl = decodeURIComponent(ctx.query.apiUrl);
        console.log(apiUrl);
        await axios.get(apiUrl)
            .then(function(response){
                console.log(response.data)
                ctx.state.data = response.data
            });
    }
}
