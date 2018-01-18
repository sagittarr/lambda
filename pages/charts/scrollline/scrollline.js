var wxCharts = require('../../../utils/wxcharts.js');
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

    createSimulationData: function () {
        var categories = [];
        var data = [];
        for (var i = 0; i < 10; i++) {
            categories.push('201620162-' + (i + 1));
            data.push(Math.random()*(20-10)+10);
        }
        return {
            categories: categories,
            data: data
        }
    },
    createChart: function(data){
      if(data.data.length<=0 || data.categories.length<=0){
        return;
      }
      lineChart = new wxCharts({
        canvasId: 'lineCanvas',
        type: 'line',
        categories: data.categories,
        animation: false,
        series: [{
          name: '成交量1',
          data: data.data,
          format: function (val, name) {
            return val.toFixed(2) + '万';
          }
        }],
        xAxis: {
          disableGrid: false
        },
        yAxis: {
          title: '成交金额 (万元)',
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
    loadStockDataEOD: function () {
      var page = this;
      var requestTask = wx.request({
        url: 'https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?start_date=2018-01-01&end_date=2018-01-16&api_key=weN4-vHsp1yBg9LBEkmJ', //仅为示例，并非真实的接口地址
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
    onLoad: function (e) {
        this.windowWidth = 320;
        try {
            var res = wx.getSystemInfoSync();
            this.windowWidth = res.windowWidth;
        } catch (e) {
            console.error('getSystemInfoSync failed!');
        }
        
        //var simulationData = this.createSimulationData();
        this.loadStockDataEOD();
        //console.log(realdata);

    }
});