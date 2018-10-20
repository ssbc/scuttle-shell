#! /usr/bin/env node

const setup = require('./setup')
// TODO: unify check scripts
const check = require('./check-configuration' + (process.platform === 'win32' ? '-win' : ''))

setup((err) => {
  if (err) {
    console.log('[ERROR] scuttle-shell setup step:', err)
    process.exitCode = 1
    return
  }

  check((err) => {
    if (err) {
      console.log('[ERROR] scuttle-shell check step:', err)
      process.exitCode = 1
    }
  })
})
