#! /usr/bin/env node

const fs = require('fs')
const path = require('path')
const notifier = require('node-notifier')
const SysTray = require('forked-systray').default
const minimist = require('minimist')
const buildConfig = require('./config')

// uninitialized
let tray = null
let config = null
let sbotClose = noop

function noop () {}

function start (opts = {}, donecb) {
  donecb = donecb || noop
  // TODO: try { allthethings } catch(e) { donecb(e) }

  config = buildConfig(opts)

  const createSbot = require('ssb-server')
    .use(require('ssb-server/plugins/plugins'))
    .use(require('ssb-server/plugins/onion'))
    .use(require('ssb-server/plugins/unix-socket'))
    .use(require('ssb-server/plugins/no-auth'))
    .use(require('ssb-server/plugins/master'))
    .use(require('ssb-server/plugins/gossip'))
    .use(require('ssb-server/plugins/replicate'))
    .use(require('ssb-server/plugins/invite'))
    .use(require('ssb-server/plugins/local'))
    .use(require('ssb-server/plugins/logging'))
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
    .use(require('ssb-tags'))
    .use(require('ssb-talequery')) // only tale:net - close to obsolete %qJqQbvb8vLh5SUcSIlMeM2u0vt0M1RRaczb5NqH4tB8=.sha256
    .use(require('ssb-threads'))
    .use(require('ssb-unread'))
    .use(require('ssb-ws'))

  // load user plugins (from $HOME/.ssb/node_modules using $HOME/.ssb/config plugins {name:true})
  require('ssb-server/plugins/plugins').loadUserPlugins(createSbot, config)

  // Custom plugins from json
  let appManifestFile = path.resolve('scuttleshell.json')
  if (fs.existsSync(appManifestFile)) {
    let manifest = JSON.parse(fs.readFileSync(appManifestFile))
    if (manifest.hasOwnProperty('plugins') && Array.isArray(manifest.plugins)) {
      console.log('loading custom plugins: ', manifest.plugins.join(', '))
      manifest.plugins.forEach(plugin => createSbot.use(require(plugin)))
    }
  }

  // from opts.plugins
  if (Array.isArray(opts.plugings)) {
    console.log('loading custom plugins: ', opts.plugins.join(', '))
    opts.plugins.forEach(plugin => createSbot.use(require(plugin)))
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
  const manifestFile = path.join(config.path, 'manifest.json')
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

  const sbotVersion = server.version()
  console.log(`started sbot server v${sbotVersion}`)
  tray.emit('action', {
    type: 'update-item',
    seq_id: 1,
    item: {
      title: `sbot version: ${sbotVersion}`,
      checked: false,
      enabled: false
    }
  })

  server.about.socialValue({ key: 'name', dest: config.keys.id }, (err, namev) => {
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
        tooltip: config.keys.id,
        checked: false,
        enabled: false
      }
    })
    donecb(null)
  })
}

function stop () {
  sbotClose()
  tray.kill()
}

const getConfig = () => {
  if (config === null) {
    return { type: 'error', msg: 'uninitialized config - call start() first' }
  }
  try {
    const k = config.keys
    const manifest = JSON.parse(fs.readFileSync(path.join(config.path, 'manifest.json')))
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
