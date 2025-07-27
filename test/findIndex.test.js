const request = require('supertest')
const path = require('path')
const FiveServer = require('../lib').default

var fiveServer = new FiveServer()

beforeAll(async () => {
  await fiveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false
  })
})

describe('serve index test', function () {
  it('/sub2', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/index', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/index')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/index.html', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2?foo=bar', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2?foo=bar')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/?foo=bar', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/?foo=bar')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/index?foo=bar', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/index?foo=bar')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
  it('/sub2/index.html?foo=bar', function (done) {
    request(fiveServer.httpServer)
      .get('/sub2/index.html?foo=bar')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/This in a index file inside the sub directory./i)
      .expect(200, done)
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
})
