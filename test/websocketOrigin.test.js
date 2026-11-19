const WebSocket = require('ws')
const path = require('path')
const FiveServer = require('../lib').default

const root = path.join(__dirname, 'data')

// Resolves with 'open' if the handshake succeeds, otherwise with the HTTP
// status code or 'error'.
const handshake = (port, origin, extraHeaders = {}) =>
  new Promise(resolve => {
    const opts = { headers: extraHeaders }
    if (origin !== undefined) opts.origin = origin

    const ws = new WebSocket(`ws://127.0.0.1:${port}/`, opts)
    const finish = result => {
      resolve(result)
      ws.terminate()
    }

    ws.on('open', () => finish('open'))
    ws.on('unexpected-response', (_req, res) => finish(res.statusCode))
    ws.on('error', () => finish('error'))
  })

describe('WebSocket origin validation', () => {
  const fiveServer = new FiveServer()
  let port

  beforeAll(async () => {
    await fiveServer.start({ root, port: 0, open: false })
    port = fiveServer.httpServer.address().port
  })

  afterAll(async () => {
    await fiveServer.shutdown()
  })

  it('rejects a handshake from a cross-site origin', async () => {
    const result = await handshake(port, 'http://evil.com')
    expect(result).not.toBe('open')
  })

  it('rejects a handshake with no Origin header', async () => {
    const result = await handshake(port, undefined)
    expect(result).not.toBe('open')
  })

  it('rejects a handshake from a trusted origin sent with a foreign Host header', async () => {
    const result = await handshake(port, `http://localhost:${port}`, { Host: 'evil.com:5500' })
    expect(result).not.toBe('open')
  })

  it('accepts a handshake from a loopback origin', async () => {
    const result = await handshake(port, `http://localhost:${port}`)
    expect(result).toBe('open')
  })
})
