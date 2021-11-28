module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['lib/*.js', 'lib/**/*.js', '!lib/dependencies/**', '!lib/bin.js'],
  coverageReporters: ['html', 'lcov', 'text'],
  maxConcurrency: 1,
  maxWorkers: 1,
  testTimeout: 30_000
}
