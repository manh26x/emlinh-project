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
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt FFmpeg và cache
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Rhubarb Lip Sync và cache
WORKDIR /opt/rhubarb
RUN wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip \
    && unzip rhubarb-lip-sync-1.13.0-linux.zip \
    && ls -la \
    && find . -name "rhubarb" -type f \
    && chmod +x */rhubarb \
    && find . -name "rhubarb" -type f -exec ln -s {} /usr/local/bin/rhubarb \; \
    && rm rhubarb-lip-sync-1.13.0-linux.zip

# Verify installations
RUN ffmpeg -version

# Stage 2: Build emlinh-remotion
FROM base-tools AS remotion-builder

WORKDIR /app/emlinh-remotion
COPY emlinh-remotion/package*.json ./
RUN npm ci && npm cache clean --force

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
ENV WORKSPACE_ROOT=/app

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Copy Python dependencies
COPY --from=python-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy built Remotion assets
COPY --from=remotion-builder /app/emlinh-remotion/build /app/emlinh-remotion/build
COPY --from=remotion-builder /app/emlinh-remotion/node_modules /app/emlinh-remotion/node_modules

# Create out directory for rendered videos
RUN mkdir -p /app/emlinh-remotion/out

# Copy application code
WORKDIR /app
COPY emlinh_mng/ ./emlinh_mng/
COPY emlinh-remotion/ ./emlinh-remotion/

# Copy and setup permission fix script (before switching to non-root user)
COPY scripts/docker-fix-permissions.sh /app/fix-permissions.sh
RUN chmod +x /app/fix-permissions.sh

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

echo "Starting emlinh application..."

# Fix permissions first
/app/fix-permissions.sh

# Create required directories
mkdir -p /app/emlinh-remotion/out
mkdir -p /app/emlinh-remotion/public/audios
mkdir -p /tmp/emlinh_audio

# Start emlinh-remotion in background
echo "Starting Remotion studio..."
cd /app/emlinh-remotion && npm start > /tmp/remotion.log 2>&1 &
REMOTION_PID=\$!

# Give remotion a moment to start
sleep 5

# Start emlinh_mng
echo "Starting Flask application..."
cd /app/emlinh_mng && python3 -m src.app.run &
FLASK_PID=\$!

# Monitor both processes
while kill -0 \$REMOTION_PID 2>/dev/null && kill -0 \$FLASK_PID 2>/dev/null; do
    sleep 10
done

echo "One of the processes died, shutting down..."
kill \$REMOTION_PID \$FLASK_PID 2>/dev/null || true
wait
EOF

CMD ["/app/start.sh"]
