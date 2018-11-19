var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')

const APPPaths = require('./platforms')

function setup (cb) {
  if (!fs.existsSync(APPPaths.loader)) {
    return cb(new Error('Application not found at: ' + APPPaths.loader))
  }

  if (!fs.existsSync(APPPaths.manifestTemplate)) {
    return cb(new Error('App manifest not found at: ' + APPPaths.manifestTemplate))
  }

  let manifestLocation
  try {
    const template = JSON.parse(fs.readFileSync(APPPaths.manifestTemplate))

    // TODO: copy loader to manifestFolder?
    // if the shell was 'installed' through a bundled AppImage this path would point into the image... :S
    const manifest = Object.assign(template, { path: APPPaths.loader })

    mkdirp.sync(APPPaths.manifestFolder)

    manifestLocation = path.join(APPPaths.manifestFolder, 'scuttleshell.json')
    fs.writeFileSync(manifestLocation, JSON.stringify(manifest, null, 2))
  } catch (e) {
    return cb(e)
  }

  console.log(`[OK] Wrote manifest path to ${manifestLocation}.`)

  // This now involves writing to the registry, I am a bit scared of that...
  if (process.platform !== 'win32') {
    return cb(null)
  }

  let valuesToPut = {}
  valuesToPut[APPPaths.regKey] = {
    'scuttleshell': {
      value: manifestLocation,
      type: 'REG_DEFAULT'
    }
  }

  var RE = require('regedit')

  RE.createKey(APPPaths.regKey, function (err, data) {
    // great.. node-regedit doesn't seem to adhere to cb(err, data)...?
    // https://github.com/ironSource/node-regedit/issues/10
    // https://github.com/ironSource/node-regedit/issues/44
    // https://github.com/ironSource/node-regedit/issues/4
    // ps: it also has problems when embedded in an electron asar since it generates scripts on the fly
    console.log('[DEBUG] regedit.createKey result arguments:', arguments.length)
    console.dir(arguments)
    if (arguments.length === 2 && err !== null) return cb(err)
    RE.putValue(valuesToPut, function (err) {
      if (err) {
        console.error(err)
        return cb(new Error('[ERROR] Problem writing to registry. ' + err.message))
      }
      console.log('[OK] Wrote manifest path to registry.\n[INFO] Try: npm run check-win')
      cb(null)
    })
  })
}

module.exports = setup

if (require.main === module) {
  setup((err) => {
    if (err) {
      console.error(err)
      process.exitCode = 1
    }
  })
}
