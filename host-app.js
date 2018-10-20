#! /usr/bin/env node

const nativeMessage = require('chrome-native-messaging')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const config = require('ssb-config/inject')(process.env.ssb_appname)

const pathToSecret = path.join(config.path, 'secret')

const input = new nativeMessage.Input()

const transform = new nativeMessage.Transform((msg, push, done) => {
  getReplyFor(msg, (err, data) => {
    // this module doesn't seem to have error handling?
    // would have expected done(err)
    if (err) throw err
    push(data)
    done()
  })
})
const output = new nativeMessage.Output()

const getConfig = () => { // exposes secret...
  try {
    let secret = fs.readFileSync(pathToSecret, 'utf8')
    let keys = JSON.parse(secret.replace(/#[^\n]*/g, ''))
    let manifest = JSON.parse(fs.readFileSync(path.join(config.path, 'manifest.json')))
    let remote = 'ws://localhost:8989~shs:' + keys.id.substring(1, keys.id.indexOf('.'))
    return { type: 'config', keys, manifest, remote, secret }
  } catch (n) {
    return { type: 'exception', msg: n.message }
  }
}

const startServer = (cb) => {
  output.write({ type: 'debug', msg: `starting scuttlebutt` })

  let crashed = false
  var scriptPath = path.join(__dirname, 'server.js')
  var child = spawn(process.execPath, [scriptPath])

  child.stdout.on('data', (data) => {
    console.warn('[sbot server]', data.toString())
    output.write({ type: 'debug', msg: `stdout: ${data}` })
  })

  child.stderr.on('data', (data) => {
    console.warn('[sbot server] stderr:', data.toString())
    output.write({ type: 'error', msg: `stderr: ${data}` })
  })

  child.on('close', (code) => {
    const msg = `child process exited with code ${code}`
    console.warn(msg)
    output.write({ type: 'debug', msg: msg })
    cb(new Error(msg))
    crashed = true
  })

  output.write(getConfig())

  setTimeout(function () {
    if (!crashed) cb(null, 'started') // TODO: once me
  }, 4000)
}

const getReplyFor = (msg, cb) => {
  output.write({ type: 'debug', msg: `trying to get reply for ${msg.cmd}` })
  switch (msg.cmd) {
    case 'start-server':
      console.warn('[host-app] starting server')
      startServer(cb)
      break
    case 'stop-server': {
      clearInterval(timer)
      cb(null, { type: 'shutdown', msg: 'stopping server' })
      process.exit(0)
    }
    case 'get-config': {
      cb(null, getConfig()) // exposes secret..
    }
  }
}

var timer = setInterval(function () {
  output.write({ type: 'ping', time: new Date().toISOString() })
}, 1200)

input.on('end', function () {
  clearInterval(timer)
})

process.stdin
  .pipe(input)
  .pipe(transform)
  .pipe(output)
  .pipe(process.stdout)
