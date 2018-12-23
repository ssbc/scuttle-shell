const homedir = require('os').homedir()
const test = require('tape')
const spawn = require('child_process').spawn
const join = require('path').join
const cnm = require('chrome-native-messaging')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const notify = require('pull-notify')

const appName = 'scuttle-shell-hostapp-test'

test('start and stop', function (t) {
  // t.timeoutAfter(1000 * 10)
  // helper to send cmds from time to time
  const eventSender = notify()

  // start host-app.js (with stderr copied to the test runner)
  var hostApp = spawn('node', [join(__dirname, '..', 'host-app.js')], {
    env: Object.assign({}, process.env, { ssb_appname: appName }),
    stdio: ['pipe', 'pipe', 'inherit']
  })

  // send to host app
  const toApp = new cnm.Output()
  toApp.pipe(hostApp.stdin)
  pull(
    eventSender.listen(),
    pull.through(console.log),
    toPull.sink(toApp, function (err) {
      t.error(err, 'stdin pipe error')
    })
  )

  // TODO: pull-stream me?
  hostApp.stdout // from app to test runner
    .pipe(new cnm.Input())
    .pipe(new cnm.Transform(function (msg, push, done) {
      switch (msg.type) {
        case 'config':
          setTimeout(() => {
            require('ssb-client')(msg.keys, {
              path: join(homedir, '.' + appName),
              caps: { shs: require('ssb-server/lib/ssb-cap') },
              remote: msg.remote
            }, (err, client) => {
              t.error(err, 'ssb-client error')
              client.whoami((err, who) => { // try to use the remote from get-config
                t.error(err, 'whoami error')
                t.equals(msg.keys.id, who.id, 'who was this?')
                setTimeout(() => {
                  eventSender({ cmd: 'stop-server' })
                }, 1000)
              })
            })
          }, 1000)
          break

        case 'shutdown':
          eventSender.end()
          hostApp.stdin.destroy(null)
          break

        case 'ping': // ignore
          break

        default:
          if (typeof msg.type === 'undefined') t.comment('warning: msg.type undefined', JSON.stringify(msg))
          t.comment(`=> from host: [${msg.type}] ${msg.msg}`)
          break
      }
      done()
    }))

  hostApp.on('exit', function (code) {
    t.notOk(code, 'hostApp exit code should be zero')
    t.end()
  })

  setTimeout(function () {
    eventSender({ cmd: 'start-server' })
  }, 2000)
})
