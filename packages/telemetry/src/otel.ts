import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// ATTR_DEPLOYMENT_ENVIRONMENT_NAME is in the incubating spec; use the string directly.
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name' as const;
import { trace, context, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api';

export interface OtelConfig {
  serviceName: string;
  serviceVersion?: string | undefined;
  environment?: string | undefined;
  /** OTLP HTTP endpoint. Defaults to http://localhost:4318/v1/traces */
  otlpEndpoint?: string | undefined;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with OTLP HTTP export.
 * Instruments HTTP, PostgreSQL, and BullMQ automatically.
 * Must be called before any other imports to ensure instrumentation patches apply.
 */
export function initOtel(config: OtelConfig): void {
  const exporter = new OTLPTraceExporter({
    url: config.otlpEndpoint ?? 'http://localhost:4318/v1/traces',
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? '0.0.0',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment ?? 'development',
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        // BullMQ is instrumented via the generic redis instrumentation
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
        // Disable noisy instrumentation
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await sdk?.shutdown();
    process.exit(0);
  });
}

/**
 * Run a function inside a named OTel span with optional attributes.
 * The span is automatically ended and status set on completion or error.
 *
 * @example
 * const result = await withSpan('db.query', { 'db.table': 'properties' }, async (span) => {
 *   return db.query(...);
 * });
 */
export async function withSpan<T>(
  name: string,
  attrs: Attributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer('corredor');
  return tracer.startActiveSpan(name, async (span) => {
    if (Object.keys(attrs).length > 0) {
      span.setAttributes(attrs);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

/** Get the active trace and span IDs for log correlation. */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return { traceId: ctx.traceId, spanId: ctx.spanId };
}
