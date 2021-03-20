var request = require('supertest')
var path = require('path')

var liveServer

beforeAll(async () => {
  liveServer = await require('../lib').default.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false
    // TODO: Does not work yet
    // htpasswd: path.join(__dirname, 'data', 'htpasswd-test')
  })
})

describe('htpasswd tests', function () {
  xit('should respond with 401 since no password is given', function (done) {
    request(liveServer).get('/').expect(401, done)
  })
  xit('should respond with 401 since wrong password is given', function (done) {
    request(liveServer).get('/').auth('test', 'not-real-password').expect(401, done)
  })
  xit('should respond with 200 since correct password is given', function (done) {
    request(liveServer).get('/').auth('test', 'test').expect(200, done)
  })
})
