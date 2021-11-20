module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['lib/*.js', 'lib/utils/*.js', 'lib/middleware/*.js'],
  maxConcurrency: 1,
  maxWorkers: 1,
  testTimeout: 30_000
}
