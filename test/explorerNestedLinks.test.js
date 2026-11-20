const path = require('path')
const fs = require('fs')
const os = require('os')

// Issue #168: nested directory listings produced links like "//test/1.html/" on Windows.
// The default baseURL is "/", so the listing joins "/" and "/test/" into "//test/".
// Windows path.normalize keeps a leading "//" as a UNC prefix and appends a trailing slash.
// Linux path.normalize collapses it, so this test simulates Windows normalize and sep.

const stylesheet = path.join(__dirname, '../public/serve-explorer/style.css')
const template = path.join(__dirname, '../public/serve-explorer/explorer.html')

const loadExplorerWithWindowsNormalize = () => {
  let explorer
  jest.isolateModules(() => {
    jest.doMock('path', () => {
      const actual = jest.requireActual('path')
      return { ...actual, normalize: actual.win32.normalize, sep: '\\' }
    })
    explorer = require('../lib/middleware/explorer').default
    jest.dontMock('path')
  })
  return explorer
}

const renderListing = (explorer, dirPath, files, baseURL, directory) =>
  new Promise((resolve, reject) => {
    const res = {
      setHeader: () => {},
      end: body => resolve(body)
    }
    explorer.html(
      {},
      res,
      files,
      err => reject(err || new Error('explorer called next')),
      directory,
      baseURL,
      true,
      undefined,
      dirPath,
      'tiles',
      template,
      stylesheet
    )
  })

describe('explorer nested directory links (issue #168)', () => {
  let fixtureDir

  beforeAll(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-server-168-'))
    const nested = path.join(fixtureDir, 'test')
    fs.mkdirSync(nested)
    for (const name of ['1.html', '2.html', '3.html', 'TODO.md']) {
      fs.writeFileSync(path.join(fixtureDir, name), 'x')
      fs.writeFileSync(path.join(nested, name), 'x')
    }
  })

  afterAll(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true })
  })

  it('renders correct relative links for a nested directory with the default baseURL', async () => {
    const explorer = loadExplorerWithWindowsNormalize()
    const body = await renderListing(
      explorer,
      path.join(fixtureDir, 'test'),
      ['1.html', '2.html', '3.html', 'TODO.md'],
      '/',
      '/test/'
    )

    const hrefs = [...body.matchAll(/<a href="([^"]*)" class="[^"]*" title="[^"]*">/g)].map(m => m[1])

    expect(hrefs).toEqual(['/', '/test/1.html', '/test/2.html', '/test/3.html', '/test/TODO.md.preview'])
  })
})
