// const CATEGORY_All = '';//全部模型(""空字符串或null)
// const CATEGORY_QZ = '001001';//强者恒强
// const CATEGORY_QK = '001014';//缺口模块
// const CATEGORY_TC = '001018';//题材领涨
// const CATEGORY_HJ = '001022';//黄金K线
// const SORT_UP = 1;//升序
// const SORT_DOWN = -1;//降序

const util = require('../../utils/util.js')
const putil = require('../../pages/portfolio/port_utils.js')
var intervalId = 0;

const helper = require('../lab2/helper.js')
const parser = require('../../parsers/quote_parser.js')
const SearchBar = require('../common/SearchBar/SearchBar.js')

var stockLists = [[]/*watch*/, []/*gainer*/, []/*loser*/, []/*active*/, []/*pct change*/]
var whileLongPress = false
Page({
  data: {
    // currIndex: 0,//当前选择的tab
    currListIndex: 0,
    currPeriodIndex: 0,
    sortState: -1,//-1降序,1升序
    bkArr: [],
    sectorPeriodArr: ["当天", "一周", "一月", "一年"],//tab
    // sectorPerfTable : {},
    tabArr: ["自选", "领涨", "领跌", "活跃", "放量"],//tab
    showList: [],//列表数据
    sectorTables: { 'realtime': {}, '1month': {}, '1year': {} },
    sectorsToShow: [{}, {}, {}, {}],
    sectorPeriodIndex: 0,
    marketIndex: helper.marketIndex
  },

  onLoad: function (options) {
    // 上次hide是退出hide时，才自动跳转到其它页面
    var that = this
    var page = ''
    if (options.hasOwnProperty('page')) {
      page = options.page

      if (page != '') {
        if (page == 'stock' || page == 'bk') {
          if (options.hasOwnProperty('id') && options.hasOwnProperty('name') && options.hasOwnProperty('code')) {
            util.gotoQuote(parseInt(options.id), options.name, options.code)
          }
        } else if (page == 'search') {
          util.gotoSearchPage('search', '')
        }
      }
    }
  },

  onReady: function () {
    this.getData()
  },

  onShow: function () {
    this.startTimer();
    this.getData()
  },

  onHide: function () {
    //停止计时
    this.stopTimer();
  },

  onUnload: function () {
    console.log('kanpan onUnload')
    // 页面关闭
    //停止计时
    this.stopTimer();
  },

  //分享
  onShareAppMessage: function () {
    return {
      title: `看盘`,
      desc: `${getApp().globalData.shareDesc}`,
      path: `/pages/kanpan/kanpan`
    }
  },

  //下拉刷新
  onPullDownRefresh: function () {
    wx.stopPullDownRefresh();
  },


  //启动计时
  startTimer: function () {
    var that = this;
    var interval = getApp().globalData.netWorkType == 'wifi' ? getApp().globalData.WIFI_REFRESH_INTERVAL : getApp().globalData.MOBILE_REFRESH_INTERVAL;
    intervalId = setInterval(function () {
      that.getData();
      that.setData({ showList: stockLists[that.data.currListIndex] })
    }, interval);
  },

  //停止计时
  stopTimer: function () {
    clearInterval(intervalId)
  },

  getData: function () {
    var that = this
    helper.quoteMarketIndex(this, this.data.marketIndex)
    if (stockLists[0].length == 0) {
      var lambda_key = getApp().globalData.lambda_key
      wx.getStorage({
        key: lambda_key,
        success: function (res) {
          if (res && res.data && res.data['watchlist']) {
            console.log(res.data['watchlist'])
            stockLists[0] = res.data['watchlist']
            // that.setData({ showList: stockLists[that.data.currListIndex]})
            putil.realtime_price(stockLists[0].map(stk => stk.ticker), function (results) {
              console.log('res',results)
              if (typeof(results) === 'object') {
                results = [results]
              }
              stockLists[0] = putil.quoteRealTimePriceCallback(results)
            })
          }
        },
        fail: function (res) {
          console.log('storage is empty')
        }
      });
    }

    putil.realtime_price(stockLists[0].map(stk=>stk.ticker), function (results) {
      console.log(results)
      if (typeof (results) === 'object') {
        results = [results]
      }
      stockLists[0] = putil.quoteRealTimePriceCallback(results)
    })
    parser.getSectorPerformanceFromALV(function (input) {
      let sectorTables = {}
      let periods = ['realTime', '1month', '1year']
      periods.map(period => {
        sectorTables[period] = []
        let row = {}
        input[period].map((sector, index) => {
          sector.colorify()
          row['s' + (index % 3).toString()] = sector
          if (index % 3 == 2 || index == input[period].length - 1) {
            sectorTables[period].push(row)
            row = {}
          }
        })
      })
      that.setData({ sectorTables: sectorTables, sectorsToShow: sectorTables[periods[that.data.sectorPeriodIndex]] })
    })

    parser.getStockListFromIEX(function (result, category) {
      if (category == 'gainers') {
        stockLists[1] = result
      }
      else if (category == 'losers') {
        stockLists[2] = result
      }
      else if (category == 'active') {
        stockLists[3] = result
      }
      else if (category == 'iexpercent') {
        stockLists[4] = result
      }
      that.setData({ showList: stockLists[that.data.currListIndex] })
    })
  },

  onPeriodSelectorClick: function (e) {
    let index = parseInt(e.currentTarget.dataset.index)
    let that = this

    if (index == 0)
      this.setData({ sectorsToShow: that.data.sectorTables['realTime'], sectorPeriodIndex: index })
    else if (index == 1) {
      this.setData({ sectorsToShow: that.data.sectorTables['1month'], sectorPeriodIndex: index })
    }
    else {
      this.setData({ sectorsToShow: that.data.sectorTables['1year'], sectorPeriodIndex: index })
    }
  },

  onStockListSelectorClick: function (e) {
    var index = e.currentTarget.dataset.index;
    if (index < stockLists.length) {
      this.setData({
        currListIndex: index,
        showList: stockLists[index]
      })
    }
  },

  //排序和绑定数据 
  sortAndSetData: function (data) {
    if (!data || data.length <= 0) {
      return;
    }
    var that = this;
    data.sort(function (a, b) {
      var zdf1 = a.zdf
      var zdf2 = b.zdf
      if (!zdf1) {
        zdf1 = that.data.sortState * 20000
      }
      if (!zdf2) {
        zdf2 = that.data.sortState * 20000
      }
      return that.data.sortState * (zdf1 - zdf2);
    });

    this.setData({
      showList: data
    })
  },

  //listview item的点击事件
  // onItemClickEvent: function (e) {
  //   var data = e.currentTarget.dataset
  //   util.gotoQuote(data.item.id, data.item.name, data.item.code)
  // },

  //涨跌幅排序
  onZDFSort: function (e) {
    var tempSortState = -this.data.sortState;
    this.setData({
      sortState: tempSortState
    })

    //更新数据并排序
    this.updateData()
  },

  onStockSearchEvent: function (e) {
    wx.navigateTo({
      url: '../search/search'
    })
  },
  onSearchBarClick: function (e) {
    util.gotoSearchPage('search', '')
  },
  longPressStockItem: function (e) {
    console.log(e)
    if (this.data.currListIndex!=0) return;
    var that = this
    let item = e.target.dataset.item
    if (!item){
      item = e.currentTarget.dataset.item
    }
    let showList = that.data.showList
    showList.map(x => {
      if (x.ticker == item.ticker) {
        if (x.toDel == true) {
          x.toDel = false
        }
        else {
          x.toDel = true
        }
      }

    })
    stockLists[that.data.currListIndex] = showList
    this.setData({ showList: showList })
    // whileLongPress = true
  },
  clickStockItem: function (e) {
    console.log(e)
  },
  removeStockItem: function(e){
    console.log(e)
    let showList = this.data.showList
    showList = showList.filter(x => x.ticker != e.currentTarget.dataset.item.ticker);
    this.setData({showList:showList})
    stockLists[0] = showList
    console.log(this.data.showList)
    var lambda_key = getApp().globalData.lambda_key
    wx.getStorage({
      key: lambda_key,
      success: function (res) {
        let data = res.data
        // console.log(res.data['watchlist'])
        data['watchlist'] = stockLists[0]
        wx.setStorage({
          key: lambda_key,
          data: data,
        })
      },
      fail: function (res) {
        console.log('storage is empty')
      }
    });

  }
})