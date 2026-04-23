#!/usr/bin/env bash

# AXIOM Financial OS - Bootstrapper
# Tauri + Rust + Python Sidecar Architecture

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.cargo/bin:$PATH"
cd "$ROOT_DIR"

echo "=========================================="
echo "   AXIOM INSTITUTIONAL TERMINAL v3.5     "
echo "=========================================="
echo "Root: $ROOT_DIR"

# 1. Dependency Check
if [ ! -d "node_modules" ]; then
  echo "==> [BOOT] Installing Node dependencies..."
  npm install
else
  echo "==> [BOOT] Node dependencies verified."
fi

# 2. Sidecar Check (Python)
VENV_DIR="packages/ml-engine/venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "==> [BOOT] Python environment missing. Initializing..."
  cd packages/ml-engine
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt
  cd "$ROOT_DIR"
else
  echo "==> [BOOT] Python environment verified."
fi

# 3. Kill any lingering sidecar processes holding the DuckDB lock
echo "==> [BOOT] Releasing DuckDB locks..."
pkill -f "python.*main\.py" 2>/dev/null || true
# Give the OS a moment to release file locks
sleep 1

# 4. Launch Core
echo "==> [BOOT] Launching Axiom Terminal (Tauri + Rust)..."
# We use start:desktop which handles the UI dev server and Rust compilation
npm run start:desktop
