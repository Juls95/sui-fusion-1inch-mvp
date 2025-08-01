#!/bin/bash

# Sui Fusion+ Testing Startup Script
echo "🚀 Starting Sui Fusion+ Testing Environment"

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
set -a
source ../.env
set +a

echo "📋 Pre-flight checks..."

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "../ui/node_modules" ]; then
    echo "📦 Installing UI dependencies..."
    cd ../ui && npm install && cd ../scripts
fi

# Check if HTLC contract is deployed
if [ -z "$HTLC_PACKAGE_ID" ]; then
    echo "⚠️  HTLC contract not deployed. Run 'npm run deploy' first."
    echo "🔧 Would you like to run setup validation? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        npm run setup
    fi
    exit 1
fi

echo "✅ All dependencies installed"
echo "✅ Environment configured"
echo "✅ HTLC contract deployed: $HTLC_PACKAGE_ID"

echo ""
echo "🎯 Starting services..."

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $API_PID 2>/dev/null
    kill $UI_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "🔧 Starting API server on port 3001..."
DEBUG=sui-fusion:* npm run api &
API_PID=$!

# Wait for API server to start
echo "⏳ Waiting for API server..."
sleep 3

# Check if API server is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ API server failed to start. Check the logs above."
    kill $API_PID 2>/dev/null
    exit 1
fi

echo "✅ API server running on http://localhost:3001"

# Start UI in background
echo "🎨 Starting UI server on port 3000..."
cd ../ui
npm start &
UI_PID=$!
cd ../scripts

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Services:"
echo "   • API Server: http://localhost:3001"
echo "   • UI:         http://localhost:3000"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Connect your Sui wallet"
echo "   3. Verify backend status (green indicator)"
echo "   4. Execute a test swap with small amount"
echo ""
echo "🔍 Monitoring:"
echo "   • API logs: Watch this terminal"
echo "   • UI logs:  Browser developer console"
echo ""
echo "💡 Press Ctrl+C to stop all services"

# Wait for user to interrupt
wait 