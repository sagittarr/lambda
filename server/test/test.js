var STK = require('../tools/StockData')
const async = require('async')
// var StockDataFactory = STK.StockDataFactory
// var AggregationFactory = STK.AggregationFactory
// var testInput = [{low: 106.650002, date: "2018-05-04T04:00:00.000Z", high: 111.150002, open: 107.300003, close: 110.050003, adjClose: 110.050003}, {low: 105.349998, date: "2018-05-03T04:00:00.000Z", high: 108.599998, open: 106.349998, close: 107.900002, adjClose: 107.900002}]
// var spy = new StockDataFactory().build(testInput, 'SPY', '000')
// var stk = new StockDataFactory().build(testInput, 'X', '000')
// // console.log(new StockDataFactory().build(testInput, 'X', '000'))
// console.log(new AggregationFactory().build([spy,stk], '2018XXXX'))

async.waterfall([
    function(callback) {
        console.log('1')
        return new Promise(function(resolve, reject){
            resolve('OK')
        }).then(function (result) {
            callback(null, result, 'two');
        })
    },
    function(arg1, arg2, callback) {
        // arg1 now equals 'one' and arg2 now equals 'two'
        console.log(arg1, arg2)
        callback(null, 'three');
    },
    function(arg1, callback) {
        // arg1 now equals 'three'
        console.log('3')
        callback(null, 'done');
    }
], function (err, result) {
    console.log('done')
    // result now equals 'done'
});