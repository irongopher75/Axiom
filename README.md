# AXIOM · Institutional Terminal

AXIOM is a high-performance, local-first financial operating system designed for institutional-grade market analysis, trade execution, and real-time intelligence gathering. Built with a **Tauri v2 (Rust)** core and a **Python ML Engine**, it provides a zero-latency, cloud-independent environment for quantitative finance.

![AXIOM Terminal Interface](https://via.placeholder.com/1200x675/000000/FF6600?text=AXIOM+QUANTITATIVE+INTELLIGENCE+HUB)

## 🏗️ Architecture

AXIOM follows a **hybrid-local** architecture to ensure maximum privacy, speed, and reliability:

- **Core**: [Tauri v2](https://v2.tauri.app/) (Rust) — provides a lightweight native macOS container with hardened security.
- **Frontend**: React + Vite + Deck.gl — an high-frequency UI optimized for financial data visualization.
- **Intelligence Engine**: Python 3.11 Sidecar — handles heavy data processing, local ML models, and DuckDB aggregation.
- **Storage**: [DuckDB](https://duckdb.org/) + SQLite — local, analytical databases for lightning-fast multi-million row queries.

## 📊 Modules (F1 - F9)

AXIOM is organized into specialized intelligence modules, accessible via functional hotkeys:

- **F1: EQUITIES** — Global symbol browser (NSE, NASDAQ, NYSE, TSE, BSE) with live batch pricing.
- **F2: FIXED INCOME** — Yield curve analytics and sovereign debt tracking.
- **F3: FOREX** — Real-time spot rates and currency volatility heatmaps.
- **F4: COMMODITIES** — Futures tracking for energy, metals, and softs.
- **F5: CRYPTO** — Multi-exchange asset tracking with 15s refresh cycles.
- **F6: SATELLITE** — Live maritime tracking via **AISStream API** integration.
- **F7: FLEET** — Logistics and supply chain intelligence feed.
- **F8: AVIATION** — Real-time air traffic monitoring via global ADS-B feeds.
- **F9: MACRO** — Global economic indicators and central bank policy tracking.

## ⚡ Key Features

- **Local ML**: Run predictive models and sentiment analysis entirely on your machine.
- **Zero Cloud Dependency**: Your data never leaves your hardware. Local storage handles over 10M records with ease.
- **Real-Time Data**: Integrated WebSockets for maritime, aviation, and financial markets.
- **Institutional Aesthetics**: A premium, dark-mode terminal UI built for focus and rapid data ingestion.

## 🛠️ Quick Start

### Prerequisites
- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v20+)
- [Python 3.11+](https://www.python.org/)

### Local Development
1. **Clone the repository**:
   ```bash
   git clone https://github.com/irongopher75/Axiom.git
   cd Axiom
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the ML Engine**:
   ```bash
   cd packages/ml-engine
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Launch the Terminal**:
   ```bash
   # From the root directory
   ./start-axiom.sh
   ```

## 📦 Deployment & Releases

AXIOM uses an automated GitHub Actions pipeline to build signed macOS binaries.

1. **Tag a release**:
   ```bash
   git tag v1.3.0
   git push origin v1.3.0
   ```
2. **CI/CD**: The `releaser.yml` workflow will automatically:
   - Compile the Rust core for `aarch64` (Silicon) and `x86_64` (Intel).
   - Bundle the Python ML Engine using PyInstaller.
   - Package the app into a `.dmg` and upload to GitHub Releases.

## 🔒 Security
AXIOM implements strict Content Security Policies (CSP) and local-first data persistence. Authentication is handled locally via encrypted SQLite storage.

---
**AXIOM v3.0** · *Quantitative Intelligence Hub*
