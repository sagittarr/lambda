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

    static computeMDD(ts) {
        var peak = 0.;
        var mdd = 1.;
        ts.forEach(function (current, i, a) {
            if (current > peak) {
                peak = current;
            }
            // console.log( peak, current, mdd)
            if (current / peak < mdd) {
                mdd = current / peak;
            }
        })
        return (1.-mdd)*100
    }

    static computeVolatility(returns) {
        // console.log(portfolio.aggregation.returns.map(Math.log))
        var N = returns.length;
        return Math.sqrt(N) * ss.standardDeviation(returns.map(Math.log))
    }

    static computeAll(ts1, ts2){
        let dlyRtns= ts1.map((v, i) => { return i > 0 ? v / ts1[i - 1] : 1 })
        let voli  = Calculator.computeVolatility(dlyRtns)
        let mdd = Calculator.computeMDD(ts1)
        let totalRtn = ts1[ts1.length-1] / ts1[0]
        let avgDlyRtn = 100*(Math.pow(totalRtn, 1./ts1.length) - 1)
        return {dlyRtns: dlyRtns, avgDlyRtn: avgDlyRtn, totalRtn:100*(totalRtn-1), mdd: mdd, voli:voli, numOfDays: ts1.length}
    }
}
module.exports  = Calculator