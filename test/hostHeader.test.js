const request = require('supertest')
const path = require('path')
const os = require('os')
const FiveServer = require('../lib').default

const root = path.join(__dirname, 'data')

describe('Host header validation on loopback bind', () => {
  const fiveServer = new FiveServer()

  beforeAll(async () => {
    await fiveServer.start({ root, port: 0, open: false })
  })

  afterAll(async () => {
    await fiveServer.shutdown()
  })

  it('rejects a file request with a foreign Host header', async () => {
    await request(fiveServer.httpServer).get('/style.css').set('Host', 'evil.com:5500').expect(403)
  })

  it('rejects a directory listing request with a foreign Host header', async () => {
    await request(fiveServer.httpServer).get('/sub/').set('Host', 'evil.com:5500').expect(403)
  })

  it('rejects a foreign Host header even when the name is a subdomain of localhost', async () => {
    await request(fiveServer.httpServer).get('/style.css').set('Host', 'localhost.evil.com').expect(403)
  })

  it('accepts localhost, 127.0.0.1 and [::1] Host headers with and without the port', async () => {
    const port = fiveServer.httpServer.address().port
    const hosts = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`, 'localhost', '127.0.0.1']

    for (const host of hosts) {
      await request(fiveServer.httpServer).get('/style.css').set('Host', host).expect(200)
    }
  })
})

describe('Host header validation in LAN mode (host 0.0.0.0)', () => {
  const fiveServer = new FiveServer()

  beforeAll(async () => {
    await fiveServer.start({ root, port: 0, open: false, host: '0.0.0.0' })
  })

  afterAll(async () => {
    await fiveServer.shutdown()
  })

  it('rejects a foreign Host header', async () => {
    await request(fiveServer.httpServer).get('/style.css').set('Host', 'evil.com:5500').expect(403)
  })

  it('still accepts localhost', async () => {
    const port = fiveServer.httpServer.address().port
    await request(fiveServer.httpServer).get('/style.css').set('Host', `localhost:${port}`).expect(200)
  })

  it('accepts the machine LAN address', async () => {
    const port = fiveServer.httpServer.address().port
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find(i => i && i.family === 'IPv4' && !i.internal)

    if (!lan) return // no LAN interface on this machine, nothing to check

    await request(fiveServer.httpServer).get('/style.css').set('Host', `${lan.address}:${port}`).expect(200)
  })
})
