"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.notFoundHandler = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, _next) => {
    logger_1.logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
    });
    const response = {
        status: 'error',
        error: 'Internal server error',
        message: err.message,
    };
    res.status(500).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    logger_1.logger.warn(`Route not found: ${req.method} ${req.url}`);
    const response = {
        status: 'error',
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.url}`,
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=index.js.map