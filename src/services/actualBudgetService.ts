// v26.4.0 exposes TypeScript source through transitive types; use runtime import to avoid compiling dependency internals.
const actual: any = require('@actual-app/api');
const actualApiPackage: { version: string } = (() => {
  try {
    return require('@actual-app/api/package.json');
  } catch {
    return { version: 'unknown' };
  }
})();
import { ActualServiceError, ActualServiceHealth, Transaction } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { normalizeTransactionDate, validateAmount, validateEmpty } from '../utils/validation';

export class ActualBudgetService {
  private static instance: ActualBudgetService;
  private isInitialized = false;
  private lastActualError: ActualServiceError | null = null;
  private lastSuccessfulBudgetDownloadAt: string | null = null;

  private constructor() {}

  public static getInstance(): ActualBudgetService {
    if (!ActualBudgetService.instance) {
      ActualBudgetService.instance = new ActualBudgetService();
    }
    return ActualBudgetService.instance;
  }

  private getErrorCode(errorText: string): string {
    if (
      errorText.includes('out-of-sync-migrations') ||
      errorText.includes('Database is out of sync with migrations')
    ) {
      return 'out-of-sync-migrations';
    }

    return 'actual-api-error';
  }

  private recordActualError(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.lastActualError = {
      code: this.getErrorCode(message),
      message,
      operation,
      at: new Date().toISOString(),
    };
  }

  private clearActualError(): void {
    this.lastActualError = null;
  }

  private async runActualOperation<T>(operation: string, action: () => Promise<T>): Promise<T> {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    const capturedMessages: string[] = [];

    const captureConsoleMessage = (...args: unknown[]): void => {
      const message = args
        .map((arg) => {
          if (arg instanceof Error) return arg.message;
          if (typeof arg === 'string') return arg;
          if (arg === undefined) return 'undefined';

          return JSON.stringify(arg);
        })
        .join(' ');

      capturedMessages.push(message);
    };

    console.error = (...args: unknown[]): void => {
      captureConsoleMessage(...args);
      originalConsoleError(...args);
    };

    console.warn = (...args: unknown[]): void => {
      captureConsoleMessage(...args);
      originalConsoleWarn(...args);
    };

    console.log = (...args: unknown[]): void => {
      captureConsoleMessage(...args);
      originalConsoleLog(...args);
    };

    try {
      const result = await action();
      const migrationError = capturedMessages.find(
        (message) =>
          message.includes('out-of-sync-migrations') ||
          message.includes('Database is out of sync with migrations')
      );

      if (migrationError) {
        this.recordActualError(operation, migrationError);
      } else {
        this.clearActualError();
      }

      return result;
    } catch (error) {
      this.recordActualError(operation, error);
      throw error;
    } finally {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    }
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
      await this.runActualOperation('downloadBudget', async () => actual.downloadBudget(config.budgetId));
      this.lastSuccessfulBudgetDownloadAt = new Date().toISOString();
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
      const normalizedDate = normalizeTransactionDate(transactionDate);

      const transaction: Transaction = {
        account: validatedAccountId,
        date: normalizedDate,
        amount: validatedAmount,
        payee_name: validatedPayee,
        notes: notes || '',
        ...(importedId && { imported_id: importedId }),
      };

      logger.info(
        `Processing transaction: ${transaction.date} - ${transaction.amount} - ${transaction.payee_name} - ${transaction.notes}${transaction.imported_id ? ` - ${transaction.imported_id}` : ''}`
      );

      await this.runActualOperation('importTransactions', async () => actual.importTransactions(validatedAccountId, [transaction]));
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
      await this.runActualOperation('downloadBudget', async () => actual.downloadBudget(config.budgetId));
      this.lastSuccessfulBudgetDownloadAt = new Date().toISOString();
      const accounts = await this.runActualOperation('getAccounts', async () => actual.getAccounts());
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

  public getHealthStatus(): ActualServiceHealth {
    let status: ActualServiceHealth['status'] = 'error';

    if (this.isInitialized && !this.lastActualError) {
      status = 'ok';
    } else if (this.isInitialized && this.lastActualError) {
      status = 'degraded';
    }

    return {
      status,
      apiInitialized: this.isInitialized,
      actualApiVersion: actualApiPackage.version,
      lastSuccessfulBudgetDownloadAt: this.lastSuccessfulBudgetDownloadAt,
      lastError: this.lastActualError,
    };
  }
}
