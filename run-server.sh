#!/bin/bash

# PanelOS Server Runner
# This script provides better signal handling for the server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="$SCRIPT_DIR/server.js"

# Function to cleanup on exit
cleanup() {
    echo "Stopping PanelOS server..."
    pkill -f "node.*server.js" 2>/dev/null || true
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

echo "Starting PanelOS server..."
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node --trace-warnings "$SERVER_FILE" &
SERVER_PID=$!

# Wait for the server process
wait $SERVER_PID