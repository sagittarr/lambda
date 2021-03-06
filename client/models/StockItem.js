const color_style = getApp().globalData.color_style
function StockItem(ticker, companyName, chgPct, price, securityType){
    this.ticker = ticker
    this.companyName = companyName.replace(new RegExp('&amp;','g'),'\&')
    this.chgPct = parseFloat(chgPct)
    this.price = parseFloat(price).toFixed(2)
    this.securityType = securityType
    this.companyNameInShort = this.companyName
    // .length>25 ? this.companyName.slice(0,22) + '...': this.companyName
    let pctValue = parseFloat(chgPct)
    let mark = pctValue > 0 ? '+' : ''
    this.chgPctDisplay = mark + (chgPct*100).toFixed(2) + '%'
    this.bgColor = pctValue > 0 ? color_style.up : pctValue < 0 ? color_style.down : color_style.off
    
}

module.exports = StockItem