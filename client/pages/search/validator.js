require('../../utils/date.js')
function parseDateString(str) {
  if(!str || str.length<8){
    return undefined
  }
  var y = str.substr(0, 4),
    m = str.substr(4, 2) - 1,
    d = str.substr(6, 2);
  var D = new Date(y, m, d);
  return (D.getFullYear() == y && D.getMonth() == m && D.getDate() == d) ? D : 'invalid date';
}
class PortfolioCreationFormValidation {
  static validateForm(form) {
  }
  static validateDate(input) {
    // var d1 = Date.parse('2007-05-12');
    return parseDateString(input)
  }
}
module.exports = PortfolioCreationFormValidation