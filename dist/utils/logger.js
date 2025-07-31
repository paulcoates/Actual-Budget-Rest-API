"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("./config");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
}));
exports.logger = winston_1.default.createLogger({
    level: config_1.config.nodeEnv === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log'
        }),
    ],
});
const fs_1 = require("fs");
if (!(0, fs_1.existsSync)('logs')) {
    (0, fs_1.mkdirSync)('logs');
}
//# sourceMappingURL=logger.js.map