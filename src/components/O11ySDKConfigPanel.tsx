import React, { useCallback, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import {
  Button,
  Collapse,
  Field,
  InlineField,
  InlineSwitch,
  Input,
  RadioButtonGroup,
  Select,
  useStyles2,
} from '@grafana/ui';
import {
  O11yConfig,
  type O11yProtocol,
  type O11yCollectorMode,
  type O11yDiagLogLevel,
  type O11yIgnoreUrlType,
  type O11yResourceAttribute,
  type O11ySpanAttribute,
  type O11yIgnoreUrl,
} from '../types/o11yConfig';
import type { PackageManager } from '../types/otelConfig';

// ─── Selection options ────────────────────────────────────────────────────────

const PROTOCOL_OPTIONS = [
  {
    label: 'gRPC',
    value: 'grpc' as O11yProtocol,
    description: 'Recommended — default collector port 4317',
  },
  {
    label: 'HTTP',
    value: 'http' as O11yProtocol,
    description: 'HTTP/Protobuf — default collector port 4318',
  },
  {
    label: 'Console',
    value: 'console' as O11yProtocol,
    description: 'Prints signals to stdout (dev / debug only)',
  },
];

const COLLECTOR_MODE_OPTIONS = [
  {
    label: 'Batch',
    value: 'batch' as O11yCollectorMode,
    description: 'Time-windowed batching — recommended for production',
  },
  {
    label: 'Single',
    value: 'single' as O11yCollectorMode,
    description: 'Immediate per-signal request — useful for debugging',
  },
];

const DIAG_LOG_LEVEL_OPTIONS = [
  { label: 'NONE', value: 'NONE' as O11yDiagLogLevel },
  { label: 'ERROR', value: 'ERROR' as O11yDiagLogLevel },
  { label: 'WARN', value: 'WARN' as O11yDiagLogLevel },
  { label: 'INFO', value: 'INFO' as O11yDiagLogLevel },
  { label: 'DEBUG', value: 'DEBUG' as O11yDiagLogLevel },
  { label: 'VERBOSE', value: 'VERBOSE' as O11yDiagLogLevel },
  { label: 'ALL', value: 'ALL' as O11yDiagLogLevel },
];

const PKG_MANAGER_OPTIONS = [
  { label: 'npm', value: 'npm' as PackageManager },
  { label: 'yarn', value: 'yarn' as PackageManager },
  { label: 'pnpm', value: 'pnpm' as PackageManager },
];

const ENVIRONMENT_OPTIONS = [
  { label: 'Development', value: 'development' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'production' },
];

const IGNORE_URL_TYPE_OPTIONS = [
  { label: 'endsWith', value: 'endsWith' as O11yIgnoreUrlType },
  { label: 'includes', value: 'includes' as O11yIgnoreUrlType },
  { label: 'equals', value: 'equals' as O11yIgnoreUrlType },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface O11ySDKConfigPanelProps {
  config: O11yConfig;
  setConfig: React.Dispatch<React.SetStateAction<O11yConfig>>;
}

export function O11ySDKConfigPanel({ config, setConfig }: O11ySDKConfigPanelProps) {
  const s = useStyles2(getStyles);

  const [openSections, setOpenSections] = useState({
    service: true,
    connection: true,
    sampling: false,
    diagnostics: false,
    metrics: false,
    detection: false,
    resources: false,
    spanAttributes: false,
    ignoreUrls: false,
    output: false,
  });

  const toggleSection = useCallback((key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateConfig = useCallback(
    <K extends keyof O11yConfig>(key: K, value: O11yConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [setConfig]
  );

  // ── Resource attributes ──────────────────────────────────────────────────
  const addResourceAttribute = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      resourceAttributes: [...prev.resourceAttributes, { key: '', value: '' }],
    }));
  }, [setConfig]);

  const updateResourceAttribute = useCallback(
    (index: number, field: keyof O11yResourceAttribute, value: string) => {
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

  // ── Span attributes ─────────────────────────────────────────────────────
  const addSpanAttribute = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      spanAttributes: [...prev.spanAttributes, { key: '', value: '', isFunction: false }],
    }));
  }, [setConfig]);

  const updateSpanAttribute = useCallback(
    (index: number, field: keyof O11ySpanAttribute, value: string | boolean) => {
      setConfig((prev) => {
        const attrs = [...prev.spanAttributes];
        attrs[index] = { ...attrs[index], [field]: value } as O11ySpanAttribute;
        return { ...prev, spanAttributes: attrs };
      });
    },
    [setConfig]
  );

  const removeSpanAttribute = useCallback(
    (index: number) => {
      setConfig((prev) => ({
        ...prev,
        spanAttributes: prev.spanAttributes.filter((_, i) => i !== index),
      }));
    },
    [setConfig]
  );

  // ── Ignore URLs ──────────────────────────────────────────────────────────
  const addIgnoreUrl = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      ignoreUrls: [...prev.ignoreUrls, { type: 'endsWith', url: '' }],
    }));
  }, [setConfig]);

  const updateIgnoreUrl = useCallback(
    (index: number, field: keyof O11yIgnoreUrl, value: string) => {
      setConfig((prev) => {
        const urls = [...prev.ignoreUrls];
        urls[index] = { ...urls[index], [field]: value } as O11yIgnoreUrl;
        return { ...prev, ignoreUrls: urls };
      });
    },
    [setConfig]
  );

  const removeIgnoreUrl = useCallback(
    (index: number) => {
      setConfig((prev) => ({
        ...prev,
        ignoreUrls: prev.ignoreUrls.filter((_, i) => i !== index),
      }));
    },
    [setConfig]
  );

  return (
    <>
      {/* Service Configuration */}
      <Collapse label="Service Configuration" isOpen={openSections.service} onToggle={() => toggleSection('service')}>
        <div className={s.section}>
          <Field label="Service Name" description="Identifies your service in traces and logs">
            <Input
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

          <Field label="Environment" description="Added as deployment.environment resource attribute">
            <RadioButtonGroup
              value={config.environment}
              options={ENVIRONMENT_OPTIONS}
              onChange={(v) => updateConfig('environment', v)}
            />
          </Field>
        </div>
      </Collapse>

      {/* Collector Connection */}
      <Collapse
        label="Collector Connection"
        isOpen={openSections.connection}
        onToggle={() => toggleSection('connection')}
      >
        <div className={s.section}>
          <Field
            label="Collector URL"
            description="gRPC default: http://localhost:4317 | HTTP default: http://localhost:4318"
          >
            <Input
              value={config.collectorUrl}
              onChange={(e) => updateConfig('collectorUrl', e.currentTarget.value)}
              placeholder="http://localhost:4317"
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

          <Field
            label="Collector Mode"
            description="batch is recommended for production; single is useful for debugging"
          >
            <RadioButtonGroup
              value={config.collectorMode}
              options={COLLECTOR_MODE_OPTIONS}
              onChange={(v) => updateConfig('collectorMode', v)}
            />
          </Field>
        </div>
      </Collapse>

      {/* Sampling */}
      <Collapse label="Sampling" isOpen={openSections.sampling} onToggle={() => toggleSection('sampling')}>
        <div className={s.section}>
          <Field
            label="Trace Ratio"
            description="Fraction of traces to sample (0 = drop all, 1 = keep all). Uses TraceIdRatioBased sampler."
          >
            <Input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={config.traceRatio}
              onChange={(e) => updateConfig('traceRatio', parseFloat(e.currentTarget.value) || 0)}
              width={20}
            />
          </Field>
        </div>
      </Collapse>

      {/* Diagnostics */}
      <Collapse label="Diagnostics" isOpen={openSections.diagnostics} onToggle={() => toggleSection('diagnostics')}>
        <div className={s.section}>
          <Field label="Internal Log Level" description="Controls the verbosity of the SDK's internal logger">
            <Select
              value={config.diagLogLevel}
              options={DIAG_LOG_LEVEL_OPTIONS}
              onChange={(v) => updateConfig('diagLogLevel', v.value!)}
              width={20}
            />
          </Field>
        </div>
      </Collapse>

      {/* Metrics */}
      <Collapse label="Metrics" isOpen={openSections.metrics} onToggle={() => toggleSection('metrics')}>
        <div className={s.section}>
          <Field label="Export Interval (ms)" description="How often to push metrics to the collector">
            <Input
              type="number"
              min={1000}
              step={1000}
              value={config.metricsExportIntervalMs}
              onChange={(e) => updateConfig('metricsExportIntervalMs', parseInt(e.currentTarget.value, 10) || 60000)}
              width={20}
            />
          </Field>
        </div>
      </Collapse>

      {/* PII Detection */}
      <Collapse
        label="PII Detection & Redaction"
        isOpen={openSections.detection}
        onToggle={() => toggleSection('detection')}
      >
        <div className={s.section}>
          <p className={s.sectionDescription}>
            The o11y SDK automatically redacts personally-identifiable information from spans and logs.
          </p>
          <InlineField label="Email addresses" labelWidth={20}>
            <InlineSwitch
              value={config.detection.email}
              onChange={() => updateConfig('detection', { ...config.detection, email: !config.detection.email })}
            />
          </InlineField>
          <InlineField label="IP addresses" labelWidth={20}>
            <InlineSwitch
              value={config.detection.ip}
              onChange={() => updateConfig('detection', { ...config.detection, ip: !config.detection.ip })}
            />
          </InlineField>
          <InlineField label="PPSN (IE)" labelWidth={20} tooltip="Personal Public Service Number (Ireland)">
            <InlineSwitch
              value={config.detection.ppsn}
              onChange={() => updateConfig('detection', { ...config.detection, ppsn: !config.detection.ppsn })}
            />
          </InlineField>
        </div>
      </Collapse>

      {/* Custom Resource Attributes */}
      <Collapse
        label="Custom Resource Attributes"
        isOpen={openSections.resources}
        onToggle={() => toggleSection('resources')}
      >
        <div className={s.section}>
          <p className={s.sectionDescription}>
            These are merged with automatically-detected attributes (service name, version, environment, host, …).
          </p>
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

      {/* Span Attributes */}
      <Collapse
        label={`Span Attributes${config.spanAttributes.length > 0 ? ` (${config.spanAttributes.length})` : ''}`}
        isOpen={openSections.spanAttributes}
        onToggle={() => toggleSection('spanAttributes')}
      >
        <div className={s.section}>
          <p className={s.sectionDescription}>
            Attached to every span. Static values are emitted as string literals; function references are emitted as
            identifiers — make sure the function is in scope in your instrumentation file.
          </p>
          {config.spanAttributes.map((attr, i) => (
            <div key={i} className={s.spanAttrRow}>
              <Input
                placeholder="attribute.key"
                value={attr.key}
                onChange={(e) => updateSpanAttribute(i, 'key', e.currentTarget.value)}
                width={18}
              />
              <Input
                placeholder={attr.isFunction ? 'functionName' : 'static value'}
                value={attr.value}
                onChange={(e) => updateSpanAttribute(i, 'value', e.currentTarget.value)}
                width={20}
              />
              <label className={s.fnToggle}>
                <input
                  type="checkbox"
                  checked={attr.isFunction}
                  onChange={(e) => updateSpanAttribute(i, 'isFunction', e.currentTarget.checked)}
                />
                <span>fn</span>
              </label>
              <Button
                variant="destructive"
                size="sm"
                icon="trash-alt"
                aria-label="Remove span attribute"
                onClick={() => removeSpanAttribute(i)}
              />
            </div>
          ))}
          <Button variant="secondary" size="sm" icon="plus" onClick={addSpanAttribute}>
            Add span attribute
          </Button>
        </div>
      </Collapse>

      {/* Ignore URLs */}
      <Collapse
        label={`Ignore URLs${config.ignoreUrls.length > 0 ? ` (${config.ignoreUrls.length})` : ''}`}
        isOpen={openSections.ignoreUrls}
        onToggle={() => toggleSection('ignoreUrls')}
      >
        <div className={s.section}>
          <p className={s.sectionDescription}>
            Requests to these URL patterns are excluded from traces (health checks, metrics endpoints, …).
          </p>
          {config.ignoreUrls.map((entry, i) => (
            <div key={i} className={s.ignoreUrlRow}>
              <Select
                value={entry.type}
                options={IGNORE_URL_TYPE_OPTIONS}
                onChange={(v) => updateIgnoreUrl(i, 'type', v.value!)}
                width={14}
              />
              <Input
                placeholder="/health"
                value={entry.url}
                onChange={(e) => updateIgnoreUrl(i, 'url', e.currentTarget.value)}
                width={28}
              />
              <Button
                variant="destructive"
                size="sm"
                icon="trash-alt"
                aria-label="Remove URL filter"
                onClick={() => removeIgnoreUrl(i)}
              />
            </div>
          ))}
          <Button variant="secondary" size="sm" icon="plus" onClick={addIgnoreUrl}>
            Add URL filter
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
  sectionDescription: css`
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    margin: 0 0 ${theme.spacing(1.5)} 0;
  `,
  resourceRow: css`
    display: flex;
    gap: ${theme.spacing(1)};
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  ignoreUrlRow: css`
    display: flex;
    gap: ${theme.spacing(1)};
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  spanAttrRow: css`
    display: flex;
    gap: ${theme.spacing(1)};
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  fnToggle: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    cursor: pointer;
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    white-space: nowrap;
    user-select: none;

    input[type='checkbox'] {
      accent-color: ${theme.colors.primary.main};
    }
  `,
});
