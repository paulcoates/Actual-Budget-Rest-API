import request from 'supertest';
import App from '../index';
import crypto from 'crypto';
import { UpBankService } from '../services/upBankService';

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

jest.mock('../services/upBankService', () => {
  const actual = jest.requireActual('../services/upBankService');
  const instance = {
    processWebhook: jest.fn(),
    validateWebhookSignature: jest.fn(),
  };
  return {
    ...actual,
    UpBankService: {
      getInstance: jest.fn(() => instance),
    },
  };
});

describe('API Routes', () => {
  let app: App;
  let server: any;
  let processWebhookMock: jest.Mock;
  let validateWebhookSignatureMock: jest.Mock;
  const webhookSecret = process.env.UPBANK_WEBHOOK_SECRET || 'test-upbank-secret';

  beforeAll(async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          type: 'transactions',
          id: 'transaction-123',
          attributes: {
            status: 'SETTLED',
            rawText: 'Test',
            description: 'Test Description',
            message: 'Test Message',
            isCategorizable: true,
            holdInfo: null,
            roundUp: null,
            cashback: null,
            amount: {
              currencyCode: 'AUD',
              value: '10.00',
              valueInBaseUnits: 1000,
            },
            foreignAmount: null,
            cardPurchaseMethod: null,
            settledAt: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          relationships: {
            account: {
              data: {
                type: 'accounts',
                id: 'up-account-1',
              },
            },
            transferAccount: null,
            category: null,
            parentCategory: null,
            tags: { data: [] },
          },
        },
      }),
    });

    app = new App();
    server = app.getApp();
    const upBankService = UpBankService.getInstance() as unknown as {
      processWebhook: jest.Mock;
      validateWebhookSignature: jest.Mock;
    };
    processWebhookMock = upBankService.processWebhook;
    validateWebhookSignatureMock = upBankService.validateWebhookSignature;
    validateWebhookSignatureMock.mockReturnValue(true);
    processWebhookMock.mockResolvedValue(null);
  });

  afterEach(() => {
    processWebhookMock?.mockReset();
    validateWebhookSignatureMock?.mockReset();
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
      expect(response.body.message).toContain('Account ID is required');
      expect(response.body.message).toContain('Transaction date is required');
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
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('fails to match the required pattern');
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
      validateWebhookSignatureMock.mockReturnValueOnce(true);
      processWebhookMock.mockResolvedValueOnce({
        account_id: 'account-123',
        transaction_date: '2024-01-01',
        amount: 1000,
        payee: 'Test Payee',
        notes: 'Test Message',
        imported_id: 'transaction-123',
      });

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

      const rawBody = JSON.stringify(webhookData);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const response = await request(server)
        .post('/webhook/upbank')
        .set('Content-Type', 'application/json')
        .set('x-up-authenticity-signature', signature)
        .send(rawBody);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should reject webhook with invalid signature', async () => {
      validateWebhookSignatureMock.mockReturnValueOnce(false);
      const webhookData = {
        data: {
          type: 'webhook-events',
          id: 'webhook-456',
          attributes: {
            eventType: 'TRANSACTION_CREATED',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          relationships: {
            transaction: {
              data: {
                type: 'transactions',
                id: 'transaction-456',
              },
            },
          },
        },
      };

      const response = await request(server)
        .post('/webhook/upbank')
        .set('Content-Type', 'application/json')
        .set('x-up-authenticity-signature', 'invalid-signature')
        .send(JSON.stringify(webhookData))
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Invalid webhook signature');
    });

    it('should reject webhook transaction with invalid amount', async () => {
      validateWebhookSignatureMock.mockReturnValueOnce(true);
      processWebhookMock.mockResolvedValueOnce({
        account_id: 'account-123',
        transaction_date: '2024-01-01',
        amount: 'invalid-amount',
        payee: 'Test Payee',
        notes: 'Test Message',
        imported_id: 'transaction-123',
      });

      const webhookData = {
        data: {
          type: 'webhook-events',
          id: 'webhook-789',
          attributes: {
            eventType: 'TRANSACTION_CREATED',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          relationships: {
            transaction: {
              data: {
                type: 'transactions',
                id: 'transaction-789',
              },
            },
          },
        },
      };

      const response = await request(server)
        .post('/webhook/upbank')
        .set('Content-Type', 'application/json')
        .set('x-up-authenticity-signature', 'valid-signature')
        .send(JSON.stringify(webhookData))
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Transaction validation failed');
      expect(String(response.body.message).toLowerCase()).toContain('amount');
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
