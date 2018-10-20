const test = require('tape')
const spawn = require('child_process').spawn
const join = require('path').join
const cnm = require('chrome-native-messaging')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const notify = require('pull-notify')

test('start and stop', function (t) {
  // helper to send cmds from time to time
  const eventSender = notify()

  // start host-app.js (with stderr copied to the test runner)
  var hostApp = spawn('node', [join(__dirname, '..', 'host-app.js')], {
    env: Object.assign({}, process.env, { ssb_appname: 'test' }),
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
      t.comment('ok')
    })
  )

  // TODO: pull-stream me?
  hostApp.stdout // from app to test runner
    .pipe(new cnm.Input())
    .pipe(new cnm.Transform(function (msg, push, done) {
      console.log('stdout:', msg)
      done()
    }))

  hostApp.on('exit', function (code) {
    t.notOk(code, 'hostApp exit code should be zero')
    t.end()
    eventSender.end()
  })

  setTimeout(function () {
    eventSender({ cmd: 'start-server' })
    setTimeout(function () {
      eventSender({ cmd: 'stop-server' })
    }, 5000)
  }, 2000)
})
