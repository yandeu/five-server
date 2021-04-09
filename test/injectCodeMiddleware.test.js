const express = require('express')
const request = require('supertest')
const { injectCode } = require('../lib/inject')
const path = require('path')
const app = express()
const port = 40200
const root = path.join(__dirname, 'data')
let server

const injectHandler = injectCode(root)

// inject to .html and .php files
app.use(injectHandler)

const startExpressServer = () => {
  return new Promise(resolve => {
    app.get('/hello', (req, res) => {
      res.send('Hello World!')
    })

    // inject Five Server script to .html and .php files
    app.use(injectHandler)

    server = app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`)
      return resolve()
    })
  })
}

const closeExpressServer = () => {
  return new Promise(resolve => {
    server.close(() => {
      resolve()
    })
  })
}

beforeAll(async () => {
  await startExpressServer()
})

describe('basic functional tests', () => {
  it('should respond with index.html', done => {
    request(server)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(/hello world/i)
      .expect(200, done)
  })
  it('should have injected script', done => {
    request(server)
      .get('/')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(/<script [^]+?fiveserver.js[^]+?<\/script>/i)
      .expect(200, done)
  })
})

afterAll(async () => {
  await closeExpressServer()
})
