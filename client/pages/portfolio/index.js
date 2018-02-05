var wxCharts = require('../../utils/wxcharts.js');
var putils = require('./port_utils.js');
var metrics = require('./metrics.js')
var app = getApp();
var lineChart = null;
var radarChart = null;
var pieChart = null;
// var startPos = null;
// var conn = require('../../utils/connection.js').Connection;
Page({
  data: {
    listData: [
      { "code": "Sharpe Ratio:", "text": "text1" },
      { "code": 'Max Drawdown:', "text": "text2" },
      { "code": "alpha:", "text": "text3" },
      { "code": "beta:", "text": "text4" }
    ],
    metricsIndex : 1,
    currentTimeIndex: 0,
    allocationIndex: 0,
    timeSeriesSetting: undefined,
    portfolio: {},
    cache: {}
  },

  run: function(tickers, dateArgs, source){
    var that = this
    var call = function(p){
      p.tickers = tickers
      that.setData({ portfolio: p })
      that.lineChart = that.createLineChart(p);
      that.pieChart = that.createPieChart(p);
      that.computeMetrics(p)
    }
    
    if(this.data.cache[dateArgs.freq] != undefined){
      call(this.data.cache[dateArgs.freq])
    }
    else{
      putils.loadPortfolio(tickers, dateArgs, source, function(p){
        call(p);
        that.data.cache[dateArgs.freq]=p;
      })
    }
    console.log(this.data.cache[dateArgs.freq])
  },

  touchHandler: function (e) {
    if (null != lineChart)
      lineChart.scrollStart(e);
  },
  moveHandler: function (e) {
    if (null != lineChart)
      lineChart.scroll(e);
  },
  touchEndHandler: function (e) {
    if (null != lineChart) {
      lineChart.scrollEnd(e);
      lineChart.showToolTip(e, {
        format: function (item, category) {
          return category + ' ' + item.name + ':' + item.data
        }
      });
    }
  },
  onMetricSelectorClick: function (e) {
    let index = e.currentTarget.dataset.index
    this.setData({
      metricsIndex: index
    })
    this.radarChart = this.createRadarChart();
  },

  onPeriodSelectorClick: function(e){
    let index = e.currentTarget.dataset.index
    let that = this
    this.setData({
      currentTimeIndex: parseInt(index)
    })
    var dateArgs = undefined;
    var today = (new Date()).toISOString().slice(0, 10);
    switch (this.data.currentTimeIndex){
      case 0:
        dateArgs = {
          timeSeriesType: 'p',
          startDate: undefined,
          endDate: today,
          period: 15,
          freq: 'D'
        }
        break
      case 1:
        dateArgs = {
          timeSeriesType: 'p',
          startDate: undefined,
          endDate: today,
          period: 30,
          freq: 'D'
        }
        break
      case 2:
        dateArgs = {
          timeSeriesType: 'p',
          startDate: undefined,
          endDate: today,
          period: 12,
          freq: 'W'
        }
        break
      case 3:
        dateArgs = {
          timeSeriesType: 'p',
          startDate: undefined,
          endDate: today,
          period: 12,
          freq: 'M'
        }
        break
      default:
      console.log(index)
      return
    }
    this.run(this.data.portfolio.tickers, dateArgs, "AV")
    this.radarChart = this.createRadarChart();
  },

  onAllocationSelectorClick: function(e){
    let index = e.currentTarget.dataset.index
    this.setData({
      allocationIndex: index
    })
    // this.radarChart = this.createRadarChart();
  },

  createPieChart: function (portfolio) {
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
    this.pieChart = new wxCharts({
      animation: true,
      canvasId: 'pieCanvas',
      type: 'pie',
      series: series,
      width: this.windowWidth,
      height: 300,
      dataLabel: true,
    });
  },

  createRadarChart: function () {
    radarChart = new wxCharts({
      canvasId: 'radarCanvas',
      type: 'radar',
      categories: ['Performance', 'Volatility', 'Risk', 'Turnover', 'Correlation'],
      series: [{
        name: 'Portfolio Characteristics',
        data: [90, 110, 125, 95, 87]
      }],
      width: this.windowWidth,
      height: 250,
      extra: {
        radar: {
          max: 200
        }
      }
    });
  },

  createLineChart: function (portfolio) {
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

    lineChart = new wxCharts({
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
      width: this.windowWidth,
      height: 300,
      dataLabel: true,
      dataPointShape: true,
      enableScroll: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  computeMetrics(p){
    this.data.listData[0].text = metrics.computeSharpRatio(p).toFixed(6);
    this.data.listData[1].text = ((1. - metrics.computeMDD(p)) * 100).toFixed(3) + '%';

    var ab = metrics.computeAlphaBeta(p);
    this.data.listData[2].text = ab.alpha.toFixed(6);
    this.data.listData[3].text = ab.beta.toFixed(6);
    this.setData({ listData: this.data.listData })
  },

  onLoad: function (e) {
    this.windowWidth = 375;
    var that = this;
    try {
      var res = wx.getSystemInfoSync();
      this.windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var today = (new Date()).toISOString().slice(0, 10);
    var tickers = ['HUBS', 'MB', 'VRNS', 'PFPT', 'SPLK', 'PXLW']
    var dateArgs = {
      timeSeriesType: 'r',
      startDate: '2018-01-01',
      endDate: today,
      period: 15,
      freq: 'D'
    }
    this.run(tickers, dateArgs, "AV")
    that.radarChart = this.createRadarChart();
  }
});