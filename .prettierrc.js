module.exports = {
  ...require('@yandeu/prettier-config'),
  endOfLine: 'lf',
  overrides: [
    {
      files: ['*.html', 'injected.js'],
      options: { semi: true, singleQuote: false, trailingComma: 'all', arrowParens: 'always' }
    }
  ]
}
