const LiveServer = require('../lib/index').default

const liveServer = new LiveServer()

liveServer.start({ open: false })
