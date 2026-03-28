#!/bin/bash
set -e

APP_DIR="/home/ec2-user/mzadat-v2"
API_DIR="$APP_DIR/apps/api"

echo "🔄 Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔄 Restarting API..."
cd "$API_DIR"
pm2 restart mzadat-api --update-env

echo "✅ Deploy complete!"
pm2 status
