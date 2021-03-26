const LiveServer = require('../lib/index').default

const liveServer = new LiveServer()

liveServer.start({ noBrowser: true })
