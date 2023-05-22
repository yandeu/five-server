const request = require('supertest')
const path = require('path')
const { defaultPHPPath } = require('../lib/misc')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

let phpPath = defaultPHPPath()

const open = async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    php: phpPath
  })
}

const close = async () => {
  await await liveServer.shutdown()
}

describe('serve PHP files', () => {
  it('should respond to bonjour.php', async () => {
    await open()

    await request(liveServer.httpServer)
      .get('/bonjour.php')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/bonjour le monde!/i)
      .expect(200)
  })

  it('should respond without file extension', async () => {
    await request(liveServer.httpServer)
      .get('/bonjour')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/bonjour le monde!/i)
      .expect(200)
  })

  it('should respond without instructions', async () => {
    await close()
    phpPath = 'invalid_path'
    await open()

    await request(liveServer.httpServer)
      .get('/bonjour.php')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/Follow the steps below/i)
      .expect(500)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
