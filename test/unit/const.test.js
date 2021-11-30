const { readFile } = require('fs/promises')
const { NAME, VERSION } = require('../../lib/const')

describe('const.ts', () => {
  test('name and version', async () => {
    const pkg = await readFile('package.json', { encoding: 'utf-8' })
    const json = JSON.parse(pkg)

    expect(json.version).toBe(VERSION)
    expect(json.name).toBe(NAME)
  })
})
