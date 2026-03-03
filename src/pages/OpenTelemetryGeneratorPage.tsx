import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, CodeEditor, RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { testIds } from '../components/testIds';
import { OTelConfig, DEFAULT_CONFIG } from '../types/otelConfig';
import { O11yConfig, DEFAULT_O11Y_CONFIG } from '../types/o11yConfig';
import { generateFullCode, generateInstallCommand, generateCollectorDockerCompose } from '../utils/codeGenerator';
import {
  generateO11yCode,
  generateO11yInstallCommand,
  generateO11yCollectorDockerCompose,
} from '../utils/o11yCodeGenerator';
import { NativeOTelConfigPanel } from '../components/NativeOTelConfigPanel';
import { O11ySDKConfigPanel } from '../components/O11ySDKConfigPanel';

// ─── SDK selector options ─────────────────────────────────────────────────────

type SDKType = 'opentelemetry' | 'o11y';

const SDK_OPTIONS = [
  {
    label: 'OpenTelemetry Native',
    value: 'opentelemetry' as SDKType,
    description: 'Full control — configure every OTel primitive directly',
  },
  {
    label: 'o11y SDK',
    value: 'o11y' as SDKType,
    description: '@ogcio/o11y-sdk-node — opinionated wrapper with PII redaction & auto-instrumentation',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

function OpenTelemetryGeneratorPage() {
  const s = useStyles2(getStyles);

  // ── SDK selection ──────────────────────────────────────────────────────────
  const [sdkType, setSdkType] = useState<SDKType>('opentelemetry');

  // ── Per-SDK config state ───────────────────────────────────────────────────
  const [otelConfig, setOtelConfig] = useState<OTelConfig>(DEFAULT_CONFIG);
  const [o11yConfig, setO11yConfig] = useState<O11yConfig>(DEFAULT_O11Y_CONFIG);

  // ── Preview panel state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'code' | 'install' | 'docker'>('code');
  const [copied, setCopied] = useState(false);

  // ── Derived outputs ────────────────────────────────────────────────────────
  const generatedCode = useMemo(
    () => (sdkType === 'opentelemetry' ? generateFullCode(otelConfig) : generateO11yCode(o11yConfig)),
    [sdkType, otelConfig, o11yConfig]
  );

  const installCmd = useMemo(
    () =>
      sdkType === 'opentelemetry'
        ? generateInstallCommand(otelConfig)
        : generateO11yInstallCommand(o11yConfig),
    [sdkType, otelConfig, o11yConfig]
  );

  const dockerCompose = useMemo(
    () =>
      sdkType === 'opentelemetry'
        ? generateCollectorDockerCompose(otelConfig)
        : generateO11yCollectorDockerCompose(o11yConfig),
    [sdkType, otelConfig, o11yConfig]
  );

  // ── Code language for the Monaco editor ───────────────────────────────────
  const codeLanguage = useMemo(() => {
    if (activeTab === 'docker') {
      return 'yaml';
    }
    if (activeTab === 'install') {
      return 'shell';
    }
    const isTS =
      sdkType === 'opentelemetry' ? otelConfig.useTypeScript : o11yConfig.useTypeScript;
    return isTS ? 'typescript' : 'javascript';
  }, [activeTab, sdkType, otelConfig.useTypeScript, o11yConfig.useTypeScript]);

  const currentOutput =
    activeTab === 'code' ? generatedCode : activeTab === 'install' ? installCmd : dockerCompose;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentOutput]);

  const handleDownload = useCallback(() => {
    const isTS =
      sdkType === 'opentelemetry' ? otelConfig.useTypeScript : o11yConfig.useTypeScript;
    const ext = isTS ? 'ts' : 'js';
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
  }, [activeTab, sdkType, otelConfig.useTypeScript, o11yConfig.useTypeScript, generatedCode, installCmd, dockerCompose]);

  // ── Usage hint (bottom of code tab) ───────────────────────────────────────
  const usageHint = useMemo(() => {
    const isTS =
      sdkType === 'opentelemetry' ? otelConfig.useTypeScript : o11yConfig.useTypeScript;
    if (isTS) {
      return `// At the top of your entry file\nimport './instrumentation';`;
    }
    if (sdkType === 'o11y') {
      return `// At the top of your entry file (the file must be an ES module or use top-level await)\nimport './instrumentation.js';`;
    }
    return `// Or run with:\nnode --require ./instrumentation.js app.js`;
  }, [sdkType, otelConfig.useTypeScript, o11yConfig.useTypeScript]);

  return (
    <PluginPage>
      <div data-testid={testIds.generator.container} className={s.wrapper}>
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className={s.header}>
          <h2 className={s.title}>OpenTelemetry JS Instrumentation Generator</h2>
          <p className={s.subtitle}>
            Configure your Node.js instrumentation and generate ready-to-use code.
          </p>

          {/* SDK selector */}
          <div className={s.sdkSelector}>
            <span className={s.sdkSelectorLabel}>SDK</span>
            <RadioButtonGroup
              value={sdkType}
              options={SDK_OPTIONS}
              onChange={(v) => setSdkType(v)}
            />
          </div>
        </div>

        <div className={s.layout}>
          {/* ── Left panel: configuration ────────────────────────────── */}
          <div className={s.configPanel}>
            {sdkType === 'opentelemetry' ? (
              <NativeOTelConfigPanel config={otelConfig} setConfig={setOtelConfig} />
            ) : (
              <O11ySDKConfigPanel config={o11yConfig} setConfig={setO11yConfig} />
            )}
          </div>

          {/* ── Right panel: code preview ─────────────────────────────── */}
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
                height="520px"
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
                <pre className={s.usagePre}>{usageHint}</pre>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </PluginPage>
  );
}

export default OpenTelemetryGeneratorPage;

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    margin: 0 0 ${theme.spacing(2)} 0;
  `,
  sdkSelector: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
  `,
  sdkSelectorLabel: css`
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  `,
  layout: css`
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: ${theme.spacing(3)};
    align-items: start;
    min-width: 0;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  `,
  configPanel: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
  `,
  previewPanel: css`
    display: flex;
    flex-direction: column;
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    position: sticky;
    top: ${theme.spacing(2)};
    min-width: 0;
    min-height: 600px;
    overflow: hidden;
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
    min-height: 520px;
    overflow: hidden;
    position: relative;
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
