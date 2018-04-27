const YahooFinanceAPI = require('yahoo-finance-data');
const api = new YahooFinanceAPI({
  key: 'dj0yJmk9N29ibVZ0ZkRncGFnJmQ9WVdrOWIxUm5Wemt4TldVbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD03YQ--',
  secret: 'aca598741b22f2b8355dec4d3bf891f97efe3bca'
});

module.exports = async (ctx, next) => {
  function call(v) {
    console.log(v)
    ctx.state.data= v;
  }
  console.log(ctx.query.input)
  await api
    .tickerSearch(ctx.query.input, 'US', 'en-US')
    .then(data => call(data))
    .catch(err => console.log(err));
}