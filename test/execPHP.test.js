const path = require('path')
const os = require('os')
const { ExecPHP } = require('../lib/utils/execPHP')

let phpPath = os.platform() === 'win32' ? 'C:\\tools\\php81\\php.exe' : '/usr/bin/php'

const PHP = new ExecPHP()
PHP.php = phpPath

const mock_res = {
  status: _status => {}
}

describe('parse from file', function () {
  it('should work', async () => {
    const html = await PHP.parseFile(path.join(__dirname, 'data/bonjour.php'), mock_res)
    expect(html).toContain(`<p>Bonjour le monde!</p>`)
  })
})
