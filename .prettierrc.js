module.exports = {
  ...require('@yandeu/prettier-config'),
  endOfLine: 'auto',
  overrides: [
    {
      files: ['*.html', 'injected.js'],
      options: { semi: true, singleQuote: false, trailingComma: 'all', arrowParens: 'always' }
    }
  ]
}
