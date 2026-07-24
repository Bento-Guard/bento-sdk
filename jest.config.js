/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/?(*.)+(spec|test).ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@solana/web3.js|jayson|rpc-websockets|bs58)/)'
  ],
};
