const { resolve } = require('path')

module.exports = {
  mode: 'production',
  entry: './client/injected.ts',
  output: {
    filename: 'injected.js',
    path: resolve(__dirname, 'client')
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [{ test: /\.tsx?$/, loader: 'ts-loader', options: { configFile: 'tsconfig.client.json' } }]
  }
}
