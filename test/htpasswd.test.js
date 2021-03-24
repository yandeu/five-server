const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServer = new LiveServer()

beforeAll(async () => {
  await liveServer.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false
    // TODO: htpasswd does not work yet
    // htpasswd: path.join(__dirname, 'data', 'htpasswd-test')
  })
})

describe('htpasswd tests', function () {
  xit('should respond with 401 since no password is given', function (done) {
    request(liveServer.httpServer).get('/').expect(401, done)
  })
  xit('should respond with 401 since wrong password is given', function (done) {
    request(liveServer.httpServer).get('/').auth('test', 'not-real-password').expect(401, done)
  })
  xit('should respond with 200 since correct password is given', function (done) {
    request(liveServer.httpServer).get('/').auth('test', 'test').expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
