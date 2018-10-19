#! /usr/bin/env node

// TODO: unify check scripts
var check = require('./check-configuration' + (process.platform === 'win32' ? '-win' : ''))

let steps = [require('./setup'), check]

for (const s of steps) {
  s((err) => {
    if (err) throw err
  })
}
