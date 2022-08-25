const { injectHighlight } = require('../lib/workers/parseBody')

// see: https://github.com/yandeu/five-server-vscode/issues/22

// <body> is line 0

const body = /* html */ `<body>
<p>Working normally <br> Still Working</p>
<p>With <b>bold</b> also</p>
<p>With <b>bold</b> and <br> lineBreak not</p>
<p>with <b>bold</b> and <br> linebreak <b>again bold not</b></p>
<p>With break<br> and break<br> not</p>
<p>With <b>bold</b> and <b>bold not</b></p>
<p>A <span>span</span> and a <span>span</span> not</p>
</body>`

it('should work', () => {
  const parsed = injectHighlight(body, { line: 1, character: 4 })
  const expected = body.replace(
    '<p>Working normally <br> Still Working</p>',
    '<p data-highlight="true">Working normally <br> Still Working</p>'
  )
  expect(expected).toBe(parsed)
})

it('should work', () => {
  const parsed = injectHighlight(body, { line: 2, character: 12 })
  const expected = body.replace('<p>With <b>bold</b> also</p>', '<p>With <b data-highlight="true">bold</b> also</p>')
  expect(expected).toBe(parsed)
})

it('should work', () => {
  const parsed = injectHighlight(body, { line: 7, character: 36 })
  const expected = body.replace(
    '<p>A <span>span</span> and a <span>span</span> not</p>',
    '<p>A <span>span</span> and a <span data-highlight="true">span</span> not</p>'
  )
  expect(expected).toBe(parsed)
})

it('should work', () => {
  const parsed = injectHighlight(body, { line: 7, character: 24 })
  const expected = body.replace(
    '<p>A <span>span</span> and a <span>span</span> not</p>',
    '<p data-highlight="true">A <span>span</span> and a <span>span</span> not</p>'
  )
  expect(expected).toBe(parsed)
})
