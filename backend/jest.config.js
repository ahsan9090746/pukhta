/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // sanitize-html and its htmlparser2 dependency chain ship as ESM-only
    // packages; ts-jest (with allowJs) transpiles them to CJS for Jest.
    '^.+\\.[cm]?js$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(sanitize-html|htmlparser2|entities|domelementtype|domhandler|domutils|dom-serializer)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/seeds/**',
    '!src/config/**',
    '!src/socket/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  // Run suites sequentially (single worker): all suites share the local
  // footware_test database and wipe users/roles in beforeAll, so parallel
  // runs collide (E11000 duplicate key on roles.name_1).
  maxWorkers: 1,
  testTimeout: 30000,
};
