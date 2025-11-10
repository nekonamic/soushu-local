FROM node:22 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM rust:1.90.0 AS backend-builder
WORKDIR /app/backend
COPY backend/ .
RUN cargo build --release

FROM debian:bookworm-slim AS runner

RUN apt-get update && apt-get install -y \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-builder /app/backend/target/release/backend ./start

COPY --from=frontend-builder /app/frontend/dist ./web

VOLUME ["/app/data"]

EXPOSE 50721

CMD ["./start"]
