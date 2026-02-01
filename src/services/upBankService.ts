import crypto from 'crypto';
import { UpBankWebhook, UpBankTransaction, TransactionRequest } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { normalizeTransactionDate } from '../utils/validation';

export class UpBankWebhookError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

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
        throw new UpBankWebhookError('No transaction ID found in webhook', 400);
      }

      const transaction = await this.getTransaction(transactionId);
      return this.convertUpBankToActualTransaction(transaction);
    } catch (error) {
      logger.error('Error processing UpBank webhook:', error);
      throw error;
    }
  }

  private async getTransaction(transactionId: string): Promise<UpBankTransaction> {
    if (!config.upBankToken) {
      throw new UpBankWebhookError('UpBank token not configured', 500);
    }

    const controller = new AbortController();
    const timeoutMs = 10000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`https://api.up.com.au/api/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${config.upBankToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.error(`UpBank API error: ${response.status} ${response.statusText}`);
        throw new UpBankWebhookError('UpBank API request failed', 502);
      }

      const transaction = await response.json() as UpBankTransaction;
      return transaction;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('UpBank API request timed out');
        throw new UpBankWebhookError('UpBank API request timed out', 504);
      }

      logger.error('Error fetching transaction from UpBank:', error);
      if (error instanceof UpBankWebhookError) {
        throw error;
      }
      throw new UpBankWebhookError('UpBank API request failed', 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  private convertUpBankToActualTransaction(upBankTransaction: UpBankTransaction): TransactionRequest {
    const { attributes } = upBankTransaction.data;
    
    // Use base units (already integer minor units) for Actual Budget import format
    const amount = attributes.amount.valueInBaseUnits;
    
    // Use description as payee, fallback to rawText or 'Unknown'
    const payee = attributes.description || attributes.rawText || 'Unknown';
    
    // Use message as notes if available
    const notes = attributes.message || '';
    
    // Use UpBank transaction ID as imported_id to prevent duplicates
    const imported_id = upBankTransaction.data.id;
    
    // Use creation date (normalized to YYYY-MM-DD) as transaction date
    const transaction_date = normalizeTransactionDate(attributes.createdAt);

    const account_id = this.resolveAccountId(upBankTransaction);

    return {
      account_id,
      transaction_date,
      amount,
      payee,
      notes,
      imported_id,
    };
  }

  private resolveAccountId(upBankTransaction: UpBankTransaction): string {
    const upBankAccountId = upBankTransaction.data.relationships.account?.data?.id;
    const accountMap = config.upBankAccountMap;

    if (accountMap && upBankAccountId && accountMap[upBankAccountId]) {
      return accountMap[upBankAccountId];
    }

    if (config.defaultAccountId) {
      return config.defaultAccountId;
    }

    if (accountMap && upBankAccountId) {
      throw new UpBankWebhookError(`No account mapping found for UpBank account ${upBankAccountId}`, 500);
    }

    throw new UpBankWebhookError('Default account ID not configured for UpBank integration', 500);
  }

  public validateWebhookSignature(payload: string, signatureHeader?: string): boolean {
    if (!signatureHeader) {
      logger.warn('Missing UpBank webhook signature');
      return false;
    }
    if (!config.upBankWebhookSecret) {
      logger.error('UpBank webhook secret not configured');
      return false;
    }

    const signature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice('sha256='.length)
      : signatureHeader;

    const computed = crypto
      .createHmac('sha256', config.upBankWebhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      logger.warn('Invalid UpBank webhook signature format');
      return false;
    }
  }
}
