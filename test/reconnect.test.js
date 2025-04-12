const path = require('path')
const FiveServer = require('../lib').default
const puppeteer = require('puppeteer')
const pause = require('./helpers/pause')

jest.setTimeout(15_000)

const fiveServer = new FiveServer()
let browser
let page

const options = {
  root: path.join(__dirname, 'data'),
  port: 40200,
  open: false
}

let log = ''

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

  page = await browser.newPage()
  page.on('console', msg => {
    log = msg.text()
  })

  await page.goto('http://localhost:40200/', { waitUntil: 'networkidle2' })
})

describe('websocket reconnection', () => {
  it('should be connected to fiveserver', () => {
    // expect(log.includes('connected')).toBeTruthy()
    expect(fiveServer.wsc.length).toBe(1)
  })

  it('connection should be closed', async () => {
    await fiveServer.shutdown()
    await pause()
    expect(log.includes('closed')).toBeTruthy()
    expect(fiveServer.wsc.length).toBe(0)
  })

  it('should reconnect after five-server restarted', async () => {
    await fiveServer.start(options)
    await pause(2000)
    // expect(log.includes('connected')).toBeTruthy()
    expect(fiveServer.wsc.length).toBe(1)
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
