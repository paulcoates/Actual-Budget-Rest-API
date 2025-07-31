"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const actualBudgetService_1 = require("./services/actualBudgetService");
const middleware_1 = require("./middleware");
const routes_1 = __importDefault(require("./routes"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.actualService = actualBudgetService_1.ActualBudgetService.getInstance();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        if (config_1.config.nodeEnv !== 'test') {
            this.app.use((0, morgan_1.default)('combined', {
                stream: { write: (message) => logger_1.logger.info(message.trim()) }
            }));
            this.app.use(middleware_1.requestLogger);
        }
    }
    initializeRoutes() {
        this.app.use('/api', routes_1.default);
        this.app.use('/', routes_1.default);
    }
    initializeErrorHandling() {
        this.app.use(middleware_1.notFoundHandler);
        this.app.use(middleware_1.errorHandler);
    }
    async start() {
        try {
            (0, config_1.validateConfig)();
            logger_1.logger.info('Configuration validated successfully');
            await this.actualService.initialize();
            logger_1.logger.info('Actual Budget service initialized');
            const server = this.app.listen(config_1.config.port, () => {
                logger_1.logger.info(`Server running on port ${config_1.config.port} in ${config_1.config.nodeEnv} mode`);
            });
            const gracefulShutdown = async (signal) => {
                logger_1.logger.info(`Received ${signal}, starting graceful shutdown`);
                server.close(async () => {
                    logger_1.logger.info('HTTP server closed');
                    try {
                        await this.actualService.shutdown();
                        logger_1.logger.info('Actual Budget service shutdown completed');
                        process.exit(0);
                    }
                    catch (error) {
                        logger_1.logger.error('Error during shutdown:', error);
                        process.exit(1);
                    }
                });
                setTimeout(() => {
                    logger_1.logger.error('Forced shutdown after 30 seconds');
                    process.exit(1);
                }, 30000);
            };
            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));
            process.on('uncaughtException', async (error) => {
                logger_1.logger.error('Uncaught exception:', error);
                await this.actualService.shutdown();
                process.exit(1);
            });
            process.on('unhandledRejection', async (reason) => {
                logger_1.logger.error('Unhandled rejection:', reason);
                await this.actualService.shutdown();
                process.exit(1);
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
}
if (require.main === module) {
    const app = new App();
    app.start().catch((error) => {
        logger_1.logger.error('Failed to start application:', error);
        process.exit(1);
    });
}
exports.default = App;
//# sourceMappingURL=index.js.map