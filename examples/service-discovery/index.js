module.exports = {
  name: 'server-discovery',
  version: '1.0.0',
  init: function (sbot) {
    sbot.ws.use(function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.url === '/get-address') {
        res.end(sbot.ws.getAddress())
      } else {
        next()
      }
    })
  }
}
