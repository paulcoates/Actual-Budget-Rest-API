"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const actualBudgetService_1 = require("../services/actualBudgetService");
const upBankService_1 = require("../services/upBankService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const actualService = actualBudgetService_1.ActualBudgetService.getInstance();
const upBankService = upBankService_1.UpBankService.getInstance();
router.get('/healthcheck', (req, res) => {
    const healthResponse = {
        status: actualService.isApiInitialized() ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        apiInitialized: actualService.isApiInitialized(),
        version: process.env.npm_package_version || '1.0.0',
    };
    const statusCode = healthResponse.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthResponse);
});
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await actualService.getAccounts();
        const response = {
            status: 'success',
            data: accounts,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Error getting accounts:', error);
        const response = {
            status: 'error',
            error: 'Failed to retrieve accounts',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});
router.post('/transaction', async (req, res) => {
    try {
        logger_1.logger.info('Manual transaction request received:', req.body);
        const validation = (0, validation_1.validateTransaction)(req.body);
        if (validation.error) {
            const response = {
                status: 'error',
                error: 'Validation failed',
                message: validation.error,
            };
            res.status(400).json(response);
            return;
        }
        const transactionData = validation.value;
        await actualService.addTransaction(transactionData.account_id, transactionData.transaction_date, transactionData.amount, transactionData.payee, transactionData.notes, transactionData.imported_id);
        const response = {
            status: 'success',
            message: 'Transaction created successfully',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Error creating transaction:', error);
        const response = {
            status: 'error',
            error: 'Failed to create transaction',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});
router.post('/webhook/upbank', async (req, res) => {
    try {
        logger_1.logger.info('UpBank webhook received');
        const signature = req.headers['x-up-authenticity-signature'];
        if (!upBankService.validateWebhookSignature(JSON.stringify(req.body), signature)) {
            const response = {
                status: 'error',
                error: 'Invalid webhook signature',
            };
            res.status(401).json(response);
            return;
        }
        const webhook = req.body;
        const transactionData = await upBankService.processWebhook(webhook);
        if (!transactionData) {
            const response = {
                status: 'success',
                message: 'Webhook processed, no transaction to import',
            };
            res.json(response);
            return;
        }
        const validation = (0, validation_1.validateTransaction)(transactionData);
        if (validation.error) {
            logger_1.logger.error('UpBank transaction validation failed:', validation.error);
            const response = {
                status: 'error',
                error: 'Transaction validation failed',
                message: validation.error,
            };
            res.status(400).json(response);
            return;
        }
        const validatedData = validation.value;
        await actualService.addTransaction(validatedData.account_id, validatedData.transaction_date, validatedData.amount, validatedData.payee, validatedData.notes, validatedData.imported_id);
        const response = {
            status: 'success',
            message: 'UpBank transaction processed successfully',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Error processing UpBank webhook:', error);
        const response = {
            status: 'error',
            error: 'Failed to process webhook',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});
router.post('/', async (req, res) => {
    logger_1.logger.warn('Legacy endpoint used, consider migrating to /transaction');
    try {
        logger_1.logger.info('Legacy transaction request received:', req.body);
        const validation = (0, validation_1.validateTransaction)(req.body);
        if (validation.error) {
            const response = {
                status: 'error',
                error: 'Validation failed',
                message: validation.error,
            };
            res.status(400).json(response);
            return;
        }
        const transactionData = validation.value;
        await actualService.addTransaction(transactionData.account_id, transactionData.transaction_date, transactionData.amount, transactionData.payee, transactionData.notes, transactionData.imported_id);
        const response = {
            status: 'success',
            message: 'Transaction created successfully',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Error creating transaction:', error);
        const response = {
            status: 'error',
            error: 'Failed to create transaction',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map