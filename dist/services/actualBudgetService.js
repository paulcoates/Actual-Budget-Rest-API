"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActualBudgetService = void 0;
const actual = __importStar(require("@actual-app/api"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
class ActualBudgetService {
    constructor() {
        this.isInitialized = false;
    }
    static getInstance() {
        if (!ActualBudgetService.instance) {
            ActualBudgetService.instance = new ActualBudgetService();
        }
        return ActualBudgetService.instance;
    }
    async initialize() {
        if (this.isInitialized) {
            logger_1.logger.info('API already initialized');
            return;
        }
        try {
            logger_1.logger.info(`Connecting to server ${config_1.config.serverUrl}`);
            await actual.init({
                dataDir: '/tmp/actual',
                serverURL: config_1.config.serverUrl,
                password: config_1.config.serverPassword,
            });
            logger_1.logger.info('API initialized successfully');
            logger_1.logger.info('Downloading budget');
            await actual.downloadBudget(config_1.config.budgetId);
            logger_1.logger.info('Budget downloaded successfully');
            this.isInitialized = true;
        }
        catch (error) {
            logger_1.logger.error('Error initializing API:', error);
            throw new Error(`Error initializing API: ${error}`);
        }
    }
    async addTransaction(accountId, transactionDate, amount, payee, notes, importedId) {
        if (!this.isInitialized) {
            throw new Error('API not initialized');
        }
        try {
            const validatedAmount = (0, validation_1.validateAmount)(amount);
            const validatedAccountId = (0, validation_1.validateEmpty)('AccountId', accountId);
            const validatedPayee = (0, validation_1.validateEmpty)('Payee', payee);
            const transaction = {
                account: validatedAccountId,
                date: transactionDate,
                amount: validatedAmount,
                payee_name: validatedPayee,
                notes: notes || '',
                ...(importedId && { imported_id: importedId }),
            };
            logger_1.logger.info(`Processing transaction: ${transaction.date} - ${transaction.amount} - ${transaction.payee_name} - ${transaction.notes} - ${transaction.imported_id}`);
            await actual.importTransactions(validatedAccountId, [transaction]);
            logger_1.logger.info('Transaction imported successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error importing transaction:', error);
            throw new Error(`Error importing transaction: ${error}`);
        }
    }
    async getAccounts() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            await actual.downloadBudget(config_1.config.budgetId);
            const accounts = await actual.getAccounts();
            logger_1.logger.info(`Retrieved ${accounts.length} accounts`);
            return accounts;
        }
        catch (error) {
            logger_1.logger.error('Error getting accounts:', error);
            throw new Error(`Error getting accounts: ${error}`);
        }
    }
    async shutdown() {
        if (this.isInitialized) {
            try {
                await actual.shutdown();
                this.isInitialized = false;
                logger_1.logger.info('API shutdown completed');
            }
            catch (error) {
                logger_1.logger.error('Error shutting down API:', error);
            }
        }
    }
    isApiInitialized() {
        return this.isInitialized;
    }
}
exports.ActualBudgetService = ActualBudgetService;
//# sourceMappingURL=actualBudgetService.js.map