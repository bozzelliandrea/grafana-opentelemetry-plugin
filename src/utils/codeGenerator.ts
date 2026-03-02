import { OTelConfig, AVAILABLE_INSTRUMENTATIONS, type ExporterType, type PropagatorType } from '../types/otelConfig';

// ────────────────────────────────────────────────────────────────────────────
// Code generator: produces a complete Node.js / TypeScript OpenTelemetry
// instrumentation file based on the user's selected configuration.
// ────────────────────────────────────────────────────────────────────────────

/** Look up the selected instrumentation metadata by id. */
function getSelectedInstrumentations(config: OTelConfig) {
  return AVAILABLE_INSTRUMENTATIONS.filter((i) => config.instrumentations.includes(i.id));
}

/** Build the npm / yarn / pnpm install command for all required packages. */
export function generateInstallCommand(config: OTelConfig): string {
  const packages: string[] = ['@opentelemetry/sdk-node', '@opentelemetry/api'];

  // Exporter packages
  const exporterPackages = new Set<string>();

  const addExporterPkg = (exporter: ExporterType, signal: 'trace' | 'metrics' | 'logs') => {
    switch (exporter) {
      case 'otlp':
        if (signal === 'trace') {
          exporterPackages.add(
            config.protocol === 'grpc'
              ? '@opentelemetry/exporter-trace-otlp-grpc'
              : '@opentelemetry/exporter-trace-otlp-proto'
          );
        }
        if (signal === 'metrics') {
          exporterPackages.add(
            config.protocol === 'grpc'
              ? '@opentelemetry/exporter-metrics-otlp-grpc'
              : '@opentelemetry/exporter-metrics-otlp-proto'
          );
        }
        if (signal === 'logs') {
          exporterPackages.add(
            config.protocol === 'grpc'
              ? '@opentelemetry/exporter-logs-otlp-grpc'
              : '@opentelemetry/exporter-logs-otlp-proto'
          );
        }
        break;
      case 'zipkin':
        exporterPackages.add('@opentelemetry/exporter-zipkin');
        break;
      case 'jaeger':
        exporterPackages.add('@opentelemetry/exporter-jaeger');
        break;
      case 'console':
        // built-in, no extra package
        break;
    }
  };

  if (config.enableTraces) {
    addExporterPkg(config.traceExporter, 'trace');
  }
  if (config.enableMetrics) {
    addExporterPkg(config.metricsExporter, 'metrics');
  }
  if (config.enableLogs) {
    addExporterPkg(config.logsExporter, 'logs');
  }

  packages.push(...Array.from(exporterPackages).sort());

  // Propagator packages
  if (config.propagators.includes('b3') || config.propagators.includes('b3multi')) {
    packages.push('@opentelemetry/propagator-b3');
  }
  if (config.propagators.includes('jaeger')) {
    packages.push('@opentelemetry/propagator-jaeger');
  }

  // Sampler packages (built-in to sdk-node, no extras needed)

  // Instrumentation packages
  const instrumentations = getSelectedInstrumentations(config);
  instrumentations.forEach((inst) => packages.push(inst.package));

  // gRPC transport
  if (config.protocol === 'grpc') {
    packages.push('@grpc/grpc-js');
  }

  const uniquePackages = [...new Set(packages)].sort();

  switch (config.packageManager) {
    case 'yarn':
      return `yarn add ${uniquePackages.join(' \\\n  ')}`;
    case 'pnpm':
      return `pnpm add ${uniquePackages.join(' \\\n  ')}`;
    default:
      return `npm install ${uniquePackages.join(' \\\n  ')}`;
  }
}

/** Generate the full instrumentation source file. */
export function generateInstrumentationCode(config: OTelConfig): string {
  const ts = config.useTypeScript;
  const lines: string[] = [];
  const importLines: string[] = [];
  const selectedInst = getSelectedInstrumentations(config);

  // ── Imports ──────────────────────────────────────────────────────────────
  importLines.push(`const { NodeSDK } = require('@opentelemetry/sdk-node');`);
  importLines.push(`const { Resource } = require('@opentelemetry/resources');`);
  importLines.push(
    `const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } = require('@opentelemetry/semantic-conventions');`
  );

  if (ts) {
    // Replace require with import for TypeScript
    importLines.length = 0;
    importLines.push(`import { NodeSDK } from '@opentelemetry/sdk-node';`);
    importLines.push(`import { Resource } from '@opentelemetry/resources';`);
    importLines.push(
      `import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions';`
    );
  }

  // Trace exporter imports
  if (config.enableTraces) {
    importLines.push(...getTraceExporterImports(config));
  }

  // Metrics exporter imports
  if (config.enableMetrics) {
    importLines.push(...getMetricsExporterImports(config));
  }

  // Logs exporter imports
  if (config.enableLogs) {
    importLines.push(...getLogsExporterImports(config));
  }

  // Console exporter
  if (config.enableConsoleExporter) {
    if (config.enableTraces) {
      addImport(importLines, '@opentelemetry/sdk-trace-node', 'ConsoleSpanExporter', ts);
    }
  }

  // Sampler imports
  importLines.push(...getSamplerImports(config));

  // Propagator imports
  importLines.push(...getPropagatorImports(config));

  // Instrumentation imports
  selectedInst.forEach((inst) => {
    addImport(importLines, inst.package, inst.className, ts);
  });

  lines.push(...importLines);
  lines.push('');

  // ── Resource ─────────────────────────────────────────────────────────────
  lines.push('// Configure the OpenTelemetry resource');
  lines.push(`const resource = new Resource({`);
  lines.push(`  [ATTR_SERVICE_NAME]: '${config.serviceName}',`);
  lines.push(`  [ATTR_SERVICE_VERSION]: '${config.serviceVersion}',`);
  lines.push(`  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: '${config.environment}',`);
  config.resourceAttributes.forEach((attr) => {
    lines.push(`  '${attr.key}': '${attr.value}',`);
  });
  lines.push(`});`);
  lines.push('');

  // ── SDK configuration ────────────────────────────────────────────────────
  lines.push('// Initialize the OpenTelemetry Node SDK');
  lines.push(`const sdk = new NodeSDK({`);
  lines.push(`  resource,`);

  // Trace exporter
  if (config.enableTraces) {
    lines.push(`  traceExporter: ${getTraceExporterInit(config)},`);
  }

  // Metrics reader (periodic)
  if (config.enableMetrics) {
    lines.push(`  metricReader: ${getMetricsReaderInit(config)},`);
  }

  // Logs exporter
  if (config.enableLogs) {
    lines.push(`  logRecordProcessors: [${getLogsProcessorInit(config)}],`);
  }

  // Sampler
  lines.push(`  sampler: ${getSamplerInit(config)},`);

  // Propagators
  if (config.propagators.length > 0) {
    lines.push(...getPropagatorInit(config));
  }

  // Instrumentations
  if (selectedInst.length > 0) {
    lines.push(`  instrumentations: [`);
    selectedInst.forEach((inst) => {
      lines.push(`    new ${inst.className}(),`);
    });
    lines.push(`  ],`);
  }

  lines.push(`});`);
  lines.push('');

  // ── Start ────────────────────────────────────────────────────────────────
  lines.push('// Start the SDK (must be done before any other require/import of instrumented modules)');
  lines.push(`sdk.start();`);
  lines.push('');

  // ── Graceful shutdown ────────────────────────────────────────────────────
  lines.push('// Graceful shutdown on SIGTERM');
  lines.push(`process.on('SIGTERM', () => {`);
  lines.push(`  sdk.shutdown()`);
  lines.push(`    .then(() => console.log('OpenTelemetry SDK shut down successfully'))`);
  lines.push(`    .catch((err${ts ? ': Error' : ''}) => console.error('Error shutting down OpenTelemetry SDK', err))`);
  lines.push(`    .finally(() => process.exit(0));`);
  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

// ── Helper functions ─────────────────────────────────────────────────────────

function addImport(lines: string[], pkg: string, name: string, ts: boolean) {
  if (ts) {
    lines.push(`import { ${name} } from '${pkg}';`);
  } else {
    lines.push(`const { ${name} } = require('${pkg}');`);
  }
}

function getTraceExporterImports(config: OTelConfig): string[] {
  const lines: string[] = [];
  const ts = config.useTypeScript;
  switch (config.traceExporter) {
    case 'otlp':
      if (config.protocol === 'grpc') {
        addImport(lines, '@opentelemetry/exporter-trace-otlp-grpc', 'OTLPTraceExporter', ts);
      } else {
        addImport(lines, '@opentelemetry/exporter-trace-otlp-proto', 'OTLPTraceExporter', ts);
      }
      break;
    case 'zipkin':
      addImport(lines, '@opentelemetry/exporter-zipkin', 'ZipkinExporter', ts);
      break;
    case 'jaeger':
      addImport(lines, '@opentelemetry/exporter-jaeger', 'JaegerExporter', ts);
      break;
    case 'console':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'ConsoleSpanExporter', ts);
      break;
  }
  return lines;
}

function getMetricsExporterImports(config: OTelConfig): string[] {
  const lines: string[] = [];
  const ts = config.useTypeScript;
  switch (config.metricsExporter) {
    case 'otlp':
      if (config.protocol === 'grpc') {
        addImport(lines, '@opentelemetry/exporter-metrics-otlp-grpc', 'OTLPMetricExporter', ts);
      } else {
        addImport(lines, '@opentelemetry/exporter-metrics-otlp-proto', 'OTLPMetricExporter', ts);
      }
      break;
    case 'console':
      addImport(lines, '@opentelemetry/sdk-metrics', 'ConsoleMetricExporter', ts);
      break;
    default:
      // For metrics, only OTLP and console are common
      if (config.protocol === 'grpc') {
        addImport(lines, '@opentelemetry/exporter-metrics-otlp-grpc', 'OTLPMetricExporter', ts);
      } else {
        addImport(lines, '@opentelemetry/exporter-metrics-otlp-proto', 'OTLPMetricExporter', ts);
      }
  }
  addImport(lines, '@opentelemetry/sdk-metrics', 'PeriodicExportingMetricReader', ts);
  return lines;
}

function getLogsExporterImports(config: OTelConfig): string[] {
  const lines: string[] = [];
  const ts = config.useTypeScript;
  switch (config.logsExporter) {
    case 'otlp':
      if (config.protocol === 'grpc') {
        addImport(lines, '@opentelemetry/exporter-logs-otlp-grpc', 'OTLPLogExporter', ts);
      } else {
        addImport(lines, '@opentelemetry/exporter-logs-otlp-proto', 'OTLPLogExporter', ts);
      }
      break;
    case 'console':
      addImport(lines, '@opentelemetry/sdk-logs', 'ConsoleLogRecordExporter', ts);
      break;
    default:
      if (config.protocol === 'grpc') {
        addImport(lines, '@opentelemetry/exporter-logs-otlp-grpc', 'OTLPLogExporter', ts);
      } else {
        addImport(lines, '@opentelemetry/exporter-logs-otlp-proto', 'OTLPLogExporter', ts);
      }
  }
  addImport(lines, '@opentelemetry/sdk-logs', 'SimpleLogRecordProcessor', ts);
  return lines;
}

function getSamplerImports(config: OTelConfig): string[] {
  const lines: string[] = [];
  const ts = config.useTypeScript;
  switch (config.sampler) {
    case 'always_on':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'AlwaysOnSampler', ts);
      break;
    case 'always_off':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'AlwaysOffSampler', ts);
      break;
    case 'traceidratio':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'TraceIdRatioBasedSampler', ts);
      break;
    case 'parentbased_always_on':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'ParentBasedSampler', ts);
      addImport(lines, '@opentelemetry/sdk-trace-node', 'AlwaysOnSampler', ts);
      break;
    case 'parentbased_traceidratio':
      addImport(lines, '@opentelemetry/sdk-trace-node', 'ParentBasedSampler', ts);
      addImport(lines, '@opentelemetry/sdk-trace-node', 'TraceIdRatioBasedSampler', ts);
      break;
  }
  return lines;
}

function getPropagatorImports(config: OTelConfig): string[] {
  const lines: string[] = [];
  const ts = config.useTypeScript;
  const hasW3C = config.propagators.includes('tracecontext') || config.propagators.includes('baggage');
  if (hasW3C) {
    addImport(lines, '@opentelemetry/core', 'CompositePropagator', ts);
    if (config.propagators.includes('tracecontext')) {
      addImport(lines, '@opentelemetry/core', 'W3CTraceContextPropagator', ts);
    }
    if (config.propagators.includes('baggage')) {
      addImport(lines, '@opentelemetry/core', 'W3CBaggagePropagator', ts);
    }
  }
  if (config.propagators.includes('b3') || config.propagators.includes('b3multi')) {
    addImport(lines, '@opentelemetry/propagator-b3', 'B3Propagator', ts);
    if (config.propagators.includes('b3multi')) {
      addImport(lines, '@opentelemetry/propagator-b3', 'B3InjectEncoding', ts);
    }
  }
  if (config.propagators.includes('jaeger')) {
    addImport(lines, '@opentelemetry/propagator-jaeger', 'JaegerPropagator', ts);
  }
  return lines;
}

function getTraceExporterInit(config: OTelConfig): string {
  switch (config.traceExporter) {
    case 'otlp':
      return `new OTLPTraceExporter({ url: '${config.collectorUrl}${config.protocol === 'grpc' ? '' : '/v1/traces'}' })`;
    case 'zipkin':
      return `new ZipkinExporter({ url: '${config.collectorUrl}/api/v2/spans' })`;
    case 'jaeger':
      return `new JaegerExporter({ endpoint: '${config.collectorUrl}' })`;
    case 'console':
      return `new ConsoleSpanExporter()`;
  }
}

function getMetricsReaderInit(config: OTelConfig): string {
  let exporterExpr: string;
  switch (config.metricsExporter) {
    case 'console':
      exporterExpr = `new ConsoleMetricExporter()`;
      break;
    default:
      exporterExpr = `new OTLPMetricExporter({ url: '${config.collectorUrl}${config.protocol === 'grpc' ? '' : '/v1/metrics'}' })`;
  }
  return `new PeriodicExportingMetricReader({\n    exporter: ${exporterExpr},\n    exportIntervalMillis: 60000,\n  })`;
}

function getLogsProcessorInit(config: OTelConfig): string {
  let exporterExpr: string;
  switch (config.logsExporter) {
    case 'console':
      exporterExpr = `new ConsoleLogRecordExporter()`;
      break;
    default:
      exporterExpr = `new OTLPLogExporter({ url: '${config.collectorUrl}${config.protocol === 'grpc' ? '' : '/v1/logs'}' })`;
  }
  return `new SimpleLogRecordProcessor(${exporterExpr})`;
}

function getSamplerInit(config: OTelConfig): string {
  switch (config.sampler) {
    case 'always_on':
      return `new AlwaysOnSampler()`;
    case 'always_off':
      return `new AlwaysOffSampler()`;
    case 'traceidratio':
      return `new TraceIdRatioBasedSampler(${config.samplingRatio})`;
    case 'parentbased_always_on':
      return `new ParentBasedSampler({ root: new AlwaysOnSampler() })`;
    case 'parentbased_traceidratio':
      return `new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(${config.samplingRatio}) })`;
  }
}

function getPropagatorInit(config: OTelConfig): string[] {
  const propagatorEntries: string[] = [];
  config.propagators.forEach((p: PropagatorType) => {
    switch (p) {
      case 'tracecontext':
        propagatorEntries.push(`      new W3CTraceContextPropagator(),`);
        break;
      case 'baggage':
        propagatorEntries.push(`      new W3CBaggagePropagator(),`);
        break;
      case 'b3':
        propagatorEntries.push(`      new B3Propagator(),`);
        break;
      case 'b3multi':
        propagatorEntries.push(`      new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),`);
        break;
      case 'jaeger':
        propagatorEntries.push(`      new JaegerPropagator(),`);
        break;
    }
  });

  return [
    `  textMapPropagator: new CompositePropagator({`,
    `    propagators: [`,
    ...propagatorEntries,
    `    ],`,
    `  }),`,
  ];
}

/** Generate the complete code including a header comment. */
export function generateFullCode(config: OTelConfig): string {
  const ext = config.useTypeScript ? 'ts' : 'js';
  const header = [
    `// ──────────────────────────────────────────────────────────────────────────`,
    `// OpenTelemetry Instrumentation — ${config.serviceName}`,
    `// Generated by Grafana OTel Instrumentation Generator`,
    `//`,
    `// Usage:`,
    `//   node --require ./instrumentation.${ext} your-app.${ext}`,
    `//   (or import this file at the very top of your application entry point)`,
    `// ──────────────────────────────────────────────────────────────────────────`,
    ``,
  ];

  return header.join('\n') + generateInstrumentationCode(config);
}

/** Generate a docker-compose snippet for an OTel collector. */
export function generateCollectorDockerCompose(config: OTelConfig): string {
  const lines = [
    `# OpenTelemetry Collector — Docker Compose`,
    `# Pair this with your otel-collector-config.yaml`,
    `version: '3.8'`,
    `services:`,
    `  otel-collector:`,
    `    image: otel/opentelemetry-collector-contrib:latest`,
    `    command: ["--config", "/etc/otel-collector-config.yaml"]`,
    `    volumes:`,
    `      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml`,
    `    ports:`,
  ];

  if (config.protocol === 'grpc') {
    lines.push(`      - "4317:4317"   # OTLP gRPC receiver`);
  } else {
    lines.push(`      - "4318:4318"   # OTLP HTTP receiver`);
  }

  lines.push(`      - "8888:8888"   # Prometheus metrics (collector)`);
  lines.push(`      - "8889:8889"   # Prometheus exporter metrics`);

  return lines.join('\n');
}
