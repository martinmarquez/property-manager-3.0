import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger.js';

// Capture stdout/stderr writes without actually writing to the terminal.
function captureOutput() {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdoutChunks.push(String(chunk));
    return true;
  });

  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderrChunks.push(String(chunk));
    return true;
  });

  return {
    stdout: stdoutChunks,
    stderr: stderrChunks,
    restore() {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    },
  };
}

describe('logger', () => {
  let capture: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    capture = captureOutput();
  });

  afterEach(() => {
    capture.restore();
  });

  it('logger.info writes JSON to stdout', () => {
    logger.info('test message');
    expect(capture.stdout).toHaveLength(1);
    const entry = JSON.parse(capture.stdout[0]!);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
  });

  it('logger.warn writes JSON to stdout', () => {
    logger.warn('warn message');
    const entry = JSON.parse(capture.stdout[0]!);
    expect(entry.level).toBe('warn');
    expect(entry.message).toBe('warn message');
  });

  it('logger.error writes JSON to stderr', () => {
    logger.error('error message');
    expect(capture.stderr).toHaveLength(1);
    const entry = JSON.parse(capture.stderr[0]!);
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('error message');
  });

  it('includes timestamp in ISO format', () => {
    logger.info('ts check');
    const entry = JSON.parse(capture.stdout[0]!);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('includes extra fields from the fields argument', () => {
    logger.info('with fields', { tenantId: 'tenant-1', userId: 'usr-123' });
    const entry = JSON.parse(capture.stdout[0]!);
    expect(entry.tenantId).toBe('tenant-1');
    expect(entry.userId).toBe('usr-123');
  });

  it('does not include traceId/spanId when no active span', () => {
    logger.info('no span');
    const entry = JSON.parse(capture.stdout[0]!);
    expect(entry.traceId).toBeUndefined();
    expect(entry.spanId).toBeUndefined();
  });

  it('output is valid JSON (newline terminated)', () => {
    logger.info('valid json');
    expect(capture.stdout[0]).toMatch(/\n$/);
    expect(() => JSON.parse(capture.stdout[0]!.trim())).not.toThrow();
  });
});
