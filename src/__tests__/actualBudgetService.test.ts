import { ActualBudgetService } from '../services/actualBudgetService';

// Mock the API module
jest.mock('@actual-app/api');

describe('ActualBudgetService', () => {
  let service: ActualBudgetService;

  beforeEach(() => {
    service = ActualBudgetService.getInstance();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the service successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isApiInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      const firstInitialization = service.isApiInitialized();
      
      await service.initialize();
      expect(service.isApiInitialized()).toBe(firstInitialization);
    });
  });

  describe('addTransaction', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add a transaction successfully', async () => {
      const result = await service.addTransaction(
        'account-123',
        '2024-01-01',
        100,
        'Test Payee',
        'Test notes',
        'import-123'
      );

      expect(result).toBe(true);
    });

    it('should throw error if API not initialized', async () => {
      const uninitializedService = new (ActualBudgetService as any)();
      
      await expect(
        uninitializedService.addTransaction(
          'account-123',
          '2024-01-01',
          100,
          'Test Payee'
        )
      ).rejects.toThrow('API not initialized');
    });

    it('should validate empty account ID', async () => {
      await expect(
        service.addTransaction('', '2024-01-01', 100, 'Test Payee')
      ).rejects.toThrow('Invalid AccountId');
    });

    it('should validate empty payee', async () => {
      await expect(
        service.addTransaction('account-123', '2024-01-01', 100, '')
      ).rejects.toThrow('Invalid Payee');
    });

    it('should convert string amount to number', async () => {
      const result = await service.addTransaction(
        'account-123',
        '2024-01-01',
        '100.50',
        'Test Payee'
      );

      expect(result).toBe(true);
    });
  });

  describe('getAccounts', () => {
    it('should return accounts list', async () => {
      const accounts = await service.getAccounts();
      expect(Array.isArray(accounts)).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await service.initialize();
      await expect(service.shutdown()).resolves.not.toThrow();
      expect(service.isApiInitialized()).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});
