#! /usr/bin/env node

const setup = require('./setup')
const check = require('./check-configuration')

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
