const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const port = 40200
const server1 = new LiveServer()
const server2 = new LiveServer()

beforeAll(async () => {
  await server1.start({
    root: path.join(__dirname, 'data'),
    port: port,
    open: false
  })
  await server2.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    proxy: [['/server1', 'http://localhost:' + port]]
  })
})

describe('proxy tests', function () {
  it('should respond with proxied content', function (done) {
    request(server2.httpServer)
      .get('/server1/index.html')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(/Hello world/i)
      .expect(200, done)
  })
})

afterAll(async () => {
  await server1.shutdown()
  await server2.shutdown()
})
