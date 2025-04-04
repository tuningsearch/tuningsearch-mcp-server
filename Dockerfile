FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.14.2

WORKDIR /app
COPY . /app

RUN pnpm install
RUN pnpm build

FROM node:20-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml

ENV NODE_ENV=production
ENV TUNINGSEARCH_API_KEY=""

RUN npm install -g pnpm@9.14.2

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

ENTRYPOINT ["node", "dist/index.js"] 