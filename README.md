

<p align="center">
  <img src="public/nymphora.png" alt="NYMPHORA logo" width="180" />
</p>

<h1 align="center">NYMPHORA</h1>

<p align="center">
  <b>Network Yield Mapping & Profiling Host-Oriented Recon Assistant</b><br/>
  OSINT / Recon web module for research workflows — part of <b>Project R.O.I.</b>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-beta%201.0.0-blue" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.x-black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178c6" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2d3748" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-supported-336791" />
  <img alt="GeoIP" src="https://img.shields.io/badge/GeoIP-GeoLite2%20City-4c1" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-success" />
</p>

<p align="center">
  <i>This is a <b>beta</b> release prepared for further development, including deeper AI interaction and integration.</i>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Beta & Platform Note (Project R.O.I.)](#beta--platform-note-project-roi)
- [Key Capabilities](#key-capabilities)
- [GeoIP Coverage Limitation](#geoip-coverage-limitation)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Quick Start (Installer)](#quick-start-installer)
- [Manual Setup](#manual-setup)
- [Configuration](#configuration)
- [GeoIP Database Setup](#geoip-database-setup)
- [Usage Notes](#usage-notes)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)
- [Research & Education Notice](#research--education-notice)

---

## Overview

**NYMPHORA** is a web-based OSINT / recon module designed to support **repeatable research workflows** through a modern UI and server-side automation.

It can:
- Manage **cases** and investigation artifacts
- Run **recon/scanning workflows** through backend API endpoints
- Enrich IPs with **offline GeoIP** (MaxMind GeoLite2 City)
- Provide an extensible **AI assistant layer** (*NOVA*) for analysis and reporting

> NYMPHORA executes OSINT utilities server-side. For full functionality you must install required system tools (see [Requirements](#requirements)).

---

## Beta & Platform Note (Project R.O.I.)

NYMPHORA is **part of a larger platform (Project R.O.I.)**.  
Because this repository contains only the NYMPHORA module:

- Some platform-dependent features may be **incomplete, disabled, or partially wired**
- Certain UI elements may appear even if the corresponding R.O.I. service is not present
- Additional AI and automation features are expected to expand as R.O.I. integrations mature

---

## Key Capabilities

### 1) Case management
Organize work into investigation cases (CRUD routes + UI views).

### 2) Recon / scanning workflows
NYMPHORA can orchestrate tools such as:
- `rustscan`, `nmap`, `naabu`, `nuclei`, `amass`, `whatweb`, `whois`, `dig`

These run via backend API endpoints and return structured results to the UI.

### 3) GeoIP enrichment (single + batch)
- `GET /api/geoip?ip=...`
- `POST /api/geoip/batch`

### 4) NOVA (AI assistant layer)
- Analyst support (summaries, observations, IOC extraction)
- Report generation endpoints (model-driven)
- Designed for deeper tool-calling and structured outputs in future releases

> AI requires `.env` configuration (see [Configuration](#configuration)).

---

## GeoIP Coverage Limitation

NYMPHORA uses a **local** GeoIP database:

- `data/GeoLite2-City.mmdb`

The IP-to-location pool is **limited to the contents of this file**.

To expand coverage:
1. **Replace** `data/GeoLite2-City.mmdb` with a newer / different MaxMind database, **or**
2. Integrate NYMPHORA with an external GeoIP provider API (recommended for enterprise-grade coverage)

---

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **MaxMind** offline GeoIP lookups (`.mmdb`)
- **OpenAI SDK** (NOVA endpoints)

---

## Repository Layout

- `app/` – Next.js routes and UI
- `app/api/` – backend endpoints (cases, geoip, recon, nova)
- `app/scanner/` – execution layer for OSINT tools
- `components/` – UI components (consoles / renderers)
- `lib/` – shared logic (GeoIP helper, utils)
- `prisma/` – Prisma schema
- `data/` – GeoIP DB (`GeoLite2-City.mmdb`)
- `public/` – static assets (**place `logo.png` here**)

---

## Requirements

### Runtime
- **Node.js 18+** (recommended 20+)
- **PostgreSQL** (local or remote)

### OSINT system tools (for recon features)
NYMPHORA expects these tools to be available in your system **PATH**:

- `nmap`
- `rustscan`
- `whatweb`
- `whois`
- `dig` (package: `dnsutils` on Debian/Ubuntu)
- `amass`
- `naabu`
- `nuclei`

**Linux is strongly recommended** (Debian/Ubuntu/Kali).  
On Windows, use **WSL2** for best compatibility.

---

## Quick Start (Installer)

Run the installer from the project root:

```bash
python3 nymphora_setup.py
```

What it typically does:
- installs Node dependencies
- runs Prisma (`generate` + `db push`)
- creates a `.env` template if missing
- can verify/install select OSINT tools (environment dependent)

> If your environment needs a stricter “install everything” flow, use the enhanced installer or extend `nymphora_setup.py` to include all tools used in deep workflows.

---

## Manual Setup

1) Install Node deps:

```bash
npm ci
```

2) Create `.env`:

```bash
cp .env.example .env
# or create it manually (see Configuration)
```

3) Prisma:

```bash
npx prisma generate
npx prisma db push
```

4) Start the app:

```bash
npm run dev
```

Default URL: **http://localhost:3002**

---

## Configuration

Minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3002"
```

AI / NOVA (optional but recommended for AI routes):

```env
OPENAI_API_KEY="your_api_key"
# Optional:
NOVA_MODEL="gpt-4o"
NOVA_REPORT_MODEL="gpt-4o"
```

---

## GeoIP Database Setup

NYMPHORA expects:

- `data/GeoLite2-City.mmdb`

If GeoIP endpoints fail, verify the file exists at the exact path above.

---

## Usage Notes

- Recon/scanning features can generate network traffic.
- **Only scan assets you own or have explicit permission to test.**
- Prefer isolated environments (lab/VPN) for experiments.

---

## Troubleshooting

### Missing GeoLite DB
Place the MaxMind database at:

- `data/GeoLite2-City.mmdb`

### “command not found” (OSINT tools)
Install missing binaries and ensure `PATH` is correct.

Examples (Debian/Ubuntu/Kali):

```bash
sudo apt-get update
sudo apt-get install -y nmap whois whatweb dnsutils amass
```

Go-based tools:

```bash
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

### Prisma / DB issues
- Ensure Postgres is running
- Verify `DATABASE_URL`
- Re-run:

```bash
npx prisma db push
```

---

## Roadmap

- deeper NOVA integration (tool calling, structured outputs, workflow automation)
- enrichment expansion (GeoIP API, ASN, passive DNS)
- improved portability (Docker Compose, cross-platform tool management)
- additional R.O.I. platform services integration

---

## License

Licensed under the **MIT License**. See `LICENSE` for details.

---

## Research & Education Notice

NYMPHORA is provided **for research and educational purposes only**.

