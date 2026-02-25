const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

beforeAll(async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    cache: false // Disable cache
  })
})

describe('cache disabled tests', function () {
  it('should NOT transform cache attributes when cache is disabled', function (done) {
    request(liveServer.httpServer)
      .get('/index-cache.html')
      .expect(/<link cache rel="stylesheet" href="style.css"/)
      .expect(/<img cache src="http:\/\/example.com\/image.jpeg"/)
      .expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
