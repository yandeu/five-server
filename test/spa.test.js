const request = require('supertest')
const path = require('path')
const LiveServer = require('../lib').default

const liveServerSpa = new LiveServer()
const liveServerSpaIgnoreAssets = new LiveServer()

beforeAll(async () => {
  await liveServerSpa.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: ['spa']
  })
  await liveServerSpaIgnoreAssets.start({
    root: path.join(__dirname, 'data'),
    port: 0,
    open: false,
    middleware: ['spa-ignore-assets']
  })
})

describe('spa tests', function () {
  it('spa should redirect', function (done) {
    request(liveServerSpa.httpServer).get('/api').expect('Location', /\/#\//).expect(302, done)
  })
  it('spa should redirect everything', function (done) {
    request(liveServerSpa.httpServer).get('/style.css').expect('Location', /\/#\//).expect(302, done)
  })
  it('spa-ignore-assets should redirect something', function (done) {
    request(liveServerSpaIgnoreAssets.httpServer).get('/api').expect('Location', /\/#\//).expect(302, done)
  })
  it('spa-ignore-assets should not redirect .css', function (done) {
    request(liveServerSpaIgnoreAssets.httpServer).get('/style.css').expect(200, done)
  })
})

afterAll(async () => {
  await liveServerSpa.shutdown()
  await liveServerSpaIgnoreAssets.shutdown()
})
