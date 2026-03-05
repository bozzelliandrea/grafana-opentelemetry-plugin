import React, { useCallback, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, CodeEditor, useStyles2 } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import {
  BLANK_PACKAGE_JSON,
  INSTRUMENTED_PACKAGE_JSON,
  APP_JS,
  APP_JS_INSTRUMENTED,
  INSTRUMENTATION_JS,
} from '../utils/sampleApps';
import JSZip from 'jszip';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppVariant = 'instrumented' | 'blank';

interface AppFile {
  name: string;
  language: string;
  content: string;
}

// ─── File sets ────────────────────────────────────────────────────────────────

const BLANK_FILES: AppFile[] = [
  { name: 'package.json', language: 'json', content: BLANK_PACKAGE_JSON },
  { name: 'src/app.js', language: 'javascript', content: APP_JS },
];

const INSTRUMENTED_FILES: AppFile[] = [
  { name: 'package.json', language: 'json', content: INSTRUMENTED_PACKAGE_JSON },
  { name: 'src/instrumentation.js', language: 'javascript', content: INSTRUMENTATION_JS },
  { name: 'src/app.js', language: 'javascript', content: APP_JS_INSTRUMENTED },
];

// ─── Re-usable: inline code snippet with copy ─────────────────────────────────

function CodeSnippet({ code, language = 'shell' }: { code: string; language?: string }) {
  const s = useStyles2(getSnippetStyles);
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className={s.wrapper}>
      <div className={s.editorWrap}>
        <CodeEditor
          value={code}
          language={language}
          height={Math.min(Math.max(code.split('\n').length * 20 + 16, 48), 240) + 'px'}
          showMiniMap={false}
          showLineNumbers={false}
          readOnly
          monacoOptions={{ wordWrap: 'on', scrollBeyondLastLine: false, fontSize: 13 }}
        />
      </div>
      <Button className={s.copyBtn} variant="secondary" size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}

const getSnippetStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    position: relative;
    margin: ${theme.spacing(1)} 0;
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    overflow: hidden;
  `,
  editorWrap: css`
    /* let the CodeEditor control its own height */
  `,
  copyBtn: css`
    position: absolute;
    top: ${theme.spacing(0.75)};
    right: ${theme.spacing(0.75)};
    z-index: 1;
  `,
});

// ─── Re-usable: step header ───────────────────────────────────────────────────

function StepHeader({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  const s = useStyles2(getStepHeaderStyles);
  return (
    <div className={s.root}>
      <div className={s.badge}>{number}</div>
      <div>
        <h3 className={s.title}>{title}</h3>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}

const getStepHeaderStyles = (theme: GrafanaTheme2) => ({
  root: css`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(2)};
  `,
  badge: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 50%;
    background: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
    font-weight: ${theme.typography.fontWeightBold};
    font-size: ${theme.typography.body.fontSize};
    line-height: 1;
  `,
  title: css`
    margin: 0 0 ${theme.spacing(0.25)} 0;
    font-size: ${theme.typography.h4.fontSize};
  `,
  subtitle: css`
    margin: 0;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
});

// ─── Re-usable: Grafana tool card ─────────────────────────────────────────────

interface GrafanaCardProps {
  icon: string;
  title: string;
  tagline: string;
  color: string;
  children: React.ReactNode;
}

function GrafanaCard({ icon, title, tagline, color, children }: GrafanaCardProps) {
  const s = useStyles2((theme) => getCardStyles(theme, color));
  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <span className={s.icon}>{icon}</span>
        <div>
          <div className={s.cardTitle}>{title}</div>
          <div className={s.cardTagline}>{tagline}</div>
        </div>
      </div>
      <div className={s.cardBody}>{children}</div>
    </div>
  );
}

const getCardStyles = (theme: GrafanaTheme2, accentColor: string) => ({
  card: css`
    border: 1px solid ${theme.colors.border.weak};
    border-top: 3px solid ${accentColor};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
    overflow: hidden;
  `,
  cardHeader: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1.5)};
    padding: ${theme.spacing(1.5)} ${theme.spacing(2)};
    border-bottom: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.primary};
  `,
  icon: css`
    font-size: 24px;
    line-height: 1;
  `,
  cardTitle: css`
    font-weight: ${theme.typography.fontWeightMedium};
    font-size: ${theme.typography.body.fontSize};
  `,
  cardTagline: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
  cardBody: css`
    padding: ${theme.spacing(2)};
  `,
});

// ─── File viewer component ────────────────────────────────────────────────────

function FileViewer({ files }: { files: AppFile[] }) {
  const s = useStyles2(getFileViewerStyles);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = files[activeIdx];

  const generateZip = async () => {
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.name, file.content);
    }
    zip.file(
      'README.md',
      '# Sample Application\n\nThis is a sample Node.js application for OpenTelemetry practice. It includes a few routes and an in-memory data store, and can be used to generate logs, traces and metrics for exploration in Grafana.\n\n## Routes\n- `GET /health`: Health check endpoint.\n- `GET /`: Welcome message and route listing.\n- `GET /items`: List all items.\n- `GET /items/:id`: Get a single item by id.\n- `POST /items`: Create a new item.\n- `GET /slow`: Simulate a slow endpoint with a 2-second delay.\n\n## Usage\n1. Start an OpenTelemetry Collector (e.g. using the provided `docker-compose.yaml`).\n2. Run the application with `npm start`.\n3. Generate some traffic by hitting the endpoints (e.g. using `curl`).\n4. Explore the emitted telemetry data in Grafana (Loki for logs, Tempo for traces, Mimir for metrics).'
    );

    const blob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const download = useCallback(() => {
    const blob = new Blob([active.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.name.split('/').pop() ?? active.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [active]);

  return (
    <div className={s.root}>
      <div className={s.tabBar}>
        {files.map((f, i) => (
          <button key={f.name} className={i === activeIdx ? s.tabActive : s.tab} onClick={() => setActiveIdx(i)}>
            {f.name}
          </button>
        ))}
        <div className={s.spacer} />
        <Button variant="primary" size="sm" icon="archive-alt" onClick={generateZip}>
          Download ZIP
        </Button>
        <Button variant="secondary" size="sm" icon="download-alt" onClick={download}>
          Download {active.name.split('/').pop()}
        </Button>
      </div>
      <CodeEditor
        value={active.content}
        language={active.language}
        height="380px"
        showMiniMap={false}
        showLineNumbers
        readOnly
        monacoOptions={{ wordWrap: 'on', scrollBeyondLastLine: false, fontSize: 13 }}
      />
    </div>
  );
}

const getFileViewerStyles = (theme: GrafanaTheme2) => ({
  root: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    overflow: hidden;
  `,
  tabBar: css`
    display: flex;
    align-items: center;
    gap: 0;
    background: ${theme.colors.background.canvas};
    border-bottom: 1px solid ${theme.colors.border.weak};
    padding: 0 ${theme.spacing(1)};
    flex-wrap: wrap;
    gap: ${theme.spacing(0.25)};
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
  `,
  tab: css`
    padding: ${theme.spacing(0.5)} ${theme.spacing(1.25)};
    border: 1px solid transparent;
    border-radius: ${theme.shape.radius.default};
    background: transparent;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    font-family: ${theme.typography.fontFamilyMonospace};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.text.primary};
      background: ${theme.colors.action.hover};
    }
  `,
  tabActive: css`
    padding: ${theme.spacing(0.5)} ${theme.spacing(1.25)};
    border: 1px solid ${theme.colors.border.medium};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.bodySmall.fontSize};
    font-family: ${theme.typography.fontFamilyMonospace};
    cursor: pointer;
  `,
  spacer: css`
    flex: 1;
  `,
});

// ─── Variant selector card ────────────────────────────────────────────────────

interface VariantCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  tags: string[];
  accentColor: string;
}

function VariantCard({ selected, onSelect, title, subtitle, tags, accentColor }: VariantCardProps) {
  const s = useStyles2((theme) => getVariantCardStyles(theme, selected, accentColor));
  return (
    <button className={s.card} onClick={onSelect}>
      <div className={s.header}>
        <span className={s.title}>{title}</span>
        {selected && <span className={s.selectedBadge}>Selected</span>}
      </div>
      <p className={s.subtitle}>{subtitle}</p>
      <div className={s.tags}>
        {tags.map((tag) => (
          <span key={tag} className={s.tag}>
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

const getVariantCardStyles = (theme: GrafanaTheme2, selected: boolean, accentColor: string) => ({
  card: css`
    text-align: left;
    border: 2px solid ${selected ? accentColor : theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    background: ${selected ? theme.colors.background.secondary : theme.colors.background.primary};
    padding: ${theme.spacing(1.5)} ${theme.spacing(2)};
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
    width: 100%;

    &:hover {
      border-color: ${accentColor};
    }
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(0.5)};
  `,
  title: css`
    font-weight: ${theme.typography.fontWeightMedium};
    font-size: ${theme.typography.body.fontSize};
    color: ${theme.colors.text.primary};
  `,
  selectedBadge: css`
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: ${accentColor};
    color: #fff;
    font-weight: ${theme.typography.fontWeightMedium};
  `,
  subtitle: css`
    margin: 0 0 ${theme.spacing(1)} 0;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  tags: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
    flex-wrap: wrap;
  `,
  tag: css`
    font-size: 11px;
    padding: 2px 8px;
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.canvas};
    border: 1px solid ${theme.colors.border.weak};
    color: ${theme.colors.text.secondary};
    font-family: ${theme.typography.fontFamilyMonospace};
  `,
});

// ─── Query example block ──────────────────────────────────────────────────────

function QueryExample({ label, query, language = 'promql' }: { label: string; query: string; language?: string }) {
  const s = useStyles2(getQueryExampleStyles);
  return (
    <div className={s.root}>
      <div className={s.label}>{label}</div>
      <CodeSnippet code={query} language={language} />
    </div>
  );
}

const getQueryExampleStyles = (theme: GrafanaTheme2) => ({
  root: css`
    margin-bottom: ${theme.spacing(1.5)};
  `,
  label: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing(0.25)};
    font-weight: ${theme.typography.fontWeightMedium};
  `,
});

// ─── Main page ────────────────────────────────────────────────────────────────

function DeveloperGuidePage() {
  const s = useStyles2(getStyles);
  const [variant, setVariant] = useState<AppVariant>('instrumented');

  const files = variant === 'instrumented' ? INSTRUMENTED_FILES : BLANK_FILES;

  return (
    <PluginPage>
      <div className={s.wrapper}>
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className={s.pageHeader}>
          <h2 className={s.pageTitle}>Developer Quick-Start Guide</h2>
          <p className={s.pageSubtitle}>
            Follow these steps to instrument a Node.js application and explore its telemetry data in Grafana — from log
            lines to distributed traces and live metrics.
          </p>
        </div>

        <div className={s.steps}>
          {/* ── Step 1: Get the sample app ───────────────────────────── */}
          <section className={s.step}>
            <StepHeader
              number={1}
              title="Get the sample Fastify application"
              subtitle="A minimal Node.js API with in-memory data — no database required."
            />

            {/* Variant selector */}
            <div className={s.variantGrid}>
              <VariantCard
                selected={variant === 'instrumented'}
                onSelect={() => setVariant('instrumented')}
                title="Pre-instrumented app"
                subtitle="Comes with @ogcio/o11y-sdk-node already wired up. Start sending telemetry immediately."
                tags={['@ogcio/o11y-sdk-node', 'fastify', 'ready to run']}
                accentColor="#5794F2"
              />
              <VariantCard
                selected={variant === 'blank'}
                onSelect={() => setVariant('blank')}
                title="Blank app (instrument it yourself)"
                subtitle="Plain Fastify app with no OTel code. Use the generator to build and add your own instrumentation."
                tags={['fastify', 'no instrumentation', 'learning path']}
                accentColor="#F2CC0C"
              />
            </div>

            {/* File viewer */}
            <div className={s.fileViewerWrap}>
              <FileViewer files={files} />
            </div>

            {/* Setup commands */}
            <div className={s.setupCommands}>
              <p className={s.inlineLabel}>Download the files above into a new directory, then install and run:</p>
              <CodeSnippet code={`npm install\nnpm start`} language="shell" />
            </div>
          </section>

          {/* ── Step 2: Instrument (only shown for blank variant) ────── */}
          {variant === 'blank' && (
            <section className={s.step}>
              <StepHeader
                number={2}
                title="Create your instrumentation file"
                subtitle="Use the Instrumentation Generator to build a tailored bootstrap file, then drop it into src/."
              />
              <div className={s.generatorCallout}>
                <div className={s.generatorCalloutText}>
                  <strong>Instrumentation Generator</strong>
                  <p>
                    Open the generator, choose <em>o11y SDK</em> or <em>OpenTelemetry Native</em>, configure your
                    collector URL and service name, then download
                    <code className={s.inlineCode}> instrumentation.js</code> (or{' '}
                    <code className={s.inlineCode}>.ts</code>).
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon="arrow-right"
                  onClick={() => {
                    window.location.href = prefixRoute(ROUTES.Generator);
                  }}
                >
                  Open Generator
                </Button>
              </div>

              <p className={s.inlineLabel}>
                Then import it as the <strong>first line</strong> of <code className={s.inlineCode}>src/app.js</code>:
              </p>
              <CodeSnippet code={`import './instrumentation.js'; // ← must be first`} language="javascript" />
            </section>
          )}

          {/* ── Step 3 (or 2 for instrumented): Start collector ──────── */}
          <section className={s.step}>
            <StepHeader
              number={variant === 'instrumented' ? 2 : 3}
              title="Start an OpenTelemetry Collector"
              subtitle="The collector receives OTLP data from your app and forwards it to Loki, Tempo and Mimir."
            />

            <p className={s.bodyText}>
              Save the snippet below as <code className={s.inlineCode}>docker-compose.yaml</code> and run{' '}
              <code className={s.inlineCode}>docker compose up -d</code>. Replace the{' '}
              <code className={s.inlineCode}>LOKI_URL</code>, <code className={s.inlineCode}>TEMPO_URL</code> and{' '}
              <code className={s.inlineCode}>PROMETHEUS_URL</code> variables with the remote-write endpoints from your
              Grafana Cloud stack (or your self-hosted URLs).
            </p>

            <CodeSnippet
              language="yaml"
              code={`version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config", "/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP`}
            />

            <p className={s.inlineLabel}>
              Minimal collector config (<code className={s.inlineCode}>otel-collector-config.yaml</code>):
            </p>
            <CodeSnippet
              language="yaml"
              code={`receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlphttp/loki:
    endpoint: \${LOKI_URL}    # e.g. https://<user>:<token>@logs-prod.grafana.net/loki/api/v1/push
  otlp/tempo:
    endpoint: \${TEMPO_URL}   # e.g. https://<user>:<token>@tempo-prod.grafana.net:443
  prometheusremotewrite:
    endpoint: \${PROMETHEUS_URL}  # e.g. https://<user>:<token>@prometheus-prod.grafana.net/api/prom/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]`}
            />
          </section>

          {/* ── Step 4 (or 3): Generate traffic ──────────────────────── */}
          <section className={s.step}>
            <StepHeader
              number={variant === 'instrumented' ? 3 : 4}
              title="Generate some traffic"
              subtitle="Hit a few endpoints so there is data to explore in Grafana."
            />
            <CodeSnippet
              language="shell"
              code={`# List items
curl http://localhost:3000/items

# Get a single item
curl http://localhost:3000/items/1

# Create a new item
curl -X POST http://localhost:3000/items \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Widget D","price":19.99}'

# Trigger a slow span (good for Tempo latency search)
curl http://localhost:3000/slow`}
            />
          </section>

          {/* ── Step 5 (or 4): Explore in Grafana ───────────────────── */}
          <section className={s.step}>
            <StepHeader
              number={variant === 'instrumented' ? 4 : 5}
              title="Explore telemetry in Grafana"
              subtitle={`Navigate to Grafana → Explore → select your data source → paste a query below.`}
            />

            <Alert severity="info" title="Tip — Explore tab" className={s.exploreTip}>
              In Grafana, go to <strong>Explore</strong> (compass icon in the left sidebar). Use the data source
              switcher at the top to jump between Loki, Tempo and Mimir.
            </Alert>

            <div className={s.grafanaGrid}>
              {/* Loki */}
              <GrafanaCard
                icon="📋"
                title="Loki — Logs"
                tagline="Search and tail structured log output from your service"
                color="#F4812A"
              >
                <QueryExample
                  label="All logs from your service"
                  query={`{service_name="o11y-demo-app"}`}
                  language="logql"
                />
                <QueryExample
                  label="Only error-level log lines"
                  query={`{service_name="o11y-demo-app"} | json | level="error"`}
                  language="logql"
                />
                <QueryExample
                  label="Logs for a specific HTTP route"
                  query={`{service_name="o11y-demo-app"} |= "/items"`}
                  language="logql"
                />
                <QueryExample
                  label="Log rate (lines / min)"
                  query={`rate({service_name="o11y-demo-app"}[1m])`}
                  language="logql"
                />
              </GrafanaCard>

              {/* Tempo */}
              <GrafanaCard
                icon="🔍"
                title="Tempo — Distributed Traces"
                tagline="Follow a request as it flows through every span"
                color="#7EB26D"
              >
                <p className={s.cardHint}>
                  In the <strong>Tempo</strong> data source, switch to <strong>Search</strong> mode and filter by
                  service name, or use <strong>TraceQL</strong> for precise queries.
                </p>
                <QueryExample
                  label="All traces for the service"
                  query={`{resource.service.name="o11y-demo-app"}`}
                  language="traceql"
                />
                <QueryExample
                  label="Traces slower than 200 ms"
                  query={`{resource.service.name="o11y-demo-app" && duration > 200ms}`}
                  language="traceql"
                />
                <QueryExample
                  label="Traces for the /slow route"
                  query={`{resource.service.name="o11y-demo-app" && span.http.route="/slow"}`}
                  language="traceql"
                />
                <QueryExample
                  label="Traces that returned an HTTP 404"
                  query={`{resource.service.name="o11y-demo-app" && span.http.response.status_code=404}`}
                  language="traceql"
                />
              </GrafanaCard>

              {/* Mimir / Prometheus */}
              <GrafanaCard
                icon="📈"
                title="Mimir — Metrics"
                tagline="Query Node.js process and HTTP metrics with PromQL"
                color="#5794F2"
              >
                <p className={s.cardHint}>
                  These metrics are auto-collected by the OpenTelemetry SDK — no manual instrumentation needed.
                </p>
                <QueryExample
                  label="HTTP request rate (req/s)"
                  query={`rate(http_server_request_duration_seconds_count{service_name="o11y-demo-app"}[1m])`}
                />
                <QueryExample
                  label="P95 HTTP response latency"
                  query={`histogram_quantile(\n  0.95,\n  rate(http_server_request_duration_seconds_bucket{service_name="o11y-demo-app"}[5m])\n)`}
                />
                <QueryExample
                  label="Node.js heap used"
                  query={`nodejs_heap_used_bytes{service_name="o11y-demo-app"}`}
                />
                <QueryExample
                  label="CPU usage (user + system)"
                  query={`rate(process_cpu_seconds_total{service_name="o11y-demo-app"}[1m])`}
                />
              </GrafanaCard>
            </div>
          </section>
        </div>
      </div>
    </PluginPage>
  );
}

export default DeveloperGuidePage;

// ─── Page styles ──────────────────────────────────────────────────────────────

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    padding: ${theme.spacing(2)};
    max-width: 1200px;
  `,
  pageHeader: css`
    margin-bottom: ${theme.spacing(4)};
  `,
  pageTitle: css`
    margin: 0 0 ${theme.spacing(0.5)} 0;
  `,
  pageSubtitle: css`
    margin: 0;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.body.fontSize};
    max-width: 700px;
  `,
  steps: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
  `,
  step: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    padding: ${theme.spacing(3)};
    background: ${theme.colors.background.primary};
  `,
  variantGrid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(2)};

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `,
  fileViewerWrap: css`
    margin-bottom: ${theme.spacing(2)};
  `,
  setupCommands: css`
    margin-top: ${theme.spacing(1)};
  `,
  inlineLabel: css`
    margin: ${theme.spacing(0.5)} 0;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.body.fontSize};
  `,
  generatorCallout: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    border: 1px solid ${theme.colors.primary.border};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
    margin-bottom: ${theme.spacing(2)};

    @media (max-width: 640px) {
      flex-direction: column;
    }
  `,
  generatorCalloutText: css`
    flex: 1;

    strong {
      display: block;
      margin-bottom: ${theme.spacing(0.5)};
    }

    p {
      margin: 0;
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
    }
  `,
  inlineCode: css`
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: 0.9em;
    background: ${theme.colors.background.canvas};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: 3px;
    padding: 1px 4px;
  `,
  bodyText: css`
    margin: 0 0 ${theme.spacing(1.5)} 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.body.fontSize};
  `,
  exploreTip: css`
    margin-bottom: ${theme.spacing(2)};
  `,
  grafanaGrid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing(2)};

    @media (max-width: 1024px) {
      grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `,
  cardHint: css`
    margin: 0 0 ${theme.spacing(1)} 0;
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
});
