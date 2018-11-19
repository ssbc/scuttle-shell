const { resolve, join } = require('path')
const homedir = require('os').homedir()

// TODO: hmm on windows the files are not in ../ ?
const supportedPlatforms = {
  'win32': {
    regKey: 'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\scuttleshell',
    loader: resolve('.\\app.bat'),
    manifestTemplate: resolve('.\\scuttleshell.template.json'),
    manifestFolder: join(homedir, 'AppData', 'Roaming', 'scuttle-shell')
  },
  'linux': {
    loader: join(__dirname, '../host-app.js'),
    manifestTemplate: join(__dirname, '../scuttleshell.template.json'),
    manifestFolder: join(homedir, '.mozilla', 'native-messaging-hosts')
  },
  'darwin': {
    loader: join(__dirname, '../host-app.js'),
    manifestTemplate: join(__dirname, '../scuttleshell.template.json'),
    manifestFolder: join(homedir, '/Library/Application Support/Mozilla/NativeMessagingHosts')
  }
}

const forPlatform = supportedPlatforms[process.platform]
if (!forPlatform) {
  throw new Error('host_app: unsupported platform:' + process.platform)
}

// TODO? fs.exists on all the load/template fields?

module.exports = forPlatform
