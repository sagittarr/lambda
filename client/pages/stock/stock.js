const KLineView = require('../common/KLineView/KLineView.js');
const KlineData = require('../../models/KLineData.js');
const NewsItem = require('NewsItem.js');
const Quotation = require('../../models/Quotation.js');
const parser = require('../../parsers/quote_parser.js');
// const dataApi = require('../../api/data_api.js');
const util = require('../../utils/util.js');
const api = require('../../api/data_api.js');
const color_style = getApp().globalData.color_style;
const Zan = require('../../utils/dist/index');
const StockItem = require('../../models/StockItem.js');
const wxCharts = require('../../utils/wxcharts-lambda.js');

function createRecTrendChart(trend, width, height, canvasId ='RecTrendChart'){
  let categories = trend.map(t=>{return t.period});
  var columnChart = new wxCharts({
    canvasId: canvasId,
    type: 'column',
    animation: true,
    categories: categories,
    series: [{
      name: 'Strong buy',
      data: trend.map(t => { return t.strongBuy }),
    },
    {
      name: 'Buy',
      data: trend.map(t => { return t.buy }),
      // format: function (val, name) {
      //   return val.toFixed(2) + '万';
      // }
    },
    {
      name: 'hold',
      data: trend.map(t => { return t.hold }),
    },
    {
      name: 'sell',
      data: trend.map(t => { return t.sell }),
    }, {
      name: 'Strong sell',
      data: trend.map(t => { return t.strongSell }),
    }
    ],
    yAxis: {
      // format: function (val) {
      //   return Math.round(val);
      // },
      title: '观点数量',
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
    width: width,
    height: height
  });
  return columnChart
}
function getIEXHistoricalDataOption(period) {
    switch (period) {
        case 1:
            return {range: '1d', freq: ''};
            break;
        case 100:
            return {range: '1y', freq: ''};
            break;
        case 101:
            return {range: '2y', freq: 'W'};
            break;
        case 102:
            return {range: '5y', freq : 'M'};
            break;
        case 60:
            return {range: '1d', freq: ''};
            break;
    }
    return ;
}
function getCanvasId(period) {
    switch (period) {
        case 1:
            return 1;
            break;
        case 100:
            return 2;
            break;
        case 101:
            return 3;
            break;
        case 102:
            return 4;
            break;
        case 60:
            return 5;
            break;
    }
    return 1;
}
function idx2Period(idx){
    if(idx<=4 && idx>=1) {
        return [1, 1, 100, 101, 102][idx];
    }
    return 0;
}
function movingAverage(klineData = [new KlineData()], option){
    let K = 20;
    if(option === 'ma20'){
        K = 20;
    }
    else if(option === 'ma5'){
        K = 5;
    }
    else if(option === 'ma10'){
        K = 10;
    }
    let sum = 0;
    klineData.map((item,i)=>{
        sum += parseFloat(item.price);
        item[option] = NaN;
        if(i>=K - 1){
            item[option] = sum/K;
            sum -= klineData[i-K+ 1].price;
        }
    });
};
function initData(that) {
  // 初始化数据显示
  // Quotation(price, zd, zdf, open, high, low, hsl, syl, sjl, cjl, jl, zz, cje, lb, ltsz, date, time, color, ticker)
  // var quota = new Quotation('--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', 0, 0, '#e64340', 0)
  var quota = new Quotation('--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', 0, 0, '#e64340', 0)
  that.setData({
    quotation: quota
  });
};

Page({
    data: {
        // 个股头部数据
        quotation: {},
        ticker: '--',
        companyName: '--',
        companyInfo: {},
        latestKline: undefined,
        currentTimeIndex: 1,
        currentInfoIndex: 0,
        quotePeriod: 100,
        quoteData: {
            canvasIndex: 2
        },
        news: [],               // 新闻列表数据
        notices: [],            // 公告列表数据
        research: [],           // 研报列表数据
        infoSwiperHeight: 0,    // 新闻列表、资金图高度
        infoCls: '0',
        fundViewData: {},
        gradeHistoryTable: [
          { "code": "", "col1": "", "col2": "", "col3": "" },
          { "code": "", "col1": "", "col2": "", "col3": "" },
          { "code": "", "col1": "", "col2": "", "col3": "" },
          { "code": "", "col1": "", "col2": "", "col3": "" },
          { "code": "", "col1": "", "col2": "", "col3": "" }],
        isInforLoad: {    // 个股新闻等是否已加载
            news: false,
            fund: false,
            notice: false,
            research: false
        },
        isAddToZxg: false,    // 是否已添加到自选股
        finanicalTable: [
            { "code": '', "col1": '' }
        ],
    },

    onLoad: function (option) {
      try {
        var res = wx.getSystemInfoSync();
        this.windowWidth = res.windowWidth;
        console.info('window width: ', this.windowWidth);
      } catch (e) {
        console.error('getSystemInfoSync failed!');
      }
        if (option.hasOwnProperty('ticker')) {
            this.setData({
                ticker: option.ticker
            })
        }
        if (option.hasOwnProperty('companyName')) {
            this.setData({
                companyName: option.companyName
            })
            this.getRecommandationTrend(function () {

            });
        }
        if (option.hasOwnProperty('currentTimeIndex') ) {
            let idx = parseInt(option.currentTimeIndex);
            this.setData({
                currentTimeIndex: idx,
                quotePeriod: idx2Period(idx+1),
                quoteData: {canvasIndex : idx+1}
            })
        }
        if (option.hasOwnProperty('currentInfoIndex')) {
            this.setData({
                currentInfoIndex: parseInt(option.currentInfoIndex)
            })
        }
        wx.setNavigationBarTitle({
            title: `${this.data.ticker}(${this.data.companyName})`
        })

        initData(this)
        this.kLineView = new KLineView()
        this.timerId = -1             // 循环请求id
        util.showBusy('请求中...');
        this.getData()
    },


    onShareAppMessage: function (options) {
        let that = this;
        return {
            title : that.data.ticker,
            desc: '个股信息',
            path: '/pages/market/market?ticker='+that.data.ticker +'&companyName='+that.data.companyName.replace("&","") + '&currentTimeIndex=' +that.data.currentTimeIndex.toString() + '&currentInfoIndex=' + that.data.currentInfoIndex.toString(),
            success: function (){
                wx.showToast({
                    title: '转发成功！',
                    icon: 'success'
                });
            }
        };
    },

    onShow: function () {
        this.startAutoRequest()
        this.isCurrentGoodsInZxgList()
    },

    onHide: function () {
        this.stopAutoRequest()
    },

    onUnload: function () {
        // 页面退出时，不会调用onHide
        this.stopAutoRequest()
    },


    onPullDownRefresh: function (event) {
        util.showBusy('请求中...');
        this.getData()
    },

    // 开启循环请求
    startAutoRequest: function () {
        var that = this;
        var data = getApp().globalData
        var interval = data.netWorkType == 'wifi' ? data.WIFI_REFRESH_INTERVAL : data.MOBILE_REFRESH_INTERVAL;
        this.timerId = setInterval(function () {
            that.getData();
        }, interval);
    },

    // 停止循环请求
    stopAutoRequest: function () {
        clearInterval(this.timerId)
    },

    // 循环请求
    getData: function () {
        let that = this;

        // 请求行情
        this.getQuotationValue(function () {
            wx.hideNavigationBarLoading();
            wx.stopPullDownRefresh();
            that.getQuotationTrend(function () {
                wx.hideNavigationBarLoading();
                util.showSuccess('请求成功');
                wx.stopPullDownRefresh();
            })
        });
        // 请求走势，请求哪个走势，在getQuotationTrend中判断

        // 请求个股资讯，具体是否请求，在getNews中判断
        this.getNews(function () {
            wx.hideNavigationBarLoading()
        })
        this.getCompanyInfo(function(info){
            wx.hideNavigationBarLoading()
        })
        this.getKeyStats(function(stats){
            wx.hideNavigationBarLoading()
        })
        this.getFinanicalTableFromYH(function(){
            wx.hideNavigationBarLoading()
        });

        util.isStockInWatchList(this.data.ticker, function(res){
            that.setData({ isAddToZxg: res})
        })
    },
    getRecommandationTrend(callback){
        let that = this;
        api.quoteYahooFinance(this.data.ticker, ['recommendationTrend', 'upgradeDowngradeHistory'], function (quote) {
          // console.log('rec', quote.recommendationTrend.trend);
          createRecTrendChart(quote.recommendationTrend.trend, that.windowWidth, 200);
          let consensusTrend = [];
          quote.recommendationTrend.trend.map(period=>{
            let consensus = period.strongBuy * 5 + period.buy * 4 + period.hold * 3 + period.sell * 2 + period.strongSell * 1;
            consensus = consensus / (period.strongBuy + period.buy + period.hold+ period.sell + period.strongSell);
            consensusTrend.push(consensus);
            });
          consensusTrend.reverse();
          // console.log('t',consensusTrend);
          // console.log('udh', quote.upgradeDowngradeHistory.history);
          let table = [
            { epochGradeDate: "日期", firm: "机构", toGrade: "新评级", fromGrade: "前评级", action: "变化" }]

          if (quote.upgradeDowngradeHistory.history.length <=5){
            quote.upgradeDowngradeHistory.history.map(record => { 
              record.epochGradeDate = record.epochGradeDate.slice(0, 10).replace(new RegExp('-', 'g'), '');
              table.push(record);
              })
          }
          else{
            let topFive = quote.upgradeDowngradeHistory.history.slice(0,5);
            topFive.map(record => {
              record.epochGradeDate = record.epochGradeDate.slice(0, 10).replace(new RegExp('-', 'g'), '');
              table.push(record);
            })
          }
          that.setData({ gradeHistoryTable: table})
            callback();
        })
    },
    getFinanicalTableFromYH(callback){
        var that = this;
        api.quoteYahooFinance(this.data.ticker, ['financialData'], function (quote) {
            let fTable = [];
            fTable.push({'code':'earningsGrowth', 'col1':quote['financialData'].earningsGrowth});
            fTable.push({ 'code': 'quickRatio', 'col1': quote['financialData'].quickRatio });
            fTable.push({ 'code': 'currentRatio', 'col1': quote['financialData'].currentRatio });
            fTable.push({ 'code': 'targetMedianPrice', 'col1': quote['financialData'].targetMedianPrice });
            fTable.push({ 'code': 'recommendationKey', 'col1': quote['financialData'].recommendationKey });
            fTable.push({ 'code': 'totalCashPerShare', 'col1': quote['financialData'].totalCashPerShare });
            fTable.push({ 'code': 'revenuePerShare', 'col1': quote['financialData'].revenuePerShare });
            fTable.push({ 'code': 'debtToEquity', 'col1': quote['financialData'].debtToEquity });
            fTable.push({ 'code': 'returnOnAssets', 'col1': quote['financialData'].returnOnAssets });
            fTable.push({ 'code': 'returnOnEquity', 'col1': quote['financialData'].returnOnEquity });
            fTable.push({ 'code': 'grossProfits', 'col1': quote['financialData'].grossProfits });
            fTable.push({ 'code': 'freeCashflow', 'col1': quote['financialData'].freeCashflow });
            fTable.push({ 'code': 'totalRevenue', 'col1': quote['financialData'].totalRevenue });
            that.setData({finanicalTable: fTable});
            callback();
        })
    },
    getKeyStats: function(callback){
        let that = this;
        parser.quoteSingleStockFromIEX(this.data.ticker, 'stats', function(stats){
            if (stats && stats.latestEPS && that.data.quotation && that.data.quotation.price){
                stats.peRatio = (that.data.quotation.price / stats.latestEPS).toFixed(2)
            }
            stats.year5ChangePercent = stats.year5ChangePercent.toFixed(2)
            stats.EBITDA = (stats.EBITDA/1000000).toFixed(1) +'M'
            stats.institutionPercent = stats.institutionPercent + '%'
            stats.latestEPSDate = stats.latestEPSDate.replace('-', '').replace('-', '')
            that.setData({ keyStats: stats })
        })
    },
    getCompanyInfo: function(callback){
        wx.showNavigationBarLoading()
        let that = this
        parser.quoteSingleStockFromIEX(this.data.ticker,'company', function(res){
            that.setData({ companyInfo: res})
        })
    },
    // 获取行情数据
    getQuotationValue: function (callback) {
        wx.showNavigationBarLoading();
        var that = this;
        parser.getQuotation(that.data.ticker, function(quotation = new Quotation()){
            let stats = that.data.keyStats
            if (stats && stats.latestEPS && quotation && quotation.price) {
                stats.peRatio = (quotation.price / stats.latestEPS).toFixed(2)
                that.setData({keyStats: stats})
            }
            let sign = quotation.zdf>0?'+':'';
            quotation.zdf = sign + (quotation.zdf*100).toFixed(2).toString() + '%';
            quotation.zd = sign + quotation.zd.toFixed(2).toString();
            quotation.high = quotation.high.toFixed(2);
            quotation.low = quotation.low.toFixed(2);
            quotation.price  = quotation.price.toFixed(2);
            quotation.color = '+' == sign ? color_style.up :color_style.down;
            let klineData = new KlineData(
                parseInt(quotation.regularMarketTime.slice(0,10).replace(/-/g,'')),
                parseFloat(quotation.open)*1000,
                parseFloat(quotation.high)*1000,
                parseFloat(quotation.low)*1000,
                parseFloat(quotation.price)*1000,
                parseFloat(quotation.price)*1000,
                undefined,
                undefined,
                quotation.realVolume,
                parseFloat(quotation.price)*1000,
                quotation.realVolume);
            that.setData({
                quotation: quotation,
                latestKline: klineData});
            if (callback != null && typeof (callback) == 'function') {
                callback()
            }
        })
    },

    getMinuteData: function (callback) {
        wx.showNavigationBarLoading()
        util.showBusy('请求中...');
        let that = this;
        let quotePeriod = that.data.quotePeriod
        parser.getMinuteData(that.data.ticker, getIEXHistoricalDataOption(quotePeriod),function(minutes){
            if (callback != null && typeof (callback) == 'function') {
                callback()
            }
            util.showSuccess('请求成功');
            that.kLineView.drawMinuteCanvas(minutes, getCanvasId(quotePeriod))

        })
    },

    getKlineData: function (callback) {
        wx.showNavigationBarLoading();
        var that = this;
        let quotePeriod = that.data.quotePeriod;
        parser.getKlineData(that.data.ticker, getIEXHistoricalDataOption(quotePeriod), function(klineData){
            if (callback != null && typeof(callback) == 'function') {
                callback()
            }
            if (quotePeriod === 100 && that.data.latestKline.time > klineData[klineData.length - 1].time ) {
              // console.log('lll', that.data.latestKline, klineData[klineData.length - 1].time)
              klineData.push(that.data.latestKline);
            }
            movingAverage(klineData, 'ma20');
            movingAverage(klineData, 'ma5');
            movingAverage(klineData, 'ma10');
            that.kLineView.drawKLineCanvas(klineData, getCanvasId(quotePeriod), quotePeriod);
        })
    },

    // 获取行情走势
    getQuotationTrend: function (callback) {
        if (this.data.quotePeriod == 1) {
            // 获取分时走势
            this.getMinuteData(callback)
        } else {
            // 获取K线走势
            this.getKlineData(callback)
        }
    },

    getNews: function (callback) {
        // 如果数据已请求完成，不再请求
        if (this.getIsInfoLoad()) return;
        wx.showNavigationBarLoading();
        let that = this;
        let ticker = that.data.ticker;

        api.call3rdPartyAPI('YHD','',{ticker:ticker, module: 'getHeadlinesByTicker'}, function(res){
          console.log('news', res)
          let newsItems = res.data.data.Articles.Article.map(item => {
            try {
              return new NewsItem('', item.Source, '', item.PubDate.substr(0, 5), '', item.Title, item.Content.Paragraph.join('\n').replace(/['"]+/g, ''))
            }
            catch (TypeError) {
              console.log('errors in news input',item)
              return null;
            }

          });
          newsItems = newsItems.filter(x=>x!=null);           
            that.setIsInfoLoad('0')

            that.setData({
                news: newsItems
            })
        });
        // parser.getNewsItems([ticker], function(newsItems){
        //     if (callback != null && typeof (callback) == 'function') {
        //         callback()
        //     }
        //     if (newsItems.hasOwnProperty(ticker) && newsItems[ticker].length>0) {
        //         that.setIsInfoLoad('0')
        //         that.setData({
        //             news: newsItems[ticker]
        //         })
        //     }
        // })

    },
    updateWatchList: function (e) {
        let that = this
        if (this.data.ticker) {
            if (this.data.isAddToZxg) {
                util.removeFromWatchList([this.data.ticker])
                Zan.TopTips.showZanTopTips(this, '已从自选股移除');
            } else {
                let stocks = []
                stocks.push(new StockItem(
                    this.data.ticker,
                    this.data.companyName
                    // item.changePercent,
                    // item.latestPrice
                ));
                util.addToWatchList(stocks)
                Zan.TopTips.showZanTopTips(this, '已经加入自选股');
            }
            util.isStockInWatchList(this.data.ticker, function (res) {
                that.setData({ isAddToZxg: res });
            })
        }
    },
    onPeriodSelectorClick: function (e) {
        let index = e.currentTarget.dataset.index
        let period = 1
        var canvasIndex = 0

        switch (index) {
            case "0":
                period = 1;
                canvasIndex = 1
                break;
            case "1":
                period = 100;
                canvasIndex = 2
                break;
            case "2":
                period = 101;
                canvasIndex = 3
                break;
            case "3":
                period = 102;
                canvasIndex = 4
                break;
            case "4":
                period = 60;
                canvasIndex = 5
                break;
        }

        this.setData({
            currentTimeIndex: index,
            quotePeriod: period,
            quoteData: {
                canvasIndex: canvasIndex
            }
        })

        if (this.kLineView.isCanvasDrawn(canvasIndex)) return;

        this.getQuotationTrend(function () {
            wx.hideNavigationBarLoading()
        })
    },

    onInfoSelectorClick: function (e) {
        let index = e.currentTarget.dataset.index
        let cls = '0'

        switch(index) {
            case '0':
                cls = '0';
                break;
            case '2':
                cls = '1';
                break;
            case '3':
                cls = '2';
                break;
        }

        this.setData({
            currentInfoIndex: index,
            infoCls: cls
        })

        if (index != '1') {
            this.getNews(function () {
                wx.hideNavigationBarLoading()
            })
        }
    },

    onInfoEmptyClick: function (e) {
        // 请求股票资讯
        this.getNews(function () {
            wx.hideNavigationBarLoading()
        })
    },

    onNewsDetailEvent: function (e) {
        let newsItem = e.currentTarget.dataset.newsItem;
        wx.navigateTo({
            url: `../newsdetail/newsdetail`
            // url: '../newsdetail/newsdetail?item='+JSON.stringify(newsItem)
        })
        getApp().globalData.newsItem = newsItem;

    },

    // 添加删除自选股
    onZxgTap: function(e) {
        console.log("page stock onZxgTap", e)
        var that = this
    },

    getIsInfoLoad: function () {
        var index = this.data.currentInfoIndex
        var data = this.data.isInforLoad

        switch (index) {
            case '0':
                return data.news
                break;
            case '1':
                return data.fund
                break;
            case '2':
                return data.notice
                break;
            case '3':
                return data.research
                break;
        }

        return false
    },

    setIsInfoLoad: function (index) {
        var data = this.data.isInforLoad

        switch (index) {
            case '0':
                data.news = true
                break;
            case '1':
                data.fund = true
                break;
            case '2':
                data.notice = true
                break;
            case '3':
                data.research = true
                break;
        }

        this.setData({
            isInforLoad: data
        })
    },

    // 查询股票是否在自选股中中
    isCurrentGoodsInZxgList: function() {
        // var isIn = optionalUtil.isOptional(this.data.ticker)
        // this.setData({
        //     isAddToZxg: isIn
        // })
    }
})


