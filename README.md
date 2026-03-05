# Node.js Observability Demo (Logging & Tracing)

This is a comprehensive, production-ready sample application showcasing deeply integrated Logging, Tracing, and Log-Trace correlation using Node.js, Express, Winston, and OpenTelemetry.

This app implements the *two key pillars* of modern observability:
1. **Distributed Tracing**: Automatically instrumenting Express routes and downstream HTTP calls (Axios) via OpenTelemetry.
2. **Structured Logging**: Emitting robust JSON logs using Winston, with active `trace_id` and `span_id` automatically injected into each log entry allowing true observability correlation (Log-to-Trace).

## Features

- **OpenTelemetry SDK Integration**: Starts auto-instrumentation before the app even loads.
- **Trace correlation via Winston**: Every log emitted within a request context automatically binds OpenTelemetry Data (`trace_id`, `span_id`) directly to the JSON log Object.
- **Axios HTTP tracing**: Automatically traces outgoing network calls (Simulated in the complex-transaction endpoint).

## How to Run it (with Jaeger)

A `docker-compose.yml` file is provided which spins up:
1. This Node.js Express Application
2. Jaeger (An Open-Source Distributed Tracing Platform)

### Start up

To start the demo platform with Docker Compose:

```bash
docker-compose up --build
```

### Try it out!

Hit some of the local endpoints:

1. **Standard Request**: `GET http://localhost:3000/`
   Generate a basic span.
   
2. **Complex Transaction** (Outbound external API call!): `GET http://localhost:3000/api/users/1`
   This endpoint fetches an external resource via Axios. The OpenTelemetry hook will automatically trace the outgoing HTTP request creating a nested "Span" within the overall application request trace.
   
3. **Simulate an Error**: `POST http://localhost:3000/simulate-error`
   Showcasing JSON stack-trace logging and error-span reporting.

### View the Results

**View The Logs:**
Notice the logs streaming in your console when using the endpoints above. They are structured as JSON. Notice the injected `trace_id` and `span_id` properties inside the log structure!

**View The Traces (Jaeger UI):**
Open your browser to the Jaeger dashboard: [http://localhost:16686](http://localhost:16686).
Search for the `node-tracing-api` service, and hit "Find Traces" to view a breakdown of every request latency and the nested Axios HTTP calls context.

## Files Breakdown
- `tracing.js`: The bootstrap file that initializes OpenTelemetry SDK and configures auto-instrumentations for Express, HTTP, Path, etc. 
- `logger.js`: Customized Winston JSON logger injecting OpenTelemetry Contexts gracefully.
- `app.js`: Standard express application simulating API functionality.
