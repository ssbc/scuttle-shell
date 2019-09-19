#! /usr/bin/env node

const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')
const minimist = require('minimist')
const manifest = require('./ssb-manifest.json')

console.log("readfilesync", fs.readFileSync)

// uninitialized
let ssbConfig = null

function noop() { }

function start(customConfig, donecb) {
  donecb = donecb || noop
  // TODO: try { allthethings } catch(e) { donecb(e) }
  customConfig = customConfig || {}
  let appname = customConfig.appname || false
  let customPluginPaths = customConfig.plugins || false
  let argv = process.argv.slice(2)
  let i = argv.indexOf('--')
  let conf = argv.slice(i + 1)
  argv = ~i ? argv.slice(0, i) : argv
  let ssbAppName = appname || process.env.ssb_appname

  const config = require('ssb-config/inject')(ssbAppName, minimist(conf))

  const keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
  if (keys.curve === 'k256') {
    // i think this is _really_ old and could be removed
    throw new Error('k256 curves are no longer supported,' +
      'please delete' + path.join(config.path, 'secret'))
  }
  config.keys = keys
  ssbConfig = config

  const manifestFile = path.join(config.path, 'manifest.json')

  const createSbot = require('ssb-server')
    .use(require('ssb-local'))
    .use(require('ssb-logging'))
    .use(require('ssb-master'))
    .use(require('ssb-no-auth'))
    // who and how to peer
    .use(require('ssb-gossip'))
    .use(require('ssb-replicate'))
    .use(require('ssb-friends'))

    // old invites
    .use(require('ssb-invite'))

    // needed by device device-addrs
    .use(require('ssb-query'))

    // user invites
    .use(require('ssb-identities'))
    .use(require('ssb-device-address'))
    .use(require('ssb-peer-invites'))

    // view index stuff
    .use(require('ssb-about'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-blobs'))
    .use(require('ssb-chess-db'))
    .use(require('ssb-ebt'))
    .use(require('ssb-links')) // needed by patchfoo
    .use(require('ssb-names'))
    .use(require('ssb-meme'))
    .use(require('ssb-ooo'))
    .use(require('ssb-private'))
    .use(require('ssb-search'))
    .use(require('ssb-suggest'))
    .use(require('ssb-tags'))
    .use(require('ssb-talequery')) // only tale:net - close to obsolete %qJqQbvb8vLh5SUcSIlMeM2u0vt0M1RRaczb5NqH4tB8=.sha256
    // .use(require('ssb-threads'))
    .use(require('ssb-unread'))

    // ws
    .use(require('ssb-ws'))

  // start server
  const server = createSbot(config)
  sbotClose = server.close

  // write RPC manifest to ~/.ssb/manifest.json
  fs.writeFileSync(manifestFile, JSON.stringify(server.getManifest(), null, 2))


  const ssbVersion = server.version()
  console.log(`started sbot server v${ssbVersion}`)

  server.about.socialValue({ key: 'name', dest: ssbConfig.keys.id }, (err, namev) => {
    if (err) {
      console.warn('got err from about plugin:', err)
    } else {
      console.log(`you are @${namev}`)
    }
  })
}


const getConfig = () => {
  console.log("manifest", manifest)
  if (ssbConfig === null) {
    return { type: 'error', msg: 'uninitialized config - call start() first' }
  }
  try {
    const k = ssbConfig.keys
    // const manifest = JSON.parse(fs.readFileSync(path.join(ssbConfig.path, 'manifest.json')))
    const remote = 'ws://localhost:8989~shs:' + k.id.substring(1, k.id.indexOf('.'))
    return {
      type: 'config',
      keys: k,
      manifest: manifest,
      remote: remote
    }
  } catch (n) {
    return { type: 'error', msg: n.message }
  }
}


module.exports = { start, fs, getConfig }

if (require.main === module) {
  start({}, (err) => {
    if (err) console.error(err)
  })
}
