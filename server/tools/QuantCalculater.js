var ss = require('simple-statistics')

class Calculator {
    static computeAlphaBeta(ts1, ts2) {
        var arr = []
        ts1.map((item, i) => { arr.push([ts1[i], ts2[i]]) })
        var res = ss.linearRegression(arr)
        return { alpha: res.b, beta: res.m }
    }

    static computeSharpRatio(ts1, ts2) {
        return (ss.mean(ts1) - ss.mean(ts2)) / ss.standardDeviation(ts1);
    }

    static computeMDD(data) {
        var peak = 0.;
        var mdd = 1.;
        data.forEach(function (current, i, a) {
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

    static computeVolatility(returns) {
        // console.log(portfolio.aggregation.returns.map(Math.log))
        var N = returns.length;
        return Math.sqrt(N) * ss.standardDeviation(returns.map(Math.log))
    }
}
module.exports  = Calculator