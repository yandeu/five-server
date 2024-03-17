const path = require('path')
const { defaultPHPPath } = require('../lib/misc')
const { ExecPHP } = require('../lib/utils/execPHP')

let phpPath = defaultPHPPath()

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

  it('should work with relative import paths', async () => {
    const html = await PHP.parseFile(path.join(__dirname, 'data/sub/content.php'), mock_res)
    expect(html.replace(/\r?\n/g, '')).toContain('<p>I am the header</p><p>I am the content</p>')
  })
})
