#! /usr/bin/env node

const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')
const minimist = require('minimist')
const notifier = require('node-notifier')
const SysTray = require('forked-systray').default
let tray = {}

function start (customConfig) {
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
    throw new Error('k256 curves are no longer supported,' +
      'please delete' + path.join(config.path, 'secret'))
  }

  const manifestFile = path.join(config.path, 'manifest.json')

  const createSbot = require('scuttlebot')
    .use(require('scuttlebot/plugins/master'))
    .use(require('scuttlebot/plugins/gossip'))
    .use(require('scuttlebot/plugins/replicate'))
    .use(require('scuttlebot/plugins/invite'))
    .use(require('scuttlebot/plugins/local'))
    .use(require('scuttlebot/plugins/logging'))
    .use(require('ssb-about'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-blobs'))
    .use(require('ssb-chess-db'))
    .use(require('ssb-ebt'))
    .use(require('ssb-friends'))
    .use(require('ssb-links')) // needed by patchfoo
    .use(require('ssb-names'))
    .use(require('ssb-meme'))
    .use(require('ssb-ooo'))
    .use(require('ssb-private'))
    .use(require('ssb-query'))
    .use(require('ssb-search'))
    .use(require('ssb-talequery')) // only tale:net
    .use(require('ssb-unread'))
    .use(require('ssb-ws'))

  // load user plugins (from $HOME/.ssb/node_modules using $HOME/.ssb/config plugins {name:true})
  require('scuttlebot/plugins/plugins').loadUserPlugins(createSbot, config)

  // Custom plugins from json
  let appManifestFile = path.resolve('scuttleshell.json')
  if (fs.existsSync(appManifestFile)) {
    let manifest = JSON.parse(fs.readFileSync(appManifestFile))
    if (manifest.hasOwnProperty('plugins') && Array.isArray(manifest.plugins)) {
      console.log('loading custom plugins: ', manifest.plugins.join(', '))
      manifest.plugins.forEach(plugin => createSbot.use(require(plugin)))
    }
  }

  if (Array.isArray(customPluginPaths)) {
    console.log('loading custom plugins: ', customPluginPaths.join(', '))
    customPluginPaths.forEach(plugin => createSbot.use(require(plugin)))
  }

  // start server

  config.keys = keys
  console.log('config:', config)
  const server = createSbot(config)

  // write RPC manifest to ~/.ssb/manifest.json
  fs.writeFileSync(manifestFile, JSON.stringify(server.getManifest(), null, 2))

  const icon = fs.readFileSync(path.join(__dirname, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`))
  tray = new SysTray({
    menu: {
      icon: icon.toString('base64'),
      title: 'Scuttle-Shell',
      tooltip: 'Secure Scuttlebutt',
      items: [
        {
          title: 'Quit',
          tooltip: 'Stop sbot and quit tray application',
          checked: false,
          enabled: true
        }
      ]
    },
    debug: false,
    copyDir: true
  })

  tray.onClick(action => {
    console.log('got action:', action)
    switch (action.seq_id) {
      case 0:
        console.log('### EXITING IN TWO SECONDS ###')

        notifier.notify({
          title: 'Secure Scuttlebutt',
          message: `Secure Scuttlebutt will exit in two seconds...`,
          icon: path.join(__dirname, 'icon.png'),
          wait: true,
          id: 0
        })

        tray.kill()
    }
  })

  tray.onExit((code, signal) => {
    console.log('got exit:', code)
    setTimeout(() =>
      process.exit(0), 2000)
  })
}

function stop () {
  tray.kill()
}

const getConfig = () => {
  try {
    let secret = fs.readFileSync(pathToSecret, 'utf8')
    let keys = JSON.parse(secret.replace(/#[^\n]*/g, ''))
    let manifest = JSON.parse(fs.readFileSync(path.join(config.path, 'manifest.json')))
    let remote = 'ws://localhost:8989~shs:' + keys.id.substring(1, keys.id.indexOf('.'))
    return { type: 'config', keys: keys, manifest: manifest, remote: remote, secret: secret }
  } catch (n) {
    return { type: 'error', msg: n.message }
  }
}

module.exports = { start, stop, getConfig }

if (require.main === module) {
  var errorLevel = start()
  console.log('exited with:', errorLevel)
}
