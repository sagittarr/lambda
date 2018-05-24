function SectorPerf(name, description, performance) {
    this.name = name;
    this.description = description;
    this.performance = performance;
    this.toString = function() {
        return  name + ', ' + description + ', ' + performance + '\n'
    }
}

module.exports = SectorPerf

// Real-Time Performance
//     :
//     Consumer Discretionary
//     :
//     "-0.30%"
// Consumer Staples
//     :
//     "-0.48%"
// Energy
//     :
//     "-1.05%"
// Financials
//     :
//     "-0.92%"
// Health Care
//     :
//     "-0.39%"
// Industrials
//     :
//     "0.27%"
// Information Technology
//     :
//     "-0.47%"
// Materials
//     :
//     "-0.48%"
// Real Estate
//     :
//     "-0.52%"
// Telecommunication Services
//     :
//     "-0.04%"
// Utilities
//     :
//     "-0.14%"