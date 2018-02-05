var ss = require('../../utils/simple-statistics.js')
class Metrics {
  static computeAlphaBeta(portfolio) {
    var arr = []
    for (var i = 0; i < portfolio.benchmark.data.length; i++) {
      arr.push([portfolio.aggregation.returns[i], portfolio.benchmark.returns[i]])
    }
    // console.log(arr)
    var res = ss.linearRegression(arr)
    return {alpha: res.b, beta: res.m}
    // console.log(ss.linearRegression(arr))
  }

  static computeSharpRatio(portfolio){
    return (ss.mean(portfolio.aggregation.returns) - ss.mean(portfolio.benchmark.returns)) / ss.standardDeviation(portfolio.aggregation.returns);
  }

  static computeMDD(portfolio) {
    var peak = 0.;
    var mdd = 1.;
    portfolio.aggregation.values.forEach(function (current, i, a) {
      if (current > peak) {
        peak = current;
      }
      // console.log( peak, current, mdd)
      if (current / peak < mdd) {
        mdd = current / peak;
      }
    })
    return mdd
  }
}
module.exports = Metrics