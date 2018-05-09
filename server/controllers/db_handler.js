const fs = require('fs');
var api  = require('../tools/API.js');
var util = require('../tools/Util.js')
var _u = require('underscore');
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
var STK = require('../tools/StockData.js')
var StockData = STK.StockData;
var StockDataFactory = STK.StockDataFactory;
var AggregationData = STK.Aggregation;
var AggregationFactory = STK.AggregationFactory
module.exports = async (ctx, next) => {
    await next()
    console.log(ctx.query)
    if (ctx.query.operation.toUpperCase() == 'LOAD_PORTFOLIO') {
        var mode = ctx.query.mode
        var tickers = JSON.parse(ctx.query.tickers)
        var inceptionDate = parseInt(ctx.query.inception.replace(/-/g, ''))
        var id = ctx.query.id
        var toUpdateDB = ctx.query.toUpdateDB
        await api.load_historical_data(tickers).then(function (dataset) {
            var agg = new AggregationFactory().build(dataset,inceptionDate)
            agg.computeQuantMetric()
            agg.timeRange = api.timeRangeSlice(agg, inceptionDate)
            if (toUpdateDB) {
                console.log("updatePortfolioProfile", id)
                api.updateRatiosTable(id, agg.quant)
            }
            if(mode && mode.toUpperCase() == "DEBUG"){
                ctx.state.data = agg
            }
            else{
                var finalData = {}
                finalData.id = id
                finalData.ticker = agg.ticker
                finalData.quant = agg.quant
                finalData.timeRange = agg.timeRange
                ctx.state.data = finalData
            }
            console.log('final data', ctx.state.data)
        })
    }
    else if (ctx.query.operation.toUpperCase() == 'LOAD') {
        // var productId = JSON.parse(ctx.query.productId)
        // var inceptionDate = ctx.query.inception
        // var mode = ctx.query.mode
        await api.handler(ctx.query).then(function (dataset) {
            ctx.state.data = dataset
            console.log('final data', ctx.state.data)
        })
    }
    // else if (ctx.query.operation.toUpperCase() == 'STB') {
    //   var phases = JSON.parse(ctx.query.phases)
    //   var numOfPhase = phases.length
    //   await api.buildStrategyFromPhases(phases).then(function(finalData){
    //     ctx.state.data = finalData
    //     console.log('final data', ctx.state.data)
    //   })
    // }
    // else if (ctx.query.operation.toUpperCase() == 'RHN') {
    //   await knex('phases').select('*').where({ id: ctx.query.id }).orderBy('phase_id').then(function (data) {
    //     ctx.state.data = data
    //   });
    // }
    // else if(ctx.query.operation.toUpperCase() == 'RH'){
    //   await knex('phase').select('*').where({ id: ctx.query.id }).orderBy('phaseID').then(function (data) {
    //     ctx.state.data = data
    //   });
    // }
    else if (ctx.query.operation.toUpperCase() === 'R'){
        await knex('portfolio_metadata').select('*').where({ visible: true }).then(function (data) {
            ctx.state.data = data
        });
    }
    else if(ctx.query.operation.toUpperCase() === 'NEW'){
        var profile = JSON.parse(ctx.query.profile)
        await api.createNewProfile(profile,ctx.state)
        // await knex('portfolio_metadata').insert({ id: profile.id, name: profile.name, desp: profile.desp, inception: profile.inception, last_update: profile.last_update, publisher: profile.publisher, curr_holds: JSON.stringify(profile.curr_holds), ratiosTable: JSON.stringify(profile.ratiosTable), visible: 1 }).then(function(data){
        //     // console.log(data);

        //     ctx.state.data = data
        // })
        // // var profile = JSON.parse(profile)
        // var newPhase = _u.last(profile.phases)
        // knex('phases').insert({ phase_id: newPhase.phaseId, id: profile.id, date: newPhase.from.toString(), holds: JSON.stringify(newPhase.tickers) }).then(function (result) { console.log('update phases', result) })
    }
    else if(ctx.query.operation.toUpperCase() === 'UPDATE'){
        var profile = JSON.parse(ctx.query.profile)
        await api.updateProfile(profile, ctx.state)
    }
    // else if (ctx.query.operation.toUpperCase() === 'W'){
    //   var portfolio = JSON.parse(ctx.query.portfolio)
    //   console.log(portfolio.ratiosTable)
    //   await knex('portfolio_metadata')
    //     .where('id', '=', portfolio.id)
    //     .update(
    //     'ratiosTable', JSON.stringify(portfolio.c)).then(function (data) {
    //       console.log(data);
    //       ctx.state.data = data
    //     });
    // }
}