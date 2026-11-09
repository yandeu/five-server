const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const FiveServer = require('../lib').default

jest.setTimeout(30_000)

const PORT = 40310

const SECRET_TXT = 'OUTSIDE_ROOT_TXT_SECRET'
const SECRET_HTML = 'OUTSIDE_ROOT_HTML_SECRET'
const SECRET_PHP = 'OUTSIDE_ROOT_PHP_SECRET'

// Sends the path exactly as written, without client-side "../" normalization.
const rawGet = requestPath => {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: requestPath, method: 'GET', agent: false }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

let tmp
let fiveServer

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'five-server-e2e-traversal-'))
  const root = path.join(tmp, 'webroot')
  fs.mkdirSync(root)
  fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body>ROOT_INDEX</body></html>')
  fs.writeFileSync(path.join(root, 'notes.txt'), 'ROOT_NOTES')

  fs.writeFileSync(path.join(tmp, 'secret.txt'), SECRET_TXT)
  fs.writeFileSync(path.join(tmp, 'secret.html'), `<html><head></head><body>${SECRET_HTML}</body></html>`)
  fs.writeFileSync(path.join(tmp, 'secret.php'), `<?php echo "${SECRET_PHP}"; ?>`)

  fiveServer = new FiveServer()
  await fiveServer.start({ root, port: PORT, open: false })
})

afterAll(async () => {
  await fiveServer.shutdown()
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('path traversal through the full server', () => {
  it('serves an html file inside the root with the script injected', async () => {
    const res = await rawGet('/index.html')
    expect(res.status).toBe(200)
    expect(res.body).toContain('ROOT_INDEX')
    expect(res.body).toContain('fiveserver.js')
  })

  it('previews a file inside the root', async () => {
    const res = await rawGet('/notes.txt.preview')
    expect(res.status).toBe(200)
    expect(res.body).toContain('ROOT_NOTES')
  })

  it('does not serve an html file outside the root (literal "../")', async () => {
    const res = await rawGet('/../secret.html')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_HTML)
  })

  it('does not serve an html file outside the root (percent-encoded "../")', async () => {
    const res = await rawGet('/%2e%2e/secret.html')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_HTML)
  })

  it('does not preview a text file outside the root', async () => {
    const res = await rawGet('/%2e%2e/secret.txt.preview')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_TXT)
  })

  it('does not execute a php file outside the root', async () => {
    const res = await rawGet('/%2e%2e/secret.php')
    expect(res.status).toBe(403)
    expect(res.body).not.toContain(SECRET_PHP)
  })

  it('does not serve a plain text file outside the root', async () => {
    const res = await rawGet('/%2e%2e/secret.txt')
    expect(res.body).not.toContain(SECRET_TXT)
  })
})
