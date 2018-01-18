var wxCharts = require('../../utils/wxcharts.js');
var app = getApp();
var lineChart = null;
var startPos = null;
Page({
  data: {
  },
  touchHandler: function (e) {
    lineChart.scrollStart(e);
  },
  moveHandler: function (e) {
    lineChart.scroll(e);
  },
  touchEndHandler: function (e) {
    lineChart.scrollEnd(e);
    lineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },

  loadStockDataEOD: function (ticker, startDate, endDate) {
    var page = this;
    var requestTask = wx.request({
      url: 'https://www.quandl.com/api/v3/datasets/WIKI/' + ticker + '/data.json?start_date=' + startDate + '&end_date=' + endDate + '&api_key=' + this.apiKey, //仅为示例，并非真实的接口地址
      header: {
        'content-type': 'application/json' // 默认值
      },
      success: function (res) {
        console.log(res.data);
        var categories = [];
        var data = [];
        for (var i = 1; i < res.data.dataset_data.data.length; i++) {
          categories.push(res.data.dataset_data.data[i][0]);
          data.push(res.data.dataset_data.data[i][2]);
        }
        var stockData = {
          ticker: ticker,
          categories: categories,
          data: data
        }
        console.log(stockData);
        page.createChart(stockData);
        console.log("success");

        // data = res.data;
        //page.changeName(res.data.dataset_data.data[0]);
      },
      fail: function (res) {
        console.log(res);
        return false;
      }
    });
  },

  createChart: function (stockData) {
    if (stockData.data.length <= 0 || stockData.categories.length <= 0) {
      return;
    }
    lineChart = new wxCharts({
      canvasId: 'lineCanvas',
      type: 'line',
      categories: stockData.categories,
      animation: true,
      series: [{
        name: stockData.ticker,
        data: stockData.data,
        format: function (val, name) {
          //return val.toFixed(2) + '万';
          return val;
        }
      }],
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: 'price',
        format: function (val) {
          return val.toFixed(2);
        },
        min: 0
      },
      width: this.windowWidth,
      height: 200,
      dataLabel: true,
      dataPointShape: true,
      enableScroll: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  onLoad: function (e) {
    this.apiKey = 'weN4-vHsp1yBg9LBEkmJ';
    this.windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      this.windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }

    //var simulationData = this.createSimulationData();
    this.loadStockDataEOD('FB', '2018-01-01', '2018-01-16');
    //console.log(realdata);

  }
});