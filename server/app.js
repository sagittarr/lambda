const Koa = require('koa')
const app = new Koa()
const debug = require('debug')('koa-weapp-demo')
const response = require('./middlewares/response')
const bodyParser = require('koa-bodyparser')
const config = require('./config')
const knex = require('knex')
var cron = require('node-cron');
const axios = require('axios')

var util = require('./tools/Util.js')
var api = require('./tools/db_api.js')
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
// 使用响应处理中间件
app.use(response)

// 解析请求体
app.use(bodyParser())

// 引入路由分发
const router = require('./routes')
app.use(router.routes())

// 启动程序，监听端口
app.listen(config.port, () => debug(`listening on port ${config.port}`))

cron.schedule('4,26,55 9 * * *', function () {
  api.read_historical(null, null).then( function (rows) {
    console.log('number of rows', rows.length)
    rows.forEach(function (row) {
      // sleep(10000).then(function () {
        // console.log('sleep', new Date().toISOString())
      api.retryer(5, row.ticker, function () {
        return new Promise(function (resolve, reject) {
          fromTo = util.yearAgo2Today()
          var request = { ticker: row.ticker, from: fromTo.from, to: fromTo.to, freq: 'd' }
          api.getHistoricalDataFromYahoo(request).then(function (ts) {
            if (!ts || ts.length == 0) {
              resolve(false)
            }
            else {
              api.insert_historical(row.ticker, JSON.stringify(ts), Date.now() / 1000, 'yahoo');
              console.log('updated', row.ticker, ts.length, new Date().toISOString(), 'yahoo')
              resolve(true)
            }
          })
        });
      })
    })
  })
});

// axios.get('https://api.iextrading.com/1.0/stock/aapl/chart/5y').then(function(response){
//     var data = response.data
//     api.insert_historical('AAPL', JSON.stringify(data), Date.now() / 1000, 'iex')
//     console.log('https://api.iextrading.com/1.0/stock/aapl/chart/5y', data)
// })
