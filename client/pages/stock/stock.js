var KLineView = require('../common/KLineView/KLineView.js')
var NewsItem = require('NewsItem.js')
var Quotation = require('../../models/Quotation.js')
var parser = require('../../parsers/quote_parser.js')
const util = require('../../utils/util.js')
Page({

    data: {
        // 个股头部数据
        quotation: {},
        // ticker: '--',
        // goodsName: '青岛啤酒',
        ticker: '--',
        companyName: '--',
        quotationColor: '#eb333b',
        currentTimeIndex: 0,
        currentInfoIndex: 0,
        quotePeriod: 1,
        quoteData: {
            canvasIndex: 0
        },
        news: [],               // 新闻列表数据
        notices: [],            // 公告列表数据
        research: [],           // 研报列表数据
        infoSwiperHeight: 0,    // 新闻列表、资金图高度
        infoCls: '0',
        fundViewData: {},
        isInforLoad: {    // 个股新闻等是否已加载
            news: false,
            fund: false,
            notice: false,
            research: false
        },
        isAddToZxg: false    // 是否已添加到自选股
    },

    onLoad: function (option) {
        if (option.hasOwnProperty('ticker')) {
            this.setData({
                // ticker: parseInt(option.id),
                // goodsName: option.name,
                ticker: option.ticker,
                companyName: option.companyName
            })
        }

        wx.setNavigationBarTitle({
            title: `${this.data.ticker}(${this.data.companyName})`
        })

        initData(this)
        this.kLineView = new KLineView()
        this.timerId = -1             // 循环请求id

        console.log('stock page onLoad ', this.data.ticker)

        // fundview.init(this);
        // fundview.show(this);
        // fundview.setJLValue(this);
        util.showBusy('请求中...');
        this.getData()
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

    onShareAppMessage: function () {
        var that = this
        // var id = that.data.ticker
        // var name = that.data.goodsName
        var code = that.data.ticker

        return {
            title: `(${code})`,
            desc: `${getApp().globalData.shareDesc}`,
            // path: `/pages/stock/stock?id=${id}&name=${name}&code=${code}`
            path: `/pages/kanpan/kanpan?code=${code}&page=stock`
        }
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
        // 请求行情
        this.getQuotationValue(function () {
            wx.hideNavigationBarLoading()
            wx.stopPullDownRefresh()
        })
        // 请求走势，请求哪个走势，在getQuotationTrend中判断
        this.getQuotationTrend(function () {
            wx.hideNavigationBarLoading()
            util.showSuccess('请求成功');
            wx.stopPullDownRefresh()
        })
        // 请求个股资讯，具体是否请求，在getNews中判断
        this.getNews(function () {
            wx.hideNavigationBarLoading()
        })
    },

    // 获取行情数据
    getQuotationValue: function (callback) {
        wx.showNavigationBarLoading()
        var that = this
        parser.getQuotation(that.data.ticker, function(quotation = new Quotation()){
            let sign = quotation.zdf>0?'+':''
            quotation.zdf = sign + (quotation.zdf*100).toFixed(2).toString() + '%'
            quotation.zd = sign + quotation.zd.toFixed(2).toString()
            quotation.high = quotation.high.toFixed(2)
            quotation.low = quotation.low.toFixed(2)
            quotation.price  = quotation.price.toFixed(2)
            that.setData({ quotation: quotation })
                if (callback != null && typeof (callback) == 'function') {
                    callback()
                }
        })
    },

    getMinuteData: function (callback) {
        wx.showNavigationBarLoading()
        var that = this
        parser.getMinuteData(that.data.ticker, getIEXHistoricalDataOption(that.data.quotePeriod),function(minutes){
            if (callback != null && typeof (callback) == 'function') {
                callback()
            }
            console.log('stock minute result ', minutes)
            console.log('canvas id ' + getCanvasId(that.data.quotePeriod))
            that.kLineView.drawMinuteCanvas(minutes, getCanvasId(that.data.quotePeriod))

        })
    },

    getKlineData: function (callback) {
        wx.showNavigationBarLoading()
        var that = this
        parser.getKlineData(that.data.ticker, getIEXHistoricalDataOption(that.data.quotePeriod), function(klineData){
            console.log(klineData)
            if (callback != null && typeof (callback) == 'function') {
                callback()
            }
            // console.log('stock kline result ', results)
            that.kLineView.drawKLineCanvas(klineData, getCanvasId(that.data.quotePeriod), that.data.quotePeriod)
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
        if (this.getIsInfoLoad()) return

        wx.showNavigationBarLoading()
        var that = this

        // Api.stock.getNews({
        //     id: that.data.ticker + '',
        //     cls: that.data.infoCls
        // }).then(function (results) {
        //     // console.log('stock news result ', results)

        //     if (callback != null && typeof (callback) == 'function') {
        //         callback()
        //     }

        //     if (results.hasOwnProperty('news')) {
        //         that.setIsInfoLoad('0')
        //         that.setData({
        //             news: results.news
        //         })
        //     } else if (results.hasOwnProperty('notices')) {
        //         that.setIsInfoLoad('2')
        //         that.setData({
        //             notices: results.notices
        //         })
        //     } else if (results.hasOwnProperty('research')) {
        //         that.setIsInfoLoad('3')
        //         that.setData({
        //             research: results.research
        //         })
        //     }
        // }, function (res) {
        //     console.log("------fail----", res)
        //     wx.hideNavigationBarLoading()
        // })
    },

    onPeriodSelectorClick: function (e) {
        let index = e.currentTarget.dataset.index
        let period = 1
        var canvasIndex = 0

        switch (index) {
            case "0":
                period = 1;
                canvasIndex = 0
                break;
            case "1":
                period = 100;
                canvasIndex = 1
                break;
            case "2":
                period = 101;
                canvasIndex = 2
                break;
            case "3":
                period = 102;
                canvasIndex = 3
                break;
            case "4":
                period = 60;
                canvasIndex = 4
                break;
        }

        this.setData({
            currentTimeIndex: index,
            quotePeriod: period,
            quoteData: {
                canvasIndex: canvasIndex
            }
        })

        if (this.kLineView.isCanvasDrawn(canvasIndex + 1)) return;

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
        var newsItem = e.currentTarget.dataset.newsItem
        var newsType = e.currentTarget.dataset.newsType

        var data = e.currentTarget.dataset
        // var url = Util.urlNavigateEncode(newsItem.url)
        wx.navigateTo({
            url: `../newsdetail/newsdetail?time=${newsItem.time}&id=${newsItem.newsId}&url=${url}&type=${newsType}`
        })
    },

    // 添加删除自选股
    onZxgTap: function(e) {
        console.log("page stock onZxgTap", e)
        var that = this

        // Api.stock.commitOptionals({
        //     ticker: that.data.ticker
        // }).then(function (res) {
        //     console.log("添加自选股", res)
        //     if (res == 0 || res == '0') {
        //         that.isCurrentGoodsInZxgList()
        //     }
        // }, function (res) {
        //     console.log("添加自选股", res)
        // })
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

function initData(that) {
    // 初始化数据显示
    // Quotation(price, zd, zdf, open, high, low, hsl, syl, sjl, cjl, jl, zz, cje, lb, ltsz, date, time, color, ticker)
    // var quota = new Quotation('--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', 0, 0, '#e64340', 0)
    var quota = new Quotation('1', '2', '3', '4', '5', '6', '7', '8', '--', '--', '--', '--', '--', '--', '--', 0, 0, '#e64340', 0)
    that.setData({
        quotation: quota
    })
}
