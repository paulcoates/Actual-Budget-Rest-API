import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './utils/config';
import { logger } from './utils/logger';
import { ActualBudgetService } from './services/actualBudgetService';
import { UpBankService } from './services/upBankService';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import routes from './routes';

class App {
  private app: express.Application;
  private actualService: ActualBudgetService;

  constructor() {
    this.app = express();
    this.actualService = ActualBudgetService.getInstance();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    
    // Request parsing
    this.app.use(express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    if (config.nodeEnv !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) }
      }));
      this.app.use(requestLogger);
    }
  }

  private initializeRoutes(): void {
    this.app.use('/api', routes);
    // Legacy route for backward compatibility
    this.app.use('/', routes);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Initialize Actual Budget API
      await this.actualService.initialize();
      logger.info('Actual Budget service initialized');

      // Verify UpBank token if configured (ping endpoint)
      if (config.upBankToken) {
        const upBankService = UpBankService.getInstance();
        const tokenOk = await upBankService.verifyToken();
        if (!tokenOk) {
          logger.warn('UpBank token verification failed at startup; webhooks may fail until the token is valid');
        }
      }

      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      });

      const closeServer = (): Promise<void> => new Promise((resolve) => {
        server.close(() => resolve());
      });

      const shutdown = async (label: string, exitCode: number, error?: unknown): Promise<void> => {
        if (error) {
          logger.error(`${label}:`, error);
        } else {
          logger.info(`Received ${label}, starting graceful shutdown`);
        }

        const forcedShutdownTimer = setTimeout(() => {
          logger.error('Forced shutdown after 30 seconds');
          process.exit(1);
        }, 30000);

        try {
          await closeServer();
          logger.info('HTTP server closed');
        } catch (closeError) {
          logger.error('Error closing HTTP server:', closeError);
        }

        let shutdownError: unknown;
        try {
          await this.actualService.shutdown();
          logger.info('Actual Budget service shutdown completed');
        } catch (shutdownErr) {
          shutdownError = shutdownErr;
          logger.error('Error during shutdown:', shutdownErr);
        } finally {
          clearTimeout(forcedShutdownTimer);
          process.exit(shutdownError ? 1 : exitCode);
        }
      };

      // Graceful shutdown handlers
      const gracefulShutdown = async (signal: string): Promise<void> => {
        await shutdown(signal, 0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      
      process.on('uncaughtException', async (error: Error) => {
        await shutdown('Uncaught exception', 1, error);
      });

      process.on('unhandledRejection', async (reason: unknown) => {
        await shutdown('Unhandled rejection', 1, reason);
      });

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const app = new App();
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default App;
