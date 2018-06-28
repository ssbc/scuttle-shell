

var homedir = require('os').homedir()
var path = require('path')
var macPath = homedir + "/Library/Application Support/Mozilla/NativeMessagingHosts/scuttleshell.json"
var linuxPath = homedir + "/.mozilla/native-messaging-hosts/scuttleshell.json"
var manifestPath = process.platform === "darwin" ? macPath : linuxPath
var manifestFolderPath = manifestPath.replace("scuttleshell.json", "")
var appPath = path.resolve("../host-app.js")
var localManifestFile = path.resolve("../scuttleshell.json")
var fs = require("fs")
var mkdirp = require("mkdirp")

function setup() {

  if (process.platform == "win32") {
    console.log("This script doesn't work on windows, try npm run setup-win")
    return 1
  }

  if (!fs.existsSync(appPath)) {
    console.log("[ERROR] Application not found at: ", appPath)
    return 1
  }

  if (!fs.existsSync(localManifestFile)) {
    console.log("[ERROR] Local copy of app manifest not found at: ", localManifestFile)
    return 1
  }

  let manifest = JSON.parse(fs.readFileSync(localManifestFile))

  let applicationLauncherPath = manifest.path

  if (!fs.existsSync(applicationLauncherPath)) {
    console.log("[ERROR] App not found at declared location", applicationLauncherPath)
    console.log("FIXING...")
    manifest.path = appPath
    fs.writeFileSync(localManifestFile, JSON.stringify(manifest))
  } else {
    console.log("[OK] Application found at the correct location", applicationLauncherPath)
  }

  mkdirp.sync(manifestFolderPath)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))

  console.log("[OK] Wrote manifest path to registry.\n[INFO] Try: npm run check")
  return 0
}

module.exports = setup

if (require.main === module) {
  var errorLevel = setup()
  process.exit(errorLevel)
}
