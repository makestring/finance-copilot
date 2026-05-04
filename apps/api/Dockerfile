# Build from monorepo root:
#   docker build -f apps/api/Dockerfile -t finance-copilot-api .

FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Install deps with workspace context
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter api...

# Copy source and build
COPY apps/api ./apps/api

WORKDIR /app/apps/api

RUN pnpm exec prisma generate
RUN pnpm run build

# ─── Runner ──────────────────────────────────────────────────────────────────

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter api... --prod

COPY apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

RUN pnpm exec prisma generate

COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
