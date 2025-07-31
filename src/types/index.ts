export interface Transaction {
  account: string;
  date: string;
  amount: number;
  payee_name: string;
  notes?: string;
  imported_id?: string;
}

export interface TransactionRequest {
  account_id: string;
  transaction_date: string;
  amount: number | string;
  payee: string;
  notes?: string;
  imported_id?: string;
}

export interface UpBankWebhook {
  data: {
    type: string;
    id: string;
    attributes: {
      eventType: string;
      createdAt: string;
    };
    relationships: {
      transaction?: {
        data: {
          type: string;
          id: string;
        };
      };
    };
  };
}

export interface UpBankTransaction {
  data: {
    type: string;
    id: string;
    attributes: {
      status: string;
      rawText: string | null;
      description: string;
      message: string | null;
      isCategorizable: boolean;
      holdInfo: any;
      roundUp: any;
      cashback: any;
      amount: {
        currencyCode: string;
        value: string;
        valueInBaseUnits: number;
      };
      foreignAmount: any;
      cardPurchaseMethod: any;
      settledAt: string | null;
      createdAt: string;
    };
    relationships: {
      account: {
        data: {
          type: string;
          id: string;
        };
      };
      transferAccount: any;
      category: any;
      parentCategory: any;
      tags: {
        data: any[];
      };
    };
  };
  included?: any[];
}

export interface Config {
  budgetId: string;
  serverUrl: string;
  serverPassword: string;
  port: number;
  nodeEnv: string;
  upBankToken?: string | undefined;
  defaultAccountId?: string | undefined;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  apiInitialized: boolean;
  version: string;
}
