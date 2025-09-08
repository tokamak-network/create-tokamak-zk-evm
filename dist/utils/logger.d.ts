import { Logger, LogLevel } from '../types';
declare class ConsoleLogger implements Logger {
    private level;
    constructor(level?: LogLevel);
    private shouldLog;
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    setLevel(level: LogLevel): void;
}
export declare const logger: ConsoleLogger;
export declare const createLogger: (level?: LogLevel) => Logger;
export {};
//# sourceMappingURL=logger.d.ts.map