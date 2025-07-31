import { Router, Request, Response } from 'express';
import { ActualBudgetService } from '../services/actualBudgetService';
import { UpBankService } from '../services/upBankService';
import { validateTransaction } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiResponse, HealthCheckResponse, TransactionRequest, UpBankWebhook } from '../types';

const router = Router();
const actualService = ActualBudgetService.getInstance();
const upBankService = UpBankService.getInstance();

// Health check endpoint
router.get('/healthcheck', (req: Request, res: Response): void => {
  const healthResponse: HealthCheckResponse = {
    status: actualService.isApiInitialized() ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    apiInitialized: actualService.isApiInitialized(),
    version: process.env.npm_package_version || '1.0.0',
  };

  const statusCode = healthResponse.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthResponse);
});

// Get accounts endpoint
router.get('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await actualService.getAccounts();
    
    const response: ApiResponse = {
      status: 'success',
      data: accounts,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error getting accounts:', error);
    
    const response: ApiResponse = {
      status: 'error',
      error: 'Failed to retrieve accounts',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(500).json(response);
  }
});

// Manual transaction creation endpoint
router.post('/transaction', async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Manual transaction request received:', req.body);

    const validation = validateTransaction(req.body);
    if (validation.error) {
      const response: ApiResponse = {
        status: 'error',
        error: 'Validation failed',
        message: validation.error,
      };
      res.status(400).json(response);
      return;
    }

    const transactionData = validation.value as TransactionRequest;
    
    await actualService.addTransaction(
      transactionData.account_id,
      transactionData.transaction_date,
      transactionData.amount,
      transactionData.payee,
      transactionData.notes,
      transactionData.imported_id
    );

    const response: ApiResponse = {
      status: 'success',
      message: 'Transaction created successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Error creating transaction:', error);
    
    const response: ApiResponse = {
      status: 'error',
      error: 'Failed to create transaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(500).json(response);
  }
});

// UpBank webhook endpoint
router.post('/webhook/upbank', async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('UpBank webhook received');

    // Validate webhook signature (implement in production)
    const signature = req.headers['x-up-authenticity-signature'] as string;
    if (!upBankService.validateWebhookSignature(JSON.stringify(req.body), signature)) {
      const response: ApiResponse = {
        status: 'error',
        error: 'Invalid webhook signature',
      };
      res.status(401).json(response);
      return;
    }

    const webhook: UpBankWebhook = req.body;
    const transactionData = await upBankService.processWebhook(webhook);

    if (!transactionData) {
      const response: ApiResponse = {
        status: 'success',
        message: 'Webhook processed, no transaction to import',
      };
      res.json(response);
      return;
    }

    // Validate the converted transaction data
    const validation = validateTransaction(transactionData);
    if (validation.error) {
      logger.error('UpBank transaction validation failed:', validation.error);
      const response: ApiResponse = {
        status: 'error',
        error: 'Transaction validation failed',
        message: validation.error,
      };
      res.status(400).json(response);
      return;
    }

    const validatedData = validation.value as TransactionRequest;
    
    await actualService.addTransaction(
      validatedData.account_id,
      validatedData.transaction_date,
      validatedData.amount,
      validatedData.payee,
      validatedData.notes,
      validatedData.imported_id
    );

    const response: ApiResponse = {
      status: 'success',
      message: 'UpBank transaction processed successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Error processing UpBank webhook:', error);
    
    const response: ApiResponse = {
      status: 'error',
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(500).json(response);
  }
});

// Legacy endpoint for backward compatibility
router.post('/', async (req: Request, res: Response): Promise<void> => {
  logger.warn('Legacy endpoint used, consider migrating to /transaction');
  
  // Process the same as transaction endpoint
  try {
    logger.info('Legacy transaction request received:', req.body);

    const validation = validateTransaction(req.body);
    if (validation.error) {
      const response: ApiResponse = {
        status: 'error',
        error: 'Validation failed',
        message: validation.error,
      };
      res.status(400).json(response);
      return;
    }

    const transactionData = validation.value as TransactionRequest;
    
    await actualService.addTransaction(
      transactionData.account_id,
      transactionData.transaction_date,
      transactionData.amount,
      transactionData.payee,
      transactionData.notes,
      transactionData.imported_id
    );

    const response: ApiResponse = {
      status: 'success',
      message: 'Transaction created successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Error creating transaction:', error);
    
    const response: ApiResponse = {
      status: 'error',
      error: 'Failed to create transaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(500).json(response);
  }
});

export default router;
