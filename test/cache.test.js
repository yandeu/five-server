const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

beforeAll(async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false
  })
})

describe('cache tests', function () {
  it('should have transformed cache to src="/.cache/..." or href="/.cache/..."', function (done) {
    request(liveServer.httpServer)
      .get('/index-cache.html')
      .expect(/<link rel="stylesheet" href="\/.cache\/style.css"/)
      .expect(/<img src="\/.cache\/http:\/\/example.com\/image.jpeg"/)
      .expect(200, done)
  })

  it('should NOT transform the word "cache" in non-resource tags', function (done) {
    request(liveServer.httpServer)
      .get('/index-cache-bug.html')
      .expect(/<button id="setting-clear-cache" class="danger">/)
      .expect(/<div class="cache-container">/)
      .expect(200, done)
  })

  it('should transform cache attribute only in resource tags', function (done) {
    request(liveServer.httpServer)
      .get('/index-cache-bug.html')
      .expect(/<img src="\/.cache\/image.jpg"/)
      .expect(/<script src="\/.cache\/script.js"/)
      .expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
