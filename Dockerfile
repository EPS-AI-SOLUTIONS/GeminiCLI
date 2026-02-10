# ============================================================
# GeminiHydra - Multi-stage Docker Build
# Node 22 LTS, TypeScript, multi-agent AI system
# ============================================================

# --- Stage 1: Build ---
FROM node:22-slim AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/
COPY bin/ ./bin/
COPY shared/ ./shared/

# Build TypeScript -> JavaScript
RUN npx tsc

# --- Stage 2: Production ---
FROM node:22-slim AS production

LABEL maintainer="GeminiHydra Team"
LABEL description="GeminiHydra Agent Swarm - School of the Wolf Edition"
LABEL version="14.0.0"

# Create non-root user for security
RUN groupadd -r hydra && useradd -r -g hydra -m -s /bin/bash hydra

WORKDIR /app

# Copy package manifests and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared assets if needed
COPY --from=builder /app/shared ./shared

# Create data directories
RUN mkdir -p /app/.geminihydra/metrics /app/.geminihydra/sessions \
    && chown -R hydra:hydra /app

# Environment defaults
ENV NODE_ENV=production
ENV GEMINI_API_KEY=""
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV PORT=3000
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:${PORT}/api/health').then(r=>{if(!r.ok)throw new Error();process.exit(0)}).catch(()=>process.exit(1))"

# Expose API port
EXPOSE ${PORT}

# Run as non-root
USER hydra

# Start the application
CMD ["node", "dist/bin/gemini.js"]
