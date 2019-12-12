#! /usr/bin/env node

const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')
const minimist = require('minimist')
const notifier = require('node-notifier')
const SysTray = require('forked-systray').default

// uninitialized
let tray = null
let ssbConfig = null
let sbotClose = noop

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
    .use(require('ssb-unix-socket'))
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


  // load user plugins (from $HOME/.ssb/node_modules using $HOME/.ssb/config plugins {name:true})
  try {
    require('ssb-plugins').loadUserPlugins(createSbot, config)
  } catch (n) {
    console.log("error loading user plugins")
  }

  // from customConfig.plugins
  if (Array.isArray(customPluginPaths)) {
    console.log('loading custom plugins: ', customPluginPaths.join(', '))
    customPluginPaths.forEach(plugin => createSbot.use(require(plugin)))
  }

  // --extra-plugin
  const args = minimist(process.argv.slice(1))
  const extraPlugin = args['extra-plugin']
  if (typeof extraPlugin === 'string') { // one
    createSbot.use(require(extraPlugin))
  } else if (extraPlugin instanceof Array) { // multiple
    extraPlugin.forEach((plugPath) => createSbot.use(require(plugPath)))
  }

  // start server
  const server = createSbot(config)
  sbotClose = server.close

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
          title: 'starting...',
          checked: false,
          enabled: true
        },
        {
          title: 'version: unset',
          checked: false,
          enabled: false
        },
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

  tray.on('click', (action) => {
    console.log('scuttle-shell got action:', action)
    switch (action.item.title) {
      case 'Quit':
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

  tray.on('exit', (code, signal) => {
    console.log('scuttle-shell got exit:', code)
    setTimeout(() =>
      process.exit(0), 2000)
  })

  // this is ssb-db version now?
  const ssbVersion = server.version()
  console.log(`started sbot server v${ssbVersion}`)

  // let the trail start because it wasn't updating infos
  setTimeout(() => {
    tray.emit('action', {
      type: 'update-item',
      seq_id: 1,
      item: {
        title: `ssb version: ${ssbVersion}`,
        checked: false,
        enabled: false
      }
    })

    server.about.socialValue({ key: 'name', dest: ssbConfig.keys.id }, (err, namev) => {
      if (err) {
        console.warn('got err from about plugin:', err)
        donecb(err)
        return
      }
      tray.emit('action', {
        type: 'update-item',
        seq_id: 0,
        item: {
          title: `@${namev}`,
          tooltip: ssbConfig.keys.id,
          checked: false,
          enabled: false
        }
      })
      donecb(null)
    })
  }, 500)
}

function stop(done) {
  done = done || noop
  sbotClose()
  tray.kill()
  done()
}

const getConfig = () => {
  if (ssbConfig === null) {
    return { type: 'error', msg: 'uninitialized config - call start() first' }
  }
  try {
    const k = ssbConfig.keys
    const manifest = JSON.parse(fs.readFileSync(path.join(ssbConfig.path, 'manifest.json')))
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

module.exports = { start, stop, getConfig }

if (require.main === module) {
  start({}, (err) => {
    if (err) console.error(err)
  })
}
