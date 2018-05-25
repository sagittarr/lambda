function SectorPerf(name, nameCN, description, performance) {
    this.name = name;
    this.nameCN = nameCN;
    this.description = description;
    this.performance = performance;
    this.toString = function() {
        return  name + ', '+ nameCN +', '+ description + ', ' + performance + '\n'
    }
}

module.exports = SectorPerf