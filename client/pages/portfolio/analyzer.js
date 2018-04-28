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

// function getTimePeriodDesp(index){

// }
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
    var tickers = profile.curr_holds
    var _tickers = tickers
    _tickers.push('SPY')
    console.log(_tickers)
    var options = {
      url: config.service.db_handler,
      data: { operation: 'LOAD_PORTFOLIO', tickers: _tickers, inception: profile.inception },
      success(result) {
        console.log("read LOAD_PORTFOLIO", result)
        result.data.data.timeRange.map(ts => { if(ts == null) return; that.data.timeSeriesData[ts['range']] = ts})
        lineChart = chart_utils.createPortfolioLineChart2(result.data.data.timeRange[4], that.windowWidth);
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    wx.request(options);


    // this.loadPortfolioDatafromYH(tickers, 'SPY', getApp().globalData.selected.inception)

    putils.realtime_price(tickers, function (results) {
      if (!Array.isArray(results)) {
        results = [results]
      }
      that.quoteRealTimePriceCallback(results)
    })
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

  // computeMetrics2(aggregation) {
  //   var ratios = {}
  //   var ab = calculator.computeAlphaBeta(p);
  //   ratios.dailyReturn = ((p.aggregation.avg_return - 1.) * 100)
  //   ratios.return = ((p.aggregation.values[p.aggregation.values.length - 1] - 1) * 100)
  //   ratios.volatility = calculator.computeVolatility(p.aggregation.returns)
  //   ratios.sharpRatio = calculator.computeSharpRatio(p)
  //   ratios.maxDrawdown = ((1. - calculator.computeMDD(p.aggregation.values)) * 100)
  //   ratios.alpha = ab.alpha;
  //   ratios.beta = ab.beta;
  //   return ratios;
  // },
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
  
  updatePtfProfile2Cloud() {
    // console.log("before saving",getApp().globalData.selected.ratiosTable)
    var options = {
      url: config.service.db_handler,
      data: {
        operation: 'W',
        portfolio: getApp().globalData.selected
      },
      success(result) {
        console.log('update profile in cloud: result code =  ' + result.code)
      },
      fail(error) {
        // util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    // send request
    wx.request(options);
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
  // visualizeAndProcessData: function (p, timeKey, updateDB) {
  //   var that = this;
  //   lineChart = chart_utils.createPortfolioLineChart(p, timeKey, that.windowWidth);
  //   pieChart = chart_utils.createPieChart(p, that.windowWidth);
  //   p.ratiosTable = that.computeMetrics(p)
  //   this.showPortfolioMetrics(p.ratiosTable)
  //   if (updateDB) {
  //     getApp().globalData.selected.ratiosTable = {}
  //     getApp().globalData.selected.ratiosTable[timeKey] = p.ratiosTable;
  //     if (getApp().globalData.selected.isLocal) {
  //       var lambda_key = getApp().globalData.lambda_key
  //       wx.getStorage({
  //         key: lambda_key,
  //         success: function (res) {
  //           res.data[getApp().globalData.selected.id] = getApp().globalData.selected
  //           wx.setStorage({
  //             key: lambda_key,
  //             data: res.data
  //           })
  //         },
  //         fail: function (res) {
  //           console.error(lambda_key, ' not found from analyzer.')
  //         }
  //       });
  //     }
  //     else {
  //       that.updatePtfProfile2Cloud()
  //     }
  //   }
  // },

  // loadPortfolioDatafromYH: function (tickers, benchmark, inception) {
  //   var that = this;
  //   var today = (new Date()).toISOString().slice(0, 10);
  //   var thritydays = Date.today().add(-30).days().toString('yyyy-MM-dd');
  //   var tendays = Date.today().add(-15).days().toString('yyyy-MM-dd');
  //   var fourteenWeeks = Date.today().add(-14).weeks().toString('yyyy-MM-dd');
  //   var thriteenMths = Date.today().add(-14).months().toString('yyyy-MM-dd');
  //   var date_arr = [
  //     { startDate: tendays, endDate: today, period: undefined, freq: 'D', range: '10d' },
  //     { startDate: thritydays, endDate: today, period: 20, freq: 'D', range: '30d'},
  //     { startDate: fourteenWeeks, endDate: today, period: 13, freq: 'W' , range: '3m'},
  //     { startDate: thriteenMths, endDate: today, period: 13, freq: 'M', range:'1y' },
  //     { startDate: inception, endDate: today, period: undefined, freq: 'D', isInception: true, range : 'inception' }
  //   ]

  //   util.showBusy('请求中...');
  //   let id = getApp().globalData.selected.id;
  //   async.waterfall([
  //     function (next) {
  //       wx.getStorage({
  //         key: "portfolio",
  //         success: function (res) {
  //           if (res.data[id] != undefined && Date.now() / 1000 - parseInt(res.data[id].lastUpdate) <= 3600) {
  //             that.data.portfolioCache = res.data[id].ts;
  //             console.log("load portfolio cache success", id, 'lastUpdate', res.data[id].lastUpdate);
  //             date_arr.forEach(function (args, i) {
  //               var portfolio = that.data.portfolioCache[args.range]
  //               _callback(portfolio)
  //             });
  //           }
  //           else {
  //             next(null);
  //           }
  //         },
  //         fail: function (res) {
  //           next(null);
  //         }
  //       });
  //     },
  //     function(next){
  //       let ct = 0;
  //       date_arr.forEach(function (args, i) {
  //         putils.loadPortfoliofromYF(tickers, benchmark, args,
  //           function (p) {
  //             ct += 1;
  //             p.range = that.data.timeRange[i];
  //             p.isInception = args.isInception;
  //             _callback(p);
  //             that.data.portfolioCache[p.range] = p;
  //             if (ct == date_arr.length) {
  //               next(null); //update in cache
  //             }
  //           })
  //       })
  //     },
  //     function(next){
  //       wx.getStorage({
  //         key: "portfolio",
  //         success: function (res) {
  //           let id = getApp().globalData.selected.id;
  //           if (res.data == undefined) {
  //             res.data = {}
  //           }
  //           res.data[id] = {};
  //           res.data[id].ts = that.data.portfolioCache;
  //           res.data[id].lastUpdate = Math.floor(Date.now() / 1000)
  //           wx.setStorage({ key: 'portfolio', data: res.data })
  //           console.log("update portfolio cache success", id);
  //         },
  //         fail: function (res) {
  //           console.log(res);
  //           var data = {}
  //           let id = getApp().globalData.selected.id;
  //           data[id] = {};
  //           data[id].ts = that.data.portfolioCache;
  //           data[id].lastUpdate = Math.floor(Date.now() / 1000)
  //           wx.setStorage({ key: 'portfolio', data: data })
  //           console.log("update portfolio cache success", id);
  //         }
  //       });
  //     }]
  //   );

  //   function _callback(p) {
  //     that.data.portfolioCache[p.range] = p;
  //     if (p.isInception) {
  //       let current_page = getCurrentPages()[getCurrentPages().length - 1].route
  //       if (current_page == 'pages/portfolio/analyzer') {
  //         util.showSuccess('请求成功完成')
  //       }
  //       else {
  //         return;
  //       }
  //       that.visualizeAndProcessData(p, 'inception', true)
  //       that.computeComparisonMetrics(that.data.timeRange[that.data.currentTimeIndex])
  //     }
  //   }
  //   // function updatePortfolioInCache(){
  //   //   wx.getStorage({
  //   //     key: "portfolio",
  //   //     success: function (res) {
  //   //       let id = getApp().globalData.selected.id;
  //   //       if(res.data == undefined){
  //   //         res.data = {}
  //   //       }
  //   //       res.data[id] = {};
  //   //       res.data[id].ts = that.data.portfolioCache;
  //   //       res.data[id].lastUpdate = Math.floor(Date.now() / 1000)
  //   //       wx.setStorage({ key: 'portfolio', data: res.data })
  //   //       console.log("update portfolio cache success", id);
  //   //     },
  //   //     fail: function (res) {
  //   //       console.log(res);
  //   //       var data = {}
  //   //       let id = getApp().globalData.selected.id;
  //   //       data[id] = {};
  //   //       data[id].ts = that.data.portfolioCache;
  //   //       data[id].lastUpdate = Math.floor(Date.now() / 1000)
  //   //       wx.setStorage({ key: 'portfolio', data: data})
  //   //       console.log("update portfolio cache success", id);
  //   //     }
  //   //   });
  //   // }
  //   // function loadDataFromAPI(){
  //   //   let ct = 0;
  //   //   date_arr.forEach(function (args, i) {
  //   //     putils.loadPortfoliofromYF(tickers, benchmark, args,
  //   //       function (p) {
  //   //         ct += 1;
  //   //         p.range = that.data.timeRange[i];
  //   //         p.isInception = args.isInception;
  //   //         _callback(p);
  //   //         that.data.portfolioCache[p.range] = p;
  //   //         if (ct == date_arr.length) {
  //   //           updatePortfolioInCache();
  //   //         }
  //   //       })
  //   //   })
  //   // }
  // },

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

    // this.computeComparisonMetrics(range)
    // lineChart = chart_utils.createPortfolioLineChart(
    //   this.data.portfolioCache[range],
    //   getApp().globalData.selected.inception,
    //   that.windowWidth);
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
    // console.log(key)
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