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
# Build the desktop renderer
npm run build:ui:desktop

# Bundle Electron main/preload
npm run build:desktop:main

# Package the macOS app
npm run dist
```

## GitHub Releases

AXIOM now includes a GitHub Releases workflow at [.github/workflows/releaser.yml](/Users/vishnupanicker/Documents/GitHub/Axiom/.github/workflows/releaser.yml:1).

To publish a release:

1. Bump the desktop version in [packages/desktop/package.json](/Users/vishnupanicker/Documents/GitHub/Axiom/packages/desktop/package.json:1).
2. Push a tag like `v1.0.1`.
3. GitHub Actions will build the macOS artifacts and publish them to the repository's Releases page.

Recommended repository secrets:

- `MAC_CERTS`
- `MAC_CERTS_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `AXIOM_NEWS_WS_URL`

Release note categories are configured in [.github/release.yml](/Users/vishnupanicker/Documents/GitHub/Axiom/.github/release.yml:1).

## Local Stores

AXIOM stores all local data in `~/Library/Application Support/AXIOM/axiom.duckdb`. 
News feed requires `AXIOM_NEWS_WS_URL` env variable for cloud access.
