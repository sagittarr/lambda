//app.js
var qcloud = require('./vendor/wafer2-client-sdk/index')
var config = require('./config')

App({
  globalData: {
    selected: {},
    stocksForCreateOrModify:[],
    color_style: undefined,

    benchmark: { 'target_return': 10, 'base_return': 0, 'target_volatility': 0.12, 'base_volatility': 0.25 },
    color_style_1: {'up':'SeaGreen', 'fine':'darkgoldenrod', 'down':'IndianRed', 'off':'gainsboro', 'default':'#ebebeb'},
    color_style_2: ['IndianRed', 'darkgoldenrod', 'SeaGreen', 'gainsboro', '#ffcccc', '#ffffcc', '#ccffcc', '#ebebeb'],

    lambda_key: 'lambdaKey',
    useDemoData: false,
    printDemoData: false,
    screenWidth: 0,
    uid: "",
    optionals: [],
    readNews: [],
    netWorkType: "",
    WIFI_REFRESH_INTERVAL: 5 * 1000,//wifi网络时刷新间隔 秒
    MOBILE_REFRESH_INTERVAL: 30 * 1000,//手机网络时刷新间隔 秒
    shareDesc: '美股信息与投资策略',
    currSystemDate: '',//当前系统日期,格式：2016-01-01
    currSystemTime: '',//当前系统时间,格式：133050
  },
  onLaunch: function () {
    qcloud.setLoginUrl(config.service.loginUrl)
    this.globalData.color_style = this.globalData.color_style_1
      var that = this
      wx.getSystemInfo({
          success: function (res) {
              that.globalData.screenWidth = res.windowWidth
              console.log(that.globalData.screenWidth)
          }
      });
  }
})