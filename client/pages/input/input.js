var config = require('../../config')
var util = require('../../utils/util.js');
const validator = require('./validator.js')
var Zan = require('../../utils/dist/index');
Page({
    data: {
        // showTopTips: false,
        // topInfo: '',
        stockList: [],
        radioItems: [
          { name: '平均分配', value: '0', checked: true},
            // {name: '自定义', value: '1'}
        ],
        checkboxItems: [
            {name: 'standard is dealt for u.', value: '0', checked: true},
            {name: 'standard is dealicient for u.', value: '1'}
        ],
        inception: '--',
        date: "2018-03-01",
        date_tip:'',
        initial_date_tip: '创建日期(创建后不得修改)',
        update_date_tip: '更新日期(提交后不得更改)'
    },
    onLoad: function (){

      if (getApp().globalData.useExistingProfile) {
        var profile = getApp().globalData.selected
        this.setData({
          name_value: profile.name,
          desp_value: profile.desp,
          inception: profile.inception,
          date_tip: this.data.update_date_tip
        })
      }
      else{
        this.setData({
          date_tip: this.data.initial_date_tip,
        })
      }
      if (getApp().globalData.stocksForCreateOrModify.length>0){
        this.setData({ stockList: getApp().globalData.stocksForCreateOrModify})
        // this.data.stockList = getApp().globalData.stocksForCreateOrModify
      }
      console.log(getApp().globalData.stocksForCreateOrModify)
       
    },

    radioChange: function (e) {
        console.log('radio发生change事件，携带value值为：', e.detail.value);

        var radioItems = this.data.radioItems;
        for (var i = 0, len = radioItems.length; i < len; ++i) {
            radioItems[i].checked = radioItems[i].value == e.detail.value;
        }

        this.setData({
            radioItems: radioItems
        });
    },

    checkboxChange: function (e) {
        console.log('checkbox发生change事件，携带value值为：', e.detail.value);

        var checkboxItems = this.data.checkboxItems, values = e.detail.value;
        for (var i = 0, lenI = checkboxItems.length; i < lenI; ++i) {
            checkboxItems[i].checked = false;

            for (var j = 0, lenJ = values.length; j < lenJ; ++j) {
                if(checkboxItems[i].value == values[j]){
                    checkboxItems[i].checked = true;
                    break;
                }
            }
        }
        this.setData({
            checkboxItems: checkboxItems
        });
    },

    bindDateChange: function (e) {
        this.setData({
            date: e.detail.value
        })
        console.log(e)
        console.log(e)
    },

    bindTimeChange: function (e) {
        this.setData({
            time: e.detail.value
        })
    },

    showTopTips: function (info) {
      Zan.TopTips.showZanTopTips(this, info);
    },

    storeProfile: function (info, data ){
      var that = this
      let profile = getApp().globalData.selected
      let toSave ={}
      let newDate = parseInt(this.data.date.replace('-', '').replace('-', ''))
      let lambda_key = getApp().globalData.lambda_key
      if (data == undefined) {
        data = {}
      }
      let stocks
      let tickers
      if (!profile || !profile.id){
        var n = new Date().getTime();
        toSave.id = n.toString()
        toSave.inception = newDate
        toSave.ratiosTable = {}
        stocks = that.data.stockList
        tickers = stocks.map(stock => stock.ticker)
        toSave.phases = [{ phaseId: 1, 'stocks': stocks, 'tickers': tickers, from: parseInt(toSave.inception), to: -1}]
      }
      else{
        toSave.id = profile.id
        toSave.inception = profile.inception
        toSave.ratiosTable = profile.ratiosTable
        toSave.phases = profile.phases
        let num = toSave.phases.length
        console.log(toSave.phases, num) 
        toSave.phases[num-1].to = newDate
        stocks = that.data.stockList
        tickers = stocks.map(stock => stock.ticker)
        toSave.phases.push({ phaseId: num + 1, 'stocks': stocks, 'tickers': tickers, from: newDate, to: -1 } )
      }
      console.log('stk',stocks)
      toSave.tickers = tickers
      toSave.name = info.name
      toSave.desp = info.desp
      toSave.last_update = newDate,
      toSave.isLocal = true
      toSave.curr_holds = stocks
      
      data[toSave.id] = toSave
      wx.setStorage({
        key: lambda_key,
        data: data
      })
      console.log('store', data)
      wx.navigateBack({
        delta: 2
      })
      util.showSuccess('Create ' + toSave.name + ' done')
    },

    formSubmit: function (e) {
      var that = this;
      var info = e.detail.value;
      var lambda_key = getApp().globalData.lambda_key
      let profile = getApp().globalData.selected
      console.log('profile', profile)
      let date = this.data.date.replace('-', '').replace('-', '')
      if (info.name.length == 0) {
        this.showTopTips("Name is empty")
        return
      }
      if (info.desp.length == 0) {
        this.showTopTips("Description is empty")
        return
      }
      if(!profile || profile.isLocal){
        wx.getStorage({
          key: lambda_key,
          success: function (res) {
            that.storeProfile(info, res.data)
          },
          fail: function (res) {
            console.log(lambda_key, ' not found')
            that.storeProfile(info)
          }
        });
      }
      else{
        let newDate = parseInt(this.data.date.replace('-', '').replace('-', ''))
        profile.phases = JSON.parse(profile.phases)
        let num = profile.phases.length
        profile.phases[num - 1].to = newDate
        let stocks = that.data.stockList
        let tickers = stocks.map(stock => stock.ticker)
        profile.phases.push({ phaseId: num + 1, 'stocks': stocks, 'tickers': tickers, from: newDate, to: -1 })
        // profile.visible = 1
        var options = {
          url: config.service.db_handler,
          data: {
            operation: 'UPDATE',
            profile: profile
          },
          success(result) {
            console.log('Update profile in cloud: result =  ', result)
            wx.navigateBack({
              delta: 2
            })
            util.showSuccess('Update')
          },
          fail(error) {
            // util.showModel('请求失败', error);
            console.log('Update request fail', error);
          }
        }
        // send request
        wx.request(options);
      }

    },
});