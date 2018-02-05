var wxCharts = require('../../utils/wxcharts.js');

class Chart_utils{
  static windowWidth = 375;
  static createPieChart(portfolio) {
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
      width: Chart_utils.windowWidth,
      height: 300,
      dataLabel: true,
    });
  }

  static createRadarChart() {
    return new wxCharts({
      canvasId: 'radarCanvas',
      type: 'radar',
      categories: ['Performance', 'Volatility', 'Risk', 'Turnover', 'Correlation'],
      series: [{
        name: 'Portfolio Characteristics',
        data: [90, 110, 125, 95, 87]
      }],
      width: Chart_utils.windowWidth,
      height: 250,
      extra: {
        radar: {
          max: 200
        }
      }
    });
  }

  static createLineChart(portfolio) {
    if (portfolio.holdings.length == 0) {
      return;
    }
    var series = [];
    series.push({
      name: portfolio.aggregation.ticker,
      data: portfolio.aggregation.values,
      format: function (val, name) {
        return (val * 100).toFixed(2) + '%';
      }
    });
    series.push({
      name: portfolio.benchmark.ticker,
      data: portfolio.benchmark.values,
      format: function (val, name) {
        return (val * 100).toFixed(2) + '%';
      }
    });
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

    return new wxCharts({
      canvasId: 'lineCanvas',
      type: 'line',
      categories: portfolio.benchmark.dates,
      animation: true,
      series: series,
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: 'Performance',
        format: function (val) {
          return (val * 100).toFixed(2) + '%';
        },
        max: 1.02,
        min: 1.0
      },
      width: Chart_utils.windowWidth,
      height: 300,
      dataLabel: true,
      dataPointShape: true,
      enableScroll: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  }
}

module.exports = Chart_utils