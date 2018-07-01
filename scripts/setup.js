var homedir = require('os').homedir()
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')

var appPath = path.join(__dirname, '../host-app.js')

function setup () {
  if (process.platform === 'win32') {
    console.log("This script doesn't work on windows, try npm run setup-win")
    return 1
  }

  if (!fs.existsSync(appPath)) {
    console.log('[ERROR] Application not found at: ', appPath)
    return 1
  }

  var manifest = buildManifest()
  setupMozillaManifest(manifest)

  return 0
}

function buildManifest () {
  const template = require(path.join(__dirname, '../scuttleshell.template.json'))
  return Object.assign(template, { path: appPath })
}

function setupMozillaManifest (manifest) {
  var manifestFolderPath = process.platform === 'darwin'
    ? path.join(homedir, '/Library/Application Support/Mozilla/NativeMessagingHosts')
    : path.join(homedir, '/.mozilla/native-messaging-hosts')

  mkdirp.sync(manifestFolderPath)

  fs.writeFileSync(
    path.join(manifestFolderPath, 'scuttleshell.json'),
    JSON.stringify(manifest, null, 2)
  )

  console.log('[OK] Wrote manifest path to registry.\n[INFO] Try: npm run check')
}

module.exports = setup

if (require.main === module) {
  var errorLevel = setup()
  process.exit(errorLevel)
}
