const putils = require('../portfolio/port_utils.js');
const util = require('../../utils/util.js')
const config = require('../../config')
const lang = require('../../language.js')
const parser = require('../../parsers/quote_parser.js')
const Quotation = require('../../models/Quotation.js')
const keywords = lang.CH

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
};
var marketIndex = [
    {
        index: 0,
        name: 'NASDAQ',
        ticker: '^IXIC',
        zd: '-',
        zdf: '-%',
        intZd: 0,
        price: '--',
        showPct: true,
    },
    {
        index: 1,
        name: 'DOW',
        ticker: '^DJI',
        zd: '-',
        zdf: '-%',
        intZd: 0,
        price: '--',
        showPct: true
    },
    {
        index: 2,
        name: 'S&P500',
        ticker: '^GSPC',
        zd: '-',
        zdf: '-%',
        intZd: 0,
        price: '--',
        showPct: true
    }
];
function quoteMarketIndex (that, marketIndex) {

    const color_style = getApp().globalData.color_style
    marketIndex.forEach(function (e, i, a) {
        putils.quoteYahooFinance(e.ticker, ['price'], function (v) {
            console.log(v)
            let mark = v.price.regularMarketChange > 0 ? '+' :''
            e.zd = mark + v.price.regularMarketChange.toFixed(2);
            e.pct = mark + (v.price.regularMarketChangePercent * 100).toFixed(2) + '%';
            e.intZd = v.price.regularMarketChangePercent;
            e.price = v.price.regularMarketPrice.toFixed(2);
            e.active = v.price.marketState == "REGULAR";
            e.showPct = true
            // e.color = v.price.regularMarketChangePercent > 0 ? color_style[0]: v.price.regularMarketChangePercent< 0 ? color_style[2]: color_style[2]
            e.color = 'white'
            e.bg = v.price.regularMarketChangePercent > 0 ? color_style.up : v.price.regularMarketChangePercent < 0 ? color_style.down : color_style.default
            // e.bg = v.price.regularMarketChangePercent > 0 ? color_style[0] : v.price.regularMarketChangePercent < 0 ? color_style[2] : color_style[7]
            that.setData({
                marketIndex: marketIndex,
                marketState: v.price.marketState
            });
        })
    })
}

function quoteProfileDailyChangeFromYHD(profile, that) {
    let tickers
    if(profile.isLocal){
        tickers = profile.tickers
    }
    else{
        if (profile.curr_holds && profile.curr_holds[0] && typeof(profile.curr_holds[0]) === typeof("str"))
            tickers = profile.curr_holds
        else{
            tickers = profile.curr_holds.map(stock=>stock.ticker)
        }
    }
    putils.realtime_price(tickers, function (results) {
        var chg_pct = 0
        if (results == undefined) {
            wx.stopPullDownRefresh();
            return;
        }
        if(!(results instanceof Array)){
            results = [results]
        }
        results.forEach(function (e) {
            chg_pct += parseFloat(e.realtime_chg_percent)
        })
        chg_pct = chg_pct / results.length
        profile.latestChgPct = chg_pct
        DisplayMetrics(profile, '', that.data.marketState)
        Colorify(profile, 'inception')
        wx.stopPullDownRefresh();
        that.showProfileList()
    })
}

function quoteProfileDailyChangeFromIEX(profile, that) {
    let tickers
    if(profile.isLocal){
        tickers = profile.tickers
    }
    else{
        if (profile.curr_holds && profile.curr_holds[0] && typeof(profile.curr_holds[0]) === typeof("str"))
            tickers = profile.curr_holds
        else{
            tickers = profile.curr_holds.map(stock=>stock.ticker)
        }
    }
    parser.getBatchDataFromIEX(tickers, 'quote', function(result){
        let dlyChange = 0
        tickers.map(ticker =>{
            dlyChange += result[ticker].quote.changePercent
        })
        profile.latestChgPct = 100*dlyChange/tickers.length
        DisplayMetrics(profile, '', that.data.marketState)
        Colorify(profile, 'inception')
        wx.stopPullDownRefresh();
        that.showProfileList()
    })
}

function loadProfileFromServer(that) {
    var options = {
        url: config.service.db_handler,
        data: { operation: 'R' },
        success(result) {
            console.log("cloud ", result.data.data)
            result.data.data.forEach(function (loaded) {
                let phases = JSON.parse(loaded.phases)
                if (phases) {
                    loaded.curr_holds = phases[phases.length - 1].stocks
                    loaded.tickers = phases[phases.length - 1].tickers
                    loaded.isLocal = false
                    loaded.phases = phases
                    loaded.numOfUpdates = loaded.phases.length - 1
                }
                DisplayMetrics(loaded, 'inception')
                Colorify(loaded, 'inception')
            })

            that.setData({
                public_list: result.data.data,
            });

            that.data.public_list.forEach(function (profile) {
                // quoteChangePrecentageForProfile(profile, that);
                quoteProfileDailyChangeFromIEX(profile, that)
            })
            that.showProfileList()
            util.showSuccess('数据请求完成')
        },
        fail(error) {
            util.showModel('请求失败', error);
            console.log('request fail', error);
        }
    }
    wx.request(options);
};

function loadProfilefromStorage(that) {
    var lambda_key = getApp().globalData.lambda_key
    wx.getStorage({
        key: lambda_key,
        success: function (res) {
            var data = res.data
            if (data == undefined) {
                return
            }
            var list = []
            Object.keys(data).forEach(function (key, i, a) {
                if(key =='watchlist') {return}
                var profile = data[key]
                if (typeof (profile.phases) === typeof ("str")) {
                    profile.phases = JSON.parse(profile.phases)
                }
                profile.numOfUpdates = profile.phases.length - 1
                DisplayMetrics(profile, 'inception')
                Colorify(profile, 'inception')
                list.push(profile);
            })
            that.setData({ local_list: list })
            console.log('local', that.data.local_list)
            that.showProfileList()
            that.data.local_list.forEach(function(profile){
                // quoteChangePrecentageForProfile(profile, that);
                quoteProfileDailyChangeFromIEX(profile, that)
            })
        },
        fail:function(err){
            console.log(err)
            that.setData({ local_list: [] })
            console.log('local', that.data.local_list)
        }
    });
};


function DisplayMetrics(profile, timeKey, marketState = '') {
    if (!profile.short_desp) {
        profile.short_desp = profile.desp.slice(0, 35) + '...'
        // console.log('short ', profile.short_desp);
    }
    if (!profile.ratiosDisplay) {
        profile.ratiosDisplay = {}
        profile.ratiosDisplay.latestChgPct = '--%'
        profile.ratiosDisplay.volatility = '--'
        profile.ratiosDisplay.avgDlyReturn = '--'
        profile.ratiosDisplay.totalReturn = '--'
    }
    // profile.size = profile.curr_holds.length

    if (profile.latestChgPct) {
        let mark = profile.latestChgPct > 0 ? '+' : ''
        profile.ratiosDisplay.latestChgPct = mark + profile.latestChgPct.toFixed(2) + '%';
    }
    else if (marketState == 'PRE') {
        profile.ratiosDisplay.latestChgPct = 'PRE'
    }

    if (typeof profile.ratiosTable === 'string') {
        profile.ratiosTable = JSON.parse(profile.ratiosTable)
    }
    if (profile.ratiosTable && profile.ratiosTable[timeKey]) {
        let mark = profile.ratiosTable[timeKey].totalReturn > 0 ? '+' : ''
        if (profile.ratiosTable[timeKey].totalReturn)
            profile.ratiosDisplay.totalReturn = mark + profile.ratiosTable[timeKey].totalReturn.toFixed(2) + '%';
        // profile.ratiosDisplay.volatility = profile.ratiosTable[timeKey].volatility.toFixed(2) ;
    }

    if (profile.ratiosTable && profile.ratiosTable[timeKey] && profile.ratiosTable[timeKey].avgDlyReturn) {
        let mark = profile.ratiosTable[timeKey].avgDlyReturn > 0 ? '+' : ''
        if (profile.ratiosTable[timeKey].avgDlyReturn)
            profile.ratiosDisplay.avgDlyReturn = mark + profile.ratiosTable[timeKey].avgDlyReturn.toFixed(2) +'%';
    }
}

function Colorify(profile, timeKey) {
    var benchmark = getApp().globalData.benchmark
    var color_style = getApp().globalData.color_style

    // set default color
    profile.return_bg = color_style.default
    profile.ltsChgPct_bg = color_style.default
    profile.volatility_bg = color_style.default
    profile.dailyReturn_bg = color_style.default
    profile.size_bg = color_style.default
    // set color for latest change in precentage.
    var ltsChgPct = profile.latestChgPct;
    // console.log("coloriy ", ltsChgPct)
    if (ltsChgPct) {
        if (ltsChgPct > 0) {
            profile.ltsChgPct_bg = color_style.up
        }
        else if (ltsChgPct < 0) {
            profile.ltsChgPct_bg = color_style.down
        }
        else if (latestChgPct == 'PRE'){
            profile.ltsChgPct_bg = 'black'
        }
        else {
            profile.ltsChgPct_bg = color_style.off
        }
    }

    // set color for cumulative return and volatility, and avg daily return
    // for given time period.
    if (profile.ratiosTable && profile.ratiosTable[timeKey]) {
        profile.return_bg = profile.ratiosTable[timeKey].totalReturn > benchmark.target_return ? color_style.up : profile.ratiosTable[timeKey].totalReturn> benchmark.base_return ? color_style.fine : color_style.down
        profile.volatility_bg = profile.ratiosTable[timeKey].volatility < benchmark.target_volatility ? color_style.up : profile.ratiosTable[timeKey].volatility < benchmark.base_volatility ? color_style.fine : color_style.down
        var avgDlyReturn = profile.ratiosTable[timeKey].avgDlyReturn
        if (avgDlyReturn) {
            profile.dailyReturn_bg = avgDlyReturn > 0.1 ? color_style.up : avgDlyReturn > 0 ? color_style.fine: color_style.down;
        }
    }
}
function DeleteCloudProfile(profile, that) {
    var options = {
        url: config.service.db_handler,
        data: { operation: 'DEL', profile : profile },
        success(result) {
            console.log("cloud ", result.data.data)
            util.showSuccess('数据请求完成')
        },
        fail(error) {
            util.showModel('请求失败', error);
            console.log('request fail', error);
        }
    }
    wx.request(options);
}
function DeleteLocalProfile(profile, that){
    var lambda_key = getApp().globalData.lambda_key
    wx.getStorage({
        key: lambda_key,
        success: function (res) {
            if(res.data){
                res.data[profile.id] = undefined
            }
            wx.setStorage({
                key: lambda_key,
                data: res.data,
                success: function (res) {
                    loadProfilefromStorage(that)
                    util.showSuccess("Removed ", profile.id)
                }
            })
        },
        fail: function (res) {
            console.log(lambda_key, ' not found')
        }
    });
}
module.exports = {
    marketIndex: marketIndex,
    quoteMarketIndex: quoteMarketIndex,
    loadProfileFromServer: loadProfileFromServer,
    loadProfileFromStorage: loadProfilefromStorage,
    DeleteCloudProfile: DeleteCloudProfile,
    DeleteLocalProfile: DeleteLocalProfile
};