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
        if(typeof(profile.phases) === typeof("str")){
          profile.phases = JSON.parse(profile.phases)
        }
        var numOfPhases = profile.phases.length
        var dt = profile.phases[numOfPhases - 1].from.toString()
        this.setData({
          name_value: profile.name,
          desp_value: profile.desp,
          inception: profile.inception,
          date_tip: this.data.update_date_tip,
          date: dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6)
        })
      }
      else{
        this.setData({
          date_tip: this.data.initial_date_tip
        })
      }

      if (getApp().globalData.stocksForCreateOrModify.length>0){
        this.setData({ stockList: getApp().globalData.stocksForCreateOrModify})
        // this.data.stockList = getApp().globalData.stocksForCreateOrModify
      }
      console.log(getApp().globalData.stocksForCreateOrModify)
       
    },

    radioChange: function (e) {
        // console.log('radio发生change事件，携带value值为：', e.detail.value);

        var radioItems = this.data.radioItems;
        for (var i = 0, len = radioItems.length; i < len; ++i) {
            radioItems[i].checked = radioItems[i].value == e.detail.value;
        }

        this.setData({
            radioItems: radioItems
        });
    },

    checkboxChange: function (e) {
        // console.log('checkbox发生change事件，携带value值为：', e.detail.value);

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
    saveProfileToCloud: function (toSave){
      var options = {
        url: config.service.db_handler,
        data: {
          operation: 'UPDATE',
          profile: toSave
        },
        success(result) {
          console.log('Update profile in cloud: result =  ', result)
          wx.navigateBack({
            delta: 2
          })
          util.showSuccess('Update')
        },
        fail(error) {
          console.log('Update request fail', error);
        }
      }
      wx.request(options);
    },

    saveProfileToStorage: function (toSave, data){
      var that = this
      let lambda_key = getApp().globalData.lambda_key
      if (data == undefined) {
        data = {}
      }
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

    cookData: function(info){
      var that = this
      let profile = getApp().globalData.selected
      let toSave = {}
      let newDate = parseInt(this.data.date.replace('-', '').replace('-', ''))
      // let lambda_key = getApp().globalData.lambda_key
      // if (data == undefined) {
      //   data = {}
      // }
      let stocks = that.data.stockList
      let tickers = stocks.map(stock => stock.ticker)
      if (!profile || !profile.id || !getApp().globalData.useExistingProfile) {
        var n = new Date().getTime();
        toSave.id = n.toString()
        toSave.inception = newDate
        toSave.ratiosTable = {}
        toSave.isLocal = true
        toSave.phases = [{ phaseId: 1, 'stocks': stocks, 'tickers': tickers, from: parseInt(toSave.inception), to: -1 }]
      }
      else {
        toSave.isLocal = profile.isLocal
        if (toSave.isLocal == undefined){
          console.log("isLocal undefined")
        }
        toSave.id = profile.id
        toSave.inception = profile.inception
        toSave.ratiosTable = profile.ratiosTable
        if(typeof(profile.phases) === typeof("str")){
          toSave.phases = JSON.parse(profile.phases)
        }
        else{
          toSave.phases = profile.phases
        }
        let num = toSave.phases.length
        console.log(toSave.phases, num)
        if (getApp().globalData.editing == true) {
          if (num>=2){
            if(newDate > toSave.phases[num - 2].to){
              toSave.phases[num - 1].from = newDate
            }
            else{
              this.showTopTips("update date should > previous update date " + toSave.phases[num - 2].to.toString())
              return null;
            }
          }
          else{
            toSave.phases[num - 1].from = newDate
          } 
          toSave.phases[num - 1].stocks = stocks
          toSave.phases[num - 1].tickers = tickers
        }
        else {
          toSave.phases[num - 1].to = newDate
          toSave.phases.push({ phaseId: num + 1, 'stocks': stocks, 'tickers': tickers, from: newDate, to: -1 })
        }

      }
      // console.log('stk', stocks)
      toSave.tickers = tickers
      toSave.name = info.name
      toSave.desp = info.desp
      toSave.last_update = newDate,
      toSave.curr_holds = stocks
      return toSave  
    },
    formSubmit: function (e) {
      var that = this;
      var info = e.detail.value;
      var lambda_key = getApp().globalData.lambda_key
      let profile = getApp().globalData.selected
      console.log('profile', profile)
      // let date = this.data.date.replace('-', '').replace('-', '')
      if (info.name.length == 0) {
        this.showTopTips("Name is empty")
        return
      }
      if (info.desp.length == 0) {
        this.showTopTips("Description is empty")
        return
      }
      var toSave = that.cookData(info)
      if(toSave === null){
        return 
      }
      if(!profile || profile.isLocal){
        wx.getStorage({
          key: lambda_key,
          success: function (res) {
            that.saveProfileToStorage(toSave, res.data)
          },
          fail: function (res) {
            console.log(lambda_key, ' not found')
            that.saveProfileToStorage(toSave)
          }
        });
      }
      else{
        that.saveProfileToCloud(toSave)
        // profile.phases = JSON.parse(profile.phases)
        // let newDate = parseInt(this.data.date.replace('-', '').replace('-', ''))
        // let num = profile.phases.length
        // let stocks = that.data.stockList
        // let tickers = stocks.map(stock => stock.ticker)
        // if (getApp().globalData.editing == true){
        //   profile.phases[num - 1].from = newDate
        //   profile.phases[num - 1].stocks = stocks
        //   profile.phases[num - 1].tickers = tickers
        // }
        // else{
        //   profile.phases[num - 1].to = newDate
        //   profile.phases.push({ phaseId: num + 1, 'stocks': stocks, 'tickers': tickers, from: newDate, to: -1 })
        // }
        // var options = {
        //   url: config.service.db_handler,
        //   data: {
        //     operation: 'UPDATE',
        //     profile: profile
        //   },
        //   success(result) {
        //     console.log('Update profile in cloud: result =  ', result)
        //     wx.navigateBack({
        //       delta: 2
        //     })
        //     util.showSuccess('Update')
        //   },
        //   fail(error) {
        //     console.log('Update request fail', error);
        //   }
        // }
        // wx.request(options);
      }
    },
});