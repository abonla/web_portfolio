module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  transformIgnorePatterns: ['node_modules/(?!(uuid|cheerio)/)'],
};
