const express = require('express');
const axios = require('axios');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SENSITIVE_KEYS = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'proxy-authorization',
    'password',
    'pass',
    'passwd',
    'secret',
    'token',
    'access_token',
    'refresh_token',
    'client_secret',
    'api_key'
]);

function sanitizeObject(value, depth = 0) {
    if (depth > 5 || value == null) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeObject(item, depth + 1));
    }

    if (typeof value === 'object') {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
            const normalized = String(key).toLowerCase();
            sanitized[key] = SENSITIVE_KEYS.has(normalized) ? '[REDACTED]' : sanitizeObject(val, depth + 1);
        }
        return sanitized;
    }

    return value;
}

// Middleware to log all incoming requests and outgoing responses
app.use((req, res, next) => {
    const startTime = Date.now();
    const safeHeaders = sanitizeObject(req.headers);
    const safeBody = req.body && Object.keys(req.body).length > 0 ? sanitizeObject(req.body) : undefined;

    // Log the incoming API call
    logger.info(`Incoming API Request: ${req.method} ${req.url}`, {
        type: 'request_in',
        method: req.method,
        url: req.url,
        ip: req.ip,
        headers: safeHeaders,
        query: req.query,
        body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? safeBody : undefined
    });

    // Hook into response finish to log the result
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? (res.statusCode >= 500 ? 'error' : 'warn') : 'info';

        logger.log(level, `Completed API Request: ${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`, {
            type: 'request_out',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            durationMs: duration,
            contentLength: res.get('Content-Length')
        });
    });

    next();
});

// Basic endpoint
app.get('/', (req, res) => {
    logger.info('Processing root route request...');
    res.json({ message: 'Hello! Complete Observability is active.' });
});

// A Complex Endpoint that simulates database/external queries
// OpenTelemetry context propagates to external services via HTTP headers Automatically.
app.get('/api/users/:id', async (req, res) => {
    logger.info(`Fetching details for user ID: ${req.params.id}`);

    try {
        // Simulating an external downstream API call (e.g. Identity provider)
        logger.debug('Making external call to jsonplaceholder API...');
        const response = await axios.get(`https://jsonplaceholder.typicode.com/users/${req.params.id}`);

        // Complex Business Logic Log Event
        logger.info('Successfully fetched user data', {
            userId: req.params.id,
            name: response.data.name,
            company: response.data.company?.name
        });

        res.json({
            message: 'Transaction successful',
            data: response.data
        });
    } catch (error) {
        // Correlated error logs with detailed context
        logger.error('Failed to process complex transaction', {
            errorMessage: error.message,
            userId: req.params.id
        });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// An endpoint specifically designed to fail nicely
app.post('/simulate-error', (req, res) => {
    logger.warn('User triggered a simulated error path.', { requestBody: req.body });

    const err = new Error('Database Connection Outage or Timeout!');

    // Log the error stack correctly so standard platforms index it
    logger.error('A critical application error occurred!', {
        error_name: err.name,
        error_message: err.message,
        stack: err.stack
    });

    res.status(503).json({
        error: 'Service Unavailable',
        details: err.message
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled Application Error', {
        error_name: err.name,
        error_message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.'
    });
});

app.listen(PORT, () => {
    logger.info(`Observability App started on http://localhost:${PORT}`);

    // Start a background task to constantly generate logs for ELK demonstration
    setInterval(() => {
        const actions = [
            () => logger.info('Background sync process completed successfully.', { type: 'background_job', status: 'success', activeConnections: Math.floor(Math.random() * 100) }),
            () => logger.debug('Checking cache invalidation rules...', { type: 'background_job', cacheSize: Math.random() * 1024 }),
            () => logger.warn('Database query response time degraded slightly.', { type: 'background_job', metric: 'db_latency', valueMs: 400 + Math.floor(Math.random() * 200) }),
            () => logger.error('Failed to sync telemetry to secondary storage.', { type: 'background_job', error_code: 'ERR_SYNC_TIMEOUT', retry_count: Math.floor(Math.random() * 5) })
        ];

        // Randomly execute one of the synthetic log events
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        randomAction();
    }, 3000); // Emits a background log every 3 seconds
});
