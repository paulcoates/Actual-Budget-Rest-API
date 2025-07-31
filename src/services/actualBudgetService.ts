import * as actual from '@actual-app/api';
import { Transaction } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { validateAmount, validateEmpty } from '../utils/validation';

export class ActualBudgetService {
  private static instance: ActualBudgetService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ActualBudgetService {
    if (!ActualBudgetService.instance) {
      ActualBudgetService.instance = new ActualBudgetService();
    }
    return ActualBudgetService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('API already initialized');
      return;
    }

    try {
      logger.info(`Connecting to server ${config.serverUrl}`);
      
      await actual.init({
        dataDir: '/tmp/actual',
        serverURL: config.serverUrl,
        password: config.serverPassword,
      });

      logger.info('API initialized successfully');
      
      logger.info('Downloading budget');
      await actual.downloadBudget(config.budgetId);
      logger.info('Budget downloaded successfully');
      
      this.isInitialized = true;
    } catch (error) {
      logger.error('Error initializing API:', error);
      throw new Error(`Error initializing API: ${error}`);
    }
  }

  public async addTransaction(
    accountId: string,
    transactionDate: string,
    amount: number | string,
    payee: string,
    notes?: string,
    importedId?: string
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('API not initialized');
    }

    try {
      const validatedAmount = validateAmount(amount);
      const validatedAccountId = validateEmpty('AccountId', accountId);
      const validatedPayee = validateEmpty('Payee', payee);

      const transaction: Transaction = {
        account: validatedAccountId,
        date: transactionDate,
        amount: validatedAmount,
        payee_name: validatedPayee,
        notes: notes || '',
        ...(importedId && { imported_id: importedId }),
      };

      logger.info(
        `Processing transaction: ${transaction.date} - ${transaction.amount} - ${transaction.payee_name} - ${transaction.notes} - ${transaction.imported_id}`
      );

      await actual.importTransactions(validatedAccountId, [transaction]);
      logger.info('Transaction imported successfully');
      
      return true;
    } catch (error) {
      logger.error('Error importing transaction:', error);
      throw new Error(`Error importing transaction: ${error}`);
    }
  }

  public async getAccounts(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await actual.downloadBudget(config.budgetId);
      const accounts = await actual.getAccounts();
      logger.info(`Retrieved ${accounts.length} accounts`);
      return accounts;
    } catch (error) {
      logger.error('Error getting accounts:', error);
      throw new Error(`Error getting accounts: ${error}`);
    }
  }

  public async shutdown(): Promise<void> {
    if (this.isInitialized) {
      try {
        await actual.shutdown();
        this.isInitialized = false;
        logger.info('API shutdown completed');
      } catch (error) {
        logger.error('Error shutting down API:', error);
      }
    }
  }

  public isApiInitialized(): boolean {
    return this.isInitialized;
  }
}
