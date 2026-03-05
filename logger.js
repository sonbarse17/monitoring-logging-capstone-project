const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

/**
 * Custom format to inject OpenTelemetry Trace UI and Span ID into each log entry.
 * This effectively correlates any log message with its respective Trace.
 */
const otelFormat = winston.format((info) => {
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
        const spanContext = currentSpan.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;
    }
    return info;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Adjust log levels using environment variables
    format: winston.format.combine(
        winston.format.timestamp(),
        otelFormat(),
        winston.format.json() // Using JSON format for logs to easily index in systems like ELK/Datadog
    ),
    defaultMeta: { service: 'sample-observability-app' },
    transports: [
        new winston.transports.Console(),
        // Write all logs with importance level of `error` or higher to `error.log`
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Write all logs with importance level of `info` or higher to `combined.log`
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

module.exports = logger;
