# ==============================================================================
# TV Today NPL Cricket Management System — Production Dockerfile
# Optimized for Next.js 16, Prisma 6, and Broadcast WebSocket Engine
# ==============================================================================

FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3211
ENV WS_PORT=3212

# Copy package manifests first for caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --prefer-offline --no-audit --no-fund

# Copy application source
COPY . .

# Generate Prisma Client & Build Next.js
RUN npx prisma generate
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/public/uploads

EXPOSE 3211
EXPOSE 3212

CMD ["node", "scripts/start-production.mjs"]
