// ────────────────────────────────────────────────────────────────────────────
// Sample Fastify applications used by the Developer Guide page.
//
// BLANK_APP    – a plain Fastify app; the developer instruments it themselves.
// INSTRUMENTED_APP – the same app with @ogcio/o11y-sdk-node wired up.
// ────────────────────────────────────────────────────────────────────────────

/** package.json for the blank (un-instrumented) variant. */
export const BLANK_PACKAGE_JSON = JSON.stringify(
  {
    name: 'o11y-demo-app',
    version: '1.0.0',
    description: 'Sample Fastify app for OpenTelemetry instrumentation practice',
    type: 'module',
    main: 'src/app.js',
    scripts: {
      start: 'node src/app.js',
      dev: 'node --watch src/app.js',
    },
    dependencies: {
      fastify: '^5.0.0',
    },
    engines: { node: '>=20.6.0' },
  },
  null,
  2
);

/** package.json for the pre-instrumented variant. */
export const INSTRUMENTED_PACKAGE_JSON = JSON.stringify(
  {
    name: 'o11y-demo-app',
    version: '1.0.0',
    description: 'Sample Fastify app — pre-instrumented with @ogcio/o11y-sdk-node',
    type: 'module',
    main: 'src/app.js',
    scripts: {
      start: 'node src/app.js',
      dev: 'node --watch src/app.js',
    },
    dependencies: {
      '@ogcio/o11y-sdk-node': '^0.9.0',
      fastify: '^5.0.0',
    },
    engines: { node: '>=20.6.0' },
  },
  null,
  2
);

/** The Fastify application — identical in both variants. */
export const APP_JS = `\
// src/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Sample Fastify application for OpenTelemetry practice.
// Routes operate entirely in-memory — no database required.
// ─────────────────────────────────────────────────────────────────────────────
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// ── In-memory store ───────────────────────────────────────────────────────────
const items = [
  { id: 1, name: 'Widget A', price: 9.99 },
  { id: 2, name: 'Widget B', price: 14.99 },
  { id: 3, name: 'Widget C', price: 4.99 },
];
let nextId = 4;

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check — typically excluded from distributed traces. */
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

/** Welcome / route listing. */
app.get('/', async () => ({
  message: 'Welcome to the o11y demo API',
  endpoints: ['GET /health', 'GET /items', 'GET /items/:id', 'POST /items', 'GET /slow'],
}));

/** List all items. */
app.get('/items', async () => items);

/** Get a single item by id. */
app.get('/items/:id', async (request, reply) => {
  const item = items.find((i) => i.id === parseInt(request.params.id, 10));
  if (!item) {
    return reply.code(404).send({ error: 'Item not found' });
  }
  return item;
});

/** Create a new item. */
app.post('/items', async (request, reply) => {
  const { name, price } = request.body ?? {};
  if (!name || price == null) {
    return reply.code(400).send({ error: 'name and price are required' });
  }
  const item = { id: nextId++, name, price: Number(price) };
  items.push(item);
  return reply.code(201).send(item);
});

/**
 * Slow endpoint — introduces artificial latency to make it easy to spot
 * high-duration spans in Tempo.
 */
app.get('/slow', async () => {
  const delay = 300 + Math.floor(Math.random() * 700); // 300–1000 ms
  await new Promise((resolve) => setTimeout(resolve, delay));
  return { message: 'That took a while…', delayMs: delay };
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
await app.listen({ port: PORT, host: '0.0.0.0' });
`;

/** Instrumentation bootstrap file (o11y SDK). */
export const INSTRUMENTATION_JS = `\
// src/instrumentation.js
// ─────────────────────────────────────────────────────────────────────────────
// Load this file FIRST — before Fastify and any other import.
// e.g.  import './instrumentation.js';   ← first line of app.js
// ─────────────────────────────────────────────────────────────────────────────
import { instrumentNode } from '@ogcio/o11y-sdk-node';

await instrumentNode({
  collectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317',
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'o11y-demo-app',
  serviceVersion: process.env.npm_package_version ?? '1.0.0',
  protocol: 'grpc',
  collectorMode: 'batch',
  diagLogLevel: 'INFO',
  traceRatio: 1,
  detection: { email: true, ip: true, ppsn: true },
  resourceAttributes: {
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  },
  ignoreUrls: [{ type: 'equals', url: '/health' }],
});
`;

/** app.js variant that imports instrumentation first. */
export const APP_JS_INSTRUMENTED = `\
// src/app.js  (pre-instrumented)
// ─────────────────────────────────────────────────────────────────────────────
// The instrumentation bootstrap MUST be the very first import.
// ─────────────────────────────────────────────────────────────────────────────
import './instrumentation.js';

import Fastify from 'fastify';

const app = Fastify({ logger: true });

// ── In-memory store ───────────────────────────────────────────────────────────
const items = [
  { id: 1, name: 'Widget A', price: 9.99 },
  { id: 2, name: 'Widget B', price: 14.99 },
  { id: 3, name: 'Widget C', price: 4.99 },
];
let nextId = 4;

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/', async () => ({
  message: 'Welcome to the o11y demo API',
  endpoints: ['GET /health', 'GET /items', 'GET /items/:id', 'POST /items', 'GET /slow'],
}));

app.get('/items', async () => items);

app.get('/items/:id', async (request, reply) => {
  const item = items.find((i) => i.id === parseInt(request.params.id, 10));
  if (!item) {
    return reply.code(404).send({ error: 'Item not found' });
  }
  return item;
});

app.post('/items', async (request, reply) => {
  const { name, price } = request.body ?? {};
  if (!name || price == null) {
    return reply.code(400).send({ error: 'name and price are required' });
  }
  const item = { id: nextId++, name, price: Number(price) };
  items.push(item);
  return reply.code(201).send(item);
});

app.get('/slow', async () => {
  const delay = 300 + Math.floor(Math.random() * 700);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return { message: 'That took a while…', delayMs: delay };
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
await app.listen({ port: PORT, host: '0.0.0.0' });
`;
