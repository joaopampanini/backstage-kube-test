// Jest setup for platform-insights-backend plugin tests

// Set test timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

export {};
