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
})

describe('preview test', () => {
  it('should open svg', async () => {
    await page.goto('http://localhost:40200/test.svg', { waitUntil: 'networkidle2' })
    const content = await page.content()
    expect(content.startsWith('<svg')).toBe(true)
  })

  it('should open svg in preview mode', async () => {
    await page.goto('http://localhost:40200/test.svg.preview', { waitUntil: 'networkidle2' })
    const content = await page.content()
    const h1 = await getInnerText('h1')
    expect(h1.startsWith('~ / test.svg')).toBe(true)
  })

  it('should open svg in fullscreen mode', async () => {
    await page.goto('http://localhost:40200/test.svg.fullscreen', { waitUntil: 'networkidle2' })
    const div = await page.evaluate(() => document.querySelector('.preview-fullscreen').outerHTML)
    expect(div.startsWith('<div class="preview-fullscreen">')).toBe(true)
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
