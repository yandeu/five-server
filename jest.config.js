module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['lib/*.js', 'lib/utils/*.js', 'lib/middleware/*.js'],
  maxWorkers: 1,
  testTimeout: 15_000
}
