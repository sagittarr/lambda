// pages/preview/preview.js
var util = require('../../utils/util.js');
const config = require('../../config')
Page({

  /**
   * 页面的初始数据
   */
  data: {
  
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var profile = getApp().globalData.selected
    this.setData({
      name_value: profile.name,
      desp_value: profile.desp,
      inception: profile.inception,
      date_tip: this.data.update_date_tip,
      stockList: profile.tickers
    })
    // this.setData({ stockList: getApp().globalData.stocksForCreateOrModify })
    console.log(this.data.stockList)
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
  
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  },
  onCancel: function(){
    wx.navigateBack({
      delta: 1
    })
  },
  onPublish: function(){
      var options = {
        url: config.service.db_handler,
        data: {
          operation: 'NEW',
          profile: getApp().globalData.selected
        },
        success(result) {
          console.log('Insert profile in cloud: result =  ', result)
          wx.navigateBack({
            delta: 2
          })
          util.showSuccess('publish')
        },
        fail(error) {
          // util.showModel('请求失败', error);
          console.log('onPublish request fail', error);
        }
      }
      // send request
      wx.request(options);
    }
})