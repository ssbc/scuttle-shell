
var path = require('path')
var regedit = require('regedit')
var fs = require("fs")
var appPath = path.resolve(".\\app.bat")
var appManifestTemplateFile = path.resolve(".\\scuttleshell.template.json")
var appManifestFile = path.resolve(".\\scuttleshell.json")


function setup() {

  if (process.platform !== "win32") {
    console.log("This script works only on windows, try npm run setup")
    return 1
  }

  if (!fs.existsSync(appPath)) {
    console.log("[ERROR] Application not found at: ", appPath)
    return 1
  }

  if (!fs.existsSync(appManifestTemplateFile)) {
    console.log("[ERROR] App manifest not found at: ", appManifestTemplateFile)
    return 1
  }

  let manifest = JSON.parse(fs.readFileSync(appManifestTemplateFile))

  let applicationLauncherPath = manifest.path

  if (!fs.existsSync(applicationLauncherPath)) {
    console.log("[ERROR] App not found at declared location", applicationLauncherPath)
    console.log("FIXING...")
    manifest.path = appPath
    fs.writeFileSync(appManifestFile, JSON.stringify(manifest))
  } else {
    console.log("[OK] Application found at the correct location", applicationLauncherPath)
  }

  // This now involves writing to the registry, I am a bit scared of that...

  var valuesToPut = {
    'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell': {
      'scuttleshell': {
        value: appManifestTemplateFile,
        type: 'REG_DEFAULT'
      }
    }
  }

  regedit.createKey('HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell', function (a, b) {
    regedit.putValue(valuesToPut, function (err) {
      if (err) {
        console.log("[ERROR] Problem writing to registry.", err)
        return 1
      } else {
        console.log("[OK] Wrote manifest path to registry.\n[INFO] Try: npm run check-win")
        return 0
      }
    })
  })
  return 0
}

module.exports = setup

if (require.main === module) {
  var errorLevel = setup()
  process.exit(errorLevel)
}

