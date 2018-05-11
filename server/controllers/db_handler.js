// const fs = require('fs');
var api  = require('../tools/API.js');
// var util = require('../tools/Util.js')
// var _u = require('underscore');
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
// var STK = require('../tools/StockData.js')
// var StockData = STK.StockData;
// var StockDataFactory = STK.StockDataFactory;
// var AggregationData = STK.Aggregation;
// var AggregationFactory = STK.AggregationFactory
module.exports = async (ctx, next) => {
    await next()
    console.log(ctx.query)
    if (ctx.query.operation.toUpperCase() == 'LOAD') {
        await api.handler(ctx.query).then(function (dataset) {
            ctx.state.data = dataset
            console.log('final data', ctx.state.data)
        })
    }
    else if (ctx.query.operation.toUpperCase() === 'R'){
        await knex('portfolio_metadata').select('*').where({ visible: true }).then(function (data) {
            ctx.state.data = data
        });
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
        var profile = JSON.parse(ctx.query.profile)
        await api.deleteProfile(profile, ctx.state)
    }
}