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

describe('basic functional tests', function () {
  it('should respond with index.html', function (done) {
    request(liveServer.httpServer)
      .get('/')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/hello world/i)
      .expect(200, done)
  })
  it('should have injected script', function (done) {
    request(liveServer.httpServer)
      .get('/')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/<script [^]+?fiveserver.js[^]+?<\/script>/i)
      .expect(200, done)
  })
  it('with query params: should have injected script', function (done) {
    request(liveServer.httpServer)
      .get('/index.html?a=b')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/<script [^]+?fiveserver.js[^]+?<\/script>/i)
      .expect(200, done)
  })
  it('should inject script when tags are in CAPS', function (done) {
    request(liveServer.httpServer)
      .get('/index-caps.htm')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/<script [^]+?fiveserver.js[^]+?<\/script>/i)
      .expect(200, done)
  })
  it('should inject to <head> when no <body>', function (done) {
    request(liveServer.httpServer)
      .get('/index-head.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/<script [^]+?fiveserver.js[^]+?<\/script>/i)
      .expect(200, done)
  })
  // TODO(yandeu): You can't inject fiveserver.js into svg files! Consider injecting the old injected.html file instead!
  xit('should inject also svg files', function (done) {
    request(liveServer.httpServer)
      .get('/test.svg')
      .expect('Content-Type', 'image/svg+xml')
      .expect(function (res) {
        if (res.body.toString().indexOf('Five-Server is connected') == -1) throw new Error('injected code not found')
      })
      .expect(200, done)
  })
  xit('should not inject html fragments', function (done) {
    request(liveServer.httpServer)
      .get('/fragment.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(function (res) {
        if (res.text.toString().indexOf('fiveserver.js') > -1) throw new Error('injected code should not be found')
      })
      .expect(200, done)
  })
  xit('should have WebSocket connection', function (done) {
    done() // todo
  })
  xit('should reload on page change', function (done) {
    done() // todo
  })
  xit('should reload (without refreshing) on css change', function (done) {
    done() // todo
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
