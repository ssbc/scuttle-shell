const ssbKeys = require('ssb-keys')
const Config = require('ssb-config/inject')
const path = require('path')
const merge = require('lodash.merge')
// const minimist = require('minimist')

module.exports = function buildConfig ({ appname }) {
  // mix: note ssb-config uses RC, which loads config opts from process.argv
  // let argv = process.argv.slice(2)
  // let i = argv.indexOf('--')
  // let conf = argv.slice(i + 1)
  // argv = ~i ? argv.slice(0, i) : argv // mix: is this used ?
  //

  var config = Config(appname || process.env.ssb_appname)
  config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
  config = merge(
    config,
    Connections(config),
    Remote(config)
  )

  return config
}

function Connections (config) {
  const connections = (process.platform === 'win32')
    ? undefined // this seems wrong?
    : { incoming: { unix: [{ 'scope': 'local', 'transform': 'noauth', server: true }] } }

  return connections ? { connections } : {}
}

function Remote (config) {
  const pubkey = config.keys.id.slice(1).replace(`.${config.keys.curve}`, '')
  const remote = (process.platform === 'win32')
    ? undefined // `net:127.0.0.1:${config.port}~shs:${pubkey}` // currently broken
    : `unix:${path.join(config.path, 'socket')}:~noauth:${pubkey}`

  return remote ? { remote } : {}
}
