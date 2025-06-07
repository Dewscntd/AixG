export default () => ({
  // Application Configuration
  port: parseInt(process.env.PORT, 10) || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // WebRTC Configuration
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      ...(process.env.TURN_SERVER_URL ? [{
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      }] : [])
    ],
    maxBitrate: parseInt(process.env.WEBRTC_MAX_BITRATE, 10) || 2000000,
    frameRate: parseInt(process.env.WEBRTC_FRAME_RATE, 10) || 30
  },

  // ML Inference Configuration
  ml: {
    modelPaths: {
      playerDetection: process.env.PLAYER_DETECTION_MODEL_PATH || '/models/player_detection.onnx',
      ballDetection: process.env.BALL_DETECTION_MODEL_PATH || '/models/ball_detection.onnx',
      teamClassification: process.env.TEAM_CLASSIFICATION_MODEL_PATH || '/models/team_classification.onnx',
      eventDetection: process.env.EVENT_DETECTION_MODEL_PATH || '/models/event_detection.onnx'
    },
    batchSize: parseInt(process.env.ML_BATCH_SIZE, 10) || 1,
    maxConcurrentInferences: parseInt(process.env.ML_MAX_CONCURRENT, 10) || 4,
    gpuEnabled: process.env.GPU_ENABLED === 'true',
    gpuMemoryLimit: parseInt(process.env.GPU_MEMORY_LIMIT, 10) || undefined
  },

  // Stream Configuration
  stream: {
    defaultBufferSize: parseInt(process.env.STREAM_BUFFER_SIZE, 10) || 300,
    maxStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS, 10) || 10,
    frameTimeout: parseInt(process.env.FRAME_TIMEOUT_MS, 10) || 5000,
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS, 10) || 30000
  },

  // Event Publishing Configuration
  events: {
    pulsarUrl: process.env.PULSAR_URL || 'pulsar://localhost:6650',
    topicPrefix: process.env.EVENT_TOPIC_PREFIX || 'real-time-analysis',
    batchingEnabled: process.env.EVENT_BATCHING_ENABLED === 'true',
    batchingMaxMessages: parseInt(process.env.EVENT_BATCHING_MAX_MESSAGES, 10) || 100,
    batchingMaxDelayMs: parseInt(process.env.EVENT_BATCHING_MAX_DELAY_MS, 10) || 100
  },

  // Redis Configuration (for caching and coordination)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'real-time-analysis:',
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // Swagger/OpenAPI Configuration
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'Real-time Analysis Service API',
    description: 'API for real-time football video analysis with WebRTC streaming',
    version: '1.0.0',
    path: process.env.SWAGGER_PATH || 'api/docs'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/real-time-analysis.log'
  },

  // Monitoring Configuration
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090,
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
    tracingEndpoint: process.env.TRACING_ENDPOINT || 'http://localhost:14268/api/traces'
  },

  // Security Configuration
  security: {
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
  }
});
