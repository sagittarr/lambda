const color_style = getApp().globalData.color_style
function StockItem(ticker, companyName, chgPct, price){
    this.ticker = ticker
    this.companyName = companyName
    this.chgPct = chgPct
    this.price = price.toFixed(2)

    let pctValue = parseFloat(chgPct)
    let mark = pctValue > 0 ? '+' : ''
    this.chgPctDisplay = mark + (chgPct*100).toFixed(2) + '%'
    this.bgColor = pctValue > 0 ? color_style.up : pctValue < 0 ? color_style.down : color_style.off
    
}

module.exports = StockItem