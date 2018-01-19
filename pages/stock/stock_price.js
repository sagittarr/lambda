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

  compositeQuandlURL: function (data) {
    if (data.dataset == 'WIKI') {
      var url = 'https://www.quandl.com/api/v3/datasets/WIKI/' + 
        data.ticker + '/data.json?start_date=' + data.startDate + 
        '&end_date=' + data.endDate + '&api_key=' + this.apiKey;
      return url;
    }
    return null;
  },

  loadPortfolio: function (tickers, startDate, endDate, callback){
    var page = this;
    function aggregate(stock){
      console.log(stock);
    };
    tickers.forEach(function (element, index, array) {
      page.loadStockDataEOD(element, startDate, endDate, aggregate);

    });

  },

  loadStockDataEOD: function (ticker, startDate, endDate, callback) {
    var requestTask = wx.request(
      {
        url: this.compositeQuandlURL(
          {
            dataset: 'WIKI',
            ticker: ticker,
            startDate: startDate,
            endDate: endDate
          }
        ),
        header: {
          'content-type': 'application/json' // 默认值
        },
        success: function (res) {
          var dates = [];
          var data = [];
          var closeIdx = res.data.dataset_data.column_names.indexOf("Adj. Close");
          var dateIdx = res.data.dataset_data.column_names.indexOf("Date");
          for (var i = 0; i < res.data.dataset_data.data.length; i++) {
            dates.push(res.data.dataset_data.data[i][dateIdx]);
            data.push(res.data.dataset_data.data[i][closeIdx]);
          }
          var stockData = 
          {
            ticker: ticker,
            dates: dates.reverse(),
            data: data.reverse()
          }
          console.log(stockData);
          callback(stockData);
          console.log("loadStockDataEOD success");
        },
        fail: function (res) {
          console.log(res);
        }
      });
  },

  // aggregate: function(stockData) {
  //   this.portfolio = [];
  // },
  createChart: function (stockData) {
    if (stockData.data.length <= 0 || stockData.dates.length <= 0) {
      return;
    }
    lineChart = new wxCharts({
      canvasId: 'lineCanvas',
      type: 'line',
      categories: stockData.dates,
      animation: true,
      series: [{
        name: stockData.ticker,
        data: stockData.data,
        format: function (val, name) {
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
    this.loadPortfolio(['FB','AMZN'], '2018-01-01', '2018-01-17', this.createChart);
    this.loadStockDataEOD('FB', '2018-01-01', '2018-01-17', this.createChart);
    //console.log(realdata);

  }
});