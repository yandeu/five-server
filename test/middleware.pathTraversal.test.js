const express = require('express')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { injectCode } = require('../lib/middleware/injectCode')
const { preview } = require('../lib/middleware/preview')

// Sends the path exactly as written. HTTP client libraries and browsers normalize "../"
// before sending, but raw clients (e.g. `curl --path-as-is`) do not.
const rawGet = (port, requestPath) => {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: requestPath, method: 'GET', agent: false }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

const listen = app => {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

const SECRET_TXT = 'OUTSIDE_ROOT_TXT_SECRET'
const SECRET_HTML = 'OUTSIDE_ROOT_HTML_SECRET'
const SECRET_PHP = 'OUTSIDE_ROOT_PHP_SECRET'

let tmp
let root
let PHP
let injectServer
let previewServer

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'five-server-traversal-'))
  root = path.join(tmp, 'webroot')
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true })
  fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body>ROOT_INDEX</body></html>')
  fs.writeFileSync(path.join(root, 'sub', 'page.html'), '<html><head></head><body>ROOT_SUB</body></html>')
  fs.writeFileSync(path.join(root, 'notes.txt'), 'ROOT_NOTES')

  // these files sit next to the webroot, so they are outside of it
  fs.writeFileSync(path.join(tmp, 'secret.txt'), SECRET_TXT)
  fs.writeFileSync(path.join(tmp, 'secret.html'), `<html><head></head><body>${SECRET_HTML}</body></html>`)
  fs.writeFileSync(path.join(tmp, 'secret.php'), `<?php echo "${SECRET_PHP}"; ?>`)

  PHP = { parseFile: jest.fn(async () => '<html><head></head><body>PHP</body></html>') }

  const injectApp = express()
  injectApp.use(injectCode(root, '/', PHP, false, false))
  injectServer = await listen(injectApp)

  const previewApp = express()
  previewApp.use(preview(root, '/', true))
  previewServer = await listen(previewApp)
})

afterAll(async () => {
  for (const server of [injectServer, previewServer]) {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('injectCode middleware', () => {
  beforeEach(() => PHP.parseFile.mockClear())

  it('injects the five-server script into an html file inside the root', async () => {
    const res = await rawGet(injectServer.address().port, '/index.html')
    expect(res.status).toBe(200)
    expect(res.body).toContain('ROOT_INDEX')
    expect(res.body).toContain('fiveserver.js')
  })

  it('serves a nested html file inside the root', async () => {
    const res = await rawGet(injectServer.address().port, '/sub/page.html')
    expect(res.status).toBe(200)
    expect(res.body).toContain('ROOT_SUB')
  })

  it('rejects a literal "../" path to an html file outside the root', async () => {
    const res = await rawGet(injectServer.address().port, '/../secret.html')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_HTML)
  })

  it('rejects a percent-encoded "../" path to an html file outside the root', async () => {
    const res = await rawGet(injectServer.address().port, '/%2e%2e/secret.html')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_HTML)
  })

  it('does not serve the outside file when an encoded slash is used', async () => {
    const res = await rawGet(injectServer.address().port, '/%2e%2e%2fsecret.html')
    expect(res.status).not.toBe(200)
    expect(res.body).not.toContain(SECRET_HTML)
  })

  it('rejects a php file outside the root without running the php parser', async () => {
    const res = await rawGet(injectServer.address().port, '/%2e%2e/secret.php')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_PHP)
    expect(PHP.parseFile).not.toHaveBeenCalled()
  })
})

describe('preview middleware', () => {
  it('previews a file inside the root', async () => {
    const res = await rawGet(previewServer.address().port, '/notes.txt.preview')
    expect(res.status).toBe(200)
    expect(res.body).toContain('ROOT_NOTES')
  })

  it('rejects a literal "../" path in preview mode', async () => {
    const res = await rawGet(previewServer.address().port, '/../secret.txt.preview')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_TXT)
  })

  it('rejects a percent-encoded "../" path in fullscreen mode', async () => {
    const res = await rawGet(previewServer.address().port, '/%2e%2e/secret.txt.fullscreen')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_TXT)
  })

  it('rejects a php file outside the root', async () => {
    const res = await rawGet(previewServer.address().port, '/%2e%2e/secret.php')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_PHP)
  })
})
