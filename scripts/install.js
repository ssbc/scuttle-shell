if (process.platform === "win32") {
  // do windows setup
  var setup = require("./setup-win")
  var check = require("./check-configuration-win")
} else {
  // do linux/mac setup
  var setup = require("./setup")
  var check = require("./check-configuration")
}

setup()
check()

