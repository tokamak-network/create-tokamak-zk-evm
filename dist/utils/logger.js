"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class ConsoleLogger {
    constructor(level = 'info') {
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex <= currentIndex;
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(chalk_1.default.red('✗'), message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(chalk_1.default.yellow('⚠'), message, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(chalk_1.default.blue('ℹ'), message, ...args);
        }
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(chalk_1.default.gray('🐛'), message, ...args);
        }
    }
    setLevel(level) {
        this.level = level;
    }
}
exports.logger = new ConsoleLogger();
const createLogger = (level = 'info') => {
    return new ConsoleLogger(level);
};
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map