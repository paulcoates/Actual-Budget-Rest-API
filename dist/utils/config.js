"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isDevelopment = exports.isProduction = exports.validateConfig = exports.config = void 0;
exports.config = {
    budgetId: process.env.BUDGET_ID || '',
    serverUrl: process.env.SERVER_URL || '',
    serverPassword: process.env.SERVER_PASSWORD || '',
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    upBankToken: process.env.UPBANK_TOKEN,
    defaultAccountId: process.env.DEFAULT_ACCOUNT_ID,
};
const validateConfig = () => {
    const requiredFields = ['budgetId', 'serverUrl', 'serverPassword'];
    for (const field of requiredFields) {
        if (!exports.config[field]) {
            throw new Error(`Missing required environment variable: ${field.toUpperCase()}`);
        }
    }
};
exports.validateConfig = validateConfig;
const isProduction = () => exports.config.nodeEnv === 'production';
exports.isProduction = isProduction;
const isDevelopment = () => exports.config.nodeEnv === 'development';
exports.isDevelopment = isDevelopment;
const isTest = () => exports.config.nodeEnv === 'test';
exports.isTest = isTest;
//# sourceMappingURL=config.js.map