var request = require('supertest')
var path = require('path')

var liveServer1
var liveServer2
var liveServer3

beforeAll(async () => {
  liveServer1 = await require('../lib').default.start({
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
  liveServer2 = await require('../lib').default.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: ['example']
  })
  liveServer3 = await require('../lib').default.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: [path.join(__dirname, 'data', 'middleware.js')]
  })
})

describe('middleware tests', function () {
  it("should respond with middleware function's status code", function (done) {
    request(liveServer1).get('/').expect(201, done)
  })
  it("should respond with built-in middleware's status code", function (done) {
    request(liveServer2).get('/').expect(202, done)
  })
  it("should respond with external middleware's status code", function (done) {
    request(liveServer3).get('/').expect(203, done)
  })
})
