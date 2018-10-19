var regedit = require('regedit')
var key = 'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell'
var fs = require('fs')

function check (cb) {
  if (process.platform !== 'win32') {
    return cb(new Error('This script works only on windows'))
  }

  regedit.list(key, (err, results) => {
    if (err) {
      return cb(new Error(`Registry key: ${key} doesn't exist. `))
    }

    if (!results[key] || !results[key].values) {
      console.warn('registry list results:', results)
      return cb(new Error(`Registry key does not contain expected values field`))
    }

    let manifestPath = results[key].values[''].value

    if (!fs.existsSync(manifestPath)) {
      return cb(new Error('App manifest not found at declared location:' + manifestPath))
    }

    let applicationLauncherPath
    try {
      console.log('[INFO] App manifest path location:', manifestPath)
      let manifest = JSON.parse(fs.readFileSync(manifestPath))
      applicationLauncherPath = manifest.path
    } catch (e) {
      return cb(e)
    }

    if (!fs.existsSync(applicationLauncherPath)) {
      return cb(new Error('Launcher not found at declared location:' + applicationLauncherPath))
    }

    cb(null, applicationLauncherPath)
  })
}

module.exports = check

if (require.main === module) {
  check(function (err, launchPath) {
    if (err) {
      console.error(err)
      console.log('\nTry: npm run setup-win\n')
      return
    }
    console.log('[OK] Configuration appears correct\n[INFO] App located at:', launchPath)
  })
}
