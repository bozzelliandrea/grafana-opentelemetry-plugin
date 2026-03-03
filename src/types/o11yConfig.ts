/**
 * Types for the @ogcio/o11y-sdk-node configuration.
 *
 * The o11y SDK is a thin, opinionated wrapper around the OpenTelemetry Node SDK
 * that ships sensible defaults (gRPC exporter, batch processing, URL sampler,
 * PII redaction, …) with a minimal surface API.
 */

import type { PackageManager } from './otelConfig';

export type O11yProtocol = 'grpc' | 'http' | 'console';

export type O11yCollectorMode = 'single' | 'batch';

export type O11yDiagLogLevel = 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'VERBOSE' | 'ALL';

export type O11yIgnoreUrlType = 'endsWith' | 'includes' | 'equals';

export interface O11yIgnoreUrl {
  type: O11yIgnoreUrlType;
  url: string;
}

export interface O11yResourceAttribute {
  key: string;
  value: string;
}

/**
 * A single entry in `spanAttributes`.
 * `isFunction: true` means the value is a function reference — emitted without
 * quotes in the generated code (e.g. `myFn` instead of `'myFn'`).
 */
export interface O11ySpanAttribute {
  key: string;
  /** Static value or the name of a function available in scope */
  value: string;
  /** When true the value is rendered as an identifier, not a string literal */
  isFunction: boolean;
}

export interface O11yConfig {
  // ── Service identity ───────────────────────────────────────────────────
  serviceName: string;
  serviceVersion: string;
  /** Added to resourceAttributes as `deployment.environment` */
  environment: string;

  // ── Collector connection ───────────────────────────────────────────────
  /** gRPC default: http://localhost:4317 | HTTP default: http://localhost:4318 */
  collectorUrl: string;
  /** Transport protocol used to emit signals */
  protocol: O11yProtocol;
  /** `single` = immediate per-signal request; `batch` = time-windowed (recommended for production) */
  collectorMode: O11yCollectorMode;

  // ── Sampling ───────────────────────────────────────────────────────────
  /** TraceIdRatio from 0 (drop all) to 1 (keep all). Default: 1 */
  traceRatio: number;

  // ── Diagnostics ────────────────────────────────────────────────────────
  diagLogLevel: O11yDiagLogLevel;

  // ── Metrics ────────────────────────────────────────────────────────────
  metricsExportIntervalMs: number;

  // ── PII detection & redaction ──────────────────────────────────────────
  detection: {
    email: boolean;
    ip: boolean;
    ppsn: boolean;
  };

  // ── Resource attributes ────────────────────────────────────────────────
  resourceAttributes: O11yResourceAttribute[];

  // ── Span attributes ────────────────────────────────────────────────────
  /**
   * Static values or function references attached to every span.
   * Functions are emitted as identifiers (no quotes) in the generated code.
   */
  spanAttributes: O11ySpanAttribute[];

  // ── URL filtering (ignored from traces) ───────────────────────────────
  ignoreUrls: O11yIgnoreUrl[];

  // ── Output preferences ────────────────────────────────────────────────
  packageManager: PackageManager;
  useTypeScript: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_O11Y_CONFIG: O11yConfig = {
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development',
  collectorUrl: 'http://localhost:4317',
  protocol: 'grpc',
  collectorMode: 'batch',
  traceRatio: 1,
  diagLogLevel: 'INFO',
  metricsExportIntervalMs: 60000,
  detection: {
    email: true,
    ip: true,
    ppsn: true,
  },
  resourceAttributes: [],
  spanAttributes: [],
  ignoreUrls: [],
  packageManager: 'npm',
  useTypeScript: false,
};
