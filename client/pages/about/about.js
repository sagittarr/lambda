//index.js
var qcloud = require('../../vendor/wafer2-client-sdk/index')
var config = require('../../config')
var util = require('../../utils/util.js')

Page({
    data: {
        userInfo: {},
        version: '0.0.1',
        logged: false,
        takeSession: false,
        requestResult: '',
        items: [
          { name: 'EN', value: 'English' },
          { name: 'CH', value: '简体中文', checked: 'true' }
        ],
        gainOrLoss:[
          { name: 'greenGain', value: '绿涨红跌' },
          { name: 'redGain', value: '红涨绿跌', checked: 'true' }
        ]
    },
    flodFn: function () {
      this.setData({
        isFold: !this.isFold
      });
    },
    // 用户登录示例
    login: function() {
        if (this.data.logged) return

        util.showBusy('正在登录')
        var that = this

        // 调用登录接口
        qcloud.login({
            success(result) {
                if (result) {
                    util.showSuccess('登录成功')
                    that.setData({
                        userInfo: result,
                        logged: true
                    })
                } else {
                    // 如果不是首次登录，不会返回用户信息，请求用户信息接口获取
                    qcloud.request({
                        url: config.service.requestUrl,
                        login: true,
                        success(result) {
                            util.showSuccess('登录成功')
                            that.setData({
                                userInfo: result.data.data,
                                logged: true
                            })
                        },

                        fail(error) {
                            util.showModel('请求失败', error)
                            console.log('request fail', error)
                        }
                    })
                }
            },

            fail(error) {
                util.showModel('登录失败', error)
                console.log('登录失败', error)
            }
        })
    },

    // 切换是否带有登录态
    switchRequestMode: function (e) {
        this.setData({
            takeSession: e.detail.value
        })
        this.doRequest();
    },

    doRequest: function () {
      util.showBusy('请求中...')
      var that = this
      var options = {
        url: config.service.requestUrl,
        login: true,
        success(result) {
          util.showSuccess('请求成功')
          console.log('request success', result)
          that.setData({
            requestResult: JSON.stringify(result.data)
          })
        },
        fail(error) {
          util.showModel('请求失败', error);
          console.log('request fail', error);
        }
      }
      if (this.data.takeSession) {  // 使用 qcloud.request 带登录态登录
        qcloud.request(options)
      } else {    // 使用 wx.request 则不带登录态
        wx.request(options)
      }
    },


    onChangeShowState: function () {
      var that = this;
      that.setData({
        showView: (!that.data.showView)
      })
    }

})
