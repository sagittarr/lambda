var SearchBar = require('../common/SearchBar/SearchBar.js')
var config = require('../../config')
var util = require('../../utils/util.js');
const validator = require('./validator.js')
var Zan = require('../../utils/dist/index');
Page({
  data: {
    showList: [],
    searchItem: null,
    stockList: [],
    popup: { showBottomPopup: false, date: '2018-01-01', input_hint: ''},
    showPopup: false,
  },

  onLoad:function (){
    if (getApp().globalData.useExistingProfile){
      var profile = getApp().globalData.selected
      console.log(profile.curr_holds)
      this.setData(
        { stockList: profile.curr_holds}
      )
    }
  },

    onReady: function () {
        var that = this
        SearchBar.init("代码/名称/简拼", that)
        that.setData({
            showList: []
        })
    },

    // onShareAppMessage: function () {
    //     return {
    //         title: '搜索',
    //         desc: `${getApp().globalData.shareDesc}`,
    //         // path: `/pages/search/search`
    //         path: `/pages/kanpan/kanpan?page=search`
    //     }
    // },

    onSearchBarClearEvent: function (e) {
        var that = this
        SearchBar.onSearchBarClearEvent(e, that)

        that.data.showList = []
        that.setData(that.data)
    },

    onSearchBarChangedEvent: function (e) {
        var that = this
        SearchBar.onSearchBarChangedEvent(e, that)
        this.setData({ searchItem: e.detail.value})
        // var that = this
        var input = this.data.searchItem
        console.log('search item',input)

        var options = {
          url: config.service.ticker_search,
          data: { input: input },
          success(result) {
            let res = result.data.data.ResultSet.Result
            let toshow = []
            res.forEach(function (e, i, a) {
              if (e.typeDisp == "Equity") {
                toshow.push({ 'ticker': e.symbol, 'code': e.name, 'type': e.typeDisp, 'exchDisp': e.exchDisp, 'toDel': false })
              }
            })
            console.log(toshow)
            that.setData({ showList: toshow })
          },
          fail(error) {
            util.showModel('请求失败', error);
            console.log('request fail', error);
          }
        }
        wx.request(options);
    },

    addStock: function(e){
      var theOne = e.currentTarget.dataset.stock;
      console.log(theOne)
      if (theOne.ticker!='--'){
        this.data.stockList = this.data.stockList.filter(e => e.ticker != theOne.ticker);
        this.data.stockList.push(theOne)
      }

      this.setData({ stockList: this.data.stockList})
      console.log(this.data.stockList)
    },

    onRemoveCheckedStock: function(){
      var stockList = this.data.stockList.filter(e => !e.toDel);
      this.setData({ stockList: stockList })
      console.log(this.data.stockList)
    },

    onEmptyStocks: function () {
      this.setData({ stockList: [] })
      console.log(this.data.stockList)
    },

    onCheckStock: function(e){
      var ticker = e.currentTarget.dataset.ticker;
      this.data.stockList.forEach(function(e, i, a){
        if(e.ticker == ticker){
          if(e.toDel){
            e.toDel = !e.toDel
          }
          else{
            e.toDel = true
          }
        }
      })
      this.setData({ stockList: this.data.stockList })
    },

    onCreateNewPortfolio() {
      if (this.data.stockList.length > 0 && this.data.stockList.length<=15){
        getApp().globalData.stocksForCreateOrModify = this.data.stockList
        wx.navigateTo({
          url: '../input/input'
        })
      }
      else{
        this.showTopTips()
      }
    },
    showTopTips() {
      Zan.TopTips.showZanTopTips(this, '请确认个股数量大于1且不超过15');
    }
})