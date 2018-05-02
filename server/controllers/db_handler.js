const fs = require('fs');
var api  = require('../tools/API.js');
var util = require('../tools/Util.js')
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

module.exports = async (ctx, next) => {
  await next()
  console.log(ctx.query)
  if (ctx.query.operation.toUpperCase() == 'LOAD_PORTFOLIO') {
    var mode = ctx.query.mode
    var tickers = JSON.parse(ctx.query.tickers)
    var inceptionDate = parseInt(ctx.query.inception.replace(/-/g, ''))
    var id = ctx.query.id
    var toUpdateDB = ctx.query.toUpdateDB
    await api.load_historical_data(tickers, inceptionDate).then(function (dataset) {
      var agg = api.aggregateStockData(dataset)
      api.computeQuantMetrics(agg)
      agg.timeRange = api.timeRangeSlice(agg, inceptionDate)
      if (toUpdateDB) {
        console.log("updatePortfolioProfile", id)
        api.updatePortfolioProfile(id, agg.quant)
      }
      if(mode && mode.toUpperCase() == "DEBUG"){
        ctx.state.data = agg
      }
      else{
        var finalData = {}
        finalData.ticker = agg.ticker
        finalData.quant = agg.quant
        finalData.timeRange = agg.timeRange
        ctx.state.data = finalData
      }
      console.log('final data', ctx.state.data)
    })
  }
  else if (ctx.query.operation.toUpperCase() == 'STB2') {
    var productId = JSON.parse(ctx.query.productId)
    var inceptionDate = ctx.query.inception
    var mode = ctx.query.mode
    await api.build_strategy_ts_from_id(productId).then(function (dataset) {
      ctx.state.data = dataset
      console.log('final data', ctx.state.data)
    })
  }
  else if (ctx.query.operation.toUpperCase() == 'STB') {
    var phases = JSON.parse(ctx.query.phases)
    
    await api.build_strategy_ts(phases).then(function (dataset) {
      ctx.state.data = dataset
      console.log('final data', ctx.state.data)
    })
  }
  else if (ctx.query.operation.toUpperCase() == 'RHN') {
    await knex('phases').select('*').where({ id: ctx.query.id }).orderBy('phase_id').then(function (data) {
      ctx.state.data = data
    });
  }
  else if(ctx.query.operation.toUpperCase() == 'RH'){
    await knex('phase').select('*').where({ id: ctx.query.id }).orderBy('phaseID').then(function (data) {
      ctx.state.data = data
    });
  }
  else if (ctx.query.operation.toUpperCase() === 'R'){
    await knex('portfolio_metadata').select('*').where({ visible: true }).then(function (data) {
      ctx.state.data = data
    });
  }
  else if(ctx.query.operation.toUpperCase() === 'IN'){
    var portfolio = JSON.parse(ctx.query.portfolio)
    await knex('portfolio_metadata').insert({ id: portfolio.id, name: portfolio.name, desp: portfolio.desp, inception: portfolio.inception, last_update: portfolio.last_update, publisher: portfolio.publisher, curr_holds: JSON.stringify(portfolio.curr_holds), ratiosTable: JSON.stringify(portfolio.ratiosTable) }).then(function(data){
      console.log(data);
      ctx.state.data = data
    })
  }
  else if (ctx.query.operation.toUpperCase() === 'W'){
    var portfolio = JSON.parse(ctx.query.portfolio)
    console.log(portfolio.ratiosTable)
    await knex('portfolio_metadata')
      .where('id', '=', portfolio.id)
      .update(
      'ratiosTable', JSON.stringify(portfolio.c)).then(function (data) {
        console.log(data);
        ctx.state.data = data
      });
  }  
}