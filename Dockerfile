FROM node:22 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM rust:1.90.0 AS backend-builder
WORKDIR /app/backend
COPY backend/ .
RUN apt-get update && apt-get install -y musl-tools build-essential
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM alpine:latest
WORKDIR /app
COPY --from=backend-builder /app/backend/target/x86_64-unknown-linux-musl/release/backend ./start
COPY --from=frontend-builder /app/frontend/dist ./web
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 50721
CMD ["./start"]