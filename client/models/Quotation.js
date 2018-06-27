
function Quotation(price, zd, zdf, open, high, low, hsl, syl, sjl, volume, realVolume, jl, zz, cje, lb, ltsz, regularMarketTime, preMarketTime, color, ticker, marketState) {
    	this.price = price,
        this.zd = zd,
        this.zdf = zdf,
        this.open = open,
        this.high = high,
        this.low = low,
        this.hsl = hsl,
        this.syl = syl,
        this.sjl = sjl,
        this.volume = volume,
        this.realVolume = realVolume,
        this.jl = jl,
        this.zz = zz,
        this.cje = cje,
        this.lb = lb,
        this.ltsz = ltsz,
        this.regularMarketTime = regularMarketTime,
        this.preMarketTime = preMarketTime,
        this.color = color,
        this.ticker = ticker,
        this.marketState = marketState

}

module.exports = Quotation;
