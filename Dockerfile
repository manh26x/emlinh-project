# Multi-stage Dockerfile cho emlinh-project
# Stage 1: Build dependencies và tools (Cache layer)
FROM ubuntu:22.04 AS base-tools

# Cài đặt các dependencies cơ bản và tools
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    build-essential \
    cmake \
    git \
    python3 \
    python3-pip \
    python3-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt FFmpeg và cache
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Rhubarb Lip Sync và cache
WORKDIR /opt/rhubarb
RUN wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip \
    && unzip rhubarb-lip-sync-1.13.0-linux.zip \
    && chmod +x rhubarb-lip-sync-1.13.0-linux/rhubarb \
    && ln -s /opt/rhubarb/rhubarb-lip-sync-1.13.0-linux/rhubarb /usr/local/bin/rhubarb \
    && rm rhubarb-lip-sync-1.13.0-linux.zip

# Verify installations
RUN ffmpeg -version && rhubarb --version

# Stage 2: Build emlinh-remotion
FROM base-tools AS remotion-builder

WORKDIR /app/emlinh-remotion
COPY emlinh-remotion/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY emlinh-remotion/ ./
RUN npm run build

# Stage 3: Build emlinh_mng dependencies
FROM base-tools AS python-deps

WORKDIR /app/emlinh_mng
COPY emlinh_mng/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Stage 4: Final production image
FROM base-tools AS production

# Set environment variables
ENV PYTHONPATH=/app/emlinh_mng
ENV FLASK_APP=src.app.run:app
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Copy Python dependencies
COPY --from=python-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy built Remotion assets
COPY --from=remotion-builder /app/emlinh-remotion/out /app/emlinh-remotion/out
COPY --from=remotion-builder /app/emlinh-remotion/node_modules /app/emlinh-remotion/node_modules

# Copy application code
WORKDIR /app
COPY emlinh_mng/ ./emlinh_mng/
COPY emlinh-remotion/ ./emlinh-remotion/

# Set permissions
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Expose ports
EXPOSE 5000 3000

# Create startup script để chạy cả hai services
RUN cat > /app/start.sh <<EOF && \
    chmod +x /app/start.sh
#!/bin/bash
set -e

# Start emlinh-remotion in background
cd /app/emlinh-remotion && npm start &

# Start emlinh_mng
cd /app/emlinh_mng && python3 -m src.app.run

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit \$?
EOF

CMD ["/app/start.sh"]
