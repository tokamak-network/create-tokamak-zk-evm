import chalk from 'chalk';
import { Logger, LogLevel } from '../types';

class ConsoleLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('✗'), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('⚠'), message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(chalk.blue('ℹ'), message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(chalk.gray('🐛'), message, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new ConsoleLogger();

export const createLogger = (level: LogLevel = 'info'): Logger => {
  return new ConsoleLogger(level);
};
