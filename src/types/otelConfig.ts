/**
 * Types for the OpenTelemetry JS instrumentation configuration.
 */

export type OTelProtocol = 'grpc' | 'http/protobuf' | 'http/json';

export type OTelEnvironment = 'development' | 'staging' | 'production';

export type SamplerType =
  | 'always_on'
  | 'always_off'
  | 'traceidratio'
  | 'parentbased_always_on'
  | 'parentbased_traceidratio';

export type PropagatorType = 'tracecontext' | 'baggage' | 'b3' | 'b3multi' | 'jaeger';

export type ExporterType = 'otlp' | 'console' | 'zipkin' | 'jaeger';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface InstrumentationOption {
  /** Unique key */
  id: string;
  /** Human-readable label */
  label: string;
  /** npm package name */
  package: string;
  /** Class name to import */
  className: string;
  /** Category for grouping in UI */
  category: 'web-framework' | 'http' | 'database' | 'messaging' | 'logging' | 'other';
  /** Brief description */
  description: string;
}

export interface ResourceAttribute {
  key: string;
  value: string;
}

export interface OTelConfig {
  // Basic
  serviceName: string;
  serviceVersion: string;
  environment: OTelEnvironment;

  // Endpoint
  collectorUrl: string;
  protocol: OTelProtocol;

  // Signals
  enableTraces: boolean;
  enableMetrics: boolean;
  enableLogs: boolean;

  // Exporters
  traceExporter: ExporterType;
  metricsExporter: ExporterType;
  logsExporter: ExporterType;
  enableConsoleExporter: boolean;

  // Sampling
  sampler: SamplerType;
  samplingRatio: number;

  // Propagation
  propagators: PropagatorType[];

  // Instrumentations
  instrumentations: string[];

  // Resource attributes
  resourceAttributes: ResourceAttribute[];

  // Package manager
  packageManager: PackageManager;

  // Code style
  useTypeScript: boolean;
}

/**
 * Sensible defaults for a new configuration.
 */
export const DEFAULT_CONFIG: OTelConfig = {
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development',
  collectorUrl: 'http://localhost:4318',
  protocol: 'http/protobuf',
  enableTraces: true,
  enableMetrics: true,
  enableLogs: false,
  traceExporter: 'otlp',
  metricsExporter: 'otlp',
  logsExporter: 'otlp',
  enableConsoleExporter: false,
  sampler: 'always_on',
  samplingRatio: 1.0,
  propagators: ['tracecontext', 'baggage'],
  instrumentations: ['http', 'express'],
  resourceAttributes: [],
  packageManager: 'npm',
  useTypeScript: false,
};

/**
 * All available instrumentation libraries.
 */
export const AVAILABLE_INSTRUMENTATIONS: InstrumentationOption[] = [
  // HTTP
  {
    id: 'http',
    label: 'HTTP',
    package: '@opentelemetry/instrumentation-http',
    className: 'HttpInstrumentation',
    category: 'http',
    description: 'Instruments Node.js HTTP and HTTPS modules',
  },
  {
    id: 'fetch',
    label: 'Undici / Fetch',
    package: '@opentelemetry/instrumentation-undici',
    className: 'UndiciInstrumentation',
    category: 'http',
    description: 'Instruments undici and Node.js global fetch',
  },
  {
    id: 'grpc',
    label: 'gRPC',
    package: '@opentelemetry/instrumentation-grpc',
    className: 'GrpcInstrumentation',
    category: 'http',
    description: 'Instruments gRPC client and server calls',
  },
  // Web Frameworks
  {
    id: 'express',
    label: 'Express',
    package: '@opentelemetry/instrumentation-express',
    className: 'ExpressInstrumentation',
    category: 'web-framework',
    description: 'Instruments Express.js middleware and routes',
  },
  {
    id: 'fastify',
    label: 'Fastify',
    package: '@opentelemetry/instrumentation-fastify',
    className: 'FastifyInstrumentation',
    category: 'web-framework',
    description: 'Instruments Fastify hooks and routes',
  },
  {
    id: 'koa',
    label: 'Koa',
    package: '@opentelemetry/instrumentation-koa',
    className: 'KoaInstrumentation',
    category: 'web-framework',
    description: 'Instruments Koa middleware',
  },
  {
    id: 'nestjs',
    label: 'NestJS',
    package: '@opentelemetry/instrumentation-nestjs-core',
    className: 'NestInstrumentation',
    category: 'web-framework',
    description: 'Instruments NestJS controllers and providers',
  },
  {
    id: 'hapi',
    label: 'Hapi',
    package: '@opentelemetry/instrumentation-hapi',
    className: 'HapiInstrumentation',
    category: 'web-framework',
    description: 'Instruments Hapi.js server routes',
  },
  // Databases
  {
    id: 'pg',
    label: 'PostgreSQL',
    package: '@opentelemetry/instrumentation-pg',
    className: 'PgInstrumentation',
    category: 'database',
    description: 'Instruments the pg (node-postgres) client',
  },
  {
    id: 'mysql',
    label: 'MySQL',
    package: '@opentelemetry/instrumentation-mysql2',
    className: 'MySQL2Instrumentation',
    category: 'database',
    description: 'Instruments the mysql2 client',
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    package: '@opentelemetry/instrumentation-mongodb',
    className: 'MongoDBInstrumentation',
    category: 'database',
    description: 'Instruments the MongoDB driver',
  },
  {
    id: 'redis',
    label: 'Redis (ioredis)',
    package: '@opentelemetry/instrumentation-ioredis',
    className: 'IORedisInstrumentation',
    category: 'database',
    description: 'Instruments the ioredis client',
  },
  {
    id: 'knex',
    label: 'Knex.js',
    package: '@opentelemetry/instrumentation-knex',
    className: 'KnexInstrumentation',
    category: 'database',
    description: 'Instruments Knex.js query builder',
  },
  // Messaging
  {
    id: 'amqplib',
    label: 'RabbitMQ (amqplib)',
    package: '@opentelemetry/instrumentation-amqplib',
    className: 'AmqplibInstrumentation',
    category: 'messaging',
    description: 'Instruments amqplib for RabbitMQ',
  },
  {
    id: 'kafkajs',
    label: 'KafkaJS',
    package: '@opentelemetry/instrumentation-kafkajs',
    className: 'KafkaJsInstrumentation',
    category: 'messaging',
    description: 'Instruments KafkaJS producer and consumer',
  },
  // Logging
  {
    id: 'winston',
    label: 'Winston',
    package: '@opentelemetry/instrumentation-winston',
    className: 'WinstonInstrumentation',
    category: 'logging',
    description: 'Injects trace context into Winston logs',
  },
  {
    id: 'pino',
    label: 'Pino',
    package: '@opentelemetry/instrumentation-pino',
    className: 'PinoInstrumentation',
    category: 'logging',
    description: 'Injects trace context into Pino logs',
  },
  {
    id: 'bunyan',
    label: 'Bunyan',
    package: '@opentelemetry/instrumentation-bunyan',
    className: 'BunyanInstrumentation',
    category: 'logging',
    description: 'Injects trace context into Bunyan logs',
  },
  // Other
  {
    id: 'graphql',
    label: 'GraphQL',
    package: '@opentelemetry/instrumentation-graphql',
    className: 'GraphQLInstrumentation',
    category: 'other',
    description: 'Instruments GraphQL query execution',
  },
  {
    id: 'dns',
    label: 'DNS',
    package: '@opentelemetry/instrumentation-dns',
    className: 'DnsInstrumentation',
    category: 'other',
    description: 'Instruments Node.js DNS lookups',
  },
  {
    id: 'net',
    label: 'Net',
    package: '@opentelemetry/instrumentation-net',
    className: 'NetInstrumentation',
    category: 'other',
    description: 'Instruments Node.js net module',
  },
  {
    id: 'aws-sdk',
    label: 'AWS SDK',
    package: '@opentelemetry/instrumentation-aws-sdk',
    className: 'AwsInstrumentation',
    category: 'other',
    description: 'Instruments AWS SDK v2 and v3 calls',
  },
];
