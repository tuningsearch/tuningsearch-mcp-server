FROM node:22-alpine AS builder

# Copy entire project
WORKDIR /app
COPY . /app

# Install dependencies and build
RUN --mount=type=cache,target=/root/.npm npm install
RUN npm run build

FROM node:22-alpine AS release

WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production
# Set API key environment variable (actual value will be provided at runtime)
ENV TUNINGSEARCH_API_KEY=""

# Install production dependencies
RUN npm ci --ignore-scripts --omit=dev

# Set container startup command
ENTRYPOINT ["node", "dist/index.js"] 