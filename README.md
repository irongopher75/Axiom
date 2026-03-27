# AXIOM Desktop — macOS Application

Production-grade, Mac-first, Electron + Python sidecar.

## Architecture

- **UI**: React + Vite (Shared with web, adapted for desktop)
- **Desktop**: Electron (Mac-native chrome, traffic lights, notarized)
- **ML Engine**: Python FastAPI Sidecar (Bundled runtime, local DuckDB)

## Setup

1. **Clone**: Use `git clone` or pull this repo.
2. **Install**: `npm install`
3. **Python Runtime**: `npm run setup:python` (Downloads portable Python 3.11 for macOS)
4. **Dev Mode**:
   - Terminal 1: `npm run dev:ui` (Vite)
   - Terminal 2: `npm run dev:desktop` (Electron)

## Building & Packaging

```bash
# Build the UI
npm run build:ui

# Package the DMG
npm run build:desktop
```

## Local Stores

AXIOM stores all local data in `~/Library/Application Support/AXIOM/axiom.duckdb`. 
News feed requires `AXIOM_NEWS_WS_URL` env variable for cloud access.
