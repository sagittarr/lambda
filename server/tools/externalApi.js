const yahooFinance = require('yahoo-finance');
const _ = require('underscore');
const dbApi = require('../tools/db_api.js')
const axios = require('axios');

function call(request){
    return new Promise(function(resolve, reject){
            var apiUrl = decodeURIComponent(request.apiUrl)
            console.log(apiUrl)
            axios.get(apiUrl)
                .then(function(response){
                    console.log(response.data)
                    if(request.convertKLineChart === true){
                        resolve(dbApi.convertHistoricalData(response.data, request.convertFreq))
                    }
                    else{
                        resolve(response.data)
                    }
                });
        }
    )
}

module.exports ={call:call}