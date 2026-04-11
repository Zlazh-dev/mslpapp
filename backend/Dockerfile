FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# ── System dependencies for Puppeteer (Chromium) and fonts ──
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-arabic

# ── Puppeteer config: use system Chromium instead of downloading ──
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN npm install -g @nestjs/cli

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npm install prisma --save-dev
RUN npx prisma generate

# ── Create uploads directories ──
RUN mkdir -p /app/uploads/foto /app/uploads/kk

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy; exec node dist/main"
