
var path = require('path')
var regedit = require('regedit')
var fs = require("fs")
var appPath = path.resolve(".\\app.bat")
var appManifestTemplateFile = path.resolve(".\\scuttleshell.template.json")
var appManifestFile = path.resolve(".\\scuttleshell.json")


function setup(cb) {

  if (process.platform !== "win32") {
    console.log("This script works only on windows, try npm run setup")
    cb(1)
  }

  if (!fs.existsSync(appPath)) {
    console.log("[ERROR] Application not found at: ", appPath)
    cb(1)
  }

  if (!fs.existsSync(appManifestTemplateFile)) {
    console.log("[ERROR] App manifest not found at: ", appManifestTemplateFile)
    cb(1)
  }

  let manifestTemplate = JSON.parse(fs.readFileSync(appManifestTemplateFile))

  manifestTemplate.path = appPath
  fs.writeFileSync(appManifestFile, JSON.stringify(manifestTemplate))


  // This now involves writing to the registry, I am a bit scared of that...

  var valuesToPut = {
    'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell': {
      'scuttleshell': {
        value: appManifestFile,
        type: 'REG_DEFAULT'
      }
    }
  }

  regedit.createKey('HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell', function (a, b) {
    regedit.putValue(valuesToPut, function (err) {
      if (err) {
        console.log("[ERROR] Problem writing to registry.", err)
        cb(1)
      } else {
        console.log("[OK] Wrote manifest path to registry.\n[INFO] Try: npm run check-win")
        cb(0)
      }
    })
  })
}

module.exports = setup

if (require.main === module) {
  setup((errorLevel) => {
    process.exit(errorLevel)
  })
}

