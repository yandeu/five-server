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

  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

  page = await browser.newPage()
  page.on('console', msg => {
    log = msg.text()
  })

  await page.goto('http://localhost:40200/', { waitUntil: 'networkidle2' })
})

describe('navigation test', () => {
  it('should open index.html at /', async () => {
    const h1 = await getInnerText('h1')
    expect(page.url()).toBe('http://localhost:40200/')
    expect(h1).toBe('Hello world.')
  })

  it('should navigate to /sub/sub.html', async () => {
    await fiveServer.navigate('/sub/sub.html')
    await pause()

    const h1 = await getInnerText('h1')
    expect(page.url()).toBe('http://localhost:40200/sub/sub.html')
    expect(h1).toBe('Subdirectory')
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
