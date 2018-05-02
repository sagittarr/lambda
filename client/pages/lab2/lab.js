var sliderWidth = 96; // 需要设置slider的宽度，用于计算中间位置
const putils = require('../portfolio/port_utils.js');
const util = require('../../utils/util.js')
const config = require('../../config')
const lang = require('../../language.js')
const keywords = lang.CH
var helper = require('./helper.js')

Page({   
  data: {
    tabs: ["分析案例", "我的分析"],
    activeIndex: 0,
    sliderOffset: 0,
    sliderLeft: 0,

    keywords: keywords,
    collection: [],
    public_list: [],
    marketIndex: helper.marketIndex,
    // public_domain: true,
    showBottomPopup: false,
    // showDeleteDialog: false,
    onLoadPopup: true,
    showMoreWidgets: false,
    marketState: '',
    currentPick: undefined,
    showConfirmPopup: false,
    confirmQuestion: '',
    editPopup: {}
  },

  onLoad: function () {
    var that = this;
    console.log(Math.floor(Date.now() / 1000));
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          sliderLeft: (res.windowWidth / that.data.tabs.length - sliderWidth) / 2,
          sliderOffset: res.windowWidth / that.data.tabs.length * that.data.activeIndex
        });
      }
    });
    this.updateData()
    // var options = {
    //   url: config.service.db_handler,
    //   data: { operation: 'LOAD_PORTFOLIO', tickers: ['SPY', 'AMD', 'X'], inception: '20180301', id: '0', mode:"debug" },
    //   success(result) {
    //     console.log("DEBUG-LOAD_PORTFOLIO", result)
    //   },
    //   fail(error) {
    //     util.showModel('请求失败', error);
    //     console.log('request fail', error);
    //   }
    // }
    // wx.request(options);
    var options = {
      url: config.service.db_handler,
      // data: { operation: 'STB', phases: [{ tickers: ['BABA', 'NVDA'], from: 20180102, to: 20180117}, { tickers: ['LRCX', 'AMD'], from: 20180201, to: 20180301 }], inception: '20180301' },
      data: { operation: 'STB2', productId: 1521986497295, inception: '20180301', mode: 'debug'},
      success(result) {
        console.log("read STB", result)
      },
      fail(error) {
        util.showModel('请求失败', error);
        console.log('request fail', error);
      }
    }
    wx.request(options);
  },

  updateData: function () {
    // console.log(this.data.marketIndex)
    helper.quoteMarketIndex(this, this.data.marketIndex);
    if (getApp().globalData.useDemoData) {
      helper.loadSampleData()
    }
    else {
      helper.loadProfilefromServer(this)
      helper.loadProfilefromStorage(this)
    }
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
      title: '掌控美股',
      desc: `${getApp().globalData.shareDesc}`,
      path: `/pages/lab2/lab`
    }
  },

  onPortfolioSelect: function (e) {
    var item = e.currentTarget.dataset.item;
    // && item.id
    if (item.name) {
      getApp().globalData.selected = e.currentTarget.dataset.item;
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
      this.setData({ currentPick: undefined })
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
    helper.DeleteLocalProfile(this.data.currentPick, this)
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

  // onUpdate: function(e){
  //   getApp().globalData.selected = this.data.currentPick
  // },

  onNewPortfolioTap: function () {
    getApp().globalData.selected = undefined
    getApp().globalData.useExistingProfile = false
    wx.navigateTo({
      url: '../search/search'
    })
  }
});














