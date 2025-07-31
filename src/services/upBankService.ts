import { UpBankWebhook, UpBankTransaction, TransactionRequest } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export class UpBankService {
  private static instance: UpBankService;

  private constructor() {}

  public static getInstance(): UpBankService {
    if (!UpBankService.instance) {
      UpBankService.instance = new UpBankService();
    }
    return UpBankService.instance;
  }

  public async processWebhook(webhook: UpBankWebhook): Promise<TransactionRequest | null> {
    try {
      logger.info('Processing UpBank webhook:', { eventType: webhook.data.attributes.eventType });

      // Only process transaction events
      if (webhook.data.attributes.eventType !== 'TRANSACTION_CREATED') {
        logger.info('Ignoring non-transaction webhook event');
        return null;
      }

      // Get transaction details from UpBank API
      const transactionId = webhook.data.relationships.transaction?.data.id;
      if (!transactionId) {
        logger.warn('No transaction ID found in webhook');
        return null;
      }

      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        logger.warn(`Could not retrieve transaction ${transactionId}`);
        return null;
      }

      return this.convertUpBankToActualTransaction(transaction);
    } catch (error) {
      logger.error('Error processing UpBank webhook:', error);
      throw error;
    }
  }

  private async getTransaction(transactionId: string): Promise<UpBankTransaction | null> {
    if (!config.upBankToken) {
      logger.error('UpBank token not configured');
      return null;
    }

    try {
      const response = await fetch(`https://api.up.com.au/api/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${config.upBankToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.error(`UpBank API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const transaction = await response.json() as UpBankTransaction;
      return transaction;
    } catch (error) {
      logger.error('Error fetching transaction from UpBank:', error);
      return null;
    }
  }

  private convertUpBankToActualTransaction(upBankTransaction: UpBankTransaction): TransactionRequest {
    const { attributes } = upBankTransaction.data;
    
    // Convert amount from cents to Actual Budget format
    const amount = attributes.amount.valueInBaseUnits;
    
    // Use description as payee, fallback to rawText or 'Unknown'
    const payee = attributes.description || attributes.rawText || 'Unknown';
    
    // Use message as notes if available
    const notes = attributes.message || '';
    
    // Use UpBank transaction ID as imported_id to prevent duplicates
    const imported_id = upBankTransaction.data.id;
    
    // Use creation date as transaction date
    const transaction_date = attributes.createdAt;
    
    // Use default account ID from config or throw error
    const account_id = config.defaultAccountId;
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

  public validateWebhookSignature(_payload: string, _signature: string): boolean {
    // TODO: Implement webhook signature validation
    // UpBank provides webhook signatures for security
    logger.warn('Webhook signature validation not implemented');
    return true;
  }
}
