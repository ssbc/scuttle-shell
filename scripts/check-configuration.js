const { join } = require('path')
const fs = require('fs')

const APPPaths = require('./platforms')

function checkWin (cb) {
  var regedit = require('regedit')
  const key = APPPaths.regKey
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

function check (cb) {
  const manifestLocation = join(APPPaths.manifestFolder, 'scuttleshell.json')

  if (!fs.existsSync(manifestLocation)) {
    return cb(new Error(`App manifest not found at declared location ${manifestLocation}`))
  }

  let manifest = null
  try {
    manifest = JSON.parse(fs.readFileSync(manifestLocation))
  } catch (e) {
    return cb(e)
  }

  if (!fs.existsSync(manifest.path)) {
    return cb(new Error(`Launcher not found at declared location: ${manifest.path}`))
  }

  return cb(null, manifest.path)
}

module.exports = process.platform === 'win32' ? checkWin : check

if (require.main === module) {
  check(function (err, launchPath) {
    if (err) {
      console.error(err)
      console.log('\nTry: npm run setup\n')
      return
    }
    console.log('[OK] Configuration appears correct\n[INFO] App located at:', launchPath)
  })
}
