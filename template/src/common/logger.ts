import winston, { format, type Logger as WinstonLogger, createLogger } from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node';
import chalk from 'chalk';
import * as pkg from '@app/../package.json';
import fs from 'fs';
import { env } from '@app/common/env';

const getHashFromDisk = () => {
    try {
        const fileContents = fs.readFileSync('.git/HEAD').toString();
        const rev = fileContents.trim().split(/.*[: ]/).slice(-1)[0];

        if (rev.indexOf('/') === -1) return rev;
        return fs.readFileSync('.git/' + rev).toString().trim();
    } catch { }

    return null;
};

const getHashFromEnv = () => env.GIT_COMMIT_SHA;

let commitHash: string;
const getCommitHash = () => {
    if (commitHash) return commitHash;
    commitHash = (getHashFromEnv() ?? getHashFromDisk() ?? 'unknown').substring(0, 12);
    return commitHash;
};

const logLevelColours = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'blue',
    debug: 'magenta',
} as const;

const colourLevel = (level: keyof typeof logLevelColours) => {
    const colour = logLevelColours[level];
    return chalk[colour](level);
};

declare const splatSymbol: unique symbol;

type Meta = {
    [splatSymbol]: unknown[];
};

const formatMeta = (meta: Meta) => {
    const splat = meta[Symbol.for('splat') as typeof splatSymbol];
    if (splat && splat.length) {
        const _splat = splat.length === 1 ? splat[0] : splat;
        return _splat ? JSON.stringify(_splat) : '';
    }
    return '';
};

type Options = {
    service: string;
}

export class Logger {
    private logger: WinstonLogger;

    constructor(options: Options) {
        this.logger = createLogger({
            level: 'silly',
            format: format.combine(
                format.errors({ stack: true }),
                format.json()
            ),
            defaultMeta: {
                botName: pkg.name,
                pid: process.pid,
                commitHash: getCommitHash(),
                service: options.service,
            },
            transports: [],
        });

        // Don't log while running tests
        // This allows the methods to still be hooked
        // while not messing up the test output
        if (process.env.NODE_ENV === 'test') {
            this.logger.silent = true;
        }

        // Use Axiom for logging if a token is provided
        if (process.env.AXIOM_TOKEN) {
            this.logger.add(new AxiomTransport({
                handleExceptions: true,
                handleRejections: true,
            }));
        }

        // Add the console logger if we're not running tests and there are no transports
        if (process.env.NODE_ENV !== 'test' && this.logger.transports.length === 0) {
            this.logger.add(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(({ service, level, message, timestamp, ...meta }) => {
                            const formattedDate = new Date(timestamp as string).toLocaleTimeString('en');
                            const serviceName = (service as string) ?? 'app';
                            const formattedLevel = colourLevel(level as keyof typeof logLevelColours);
                            const formattedMeta = formatMeta(meta as Meta);
                            return `${formattedDate} [${serviceName}] [${formattedLevel}]: ${message as string} ${formattedMeta}`;
                        }),
                    ),
                }),
            );
        }
    }

    debug(message: string, meta?: Record<string, unknown>) {
        this.logger.debug(message, meta);
    }

    info(message: string, meta?: Record<string, unknown>) {
        this.logger.info(message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>) {
        this.logger.warn(message, meta);
    }

    error(message: string, meta?: { error: unknown, cause?: unknown } & Record<string, unknown>) {
        // If the error isn't an error object make it so
        // This is to prevent issues where something other than an Error is thrown
        // When passing this to transports like Axiom it really needs to be a real Error class
        if (meta?.error && !(meta?.error instanceof Error)) meta.error = new Error(`Unknown Error: ${String(meta.error)}`);
        this.logger.error(message, meta);

        // Also log errors to stderr for now
        // This needs to remain until the issue with winston not serialising errors is fixed
        console.log(message, meta);
    }
}

/**
 * **Shared logger**
 * 
 * This should be used if a method needs logging that isn't tied to any specific service
 */
export const logger = new Logger({ service: '{{GITHUB_REPOSITORY}}' });
