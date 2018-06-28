

var homedir = require('os').homedir()
var macPath = homedir + "/Library/Application Support/Mozilla/NativeMessagingHosts/scuttleshell.json"
var linuxPath = homedir + "/.mozilla/native-messaging-hosts/scuttleshell.json"
var manifestPath = process.platform === "darwin" ? macPath : linuxPath
var fs = require("fs")

function check() {

  if (process.platform === "win32") {
    console.log("This script does not work on windows")
    process.exit(1)
  }

  if (!fs.existsSync(manifestPath)) {
    console.log("[ERROR] App manifest not found at declared location", manifestPath)
    console.log("\nTry: npm run setup\n")
    process.exit(1)
  }

  console.log("[INFO] App manifest path location:", manifestPath)

  let manifest = JSON.parse(fs.readFileSync(manifestPath))

  let applicationLauncherPath = manifest.path

  if (!fs.existsSync(applicationLauncherPath)) {
    console.log("[ERROR] Launcher not found at declared location", applicationLauncherPath)
    console.log("\nTry: npm run setup\n")
    process.exit(1)
  }

  console.log("[OK] Configuration appears correct\n[INFO] App located at:", applicationLauncherPath)

  process.exit(0)

}


module.exports = check

if (require.main === module) {
  var errorLevel = check()
}