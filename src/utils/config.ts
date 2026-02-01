import { Config } from '../types';

const parseUpBankAccountMap = (): Record<string, string> | undefined => {
  const raw = process.env.UPBANK_ACCOUNT_MAP;
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('UPBANK_ACCOUNT_MAP must be a JSON object');
    }

    const entries = Object.entries(parsed);
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('UPBANK_ACCOUNT_MAP values must be strings');
      }
    }

    return parsed as Record<string, string>;
  } catch (error) {
    throw new Error(`Invalid UPBANK_ACCOUNT_MAP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

export const config: Config = {
  budgetId: process.env.BUDGET_ID || '',
  serverUrl: process.env.SERVER_URL || '',
  serverPassword: process.env.SERVER_PASSWORD || '',
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  upBankToken: process.env.UPBANK_TOKEN,
  upBankWebhookSecret: process.env.UPBANK_WEBHOOK_SECRET,
  defaultAccountId: process.env.DEFAULT_ACCOUNT_ID,
  upBankAccountMap: parseUpBankAccountMap(),
  verifyUpBankWebhookSignature: parseBoolean(process.env.UPBANK_VERIFY_WEBHOOK_SIGNATURE, true),
  logSensitiveData: parseBoolean(process.env.LOG_SENSITIVE_DATA, false),
};

export const validateConfig = (): void => {
  const requiredFields: (keyof Config)[] = ['budgetId', 'serverUrl', 'serverPassword'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required environment variable: ${field.toUpperCase()}`);
    }
  }

  const upBankEnabled = Boolean(config.upBankToken || config.upBankWebhookSecret);
  if (upBankEnabled) {
    if (!config.upBankToken) {
      throw new Error('Missing required environment variable: UPBANK_TOKEN');
    }
    if (config.verifyUpBankWebhookSignature && !config.upBankWebhookSecret) {
      throw new Error('Missing required environment variable: UPBANK_WEBHOOK_SECRET');
    }
    const hasAccountMap = config.upBankAccountMap && Object.keys(config.upBankAccountMap).length > 0;
    if (!config.defaultAccountId && !hasAccountMap) {
      throw new Error('Missing required environment variable: DEFAULT_ACCOUNT_ID or UPBANK_ACCOUNT_MAP');
    }
  }
};

export const isProduction = (): boolean => config.nodeEnv === 'production';
export const isDevelopment = (): boolean => config.nodeEnv === 'development';
export const isTest = (): boolean => config.nodeEnv === 'test';
