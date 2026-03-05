FROM node:20-alpine
WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

EXPOSE 3000

# Start app using the tracing instrumentation entrypoint
CMD ["npm", "start"]
