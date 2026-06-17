#!/bin/bash
# Run this ON YOUR VPS after transferring code
# Usage: bash setup-vps.sh

set -e

echo "=== Boda VPS Setup ==="
echo ""

# 1. Update system
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm get-docker.sh
  sudo usermod -aG docker $USER
  echo "Docker installed. You may need to log out and back in for group changes."
else
  echo "Docker already installed."
fi

# 3. Install Docker Compose
echo "[3/7] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  sudo apt install docker-compose -y
else
  echo "Docker Compose already installed."
fi

# 4. Install Node.js (via nvm)
echo "[4/7] Installing Node.js..."
if ! command -v node &> /dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
else
  echo "Node.js already installed: $(node -v)"
fi

# 5. Start PostgreSQL and Redis via Docker
echo "[5/7] Starting PostgreSQL and Redis..."
cd backend
if [ -f ../docker-compose.yml ]; then
  cd ..
  docker-compose up -d
  cd backend
else
  echo "WARNING: docker-compose.yml not found. Starting containers manually..."
  docker run -d --name boda-postgres \
    -e POSTGRES_USER=boda \
    -e POSTGRES_PASSWORD=boda123 \
    -e POSTGRES_DB=boda \
    -p 5432:5432 \
    -v postgres_data:/var/lib/postgresql/data \
    postgres:15-alpine

  docker run -d --name boda-redis \
    -p 6379:6379 \
    -v redis_data:/data \
    redis:7-alpine
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# 6. Create .env file
echo "[6/7] Creating .env file..."
if [ ! -f .env ]; then
  cat > .env << 'EOF'
PORT=3000
NODE_ENV=production

DATABASE_URL=postgresql://boda:boda123@localhost:5432/boda
REDIS_URL=redis://localhost:6379

JWT_SECRET=CHANGE-ME-to-a-random-string
JWT_REFRESH_SECRET=CHANGE-ME-to-another-random-string

MTN_SUBSCRIPTION_KEY=your-mtn-subscription-key
MTN_API_USER=your-api-user-uuid
MTN_API_KEY=your-api-key
MTN_DISBURSEMENT_KEY=your-disbursement-subscription-key
MTN_TARGET_ENV=sandbox

AIRTEL_CLIENT_ID=your-airtel-client-id
AIRTEL_CLIENT_SECRET=your-airtel-client-secret
AIRTEL_PIN=your-merchant-pin

AT_API_KEY=your-africas-talking-api-key
AT_USERNAME=your-at-username

GOOGLE_MAPS_API_KEY=your-google-maps-key

AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=boda-rider-docs
AWS_REGION=af-south-1
EOF
  echo "Created .env with default values. Edit it with your real credentials:"
  echo "  nano .env"
else
  echo ".env already exists, skipping."
fi

# 7. Install dependencies and start
echo "[7/7] Installing backend dependencies and starting..."
npm install
npm run setup-db 2>/dev/null || echo "Note: setup-db may fail if schema.sql has issues. Check manually."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "To start the backend:"
echo "  cd backend && npm start"
echo ""
echo "To run in background:"
echo "  cd backend && nohup npm start > ../server.log 2>&1 &"
echo ""
echo "Edit .env with your real API keys:"
echo "  nano backend/.env"
