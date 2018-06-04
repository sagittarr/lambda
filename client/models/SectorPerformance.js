const color_style = getApp().globalData.color_style
function SectorPerf(name, nameCN, description, performance) {
    this.name = name;
    this.nameCN = nameCN;
    this.description = description;
    this.performance = performance;
    this.bgColor = color_style.default
    this.toString = function() {
        return  name + ', '+ nameCN +', '+ description + ', ' + performance + '\n'
    }
}
SectorPerf.prototype.colorify = function(){
    let realNumber = parseFloat(this.performance)
    if(realNumber> 0){
        this.bgColor = color_style.up
    }
    else if(realNumber < 0){
        this.bgColor = color_style.down
    }
}
module.exports = SectorPerf