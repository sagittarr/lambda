const linspace = require('linspace')
var _u = require('underscore');

function yearAgo2Today(){
  var today = new Date()
  var dd = today.getDate();
  if (dd < 10) {
    dd = '0' + dd
  }
  var mm = today.getMonth() + 1; //January is 0!
  if (mm < 10) {
    mm = '0' + mm
  }
  var yyyy = today.getFullYear();
  var from = (yyyy - 1) + '' + mm + '' + dd;
  var to = yyyy + '' + mm + '' + dd;
  return {from: from, to: to}
}
function getToday(){
  var today = new Date()
  var dd = today.getDate();
  if (dd < 10) {
    dd = '0' + dd
  }
  var mm = today.getMonth() + 1; //January is 0!
  if (mm < 10) {
    mm = '0' + mm
  }
  var yyyy = today.getFullYear();
  return  yyyy + '' + mm + '' + dd;
}
function date2Str(date){
  var dd = date.getDate();
  if (dd < 10) {
    dd = '0' + dd
  }
  var mm = date.getMonth() + 1; //January is 0!
  if (mm < 10) {
    mm = '0' + mm
  }
  var yyyy = date.getFullYear();
  return yyyy + '' + mm + '' + dd;
}

function dateIndexPicker(dateIndex, arg){
  var MAX = 24
  var arr = []
  if(arg == '1y'){
    if(dateIndex.length > 253){
      arr = linspace(0, 252, MAX)
    }
    else{
      arr = linspace(0, dateIndex.length - 1, MAX)
    }
  }
  else if(arg == '3m'){
    arr = linspace(dateIndex.length - 1 - 62, dateIndex.length - 1, 21)
  }
  else if(arg == '10d'){
    return [...Array(10)].map((x, i) => {return dateIndex.length - 1 -i}).reverse();

  }
  else if (arg == '30d') {
    return [...Array(30)].map((x, i) => { return dateIndex.length - 1 - i }).reverse();
  }
  else{//inception case
    var output = []
    var cut = arg
    dateIndex.map((d, i) => { if (d >= cut) output.push(i) })
    if(output.length > MAX){
      arr = linspace(output[0], _u.last(output), MAX)
    }
    else{
      arr = output;
    }
  }
  return arr.map(num => {
    return Math.round(num);
  });
}

module.exports = {
  date2Str: date2Str,
  yearAgo2Today: yearAgo2Today,
  dateIndexPicker: dateIndexPicker,
  getToday: getToday
};