// pages/stock/stock_price.js

var helloData = {
  name: 'WeChat'
}

Page({

  /**
   * 页面的初始数据
   */
  data:  helloData,
  changeName: function (value) {
    // sent data change to view
    this.setData({
      name: value
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var page = this;
    wx.request({
      url: 'https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?start_date=2018-01-01&end_date=2018-01-16&api_key=weN4-vHsp1yBg9LBEkmJ', //仅为示例，并非真实的接口地址
      header: {
        'content-type': 'application/json' // 默认值
      },
      success: function (res) {
        console.log(res.data);
        // data = res.data;
        page.changeName(res.data.dataset_data.data[0]);
      }
    });
    
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
  
  }
})