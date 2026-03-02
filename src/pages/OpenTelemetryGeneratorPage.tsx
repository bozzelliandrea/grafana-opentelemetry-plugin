import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import {
  Button,
  Checkbox,
  CodeEditor,
  Collapse,
  Field,
  InlineField,
  InlineSwitch,
  Input,
  RadioButtonGroup,
  Select,
  useStyles2,
  Alert,
  Tooltip,
} from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { testIds } from '../components/testIds';
import {
  OTelConfig,
  DEFAULT_CONFIG,
  AVAILABLE_INSTRUMENTATIONS,
  type OTelProtocol,
  type OTelEnvironment,
  type SamplerType,
  type ExporterType,
  type PackageManager,
  type PropagatorType,
  type ResourceAttribute,
} from '../types/otelConfig';
import { generateFullCode, generateInstallCommand, generateCollectorDockerCompose } from '../utils/codeGenerator';

// ─── Selection options ───────────────────────────────────────────────────────

const PROTOCOL_OPTIONS = [
  { label: 'HTTP/Protobuf', value: 'http/protobuf' as OTelProtocol },
  { label: 'HTTP/JSON', value: 'http/json' as OTelProtocol },
  { label: 'gRPC', value: 'grpc' as OTelProtocol },
];

const ENVIRONMENT_OPTIONS = [
  { label: 'Development', value: 'development' as OTelEnvironment },
  { label: 'Staging', value: 'staging' as OTelEnvironment },
  { label: 'Production', value: 'production' as OTelEnvironment },
];

const SAMPLER_OPTIONS = [
  { label: 'Always On', value: 'always_on' as SamplerType, description: 'Sample every trace' },
  { label: 'Always Off', value: 'always_off' as SamplerType, description: 'Discard all traces' },
  { label: 'Trace ID Ratio', value: 'traceidratio' as SamplerType, description: 'Probabilistic sampling' },
  {
    label: 'Parent-based (Always On)',
    value: 'parentbased_always_on' as SamplerType,
    description: 'Respect parent decision, always on for root',
  },
  {
    label: 'Parent-based (Ratio)',
    value: 'parentbased_traceidratio' as SamplerType,
    description: 'Respect parent decision, ratio for root',
  },
];

const EXPORTER_OPTIONS = [
  { label: 'OTLP', value: 'otlp' as ExporterType },
  { label: 'Console', value: 'console' as ExporterType },
];

const TRACE_EXPORTER_OPTIONS = [
  ...EXPORTER_OPTIONS,
  { label: 'Zipkin', value: 'zipkin' as ExporterType },
  { label: 'Jaeger', value: 'jaeger' as ExporterType },
];

const PKG_MANAGER_OPTIONS = [
  { label: 'npm', value: 'npm' as PackageManager },
  { label: 'yarn', value: 'yarn' as PackageManager },
  { label: 'pnpm', value: 'pnpm' as PackageManager },
];

const PROPAGATOR_OPTIONS: Array<{ label: string; value: PropagatorType; description: string }> = [
  { label: 'W3C TraceContext', value: 'tracecontext', description: 'Standard W3C trace context propagation' },
  { label: 'W3C Baggage', value: 'baggage', description: 'W3C baggage propagation' },
  { label: 'B3 Single', value: 'b3', description: 'Zipkin B3 single-header propagation' },
  { label: 'B3 Multi', value: 'b3multi', description: 'Zipkin B3 multi-header propagation' },
  { label: 'Jaeger', value: 'jaeger', description: 'Jaeger propagation format' },
];

const CATEGORY_LABELS: Record<string, string> = {
  http: 'HTTP / RPC',
  'web-framework': 'Web Frameworks',
  database: 'Databases',
  messaging: 'Messaging',
  logging: 'Logging',
  other: 'Other',
};

const CATEGORY_ORDER = ['http', 'web-framework', 'database', 'messaging', 'logging', 'other'];

// ─── Main component ──────────────────────────────────────────────────────────

function OpenTelemetryGeneratorPage() {
  const s = useStyles2(getStyles);

  const [config, setConfig] = useState<OTelConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'code' | 'install' | 'docker'>('code');
  const [copied, setCopied] = useState(false);

  // Collapse sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    signals: true,
    instrumentations: true,
    sampling: false,
    propagators: false,
    resources: false,
    output: false,
  });

  const toggleSection = useCallback((key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Derived
  const generatedCode = useMemo(() => generateFullCode(config), [config]);
  const installCmd = useMemo(() => generateInstallCommand(config), [config]);
  const dockerCompose = useMemo(() => generateCollectorDockerCompose(config), [config]);

  // Handlers
  const updateConfig = useCallback(<K extends keyof OTelConfig>(key: K, value: OTelConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleInstrumentation = useCallback((id: string) => {
    setConfig((prev) => {
      const current = prev.instrumentations;
      return {
        ...prev,
        instrumentations: current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
      };
    });
  }, []);

  const togglePropagator = useCallback((value: PropagatorType) => {
    setConfig((prev) => {
      const current = prev.propagators;
      return {
        ...prev,
        propagators: current.includes(value) ? current.filter((p) => p !== value) : [...current, value],
      };
    });
  }, []);

  const addResourceAttribute = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      resourceAttributes: [...prev.resourceAttributes, { key: '', value: '' }],
    }));
  }, []);

  const updateResourceAttribute = useCallback((index: number, field: keyof ResourceAttribute, value: string) => {
    setConfig((prev) => {
      const attrs = [...prev.resourceAttributes];
      attrs[index] = { ...attrs[index], [field]: value };
      return { ...prev, resourceAttributes: attrs };
    });
  }, []);

  const removeResourceAttribute = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      resourceAttributes: prev.resourceAttributes.filter((_, i) => i !== index),
    }));
  }, []);

  const handleCopy = useCallback(async () => {
    const text = activeTab === 'code' ? generatedCode : activeTab === 'install' ? installCmd : dockerCompose;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeTab, generatedCode, installCmd, dockerCompose]);

  const handleDownload = useCallback(() => {
    const ext = config.useTypeScript ? 'ts' : 'js';
    let filename: string;
    let content: string;
    let mime = 'text/plain';

    switch (activeTab) {
      case 'install':
        filename = 'install-otel-deps.sh';
        content = `#!/bin/bash\n${installCmd}\n`;
        break;
      case 'docker':
        filename = 'docker-compose.otel.yaml';
        content = dockerCompose;
        mime = 'text/yaml';
        break;
      default:
        filename = `instrumentation.${ext}`;
        content = generatedCode;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeTab, config.useTypeScript, generatedCode, installCmd, dockerCompose]);

  // Group instrumentations by category
  const instrumentationsByCategory = useMemo(() => {
    const groups: Record<string, typeof AVAILABLE_INSTRUMENTATIONS> = {};
    AVAILABLE_INSTRUMENTATIONS.forEach((inst) => {
      if (!groups[inst.category]) {
        groups[inst.category] = [];
      }
      groups[inst.category].push(inst);
    });
    return groups;
  }, []);

  const selectedCount = config.instrumentations.length;
  const currentOutput = activeTab === 'code' ? generatedCode : activeTab === 'install' ? installCmd : dockerCompose;
  const codeLanguage =
    activeTab === 'docker'
      ? 'yaml'
      : activeTab === 'install'
        ? 'shell'
        : config.useTypeScript
          ? 'typescript'
          : 'javascript';

  return (
    <PluginPage>
      <div data-testid={testIds.generator.container} className={s.wrapper}>
        {/* Header */}
        <div className={s.header}>
          <h2 className={s.title}>OpenTelemetry JS Instrumentation Generator</h2>
          <p className={s.subtitle}>
            Configure your OpenTelemetry Node.js instrumentation and generate ready-to-use code.
          </p>
        </div>

        <div className={s.layout}>
          {/* ── Left Panel: Configuration ─────────────────────────────────── */}
          <div className={s.configPanel}>
            {/* Basic Configuration */}
            <Collapse
              label="Service Configuration"
              isOpen={openSections.basic}
              onToggle={() => toggleSection('basic')}
              collapsible
            >
              <div className={s.section}>
                <Field label="Service Name" description="The name that identifies your service in traces">
                  <Input
                    data-testid={testIds.generator.serviceName}
                    value={config.serviceName}
                    onChange={(e) => updateConfig('serviceName', e.currentTarget.value)}
                    placeholder="my-service"
                    width={40}
                  />
                </Field>

                <Field label="Service Version">
                  <Input
                    value={config.serviceVersion}
                    onChange={(e) => updateConfig('serviceVersion', e.currentTarget.value)}
                    placeholder="1.0.0"
                    width={40}
                  />
                </Field>

                <Field label="Environment">
                  <RadioButtonGroup
                    value={config.environment}
                    options={ENVIRONMENT_OPTIONS}
                    onChange={(v) => updateConfig('environment', v)}
                  />
                </Field>

                <Field label="Collector Endpoint" description="The URL of your OpenTelemetry Collector">
                  <Input
                    data-testid={testIds.generator.collectorUrl}
                    value={config.collectorUrl}
                    onChange={(e) => updateConfig('collectorUrl', e.currentTarget.value)}
                    placeholder="http://localhost:4318"
                    width={40}
                  />
                </Field>

                <Field label="Protocol">
                  <RadioButtonGroup
                    value={config.protocol}
                    options={PROTOCOL_OPTIONS}
                    onChange={(v) => updateConfig('protocol', v)}
                  />
                </Field>
              </div>
            </Collapse>

            {/* Signals & Exporters */}
            <Collapse
              label="Signals & Exporters"
              isOpen={openSections.signals}
              onToggle={() => toggleSection('signals')}
              collapsible
            >
              <div className={s.section}>
                <div className={s.signalRow}>
                  <InlineField label="Traces" labelWidth={10}>
                    <InlineSwitch
                      data-testid={testIds.generator.enableTraces}
                      value={config.enableTraces}
                      onChange={() => updateConfig('enableTraces', !config.enableTraces)}
                    />
                  </InlineField>
                  {config.enableTraces && (
                    <Field label="Trace Exporter" className={s.exporterSelect}>
                      <Select
                        value={config.traceExporter}
                        options={TRACE_EXPORTER_OPTIONS}
                        onChange={(v) => updateConfig('traceExporter', v.value!)}
                        width={20}
                      />
                    </Field>
                  )}
                </div>

                <div className={s.signalRow}>
                  <InlineField label="Metrics" labelWidth={10}>
                    <InlineSwitch
                      data-testid={testIds.generator.enableMetrics}
                      value={config.enableMetrics}
                      onChange={() => updateConfig('enableMetrics', !config.enableMetrics)}
                    />
                  </InlineField>
                  {config.enableMetrics && (
                    <Field label="Metrics Exporter" className={s.exporterSelect}>
                      <Select
                        value={config.metricsExporter}
                        options={EXPORTER_OPTIONS}
                        onChange={(v) => updateConfig('metricsExporter', v.value!)}
                        width={20}
                      />
                    </Field>
                  )}
                </div>

                <div className={s.signalRow}>
                  <InlineField label="Logs" labelWidth={10}>
                    <InlineSwitch
                      data-testid={testIds.generator.enableLogs}
                      value={config.enableLogs}
                      onChange={() => updateConfig('enableLogs', !config.enableLogs)}
                    />
                  </InlineField>
                  {config.enableLogs && (
                    <Field label="Logs Exporter" className={s.exporterSelect}>
                      <Select
                        value={config.logsExporter}
                        options={EXPORTER_OPTIONS}
                        onChange={(v) => updateConfig('logsExporter', v.value!)}
                        width={20}
                      />
                    </Field>
                  )}
                </div>

                <InlineField
                  label="Console Debug"
                  labelWidth={14}
                  tooltip="Also log spans to the console for debugging"
                >
                  <InlineSwitch
                    value={config.enableConsoleExporter}
                    onChange={() => updateConfig('enableConsoleExporter', !config.enableConsoleExporter)}
                  />
                </InlineField>
              </div>
            </Collapse>

            {/* Instrumentations */}
            <Collapse
              label={`Instrumentations (${selectedCount} selected)`}
              isOpen={openSections.instrumentations}
              onToggle={() => toggleSection('instrumentations')}
              collapsible
            >
              <div className={s.section}>
                <div className={s.instrumentationActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updateConfig(
                        'instrumentations',
                        AVAILABLE_INSTRUMENTATIONS.map((i) => i.id)
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => updateConfig('instrumentations', [])}>
                    Clear All
                  </Button>
                </div>

                {CATEGORY_ORDER.map((cat) => {
                  const items = instrumentationsByCategory[cat];
                  if (!items) {
                    return null;
                  }
                  return (
                    <div key={cat} className={s.instrumentCategory}>
                      <h6 className={s.categoryTitle}>{CATEGORY_LABELS[cat]}</h6>
                      <div className={s.instrumentGrid}>
                        {items.map((inst) => (
                          <Tooltip key={inst.id} content={`${inst.description}\n${inst.package}`} placement="top">
                            <div className={s.instrumentItem}>
                              <Checkbox
                                data-testid={`${testIds.generator.instrumentationPrefix}${inst.id}`}
                                value={config.instrumentations.includes(inst.id)}
                                onChange={() => toggleInstrumentation(inst.id)}
                                label={inst.label}
                              />
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Collapse>

            {/* Sampling */}
            <Collapse
              label="Sampling"
              isOpen={openSections.sampling}
              onToggle={() => toggleSection('sampling')}
              collapsible
            >
              <div className={s.section}>
                <Field label="Sampler">
                  <Select
                    value={config.sampler}
                    options={SAMPLER_OPTIONS}
                    onChange={(v) => updateConfig('sampler', v.value!)}
                    width={40}
                  />
                </Field>
                {(config.sampler === 'traceidratio' || config.sampler === 'parentbased_traceidratio') && (
                  <Field label="Sampling Ratio" description="Value between 0.0 and 1.0">
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={config.samplingRatio}
                      onChange={(e) => updateConfig('samplingRatio', parseFloat(e.currentTarget.value) || 0)}
                      width={20}
                    />
                  </Field>
                )}
              </div>
            </Collapse>

            {/* Propagators */}
            <Collapse
              label="Propagators"
              isOpen={openSections.propagators}
              onToggle={() => toggleSection('propagators')}
              collapsible
            >
              <div className={s.section}>
                {PROPAGATOR_OPTIONS.map((prop) => (
                  <div key={prop.value} className={s.propagatorItem}>
                    <Checkbox
                      value={config.propagators.includes(prop.value)}
                      onChange={() => togglePropagator(prop.value)}
                      label={prop.label}
                      description={prop.description}
                    />
                  </div>
                ))}
              </div>
            </Collapse>

            {/* Resource Attributes */}
            <Collapse
              label="Custom Resource Attributes"
              isOpen={openSections.resources}
              onToggle={() => toggleSection('resources')}
              collapsible
            >
              <div className={s.section}>
                {config.resourceAttributes.map((attr, i) => (
                  <div key={i} className={s.resourceRow}>
                    <Input
                      placeholder="attribute.key"
                      value={attr.key}
                      onChange={(e) => updateResourceAttribute(i, 'key', e.currentTarget.value)}
                      width={20}
                    />
                    <Input
                      placeholder="value"
                      value={attr.value}
                      onChange={(e) => updateResourceAttribute(i, 'value', e.currentTarget.value)}
                      width={20}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      icon="trash-alt"
                      aria-label="Remove attribute"
                      onClick={() => removeResourceAttribute(i)}
                    />
                  </div>
                ))}
                <Button variant="secondary" size="sm" icon="plus" onClick={addResourceAttribute}>
                  Add attribute
                </Button>
              </div>
            </Collapse>

            {/* Output Settings */}
            <Collapse
              label="Output Settings"
              isOpen={openSections.output}
              onToggle={() => toggleSection('output')}
              collapsible
            >
              <div className={s.section}>
                <Field label="Package Manager">
                  <RadioButtonGroup
                    value={config.packageManager}
                    options={PKG_MANAGER_OPTIONS}
                    onChange={(v) => updateConfig('packageManager', v)}
                  />
                </Field>
                <InlineField label="TypeScript" labelWidth={14}>
                  <InlineSwitch
                    value={config.useTypeScript}
                    onChange={() => updateConfig('useTypeScript', !config.useTypeScript)}
                  />
                </InlineField>
              </div>
            </Collapse>
          </div>

          {/* ── Right Panel: Code Preview ─────────────────────────────────── */}
          <div className={s.previewPanel}>
            <div className={s.previewHeader}>
              <div className={s.tabBar}>
                <Button
                  variant={activeTab === 'code' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('code')}
                  icon="file-alt"
                >
                  Instrumentation Code
                </Button>
                <Button
                  variant={activeTab === 'install' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('install')}
                  icon="download-alt"
                >
                  Install Command
                </Button>
                <Button
                  variant={activeTab === 'docker' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('docker')}
                  icon="docker"
                >
                  Docker Compose
                </Button>
              </div>

              <div className={s.previewActions}>
                <Button
                  data-testid={testIds.generator.copyButton}
                  variant="secondary"
                  size="sm"
                  icon={copied ? 'check' : 'copy'}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  data-testid={testIds.generator.downloadButton}
                  variant="primary"
                  size="sm"
                  icon="download-alt"
                  onClick={handleDownload}
                >
                  Download
                </Button>
              </div>
            </div>

            <div className={s.editorContainer}>
              <CodeEditor
                value={currentOutput}
                language={codeLanguage}
                height="100%"
                showMiniMap={false}
                showLineNumbers={true}
                readOnly={true}
                monacoOptions={{
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                }}
              />
            </div>

            {activeTab === 'code' && (
              <Alert title="Usage" severity="info" className={s.usageAlert}>
                Load this file <strong>before</strong> any other import in your application:
                <pre className={s.usagePre}>
                  {config.useTypeScript
                    ? `// At the top of your entry file\nimport './instrumentation';`
                    : `// Or run with:\nnode --require ./instrumentation.js app.js`}
                </pre>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </PluginPage>
  );
}

export default OpenTelemetryGeneratorPage;

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    padding: ${theme.spacing(2)};
  `,
  header: css`
    margin-bottom: ${theme.spacing(3)};
  `,
  title: css`
    margin: 0 0 ${theme.spacing(0.5)} 0;
  `,
  subtitle: css`
    color: ${theme.colors.text.secondary};
    margin: 0;
  `,
  layout: css`
    display: grid;
    grid-template-columns: minmax(380px, 1fr) minmax(480px, 1.5fr);
    gap: ${theme.spacing(3)};
    align-items: start;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  `,
  configPanel: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
  `,
  section: css`
    padding: ${theme.spacing(1)} ${theme.spacing(2)} ${theme.spacing(2)};
  `,
  signalRow: css`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(1)};
  `,
  exporterSelect: css`
    margin: 0;
  `,
  instrumentationActions: css`
    display: flex;
    gap: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(2)};
  `,
  instrumentCategory: css`
    margin-bottom: ${theme.spacing(2)};
  `,
  categoryTitle: css`
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 ${theme.spacing(1)} 0;
    padding-bottom: ${theme.spacing(0.5)};
    border-bottom: 1px solid ${theme.colors.border.weak};
  `,
  instrumentGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: ${theme.spacing(0.5)} ${theme.spacing(2)};
  `,
  instrumentItem: css`
    display: flex;
    align-items: center;
  `,
  propagatorItem: css`
    margin-bottom: ${theme.spacing(1)};
  `,
  resourceRow: css`
    display: flex;
    gap: ${theme.spacing(1)};
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  previewPanel: css`
    display: flex;
    flex-direction: column;
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    position: sticky;
    top: ${theme.spacing(2)};
  `,
  previewHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${theme.spacing(1)} ${theme.spacing(2)};
    border-bottom: 1px solid ${theme.colors.border.weak};
    flex-wrap: wrap;
    gap: ${theme.spacing(1)};
  `,
  tabBar: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
  `,
  previewActions: css`
    display: flex;
    gap: ${theme.spacing(1)};
  `,
  editorContainer: css`
    height: 520px;
    overflow: hidden;
  `,
  usageAlert: css`
    margin: ${theme.spacing(1)} ${theme.spacing(2)} ${theme.spacing(2)};
  `,
  usagePre: css`
    margin-top: ${theme.spacing(1)};
    padding: ${theme.spacing(1)};
    background: ${theme.colors.background.canvas};
    border-radius: ${theme.shape.radius.default};
    font-size: ${theme.typography.bodySmall.fontSize};
    overflow-x: auto;
  `,
});
