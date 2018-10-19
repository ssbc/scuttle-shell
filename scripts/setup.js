var homedir = require('os').homedir()
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')

// TODO: hmm on windows the files are not in ../ ?
const supportedPlatforms = {
  'win32': {
    loader: path.resolve('.\\app.bat'),
    manifestTemplate: path.resolve('.\\scuttleshell.template.json'),
    manifestFolder: path.join(homedir, 'AppData', 'Roaming', 'scuttle-shell')
  },
  'linux': {
    loader: path.join(__dirname, '../host-app.js'),
    manifestTemplate: path.join(__dirname, '../scuttleshell.template.json'),
    manifestFolder: path.join(homedir, '.mozilla', 'native-messaging-hosts')
  },
  'darwin': {
    loader: path.join(__dirname, '../host-app.js'),
    manifestTemplate: path.join(__dirname, '../scuttleshell.template.json'),
    manifestFolder: path.join(homedir, '/Library/Application Support/Mozilla/NativeMessagingHosts')
  }
}

const APPPaths = supportedPlatforms[process.platform]
if (!APPPaths) {
  throw new Error('unsupported platform:' + process.platform)
}

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

    manifestLocation = path.join(APPPaths.manifestFolder, 'scuttle-shell.json')
    fs.writeFileSync(manifestLocation, JSON.stringify(manifest, null, 2))
  } catch (e) {
    return cb(e)
  }

  // This now involves writing to the registry, I am a bit scared of that...
  if (process.platform !== 'win32') {
    console.log(`[OK] Wrote manifest path to ${APPPaths.manifestFolder}.\n[INFO] Try: npm run check`)
    return cb(null)
  }

  var valuesToPut = {
    'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell': {
      'scuttleshell': {
        value: manifestLocation,
        type: 'REG_DEFAULT'
      }
    }
  }

  var RE = require('regedit')

  RE.createKey('HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell', function (err) {
    if (err) return cb(err)
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
