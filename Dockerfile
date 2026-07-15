FROM node:20-slim AS base
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/validator/package.json ./packages/validator/
COPY packages/firewall/package.json ./packages/firewall/
COPY packages/payments/package.json ./packages/payments/
COPY packages/core/package.json ./packages/core/
COPY packages/privacy/package.json ./packages/privacy/
COPY packages/compliance/package.json ./packages/compliance/
COPY packages/health/package.json ./packages/health/
COPY packages/finance/package.json ./packages/finance/
COPY packages/api/package.json ./packages/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/validator/src ./packages/validator/src
COPY packages/validator/tsconfig.json ./packages/validator/
COPY packages/firewall/src ./packages/firewall/src
COPY packages/firewall/tsconfig.json ./packages/firewall/
COPY packages/payments/src ./packages/payments/src
COPY packages/payments/tsconfig.json ./packages/payments/
COPY packages/core/src ./packages/core/src
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/privacy/src ./packages/privacy/src
COPY packages/privacy/tsconfig.json ./packages/privacy/
COPY packages/compliance/src ./packages/compliance/src
COPY packages/compliance/tsconfig.json ./packages/compliance/
COPY packages/health/src ./packages/health/src
COPY packages/health/tsconfig.json ./packages/health/
COPY packages/finance/src ./packages/finance/src
COPY packages/finance/tsconfig.json ./packages/finance/
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/

# Build in dependency order
RUN pnpm --filter @agentoolbox/validator build
RUN pnpm --filter @agentoolbox/firewall build
RUN pnpm --filter @agentoolbox/payments build
RUN pnpm --filter @agentoolbox/core build
RUN pnpm --filter @agentoolbox/privacy build
RUN pnpm --filter @agentoolbox/compliance build
RUN pnpm --filter @agentoolbox/health build
RUN pnpm --filter @agentoolbox/finance build
RUN pnpm --filter @agentoolbox/api build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "packages/api/dist/index.js"]
