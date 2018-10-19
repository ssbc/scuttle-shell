var fs = require('fs')
var path = require('path')
var homedir = require('os').homedir()
var manifestPath = process.platform === 'darwin'
  ? path.join(homedir, '/Library/Application Support/Mozilla/NativeMessagingHosts/scuttleshell.json')
  : path.join(homedir, '/.mozilla/native-messaging-hosts/scuttleshell.json')

function check () {
  if (process.platform === 'win32') {
    console.log('This script does not work on windows')
    process.exit(1)
  }

  if (!fs.existsSync(manifestPath)) {
    console.log('[ERROR] App manifest not found at declared location', manifestPath)
    console.log('\nTry: npm run setup\n')
    process.exit(1)
  }

  console.log('[INFO] App manifest path location:', manifestPath)

  var manifest = require(manifestPath)

  if (!fs.existsSync(manifest.path)) {
    console.log('[ERROR] Launcher not found at declared location', manifest.path)
    console.log('\nTry: npm run setup\n')
    process.exit(1)
  }

  console.log('[OK] Configuration appears correct\n[INFO] App located at:', manifest.path)

  process.exit(0)
}

module.exports = check

if (require.main === module) {
  check()
}
