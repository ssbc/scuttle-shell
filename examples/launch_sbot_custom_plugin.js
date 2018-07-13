let scuttleshell = require("../server")

console.log("Starting sbot, quitting after 30 seconds")
console.log("open http://localhost:8989/get-address")
scuttleshell.start(false, ["./examples/service-discovery"])

setTimeout(scuttleshell.stop, 30000)