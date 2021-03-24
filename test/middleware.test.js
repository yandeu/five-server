const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer1 = new LiveServer()
const liveServer2 = new LiveServer()
const liveServer3 = new LiveServer()

beforeAll(async () => {
  await liveServer1.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: [
      function setStatus(req, res, next) {
        res.statusCode = 201
        next()
      }
    ]
  })
  await liveServer2.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: ['example']
  })
  await liveServer3.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: [path.join(__dirname, 'data', 'middleware.js')]
  })
})

describe('middleware tests', function () {
  it("should respond with middleware function's status code", function (done) {
    request(liveServer1.httpServer).get('/').expect(201, done)
  })
  it("should respond with built-in middleware's status code", function (done) {
    request(liveServer2.httpServer).get('/').expect(202, done)
  })
  it("should respond with external middleware's status code", function (done) {
    request(liveServer3.httpServer).get('/').expect(203, done)
  })
})

afterAll(async () => {
  await liveServer1.shutdown()
  await liveServer2.shutdown()
  await liveServer3.shutdown()
})
