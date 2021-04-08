const request = require('supertest')
const path = require('path')
const os = require('os')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

let phpPath = os.platform() === 'win32' ? 'C:\\xampp\\php\\php.exe' : '/usr/bin/php'

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
  it('should respond to bonjour.php', async done => {
    await open()

    request(liveServer.httpServer)
      .get('/bonjour.php')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/bonjour le monde!/i)
      .expect(200, done)
  })

  it('should respond without file extension', async done => {
    request(liveServer.httpServer)
      .get('/bonjour')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/bonjour le monde!/i)
      .expect(200, done)
  })

  it('should respond without instructions', async done => {
    await close()
    phpPath = 'invalid_path'
    await open()

    request(liveServer.httpServer)
      .get('/bonjour.php')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/Follow the steps below/i)
      .expect(500, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
