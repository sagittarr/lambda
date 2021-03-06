var api  = require('../tools/db_api.js');
var _ = require('underscore');
// const ExtApi = require('../tools/externalApi');
var knex = require('knex')({
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        // password: 'Quant2018$$',
        password: 'wx2155a0a67e766226',
        database: 'lambda'
    }
});
// console.log(_.last([1,2,3],2))
module.exports = async (ctx, next) => {
    await next()
    console.log(ctx.query)
    if (ctx.query.operation.toUpperCase() == 'LOAD') {
        await api.handler(ctx.query).then(function (dataset) {
            ctx.state.data = dataset
            console.log('final data', ctx.state.data)
        }).catch(function(err){ctx.state.data = err; console.error(err)})
    }
    // else if(ctx.query.operation.toUpperCase() === 'API'){
    //     console.log('API', ctx.query);
    //     let iexReq = {apiUrl: ctx.query.apiUrl};
    //     ExtApi.asking(iexReq).then(function (res) {
    //         ctx.state.data = res;
    //     }).catch(function(err){console.error(err);reject(err)});
    // }
    else if(ctx.query.operation.toUpperCase() === 'LOAD_INTRADAY'){
        console.log('LOAD_INTRADAY', ctx.query)
        await api.smartLoadIntraday({ticker: ctx.query.ticker, source: ctx.query.source, apiUrl: ctx.query.apiUrl}).then(function(res){
            ctx.state.data = res;
            console.log('LOAD_INTRADAY', ctx.state.data)
        }).catch(function(err){ctx.state.data = err; console.error(err)})
    }
    else if (ctx.query.operation.toUpperCase() === 'R'){
        await knex('portfolio_metadata').select('*').where({ visible: true }).then(function (data) {
            ctx.state.data = data
        }).catch(function(err){ctx.state.data = err; console.error(err)});
    }
    else if(ctx.query.operation.toUpperCase() === 'READ_HISTORY'){
        if(ctx.query.option){
            ctx.query.option = JSON.parse(ctx.query.option)
        }
        await api.smartLoadStockHistory(ctx.query.ticker, 'iex').then(function (history) {
            if(typeof(history) === typeof('str')){
                history = JSON.parse(history)
            }
            if(ctx.query.option.freq==='W' || ctx.query.option.freq==='M'){
                ctx.state.data = api.convertHistoricalData(history, ctx.query.option.freq)
            }
            else{
                ctx.state.data = _.last(history, 150)
            }
        }).catch(function(err){ctx.state.data = err; console.error(err)})
    }
    else if(ctx.query.operation.toUpperCase() === 'NEW'){
        var profile = JSON.parse(ctx.query.profile)
        await api.createNewProfile(profile,ctx.state)
    }
    else if(ctx.query.operation.toUpperCase() === 'UPDATE'){
        var profile = JSON.parse(ctx.query.profile)
        await api.updateProfile(profile, ctx.state)
    }
    else if(ctx.query.operation.toUpperCase() === 'DEL'){
        var id = JSON.parse(ctx.query.id)
        await api.deleteProfile(id, ctx.state)
    }
}