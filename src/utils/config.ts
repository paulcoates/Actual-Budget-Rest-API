import { Config } from '../types';

export const config: Config = {
  budgetId: process.env.BUDGET_ID || '',
  serverUrl: process.env.SERVER_URL || '',
  serverPassword: process.env.SERVER_PASSWORD || '',
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  upBankToken: process.env.UPBANK_TOKEN,
  defaultAccountId: process.env.DEFAULT_ACCOUNT_ID,
};

export const validateConfig = (): void => {
  const requiredFields: (keyof Config)[] = ['budgetId', 'serverUrl', 'serverPassword'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required environment variable: ${field.toUpperCase()}`);
    }
  }
};

export const isProduction = (): boolean => config.nodeEnv === 'production';
export const isDevelopment = (): boolean => config.nodeEnv === 'development';
export const isTest = (): boolean => config.nodeEnv === 'test';
