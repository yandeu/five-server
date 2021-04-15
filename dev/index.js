const LiveServer = require('../lib/index').default

const liveServer = new LiveServer()

const config = {
  configFile: false,
  open: false,
  root: 'dev',
  watch: ['dev/*.css', 'dev/*.php']
}

liveServer.start(config)
