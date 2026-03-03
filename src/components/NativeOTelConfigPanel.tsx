import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import {
  Button,
  Checkbox,
  Collapse,
  Field,
  InlineField,
  InlineSwitch,
  Input,
  RadioButtonGroup,
  Select,
  Tooltip,
  useStyles2,
} from '@grafana/ui';
import { testIds } from './testIds';
import {
  OTelConfig,
  AVAILABLE_INSTRUMENTATIONS,
  type OTelProtocol,
  type OTelEnvironment,
  type SamplerType,
  type ExporterType,
  type PackageManager,
  type PropagatorType,
  type ResourceAttribute,
} from '../types/otelConfig';

// ─── Selection options ────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface NativeOTelConfigPanelProps {
  config: OTelConfig;
  setConfig: React.Dispatch<React.SetStateAction<OTelConfig>>;
}

export function NativeOTelConfigPanel({ config, setConfig }: NativeOTelConfigPanelProps) {
  const s = useStyles2(getStyles);

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

  const updateConfig = useCallback(
    <K extends keyof OTelConfig>(key: K, value: OTelConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [setConfig]
  );

  const toggleInstrumentation = useCallback(
    (id: string) => {
      setConfig((prev) => {
        const current = prev.instrumentations;
        return {
          ...prev,
          instrumentations: current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
        };
      });
    },
    [setConfig]
  );

  const togglePropagator = useCallback(
    (value: PropagatorType) => {
      setConfig((prev) => {
        const current = prev.propagators;
        return {
          ...prev,
          propagators: current.includes(value) ? current.filter((p) => p !== value) : [...current, value],
        };
      });
    },
    [setConfig]
  );

  const addResourceAttribute = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      resourceAttributes: [...prev.resourceAttributes, { key: '', value: '' }],
    }));
  }, [setConfig]);

  const updateResourceAttribute = useCallback(
    (index: number, field: keyof ResourceAttribute, value: string) => {
      setConfig((prev) => {
        const attrs = [...prev.resourceAttributes];
        attrs[index] = { ...attrs[index], [field]: value };
        return { ...prev, resourceAttributes: attrs };
      });
    },
    [setConfig]
  );

  const removeResourceAttribute = useCallback(
    (index: number) => {
      setConfig((prev) => ({
        ...prev,
        resourceAttributes: prev.resourceAttributes.filter((_, i) => i !== index),
      }));
    },
    [setConfig]
  );

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

  return (
    <>
      {/* Service Configuration */}
      <Collapse label="Service Configuration" isOpen={openSections.basic} onToggle={() => toggleSection('basic')}>
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
      <Collapse label="Signals & Exporters" isOpen={openSections.signals} onToggle={() => toggleSection('signals')}>
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
        </div>
      </Collapse>

      {/* Instrumentations */}
      <Collapse
        label={`Instrumentations (${selectedCount} selected)`}
        isOpen={openSections.instrumentations}
        onToggle={() => toggleSection('instrumentations')}
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
      <Collapse label="Sampling" isOpen={openSections.sampling} onToggle={() => toggleSection('sampling')}>
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
      <Collapse label="Propagators" isOpen={openSections.propagators} onToggle={() => toggleSection('propagators')}>
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
      <Collapse label="Output Settings" isOpen={openSections.output} onToggle={() => toggleSection('output')}>
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
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: GrafanaTheme2) => ({
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
});
