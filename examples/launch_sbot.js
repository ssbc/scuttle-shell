let scuttleshell = require("../server")

console.log("Starting sbot, quitting after 30 seconds")
scuttleshell.start()

setTimeout(scuttleshell.stop, 30000)