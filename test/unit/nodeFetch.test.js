const { express } = require('express6')
const { nodeFetch } = require('../../lib/nodeFetch')
const { listen, close } = require('../helpers/express')
const pause = require('../helpers/pause')

const app = express()
let server

app.get('/test', (req, res) => {
  return res.send('OK')
})
app.get('/404', (req, res) => {
  return res.sendStatus(404)
})
app.get('/redirect', (req, res) => {
  return res.redirect(301, '/found')
})
app.get('/redirect-full', (req, res) => {
  return res.redirect(301, 'http://127.0.0.1:4800/found')
})
app.get('/redirect-wrong', (req, res) => {
  return res.sendStatus(301)
})
app.get('/redirect-circular', (req, res) => {
  return res.redirect(301, '/redirect-circular')
})
app.get('/found', (req, res) => {
  return res.send('OK')
})

beforeAll(async () => {
  server = await listen(app, 4800)
})

describe('nodeFetch.ts', () => {
  test('get', async () => {
    const res = await nodeFetch('http://127.0.0.1:4800/test')
    const data = res.toString('utf-8')
    expect(data).toBe('OK')
  })

  test('invalid url', done => {
    nodeFetch('/api/test').catch(error => {
      expect(error.code).toBe(400)
      done()
    })
  })

  test('404 response', done => {
    nodeFetch('http://127.0.0.1:4800/404').catch(error => {
      expect(error.code).toBe(404)
      done()
    })
  })

  test('redirect header', done => {
    nodeFetch('http://127.0.0.1:4800/redirect').then(res => {
      const data = res.toString('utf-8')
      expect(data).toBe('OK')
      done()
    })
  })

  test('redirect header (with full url)', done => {
    nodeFetch('http://127.0.0.1:4800/redirect-full').then(res => {
      const data = res.toString('utf-8')
      expect(data).toBe('OK')
      done()
    })
  })

  test('redirect without header', done => {
    nodeFetch('http://127.0.0.1:4800/redirect-wrong').catch(error => {
      expect(error.message).toBe('location not found in headers')
      done()
    })
  })

  test('redirect circular', done => {
    nodeFetch('http://127.0.0.1:4800/redirect-circular').catch(error => {
      expect(error.code).toBe(429)
      expect(error.message).toBe('Too Many Requests')
      done()
    })
  })
})

afterAll(async () => {
  await Promise.race([await close(server), pause(2000)])
})
