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

const getInnerText = async query => {
  const el = await page.$(query)

  const innerText = await page.evaluate(x => {
    return x.innerText
  }, el)

  return innerText
}

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch({ headless: 'new' })

  page = await browser.newPage()
  //   page.on('console', msg => {
  //     log = msg.text()
  //   })

  await page.goto('http://localhost:40200/sub/', { waitUntil: 'networkidle2' })
})

describe('explorer test', () => {
  it('should see explorer', async () => {
    const h1 = await getInnerText('h1')
    expect(page.url()).toBe('http://localhost:40200/sub/')
    expect(h1).toBe('~ / sub /')
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
