FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server.ts ./
COPY server/ ./server/

RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PUERTO=3000
ENV DATABASE_URL="file:/app/data/dev.db"

RUN apk add --no-cache openssl

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

VOLUME /app/data

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node dist/server.cjs"]
