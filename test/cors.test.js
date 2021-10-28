const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

beforeAll(async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    cors: true
  })
})

describe('cors tests', function () {
  it('should respond with appropriate header', function (done) {
    request(liveServer.httpServer)
      .get('/index.html')
      .set('Origin', 'http://example.com')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect('Access-Control-Allow-Origin', '*')
      .expect(/Hello world/i)
      .expect(200, done)
  })
  it('should support preflighted requests', function (done) {
    request(liveServer.httpServer)
      .options('/index.html')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-PINGOTHER')
      .expect('Access-Control-Allow-Origin', '*')
      .expect('Access-Control-Allow-Methods', /POST/)
      .expect('Access-Control-Allow-Headers', 'X-PINGOTHER')
      .expect(204, done)
  })
  it('should support requests with credentials', function (done) {
    request(liveServer.httpServer)
      .options('/index.html')
      .set('Origin', 'http://example.com')
      .set('Cookie', 'foo=bar')
      .expect('Access-Control-Allow-Origin', '*')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(204, done)
  })
  // see: https://github.com/yandeu/five-server-vscode/issues/9
  it('should add custom headers', function (done) {
    request(liveServer.httpServer)
      .get('/index.html')
      .expect('Cross-Origin-Opener-Policy', 'same-origin')
      .expect('Cross-Origin-Embedder-Policy', 'require-corp')
      .expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
