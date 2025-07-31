// Set test environment
process.env.NODE_ENV = 'test';
process.env.BUDGET_ID = 'test-budget-id';
process.env.SERVER_URL = 'http://localhost:5006';
process.env.SERVER_PASSWORD = 'test-password';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Actual Budget API
jest.mock('@actual-app/api', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  downloadBudget: jest.fn().mockResolvedValue(undefined),
  importTransactions: jest.fn().mockResolvedValue(undefined),
  getAccounts: jest.fn().mockResolvedValue([
    { id: 'account-1', name: 'Test Account 1' },
    { id: 'account-2', name: 'Test Account 2' },
  ]),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));
