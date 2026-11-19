const request = require('supertest')
const fs = require('fs')
const os = require('os')
const path = require('path')
const FiveServer = require('../lib').default

let dir

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-explorer-'))
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log("app")')
  fs.writeFileSync(path.join(dir, '.env'), 'SECRET=dummy')
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('explorer with dotFiles disabled (default)', () => {
  const fiveServer = new FiveServer()

  beforeAll(async () => {
    await fiveServer.start({ root: dir, port: 0, open: false })
  })

  afterAll(async () => {
    await fiveServer.shutdown()
  })

  it('lists regular files', async () => {
    const res = await request(fiveServer.httpServer).get('/').expect(200)
    expect(res.text).toMatch(/app\.js/)
  })

  it('does not reveal dotfile names', async () => {
    const res = await request(fiveServer.httpServer).get('/').expect(200)
    expect(res.text).not.toMatch(/\.env/)
  })
})

describe('explorer with dotFiles enabled', () => {
  const fiveServer = new FiveServer()

  beforeAll(async () => {
    await fiveServer.start({ root: dir, port: 0, open: false, dotFiles: true })
  })

  afterAll(async () => {
    await fiveServer.shutdown()
  })

  it('lists dotfile names', async () => {
    const res = await request(fiveServer.httpServer).get('/').expect(200)
    expect(res.text).toMatch(/\.env/)
  })
})
