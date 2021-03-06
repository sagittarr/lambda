var sliderWidth = 96; // 需要设置slider的宽度，用于计算中间位置
const putils = require('../portfolio/port_utils.js');
const util = require('../../utils/util.js')
const config = require('../../config')
const lang = require('../../language.js')
const keywords = lang.CH
const helper = require('./helper.js')

Page({
    data: {
      tabs: ["精选组合", "自建组合"],
        activeIndex: 0,
        sliderOffset: 0,
        sliderLeft: 0,
        keywords: keywords,
        collection: [],
        public_list: [],
        marketIndex: helper.marketIndex,
        showBottomPopup: false,
        onLoadPopup: true,
        showMoreWidgets: false,
        marketState: '',
        currentPick: undefined,
        showConfirmPopup: false,
        confirmQuestion: '',
        editPopup: {}
    },

    onLoad: function (options) {
        let that = this;

        wx.getSystemInfo({
            success: function (res) {
                that.setData({
                    sliderLeft: (res.windowWidth / that.data.tabs.length - sliderWidth) / 2,
                    sliderOffset: res.windowWidth / that.data.tabs.length * that.data.activeIndex
                });
            }
        });
        if (options && options.profile) {
            getApp().globalData.selected = JSON.parse(options.profile);
            wx.navigateTo({
                url: '/pages/portfolio/analyzer?profile=' + options.profile
            })
        }
        // let ticker = 'AAPL'
        // var options = {
        //   url: config.service.db_handler,
        //   data: { operation: 'LOAD_INTRADAY', ticker: 'AAPL', source: 'IEX', apiUrl:'https://api.iextrading.com/1.0/stock/'+ticker+'/chart/1d'},
        //   success(result) {
        //     console.log("LOAD_INTRADAY", result)
        //   },
        //   fail(error) {
        //     util.showModel('请求失败', error);
        //     console.log('LOAD_INTRADAY', error);
        //   }
        // }
        // wx.request(options);
        // putils.callAPI('', 'IEX')
        // this.updateData()
        // var options = {
        //   url: config.service.db_handler,
        //   data: { operation: 'LOAD_PORTFOLIO', tickers: ['SPY', 'CQH', 'AMGP'], inception: '20180427', id: '0', mode:"debug", toUpdateDB: true },
        //   success(result) {
        //     console.log("DEBUG-LOAD_PORTFOLIO", result)
        //   },
        //   fail(error) {
        //     util.showModel('请求失败', error);
        //     console.log('request fail', error);
        //   }
        // }
        // wx.request(options);
        // var options = {
        //   url: config.service.db_handler,
        //   data: { operation: 'LOAD', phases: [{ tickers: ['BABA', 'NVDA'], from: 20180102, to: -1 }]},
        //   // data: { operation: 'LOAD', id: 1521986497295, inception: '20180301', mode: 'debug'},
        //   success(result) {
        //     console.log("read LOAD", result)
        //   },
        //   fail(error) {
        //     util.showModel('请求失败', error);
        //     console.log('request fail', error);
        //   }
        // }
        // wx.request(options);
    },

    updateData: function () {
        helper.quoteMarketIndex(this, this.data.marketIndex);
        helper.loadProfileFromServer(this)
        helper.loadProfileFromStorage(this)
    },

    tabClick: function (e) {
        this.setData({
            sliderOffset: e.currentTarget.offsetLeft,
            activeIndex: e.currentTarget.id
        });
        this.showProfileList()
    },

    onReady: function () {
        // 页面渲染完成
    },

    onShow: function () {
        // 页面显示
        util.showBusy('请求中...');
        this.updateData()
    },

    onHide: function () {
        // 页面隐藏
    },

    onUnload: function () {
        // 页面关闭
    },

    onPullDownRefresh: function () {
        // this.getData()
        this.updateData()
    },


    onShareAppMessage: function () {
        return {
            title: '选股策略',
            desc: getApp().globalData.shareDesc,
            path: '/pages/lab2/lab'
        }
    },

    onPortfolioSelect: function (e) {
        let item = e.currentTarget.dataset.item;
        if (item.name) {
            getApp().globalData.selected = item;
            wx.navigateTo({
                url: '/pages/portfolio/analyzer?profile=' + JSON.stringify(item)
            });
        }
    },

    showProfileList: function () {
        if (this.data.activeIndex == 0) {
            this.setData({ collection: this.data.public_list })
        }
        else if (this.data.activeIndex == 1) {
            this.setData({ collection: this.data.local_list })
        }
    },

    togglePopup: function (e) {
        var item = e.currentTarget.dataset.item
        this.setData({ showOperationPopup: !this.data.showOperationPopup })
        if (this.data.showOperationPopup) {
            this.setData({ currentPick: item })
        }
        else {
            this.setData({ currentPick: null })
        }
    },

    onConfirm: function (e) {
        this.deleteProfile()
        this.setData({ showConfirmPopup: false })
    },

    onCancel: function (e) {
        this.setData({ showConfirmPopup: false })
    },

    onDeleteClick: function (e) {
        // this.setData({ showDeleteDialog: !this.data.showDeleteDialog })
        this.setData({ showConfirmPopup: true, confirmQuestion: '是否删除此组合?' })
    },

    deleteProfile: function () {
        if(this.data.currentPick.isLocal){
            helper.DeleteLocalProfile(this.data.currentPick, this)
        }
        else{
            helper.DeleteCloudProfile(this.data.currentPick, this)
        }
        this.setData({ currentPick: undefined })
        this.setData({ showOperationPopup: false })
    },

    onIndexTap: function (e) {
        let index = e.currentTarget.dataset.index
        this.data.marketIndex[index].showPct = !this.data.marketIndex[index].showPct;
        this.setData({ marketIndex: this.data.marketIndex })
    },

    onEditClick: function (e) {
        getApp().globalData.selected = this.data.currentPick
        getApp().globalData.editing = true
        console.log(this.data.currentPick)
        getApp().globalData.useExistingProfile = true
        wx.navigateTo({
            url: '../search/search'
        })
    },
    onUpdateClick: function (e) {
        getApp().globalData.selected = this.data.currentPick
        getApp().globalData.editing = false
        console.log(this.data.currentPick)
        getApp().globalData.useExistingProfile = true
        wx.navigateTo({
            url: '../search/search'
        })
    },
    onPublish: function (e) {
        getApp().globalData.selected = this.data.currentPick
        // getApp().globalData.useExistingProfile = true
        wx.navigateTo({
            url: '../preview/preview'
        })
    },

    onNewPortfolioTap: function () {
        getApp().globalData.selected = undefined
        getApp().globalData.useExistingProfile = false
        wx.navigateTo({
            url: '../search/search'
        })
    }
});














