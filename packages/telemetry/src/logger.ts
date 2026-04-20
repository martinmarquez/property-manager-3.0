import { getTraceContext } from './otel.js';

type LogLevel = 'info' | 'warn' | 'error';

interface LogFields {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

interface LogEntry extends LogFields {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  spanId?: string;
}

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const { traceId, spanId } = getTraceContext();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(traceId && { traceId }),
    ...(spanId && { spanId }),
    ...fields,
  };

  const line = JSON.stringify(entry);

  // Node: write to stdout/stderr; browser: use console
  if (typeof process !== 'undefined' && process.stdout) {
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    console[level](line);
  }
}

/**
 * Structured JSON logger.
 * Automatically injects traceId and spanId from the active OTel span.
 *
 * @example
 * logger.info('Property created', { tenantId: 'tenant-1', userId: 'usr-123' });
 * logger.error('Failed to publish listing', { tenantId, error: err.message });
 */
export const logger = {
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
} as const;
