Page({
    data: {},
    gotoPage: function(e) {
        var page = e.currentTarget.dataset.page;
        wx.navigateTo({
            url: '../charts/' + page + '/' + page
        });
        wx.navigateTo({
          url: '../stock/' + page
        });
    },
    onLoad: function() {

    }
})