# ==============================================================================
# TV Today NPL Cricket Management System — Multi-Stage Production Dockerfile
# Optimized for Next.js 16, Prisma 6, and Broadcast WebSocket Engine
# Production URL: https://cricket.tvtoday.com.np
# ==============================================================================

# Stage 1: Base Runtime Environment
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Stage 2: Install Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
# Configure npm for high-speed download & fast network retry
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retry-maxtimeout 60000 \
    && npm install --prefer-offline --no-audit --no-fund

# Stage 3: Build Application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3211
ENV WS_PORT=3212

# Copy artifacts from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create upload directory
RUN mkdir -p /app/public/uploads

EXPOSE 3211
EXPOSE 3212

CMD ["node", "scripts/start-production.mjs"]
