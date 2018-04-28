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
  // read history
  console.log(ctx.query)
  if (ctx.query.operation.toUpperCase() == 'DEBUG-LOAD_PORTFOLIO') {
    var tickers = JSON.parse(ctx.query.tickers)
    var inception_date = ctx.query.inception
    await api.load_historical_data(tickers).then(function (dataset) {
      console.log('ds', dataset)
      var agg = api.aggregateStockData(dataset)
      api.computeQuantMetrics(agg)
      agg.timeRange = api.timeRangeSlice(agg, inception_date)
      ctx.state.data = agg
      console.log('final data', ctx.state.data)
    })
  }
  else if (ctx.query.operation.toUpperCase() == 'STB2') {
    var productId = JSON.parse(ctx.query.productId)
    var tickers = JSON.parse(ctx.query.tickers)
    var inception_date = ctx.query.inception
    // var dts = util.yearAgo2Today()
    // var inception_date = ctx.query.inception

    await api.build_strategy_ts_from_id(productId, tickers, inception_date).then(function (dataset) {
      // ctx.state.data = api.aggregate_timeseries(dataset) 
      ctx.state.data = dataset
      console.log('final data', ctx.state.data)
    })
  }
  else if (ctx.query.operation.toUpperCase() == 'STB') {
    var phases = JSON.parse(ctx.query.phases)
    // var dts = util.yearAgo2Today()
    // var inception_date = ctx.query.inception
    
    await api.build_strategy_ts(phases).then(function (dataset) {
      // ctx.state.data = api.aggregate_timeseries(dataset) 
      ctx.state.data = dataset
      console.log('final data', ctx.state.data)
    })
  }
  if (ctx.query.operation.toUpperCase() == 'LOAD_PORTFOLIO'){
    var tickers = JSON.parse(ctx.query.tickers)
    var inception_date = ctx.query.inception
    await api.load_historical_data(tickers).then(function (dataset) { 
      var agg = api.aggregateStockData(dataset)
      api.computeQuantMetrics(agg)
      agg.timeRange = api.timeRangeSlice(agg, inception_date)
      var finalData = {}
      finalData.ticker = agg.ticker
      finalData.avg_return = agg.avg_return
      finalData.quant = agg.quant
      finalData.timeRange = agg.timeRange
      ctx.state.data = finalData
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
    // innerJoin('portfolio_view', 'portfolio_metadata.id', 'portfolio_view.id').
    await knex('portfolio_metadata').select('*').where({ visible: true }).then(function (data) {
      // console.log(data);
      ctx.state.data = data
    });
  }
  else if(ctx.query.operation.toUpperCase() === 'IN'){
    // knex.insert('*').from('users').join('contacts', function () {
    //   this.on('users.id', '=', 'contacts.id').onNotExists(function () {
    //     this.select('*').from('accounts').whereRaw('users.account_id = accounts.id');
    //   })
    // })
    var portfolio = JSON.parse(ctx.query.portfolio)
    await knex('portfolio_metadata').insert({ id: portfolio.id, name: portfolio.name, desp: portfolio.desp, inception: portfolio.inception, last_update: portfolio.last_update, publisher: portfolio.publisher, curr_holds: JSON.stringify(portfolio.curr_holds), ratiosTable: JSON.stringify(portfolio.ratiosTable) }).then(function(data){
      console.log(data);
      ctx.state.data = data
    })
  }
  else if (ctx.query.operation.toUpperCase() === 'W'){
    // console.log(typeof ctx.query.portfolio)
    var portfolio = JSON.parse(ctx.query.portfolio)
    console.log(portfolio.ratiosTable)
    await knex('portfolio_metadata')
      .where('id', '=', portfolio.id)
      .update(
      'ratiosTable', JSON.stringify(portfolio.ratiosTable)).then(function (data) {
        console.log(data);
        ctx.state.data = data
      });
  }  
}