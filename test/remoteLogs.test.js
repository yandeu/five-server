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

let remoteLog = []

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch()

  page = await browser.newPage()
  page.on('console', msg => {
    remoteLog.push(msg.text())
  })

  await page.goto('http://localhost:40200/index-log.html', { waitUntil: 'networkidle2' })
})

describe('remote logs', () => {
  it('should be connected to one client', () => {
    expect(fiveServer.clients.length).toBe(1)
  })

  it('should receive logs', async () => {
    await pause(2000)

    expect(remoteLog.includes('Hi from remote!')).toBeTruthy()
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
