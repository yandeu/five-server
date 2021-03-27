const path = require('path')
const FiveServer = require('../lib').default
const puppeteer = require('puppeteer')

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

const pause = (ms = 1000) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch()

  page = await browser.newPage()
  page.on('console', msg => {
    log = msg.text()
  })

  await page.goto('http://localhost:40200/', { waitUntil: 'networkidle2' })
})

describe('websocket reconnection', () => {
  it('should be connected to fiveserver', () => {
    expect(log.includes('connected')).toBeTruthy()
    expect(fiveServer.clients.length).toBe(1)
  })

  it('connection should be closed', async done => {
    await fiveServer.shutdown()
    await pause()
    expect(log.includes('closed')).toBeTruthy()
    expect(fiveServer.clients.length).toBe(0)
    done()
  })

  it('should reconnect after five-server restarted', async done => {
    await fiveServer.start(options)
    await pause(5000)
    expect(log.includes('connected')).toBeTruthy()
    expect(fiveServer.clients.length).toBe(1)
    done()
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
