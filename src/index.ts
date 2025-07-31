import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './utils/config';
import { logger } from './utils/logger';
import { ActualBudgetService } from './services/actualBudgetService';
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
    this.app.use(express.json({ limit: '10mb' }));
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

      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      });

      // Graceful shutdown handlers
      const gracefulShutdown = async (signal: string): Promise<void> => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        
        server.close(async () => {
          logger.info('HTTP server closed');
          
          try {
            await this.actualService.shutdown();
            logger.info('Actual Budget service shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Forced shutdown after 30 seconds');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      
      process.on('uncaughtException', async (error: Error) => {
        logger.error('Uncaught exception:', error);
        await this.actualService.shutdown();
        process.exit(1);
      });

      process.on('unhandledRejection', async (reason: unknown) => {
        logger.error('Unhandled rejection:', reason);
        await this.actualService.shutdown();
        process.exit(1);
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
