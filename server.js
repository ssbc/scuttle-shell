#! /usr/bin/env node

const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')
const minimist = require('minimist')
const notifier = require('node-notifier')
const SysTray = require('systray').default
let tray = {}

function start(appname) {

  let argv = process.argv.slice(2)
  let i = argv.indexOf('--')
  let conf = argv.slice(i + 1)
  argv = ~i ? argv.slice(0, i) : argv
  let ssb_appname = appname ? appname : process.env.ssb_appname

  const config = require('ssb-config/inject')(ssb_appname, minimist(conf))

  const keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
  if (keys.curve === 'k256') {
    throw new Error('k256 curves are no longer supported,' +
      'please delete' + path.join(config.path, 'secret'))
  }

  const manifestFile = path.join(config.path, 'manifest.json')

  const createSbot = require('scuttlebot')
    // .use(require('scuttlebot/plugins/plugins'))
    .use(require('scuttlebot/plugins/master'))
    .use(require('scuttlebot/plugins/gossip'))
    .use(require('scuttlebot/plugins/replicate'))
    .use(require('scuttlebot/plugins/invite'))
    .use(require('scuttlebot/plugins/local'))
    .use(require('ssb-about'))
    .use(require('ssb-backlinks'))
    .use(require('ssb-blobs'))
    .use(require('ssb-ebt'))
    .use(require('ssb-chess-db'))
    .use(require('ssb-friends'))
    .use(require('ssb-meme'))
    .use(require('ssb-names'))
    .use(require('ssb-ooo'))
    .use(require('ssb-private'))
    .use(require('ssb-search'))
    .use(require('ssb-query'))
    .use(require('ssb-ws'))

  // start server

  config.keys = keys
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
    copyDir: true,
  })

  tray.onClick(action => {
    switch (action.seq_id) {
      case 0:
        console.log("### EXITING IN TWO SECONDS ###")

        notifier.notify({
          title: 'Secure Scuttlebutt',
          message: `Secure Scuttlebutt will exit in two seconds...`,
          icon: path.join(__dirname, "icon.png"),
          wait: true,
          id: 0,
        })

        tray.kill()
    }
  })

  tray.onExit((code, signal) => {
    setTimeout(() =>
      process.exit(0), 2000)
  })

}

function stop() {
  tray.kill()
}

module.exports = { start, stop }

if (require.main === module) {
  var errorLevel = start()
}