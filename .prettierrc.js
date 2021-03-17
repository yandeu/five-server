module.exports = {
  ...require('@yandeu/prettier-config'),
  overrides: [
    {
      files: ['*.html'],
      options: { semi: true, singleQuote: false, trailingComma: 'all', arrowParens: 'always' }
    }
  ]
}
