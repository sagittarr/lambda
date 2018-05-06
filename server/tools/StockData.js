// class StockData{
//   constructor(){
//     this.ticker = '';
//     this.adjClose = [];
//     this.dateIndex = [];
//     this.dailyPctChange = [];
//     this.cumulativeValue = [];
//     this.valuesWithDate = []
//     this.isBenchmark = false;
//   }
//   get ticker() {
//     return this.ticker;
//   }
//   set ticker(t) {
//     this.ticker = t;
//   }
//   get adjClose(){
//     return this.adjClose;
//   }
//   set adjClose(adj){
//     this.adjClose = adj
//   }
//   get dateIndex(){
//     return this.dateIndex
//   }
//   set dateIndex(dateIndex) {
//     this.dateIndex = dateIndex
//   }
//   get dailyPctChange() {
//     return this.dailyPctChange
//   }
//   set dailyPctChange(dpc){
//     this.dailyPctChange = dpc
//   }
//   get cumulativeValue() {
//     return this.cumulativeValue
//   }
//   set cumulativeValue(value) {
//     this.cumulativeValue = value
//   }
//   get valuesWithDate() {
//     return this.valuesWithDate
//   }
//   set valuesWithDate(value) {
//     this.valuesWithDate = value
//   }
//   get isBenchmark() {
//     return this.isBenchmark
//   }
//   set isBenchmark(value) {
//     this.isBenchmark = value
//   }
// }

// var StockData = function (ticker) {
//     this.ticker = '';
//     this.adjClose = [];
//     this.dateIndex = [];
//     this.dailyPctChange = [];
//     this.cumulativeValue = [];
//     this.valuesWithDate = []
//     this.isBenchmark = false;
// }

// StockData.prototype.ticker = function () {
//   return this.ticker;
// };
//
function StockData () {
    this.ticker = ''
    this.adjClose = []
    this.dateIndex = []
    this.dailyPctChange = []
    this.cumulativeValue = []
    this.valuesWithDate = []
    this.isBenchmark = false
}

// var stk = new StockData()
// stk.ticker = 't'
// alert(stk)
module.exports = StockData
