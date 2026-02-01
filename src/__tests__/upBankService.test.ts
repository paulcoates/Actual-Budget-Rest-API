import crypto from 'crypto';

const makeWebhook = () => ({
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
});

const makeTransaction = () => ({
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
});

const originalFetch = global.fetch;

describe('UpBankService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.UPBANK_TOKEN = 'test-upbank-token';
    process.env.UPBANK_WEBHOOK_SECRET = 'test-upbank-secret';
    process.env.DEFAULT_ACCOUNT_ID = 'actual-account-default';
    delete process.env.UPBANK_ACCOUNT_MAP;
  });

  afterEach(() => {
    if (typeof (global.fetch as any)?.mockRestore === 'function') {
      (global.fetch as jest.Mock).mockRestore();
    }
    global.fetch = originalFetch;
  });

  it('validates webhook signatures', async () => {
    const { UpBankService } = await import('../services/upBankService');
    const service = UpBankService.getInstance();
    const payload = JSON.stringify(makeWebhook());
    const signature = crypto
      .createHmac('sha256', process.env.UPBANK_WEBHOOK_SECRET as string)
      .update(payload)
      .digest('hex');

    expect(service.validateWebhookSignature(payload, signature)).toBe(true);
    expect(service.validateWebhookSignature(payload, 'invalid')).toBe(false);
  });

  it('maps UpBank account IDs using UPBANK_ACCOUNT_MAP', async () => {
    process.env.UPBANK_ACCOUNT_MAP = JSON.stringify({
      'up-account-1': 'actual-account-1',
    });
    delete process.env.DEFAULT_ACCOUNT_ID;

    const { UpBankService } = await import('../services/upBankService');
    const service = UpBankService.getInstance();

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => makeTransaction(),
    });

    const result = await service.processWebhook(makeWebhook() as any);
    expect(result?.account_id).toBe('actual-account-1');
  });

  it('returns null for non-transaction webhooks', async () => {
    const { UpBankService } = await import('../services/upBankService');
    const service = UpBankService.getInstance();
    const webhook = makeWebhook();
    webhook.data.attributes.eventType = 'PING';

    const result = await service.processWebhook(webhook as any);
    expect(result).toBeNull();
  });
});
