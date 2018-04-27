const Koa = require('koa')
const app = new Koa()
const debug = require('debug')('koa-weapp-demo')
const response = require('./middlewares/response')
const bodyParser = require('koa-bodyparser')
const config = require('./config')
const knex = require('knex')
var cron = require('node-cron');

var util = require('./tools/Util.js')
var api = require('./tools/API.js')
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

// api.handle_historical_request('SPY', function(ds){console.log(ds)})
// api.handle_historical_request('FB', function (ds) { console.log(ds) })

// api.read_historical('SPY', function(rows){
//   rows.forEach(function(row){
//     var input = JSON.parse(row.data).reverse()
//     console.log(util.dateIndexPicker(input, '1y'))
//     console.log(util.dateIndexPicker(input, '3m'))
//     console.log(util.dateIndexPicker(input, '30d'))
//     console.log(util.dateIndexPicker(input, '10d'))
//     console.log(util.dateIndexPicker(input, '20180201'))
//   })
// })
cron.schedule('4,26,55 9 * * *', function () {
  api.read_historical(null).then( function (rows) {
    console.log('number of rows', rows.length)
    rows.forEach(function (row) {
      // sleep(10000).then(function () {
        // console.log('sleep', new Date().toISOString())
      api.retryer(5, row.ticker, function () {
        return new Promise(function (resolve, reject) {
          fromTo = util.yearAgo2Today()
          var request = { symbol: row.ticker, from: fromTo.from, to: fromTo.to, period: 'd' }
          api.quote_historical2(request).then(function (ts) {
            if (!ts || ts.length == 0) {
              resolve(false)
            }
            else {
              api.insert_historical(row.ticker, JSON.stringify(ts), Date.now() / 1000);
              console.log('updated', row.ticker, ts.length, new Date().toISOString())
              resolve(true)
            }
          })
        });
      })
    })
  })
});