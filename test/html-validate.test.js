const path = require('path')
const FiveServer = require('../lib').default
const puppeteer = require('puppeteer')
const pause = require('./helpers/pause')
const { readFile } = require('fs/promises')

jest.setTimeout(15_000)

const fiveServer = new FiveServer()
let browser
let page

const options = {
  root: path.join(__dirname, 'data'),
  port: 40200,
  open: false
}

// let remoteLog = []

beforeAll(async () => {
  await fiveServer.start(options)

  browser = await puppeteer.launch()
  page = await browser.newPage()
  //   page.on('console', msg => {
  //     remoteLog.push(msg.text())
  //   })
  await page.goto('http://localhost:40200/invalid-html.html', { waitUntil: 'networkidle2' })
})

describe('perform html validation', () => {
  it('should be connected to one client', () => {
    expect(fiveServer.wsc.length).toBe(1)
  })

  it('should report invalid html', async () => {
    const fileName = path.join(path.resolve(), 'test', 'data', 'index.html')
    const invalidFilePath = path.join(path.resolve(), 'test', 'data', 'invalid-html.html')
    const invalidFile = await readFile(invalidFilePath, { encoding: 'utf-8' })

    let valid = true
    let errorName = ''

    // init the workers to parse the body
    fiveServer.parseBody

    // contains the html-validate report
    fiveServer._parseBody.on('message', d => {
      const data = JSON.parse(d)
      const { report } = data

      if (report) {
        valid = report.valid
        report.results.forEach(r => {
          errorName = r.messages[0].ruleId
        })
      }
    })

    fiveServer.parseBody.updateBody(fileName, invalidFile)
    await pause(2000)

    expect(errorName).toBe('parser-error')
    expect(valid).toBeFalsy()
  })
})

afterAll(async () => {
  await fiveServer.shutdown()
  await browser.close()
})
