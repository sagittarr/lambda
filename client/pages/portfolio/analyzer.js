const putils = require('./port_utils.js');
const calculator = require('./metrics.js')
const config = require('../../config')
const chart_utils = require('./chart_utils.js')
const util = require('../../utils/util.js');
const async = require('../../utils/async.js');
require('../../utils/date.js')
var app = getApp();
var lineChart = null;
var radarChart = null;
var pieChart = null;
var ringChart = null;
const lang = require('../../language.js')
const keywords = lang.CH

function getToday() {
  var today = new Date()
  var dd = today.getDate();
  if (dd < 10) {
    dd = '0' + dd
  }
  var mm = today.getMonth() + 1; //January is 0!
  if (mm < 10) {
    mm = '0' + mm
  }
  var yyyy = today.getFullYear();
  return yyyy + '' + mm + '' + dd;
}
Page({
  data: {
    sliderOffset: 0,
    sliderLeft: 0,

    filterdata: {
      "sort": [
      ]
    },  //筛选条件数据
    showfilter: false, //是否显示下拉筛选
    showfilterindex: null, //显示哪个筛选类目
    sortindex: 0,  //排序索引
    sortid: null,  //排序id
    filter: {},

    showDesp: true,
    showLineChart: true,
    showMetrics: true,
    showPercentage: true,
    showInfoPopup:false,
    infoPopupValue: '--',

    keywords: keywords,
    metricsTbl: [
      { "code": keywords.return, "text": "text0" },
      { "code": keywords.volatility, "text": "text1" },
      { "code": keywords.sharpe_ratio, "text": "text2" },
      { "code": keywords.max_drawdown, "text": "text3" },
      { "code": keywords.alpha, "text": "text4" },
      { "code": keywords.beta, "text": "text5" }
    ],
    metricsIndex: 1,
    holdingsIndex: 0,
    currentTimeIndex: 4,
    timeRange: ['10d', '30d', '3m', '1y', 'inception'],
    // selectedPeriod: '策略创建至今',


    holdings: [{ 'id': 0, 'ticker': '--', 'name': 'stockName', 'time': '--', 'zdf': '--', 'zdfDisplay': '--', 'price': '--' }],

    assetProfile: {},
    portfolio: {},
    portfolioRatios: {},
    benchmarkRatios: {},
    portfolioCache: {},
    timeSeriesData:{},
    cumulativeReturnComparison : ['--', '--'],
    maxDrawdownComparison: ['--', '--'],
    cache: {}
  },


  onLoad: function (e) {
    // this.windowWidth = 375;
    var that = this;
    
    try {
      var res = wx.getSystemInfoSync();
      this.windowWidth = res.windowWidth;
      console.info('window width: ', this.windowWidth);
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var profile = getApp().globalData.selected;
    if (!profile.short_desp) {
      profile.short_desp = profile.desp.slice(0, 35) + '...'
      console.log('short ', profile.short_desp);
    }
    console.log("selected", profile);
    this.setData({ 'profile': profile })
    // this.loadStrategyPhasesFromServer(getApp().globalData.selected.inception, 'SPY')
    // var tickers = profile.curr_holds.map(stock=>stock.ticker)
    // console.log(tickers)

    // var options = {
    //   url: config.service.db_handler,
    //   data: { operation: 'LOAD_PORTFOLIO', tickers: _tickers, inception: profile.inception.toString(), id: profile.id.toString(), toUpdateDB: profile.isLocal != true},
    //   success(result) {
    //     console.log("read LOAD_PORTFOLIO", result)
    //     // result.data.data.timeRange.map(ts => { if(ts == null) return; that.data.timeSeriesData[ts.timeId] = ts})

    //     result.data.data.timeRange.map(ts => {
    //       if (ts == null) return;
    //       ts.series = [{ ticker: 'strategy', data: ts.values }, { ticker: 'SPY', data: ts.benchmark}]
    //       that.data.timeSeriesData[ts.timeId] = ts

    //     })
    //     lineChart = chart_utils.createPortfolioLineChart2(result.data.data.timeRange[4], that.windowWidth);
    //     if (profile.isLocal == true){
    //       that.syncDataToLocalStorage(result.data.data.id, result.data.data.quant)
    //     }
    //   },
    //   fail(error) {
    //     util.showModel('请求失败', error);
    //     console.log('request fail', error);
    //   }
    // }
    // if (profile.isLocal == true){
    //   profile.p
    // }
    console.log('phases',profile.phases)
    // profile.tickers = profile.curr_holds.map(stock => stock.ticker)
    var options = {
      url: config.service.db_handler,
      data: profile.isLocal === true ? { operation: 'LOAD', phases: profile.phases } : { operation: 'LOAD', id: profile.id, mode: 'debug', toUpdateDB: true},
      success(result) {
        console.log("read LOAD", result)
        result.data.data.timeRange.map(ts => {
          if (ts == null) return;
          ts.series = [{ ticker: 'strategy', data: ts.values }, { ticker: 'SPY', data: ts.benchmark }]
          that.data.timeSeriesData[ts.timeId] = ts
        })
        // profile.curr_holds = result.data.data.dataset.phaseInfo[result.data.data.dataset.phaseInfo.length-1].tickers
        
        lineChart = chart_utils.createPortfolioLineChart2(result.data.data.timeRange[4], that.windowWidth);
        if (profile.isLocal == true) {
          that.syncDataToLocalStorage(result.data.data.id, result.data.data.quant)
        }
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }

    putils.realtime_price(profile.tickers, function (results) {
      if (!Array.isArray(results)) {
        results = [results]
      }
      that.quoteRealTimePriceCallback(results)
    })
    // var options = {
    //   url: config.service.db_handler,
    //   data: { operation: 'STB', phases: profile.phases, inception: profile.inception },
    //   // data: { operation: 'STB2', productId: 1521986497295, inception: '20180301', mode: 'debug'},
    //   success(result) {
    //     console.log("read STB", result)
    //     result.data.data.timeRange.map(ts => {
    //       if (ts == null) return;
    //       ts.index = ts.index.map(i=> i?i.toString(): '')
    //       ts.series = [{ ticker: 'strategy', data: ts.values }, { ticker: 'SPY', data: ts.benchmark }]
    //       that.data.timeSeriesData[ts.timeId] = ts

    //     })
    //     lineChart = chart_utils.createPortfolioLineChart2(result.data.data.timeRange[4], that.windowWidth);
    //     // if (profile.isLocal == true){
    //     //   that.syncDataToLocalStorage(result.data.data.id, result.data.data.quant)
    //     // }
    //   },
    //   fail(error) {
    //     util.showModel('请求失败', error);
    //     console.log('request fail', error);
    //   }
    // }
    wx.request(options);


    // this.loadPortfolioDatafromYH(tickers, 'SPY', getApp().globalData.selected.inception)


  },

  onShareAppMessage: function () {
    var that = this;
    return {
      title: '投资组合分析',
      desc: that.data.profile.name,
      path: '/page/portfolio/analyzer'
    }
  },
  computeComparisonMetrics: function (range){
    let p = this.data.portfolioCache[range]
    let port_metrics = this.computeTimeSeriesMetrics(p.aggregation)
    let benchmark_metrics = this.computeTimeSeriesMetrics(p.benchmark)
    this.setData({
      cumulativeReturnComparison: [port_metrics.cumulativeReturn, benchmark_metrics.cumulativeReturn],
      maxDrawdownComparison: [port_metrics.maxDrawdown, benchmark_metrics.maxDrawdown],
    })
  },

  computeTimeSeriesMetrics: function (ts){
    var metrics = {}
    if (ts.avg_return){
      metrics.dailyReturn = ((ts.avg_return - 1.) * 100).toFixed(2) + '%'
    }
    metrics.cumulativeReturn = ((ts.values[ts.values.length - 1] - 1) * 100).toFixed(2) + '%'
    metrics.volatility = calculator.computeVolatility(ts.returns).toFixed(2)
    // metrics.sharpRatio = calculator.computeSharpRatio(p)
    metrics.maxDrawdown = ((1. - calculator.computeMDD(ts.values)) * 100).toFixed(2) + '%'
    return metrics
  },

  syncDataToLocalStorage(id, table){
    var lambda_key = getApp().globalData.lambda_key
    var that = this
    wx.getStorage({
      key: lambda_key,
      success: function (res) {
        if (res.data[id]){
          res.data[id].ratiosTable = table
          wx.setStorage({
            key: lambda_key,
            data: res.data,
            success: function(res){
              console.log('sync ok', id)
            },
            fail: function(res){
              console.log('sync fail', id)
            }
          })
        }
      },
      fail: function (res) {
        console.log(lambda_key, ' not found')
      }
    });
  },

  computeMetrics(p) {
    var ratios = {}
    var ab = calculator.computeAlphaBeta(p);
    ratios.dailyReturn = ((p.aggregation.avg_return - 1.)*100)
    ratios.return = ((p.aggregation.values[p.aggregation.values.length - 1] - 1) * 100)
    ratios.volatility = calculator.computeVolatility(p.aggregation.returns)
    ratios.sharpRatio = calculator.computeSharpRatio(p)
    ratios.maxDrawdown = ((1. - calculator.computeMDD(p.aggregation.values)) * 100)
    ratios.alpha = ab.alpha;
    ratios.beta = ab.beta;
    return ratios;
  },
  
  showPortfolioMetrics:function(table){
    this.data.metricsTbl[0].text = table.return.toFixed(2) + '%';
    this.data.metricsTbl[1].text = table.volatility.toFixed(2);
    this.data.metricsTbl[2].text = table.sharpRatio.toFixed(2);
    this.data.metricsTbl[3].text = table.maxDrawdown.toFixed(2) + '%';
    this.data.metricsTbl[4].text = table.alpha.toFixed(2);
    this.data.metricsTbl[5].text = table.beta.toFixed(2);
    this.setData({metricsTbl: this.data.metricsTbl})
  }, 

  pieCharttouchHandler: function (e) {
    console.log(pieChart.getCurrentDataIndex(e));
    pieChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    })
  },

  touchHandler: function (e) {
    if (null != lineChart)
      // lineChart.scrollStart(e);
      lineChart.showToolTip(e, {
        format: function (item, category) {
          return category + ' ' + item.name + ':' + item.data
        }
      });
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
  visualizeAndProcessData2: function (ranges) {
    var that = this;
    lineChart = chart_utils.createPortfolioLineChart2(ranges[4], that.windowWidth);
  },

  quoteRealTimePriceCallback: function (quotes){
    var color_style = getApp().globalData.color_style
    var that = this;
    var stocks = []
    var avg_chg_pct = 0;
    quotes.forEach(function (e, i, a) {
      // console.log(e)
      let realtime_chg_percent = parseFloat(e.realtime_chg_percent)
      avg_chg_pct += realtime_chg_percent
      let mark = realtime_chg_percent > 0 ? '+' : ''
      let avg_chg_percent = 0.
      stocks.push({
        'id': i, 'ticker': e.symbol, 'name': e.Name, 
        'time': getApp().globalData.selected.inception,
        'zdf': realtime_chg_percent,
        'zdfDisplay': mark + realtime_chg_percent.toFixed(2) + '%', 
        'price': parseFloat(e.realtime_price).toFixed(2),
        'bg_color': e.realtime_chg_percent > 0 ? color_style[0] : e.realtime_chg_percent < 0 ? color_style[2] : color_style[3],
        'show_name': false
      })
    })
    that.setData({ 'holdings': stocks })
  },

  onPullDownRefresh: function (e) {
    var that = this;
    var tickers = getApp().globalData.selected.curr_holds;
    putils.realtime_price(tickers, function (results) {
      that.quoteRealTimePriceCallback(results)
      wx.stopPullDownRefresh();
    })
  },

  onMetricSelectorClick: function (e) {
    let index = e.currentTarget.dataset.index
    this.setData({
      metricsIndex: index
    })
    radarChart = chart_utils.createRadarChart(this.data.portfolio, this.windowWidth);
  },

  onPeriodSelectorClick: function (e) {
    let index = parseInt(e.currentTarget.dataset.index)
    let that = this
    let range = this.data.timeRange[index]
    let updateDB = index == 3 ? true : false //1year
    this.setData({
      currentTimeIndex: index
    })
    console.log(that.data.timeSeriesData)
    lineChart = chart_utils.createPortfolioLineChart2(that.data.timeSeriesData[range], that.windowWidth);
    // pieChart = chart_utils.createPieChart2(that.data.timeSeriesData[range], that.windowWidth);
    // pieChart = chart_utils.createPieChart(
    //   this.data.portfolioCache[range],
    //   that.windowWidth);
  },

  onHoldingsSelectorClick: function (e) {
    let that = this
    let index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      holdingsIndex: index
    })
    if (this.data.holdingsIndex == 0) {
    }
    else if (this.data.holdingsIndex == 1) {
      // pieChart = chart_utils.createPieChart2(that.data.timeSeriesData[this.data.timeRange[this.data.currentTimeIndex]], that.windowWidth);
      pieChart = chart_utils.createPieChart2(that.data.timeSeriesData['inception'], that.windowWidth);
      // pieChart = chart_utils.createPieChart(p, this.windowWidth);
    }
    else if (this.data.holdingsIndex == 2) {
      ringChart = chart_utils.createRingChart(this.data.assetProfile, p, this.data.timeRange[this.data.currentTimeIndex] , this.windowWidth);
    }
  },

  onChangeShowState: function () {
    var that = this;
    that.setData({
      showDesp: (!that.data.showDesp)
    })
  },

  onChangeShowLineChart: function () {
    var that = this;
    that.setData({
      showLineChart: (!that.data.showLineChart)
    })
  },
  onChangeShowMetrics: function () {
    var that = this;
    that.setData({
      showMetrics: (!that.data.showMetrics)
    })
  },

  onChangeShowPercentage: function () {
    var that = this;
    that.setData({
      showPercentage: (!that.data.showPercentage)
    })
  },

  onStockTickerColumnSwitch: function(){
    var that = this
    this.data.holdings.forEach(function (e, i, a) {
      e.show_name = !e.show_name
    })
    that.setData({ 'holdings': this.data.holdings })
  },

  toggleInfoPopup: function(e){
    let key = parseInt(e.currentTarget.dataset.key)
    if(key == 0){
      this.data.showInfoPopup = true
      this.data.infoPopupValue = this.data.profile.desp
    }
    else{
      this.data.showInfoPopup = false
    }
    this.setData({ showInfoPopup: this.data.showInfoPopup, infoPopupValue: this.data.infoPopupValue})
  },
  tabClick: function (e) {
    this.setData({
      sliderOffset: e.currentTarget.offsetLeft,
      currentTimeIndex: e.currentTarget.id
    });
  },

});