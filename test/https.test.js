const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

// accept self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

describe('https tests with external module', () => {
  const opts = {
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    https: path.join(__dirname, 'conf/https.conf.js')
  }
  beforeEach(async () => {
    await liveServer.start(opts)
  })
  afterEach(async () => {
    await liveServer.shutdown()
  })
  it('protocol should be https', function () {
    expect(liveServer.protocol).toBe('https')
  })
  it('should reply with a correct index file', function (done) {
    request(liveServer.httpServer)
      .get('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/Hello world/i)
      .expect(200, done)
  })
  it('should support head request', function (done) {
    request(liveServer.httpServer)
      .head('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(200, done)
  })
})

describe('https tests with object', () => {
  const opts = {
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    https: require(path.join(__dirname, 'conf/https.conf.js'))
  }
  beforeEach(async () => {
    await liveServer.start(opts)
  })
  afterEach(async () => {
    await liveServer.shutdown()
  })
  it('protocol should be https', function () {
    expect(liveServer.protocol).toBe('https')
  })
  it('should reply with a correct index file', function (done) {
    request(liveServer.httpServer)
      .get('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/Hello world/i)
      .expect(200, done)
  })
  it('should support head request', function (done) {
    request(liveServer.httpServer)
      .head('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(200, done)
  })
})

describe('https tests with the "selfsigned" package', () => {
  const opts = {
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    https: true
  }
  beforeEach(async () => {
    await liveServer.start(opts)
  })
  afterEach(async () => {
    await liveServer.shutdown()
  })
  it('protocol should be https', function () {
    expect(liveServer.protocol).toBe('https')
  })
  it('should reply with a correct index file', function (done) {
    request(liveServer.httpServer)
      .get('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(/Hello world/i)
      .expect(200, done)
  })
  it('should support head request', function (done) {
    request(liveServer.httpServer)
      .head('/index.html')
      .expect('Content-Type', /text\/html; charset=utf-8/i)
      .expect(200, done)
  })
})
