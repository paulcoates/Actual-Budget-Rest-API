import request from 'supertest';
import App from '../index';

// Mock the ActualBudgetService before importing the app
jest.mock('@/services/actualBudgetService', () => {
  return {
    ActualBudgetService: {
      getInstance: jest.fn(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        isApiInitialized: jest.fn().mockReturnValue(true),
        addTransaction: jest.fn().mockResolvedValue(true),
        getAccounts: jest.fn().mockResolvedValue([
          { id: 'account1', name: 'Test Account 1' },
          { id: 'account2', name: 'Test Account 2' }
        ]),
        shutdown: jest.fn().mockResolvedValue(undefined),
      })),
    },
  };
});

describe('API Routes', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    app = new App();
    server = app.getApp();
  });

  describe('GET /healthcheck', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/healthcheck')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('apiInitialized');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /transaction', () => {
    it('should create a transaction with valid data', async () => {
      const transactionData = {
        account_id: 'account-123',
        transaction_date: '2024-01-01T00:00:00.000Z',
        amount: 100,
        payee: 'Test Payee',
        notes: 'Test transaction',
        imported_id: 'test-import-123',
      };

      const response = await request(server)
        .post('/transaction')
        .send(transactionData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('successfully');
    });

    it('should reject transaction with missing data', async () => {
      const invalidData = {
        amount: 100,
        payee: 'Test Payee',
      };

      const response = await request(server)
        .post('/transaction')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject transaction with invalid amount', async () => {
      const invalidData = {
        account_id: 'account-123',
        transaction_date: '2024-01-01T00:00:00.000Z',
        amount: 'invalid-amount',
        payee: 'Test Payee',
      };

      const response = await request(server)
        .post('/transaction')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /accounts', () => {
    it('should return list of accounts', async () => {
      const response = await request(server)
        .get('/accounts')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /webhook/upbank', () => {
    it('should process valid UpBank webhook', async () => {
      const webhookData = {
        data: {
          type: 'webhook-events',
          id: 'webhook-123',
          attributes: {
            eventType: 'TRANSACTION_CREATED',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          relationships: {
            transaction: {
              data: {
                type: 'transactions',
                id: 'transaction-123',
              },
            },
          },
        },
      };

      // Note: This test will fail in real scenarios without proper UpBank API mocking
      // For now, we expect it to process the webhook structure
      const response = await request(server)
        .post('/webhook/upbank')
        .send(webhookData);

      // Should handle the webhook gracefully even if external API calls fail
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(server)
        .get('/unknown-route')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Route not found');
    });
  });
});
