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

describe('with or without file extension', () => {
  it('should respond with file extension', done => {
    request(liveServer.httpServer)
      .get('/contact.html')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(/Contact Page/i)
      .expect(200, done)
  })
  it('should respond without file extension', done => {
    request(liveServer.httpServer)
      .get('/contact')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(/Contact Page/i)
      .expect(200, done)
  })
})

afterAll(async () => {
  await liveServer.shutdown()
})
