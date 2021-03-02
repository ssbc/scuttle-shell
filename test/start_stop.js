var tape = require('tape')

var shell = require('../server.js')


tape("start stop", (t) => {

	shell.start({}, (err) => {
		t.error(err, "starting")
	
		shell.stop()
	})

})
