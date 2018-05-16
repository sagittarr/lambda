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
    if (dateIndex.length<=24){
        return dateIndex.map((v,i)=> i);
    }
    if(arg == '1y'){
        if(dateIndex.length > 253){
            arr = linspace(0, 252, MAX)
        }
        else{
            arr = linspace(0, dateIndex.length - 1, MAX)
        }
    }
    else if(arg == '3m'){
        arr = linspace(Math.max(dateIndex.length - 1 - 62, 0), dateIndex.length - 1, 24)
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
// console.log(dateIndexPicker([20180212, 20180213, 20180214, 20180215, 20180216, 20180220, 20180221, 20180222, 20180223, 20180226, 20180227, 20180228, 20180301, 20180302, 20180305, 20180306, 20180307, 20180308, 20180309, 20180312, 20180313, 20180314, 20180315, 20180316, 20180319, 20180320, 20180321, 20180322, 20180323, 20180326, 20180327, 20180328, 20180329, 20180402, 20180403, 20180404, 20180405, 20180406, 20180409, 20180410, 20180411, 20180412, 20180413, 20180416, 20180417, 20180418, 20180419, 20180420, 20180423, 20180424, 20180425, 20180426, 20180427, 20180430, 20180501, 20180502, 20180503, 20180504, 20180507, 20180508, 20180509], '10d'))
// console.log(dateIndexPicker([20180507, 20180508, 20180509], '3m'))
module.exports = {
  date2Str: date2Str,
  yearAgo2Today: yearAgo2Today,
  dateIndexPicker: dateIndexPicker,
  getToday: getToday
};