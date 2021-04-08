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

let remoteLog = ''

// spy on localLog
jest.spyOn(console, 'log')

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch()

  page = await browser.newPage()
  page.on('console', msg => {
    remoteLog = msg.text()
  })

  await page.goto('http://localhost:40200/', { waitUntil: 'networkidle2' })
})

describe('remote logs', () => {
  it('should be connected to fiveserver', () => {
    expect(remoteLog.includes('connected')).toBeTruthy()
    expect(fiveServer.clients.length).toBe(1)
  })

  it('should receive logs', async done => {
    await pause(2000)

    const logs = console.log.mock.calls
    const lastLog = logs[logs.length - 1][0]

    expect(lastLog.includes('] Connected!')).toBeTruthy()
    done()
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
