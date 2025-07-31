"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpBankService = void 0;
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
class UpBankService {
    constructor() { }
    static getInstance() {
        if (!UpBankService.instance) {
            UpBankService.instance = new UpBankService();
        }
        return UpBankService.instance;
    }
    async processWebhook(webhook) {
        try {
            logger_1.logger.info('Processing UpBank webhook:', { eventType: webhook.data.attributes.eventType });
            if (webhook.data.attributes.eventType !== 'TRANSACTION_CREATED') {
                logger_1.logger.info('Ignoring non-transaction webhook event');
                return null;
            }
            const transactionId = webhook.data.relationships.transaction?.data.id;
            if (!transactionId) {
                logger_1.logger.warn('No transaction ID found in webhook');
                return null;
            }
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                logger_1.logger.warn(`Could not retrieve transaction ${transactionId}`);
                return null;
            }
            return this.convertUpBankToActualTransaction(transaction);
        }
        catch (error) {
            logger_1.logger.error('Error processing UpBank webhook:', error);
            throw error;
        }
    }
    async getTransaction(transactionId) {
        if (!config_1.config.upBankToken) {
            logger_1.logger.error('UpBank token not configured');
            return null;
        }
        try {
            const response = await fetch(`https://api.up.com.au/api/v1/transactions/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${config_1.config.upBankToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                logger_1.logger.error(`UpBank API error: ${response.status} ${response.statusText}`);
                return null;
            }
            const transaction = await response.json();
            return transaction;
        }
        catch (error) {
            logger_1.logger.error('Error fetching transaction from UpBank:', error);
            return null;
        }
    }
    convertUpBankToActualTransaction(upBankTransaction) {
        const { attributes } = upBankTransaction.data;
        const amount = attributes.amount.valueInBaseUnits;
        const payee = attributes.description || attributes.rawText || 'Unknown';
        const notes = attributes.message || '';
        const imported_id = upBankTransaction.data.id;
        const transaction_date = attributes.createdAt;
        const account_id = config_1.config.defaultAccountId;
        if (!account_id) {
            throw new Error('Default account ID not configured for UpBank integration');
        }
        return {
            account_id,
            transaction_date,
            amount,
            payee,
            notes,
            imported_id,
        };
    }
    validateWebhookSignature(_payload, _signature) {
        logger_1.logger.warn('Webhook signature validation not implemented');
        return true;
    }
}
exports.UpBankService = UpBankService;
//# sourceMappingURL=upBankService.js.map