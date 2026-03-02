import { generateFullCode, generateInstallCommand } from './codeGenerator';
import { DEFAULT_CONFIG, OTelConfig } from '../types/otelConfig';

describe('codeGenerator', () => {
  describe('generateFullCode', () => {
    it('should include the service name in the generated code', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain(DEFAULT_CONFIG.serviceName);
    });

    it('should include the collector URL', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain(DEFAULT_CONFIG.collectorUrl);
    });

    it('should include selected instrumentation classes', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      // Default config has http and express selected
      expect(code).toContain('HttpInstrumentation');
      expect(code).toContain('ExpressInstrumentation');
    });

    it('should include graceful shutdown code', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain('SIGTERM');
      expect(code).toContain('sdk.shutdown()');
    });

    it('should use import syntax for TypeScript', () => {
      const tsConfig: OTelConfig = { ...DEFAULT_CONFIG, useTypeScript: true };
      const code = generateFullCode(tsConfig);
      expect(code).toContain("import { NodeSDK }");
      expect(code).not.toContain('require(');
    });

    it('should use require syntax for JavaScript', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain('require(');
    });

    it('should include trace exporter when traces enabled', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain('traceExporter');
      expect(code).toContain('OTLPTraceExporter');
    });

    it('should not include trace exporter when traces disabled', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, enableTraces: false };
      const code = generateFullCode(config);
      expect(code).not.toContain('traceExporter');
    });

    it('should include metric reader when metrics enabled', () => {
      const code = generateFullCode(DEFAULT_CONFIG);
      expect(code).toContain('metricReader');
    });

    it('should include logs processor when logs enabled', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, enableLogs: true };
      const code = generateFullCode(config);
      expect(code).toContain('logRecordProcessors');
    });

    it('should use gRPC exporter imports when protocol is grpc', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, protocol: 'grpc' };
      const code = generateFullCode(config);
      expect(code).toContain('exporter-trace-otlp-grpc');
    });

    it('should include sampling ratio when using ratio sampler', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, sampler: 'traceidratio', samplingRatio: 0.5 };
      const code = generateFullCode(config);
      expect(code).toContain('TraceIdRatioBasedSampler(0.5)');
    });

    it('should include custom resource attributes', () => {
      const config: OTelConfig = {
        ...DEFAULT_CONFIG,
        resourceAttributes: [{ key: 'team', value: 'backend' }],
      };
      const code = generateFullCode(config);
      expect(code).toContain("'team': 'backend'");
    });
  });

  describe('generateInstallCommand', () => {
    it('should use npm by default', () => {
      const cmd = generateInstallCommand(DEFAULT_CONFIG);
      expect(cmd).toMatch(/^npm install/);
    });

    it('should use yarn when configured', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, packageManager: 'yarn' };
      const cmd = generateInstallCommand(config);
      expect(cmd).toMatch(/^yarn add/);
    });

    it('should use pnpm when configured', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, packageManager: 'pnpm' };
      const cmd = generateInstallCommand(config);
      expect(cmd).toMatch(/^pnpm add/);
    });

    it('should include sdk-node and api packages', () => {
      const cmd = generateInstallCommand(DEFAULT_CONFIG);
      expect(cmd).toContain('@opentelemetry/sdk-node');
      expect(cmd).toContain('@opentelemetry/api');
    });

    it('should include selected instrumentation packages', () => {
      const cmd = generateInstallCommand(DEFAULT_CONFIG);
      expect(cmd).toContain('@opentelemetry/instrumentation-http');
      expect(cmd).toContain('@opentelemetry/instrumentation-express');
    });

    it('should include grpc transport when protocol is grpc', () => {
      const config: OTelConfig = { ...DEFAULT_CONFIG, protocol: 'grpc' };
      const cmd = generateInstallCommand(config);
      expect(cmd).toContain('@grpc/grpc-js');
    });
  });
});
