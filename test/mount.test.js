const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

var liveServer = new LiveServer()

beforeAll(async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    mount: [
      ['/mounted', path.join(__dirname, 'data', 'sub')],
      ['/style', path.join(__dirname, 'data', 'style.css')]
    ]
  })
})

describe('mount tests', function () {
  it('should respond with sub.html', function (done) {
    request(liveServer.httpServer)
      .get('/mounted/sub.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/Subdirectory/i)
      .expect(200, done)
  })
  it('should respond with style.css', function (done) {
    request(liveServer.httpServer)
      .get('/style')
      .expect('Content-Type', /text\/css; charset=utf-8/i)
      .expect(/color/i)
      .expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
