module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['lib/*.js', 'lib/utils/*.js', 'lib/middleware/*.js'],
  coverageReporters: ['html', 'lcov', 'text'],
  maxConcurrency: 1,
  maxWorkers: 1,
  testTimeout: 30_000
}
