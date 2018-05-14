var wxCharts = require('../../utils/wxcharts-lambda.js');
// var wx_chart = require('../../utils/wx-chart.min.js')


function drawLineChart(categories, series, title, width, height) {
  return new wxCharts({
    canvasId: 'lineCanvas',
    type: 'line',
    categories: categories,
    animation: true,
    series: series,
    xAxis: {
      disableGrid: false
    },
    yAxis: {
      title: title,
      format: function (val) {
        return (val * 100).toFixed(2) + '%';
      },
      max: 1.02,
      min: 1.0
    },
    width: width,
    height: height,
    dataLabel: false,
    dataPointShape: true,
    enableScroll: false,
    background: '#F8F8F8',
    extra: {
      lineStyle: 'curve'
    }
  });
}
class Chart_utils {
  static createColumnChart(phases, windowWidth, height = 200, canvasId = 'stockNumberChart') {
    // phases, 
    var categories = []
    var totalStocks = []
    var newStocks = []
    phases.map((phase, i) => {
      categories.push(phase.from);
      if (i == 0) {
        totalStocks.push(phase.tickers.length)
        newStocks.push(phase.tickers.length)
      }
      else {
        let _new = 0
        phase.tickers.map(ticker => {
          if (!phases[i - 1].tickers.includes(ticker)) {
            _new += 1
          }
        })
        totalStocks.push(phase.tickers.length)
        newStocks.push(_new)
      }
    })
      var columnChart = new wxCharts({
        canvasId: canvasId,
        type: 'column',
        animation: true,
        categories: categories,
        series: [{
          name: '入选个股总数',
          data: totalStocks,
          // format: function (val, name) {
          //   return val.toFixed(2) + '万';
          // }
        },
        {
          name: '新入选个股数',
          data: newStocks,
          // format: function (val, name) {
          //   return val.toFixed(2) + '万';
          // }
        }
        ],
        yAxis: {
          // format: function (val) {
          //   return Math.round(val);
          // },
          title: '入选个股数',
          min: 0
        },
        xAxis: {
          disableGrid: false,
          type: 'calibration'
        },
        // extra: {
        //   column: {
        //     width: 15
        //   }
        // },
        width: windowWidth,
        height: height
      });
      return columnChart
    }
  static createRingChart(asset, portfolio, title, width, height = 300) {
    var _sectors = {}
    var series = [];
    portfolio.holdings.forEach(
      function (e, i, a) {
        let s = asset[e.ticker].sector
        if (_sectors[s] == undefined) {
          _sectors[s] = 0.
        }
        _sectors[s] += e.values[e.values.length - 1]
      }
    );
    Object.keys(_sectors).forEach(function (key) {
      series.push(
        {
          name: key == '' ? 'Unknown' : key,
          data: _sectors[key]
        }
      )
      // console.log(key, _sectors[key]);
    });
    return new wxCharts({
      animation: true,
      canvasId: 'ringCanvas',
      type: 'ring',
      title: {
        name: title,
        color: '#7cb5ec',
        fontSize: 25
      },
      subtitle: {
        name: '板块比例',
        color: '#666666',
        fontSize: 15
      },
      series: series,
      width: width,
      height: height,
      dataLabel: true,
    });
  }

  static createPieChart(portfolio, width, height = 300) {
    var series = [];
    portfolio.holdings.forEach(
      function (e, i, a) {
        series.push(
          {
            name: e.ticker,
            data: e.values[e.values.length - 1] * 100,
          }
        );
      }
    );
    return new wxCharts({
      animation: true,
      canvasId: 'pieCanvas',
      type: 'pie',
      series: series,
      width: width,
      height: height,
      dataLabel: true,
    });
  }
  static createPieChart2(input, width, height = 300) {
    var series = [];
    input.holdingPct.map(s => {
      series.push({
        name: s.ticker,
        data: s.value
      })
    })
    return new wxCharts({
      animation: true,
      canvasId: 'pieCanvas',
      type: 'pie',
      series: series,
      width: width,
      height: height,
      dataLabel: true,
    });
  }


  static createRadarChart(portfolio, width, height = 300) {
    return new wxCharts({
      canvasId: 'radarCanvas',
      type: 'radar',
      categories: ['Performance', 'Volatility', 'Risk', 'Turnover', 'Correlation'],
      series: [{
        name: 'Portfolio Characteristics',
        data: [90, 110, 125, 95, 87]
      }],
      width: width,
      height: height,
      extra: {
        radar: {
          max: 200
        }
      }
    });
  }
  static createStrategyLineChart(strategy, width, height = 300) {
    var series = [
      {
        connect: true,
        name: 'strategy',
        data: strategy.cumVals,
        format: function (val, name) {
          return (val * 100).toFixed(2) + '%';
        },
        drawSplitLines: false
      },
      {
        connect: true,
        name: 'SPY',
        data: strategy.benchmarkCumVal,
        format: function (val, name) {
          return (val * 100).toFixed(2) + '%';
        },
        drawSplitLines: false
      }
    ]
    return drawLineChart(strategy.dates, series, 'Performance', width, height)
  }

  static createPortfolioLineChart2(input, width, height = 300) {
    var series = [];
    input.series.map(s => {
      series.push({
        connect: true,
        name: s.ticker,
        data: s.data,
        format: function (val, name) {
          return (val * 100).toFixed(2) + '%';
        }
      })})
    return drawLineChart(input.index, series, 'Performance', width, height)
  }

  static createPortfolioLineChart(portfolio, inception, width, height = 300) {
    if (portfolio.holdings.length == 0) {
      return;
    }
    var series = [];
    if (inception) {
      var arr = []
      var desp = []
      portfolio.dates.forEach(function (d, i, a) {
        if (d.valueOf() == inception.valueOf()) {
          arr.push(1.)
          desp.push("Strategy Launched")
        }
        else {
          arr.push(null)
          desp.push(null)
        }
      })
      series.push({
        connect: false,
        name: 'inception',
        data: arr,
        desp: desp,
        drawSplitLines: true
      });
    }
    // push aggregation data
    series.push({
      connect: true,
      name: portfolio.aggregation.ticker == 'aggregation' ? '投资组合' : portfolio.aggregation.ticker,
      data: portfolio.aggregation.values,
      format: function (val, name) {
        return (val * 100).toFixed(2) + '%';
      }
    });
    // push benchmark data
    series.push({
      connect: true,
      name: portfolio.benchmark.ticker,
      data: portfolio.benchmark.values,
      format: function (val, name) {
        return (val * 100).toFixed(2) + '%';
      }
    });

    // push individual stock data
    for (var i = 0; i < portfolio.holdings.length; i++) {
      if (portfolio.holdings[i].show) {
        series.push(
          {
            name: portfolio.holdings[i].ticker,
            data: portfolio.holdings[i].values,
            format: function (val, name) {
              return (val * 100).toFixed(2) + '%';
            }
          }
        )
      }
    }
    return drawLineChart(portfolio.dates, series, 'Performance', width, height)
  }
}

module.exports = Chart_utils