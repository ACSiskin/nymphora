# NYMPHORA (Beta)

![NYMPHORA](public/logo.png)

**NYMPHORA** is a **beta** OSINT / recon web application prepared for further development — especially for **deeper AI integration** (the *NOVA* assistant) and expanded automation workflows.

NYMPHORA is also **a component of a larger platform (Project R.O.I.)**, which means **some functions may be incomplete, disabled, or not fully operational** in this standalone repository until the missing R.O.I. services and integrations are connected.

---

## What NYMPHORA does

NYMPHORA combines a modern web UI with server-side OSINT automation. It helps you:

- Organize investigations into **cases** (create / update / track artifacts).
- Run **automated recon workflows** from the backend (system tools executed server-side).
- Enrich IPs with **offline GeoIP** (MaxMind GeoLite2 City database).
- Use **NOVA (AI assistant)** for analysis, summaries, IOC extraction, and report generation.

> **Important:** NYMPHORA executes OSINT utilities on the server (Node.js runtime). For full functionality you must install the required system tools (see below).

---

## Beta / Platform note (R.O.I.)

This repository contains the NYMPHORA module. Because it is part of a bigger platform:

- Some UI elements can be present even if the corresponding backend workflow is not fully connected.
- Certain “platform” features may require services that are **not shipped here**.
- The AI layer can be extended further as R.O.I. integration progresses.

---

## GeoIP coverage limitation (offline database)

NYMPHORA uses a **local** GeoIP database:

- `data/GeoLite2-City.mmdb`

The IP-to-location coverage is limited to what exists inside this file.

To expand the GeoIP dataset you can:
1. **Replace** `data/GeoLite2-City.mmdb` with a newer / different MaxMind DB file, **or**
2. Integrate NYMPHORA with an external GeoIP provider API (recommended for enterprise-grade coverage).

---

## Key features

### 1) Case management API
- CRUD routes for investigation “cases”.

### 2) Recon / scanning workflows
NYMPHORA can run recon tools such as:
- `rustscan`, `nmap`, `naabu`, `nuclei`, `amass`, `whatweb`, `whois`, `dig`

These are executed by server-side API routes (via Node.js) and returned to the UI.

### 3) GeoIP enrichment (single + batch)
- `/api/geoip?ip=...`
- `/api/geoip/batch` (POST)

### 4) NOVA (AI assistant)
- Chat-style analyst support.
- Report generation.
- IOC-focused helper endpoint.

> AI features require valid configuration in `.env` (see **Configuration**).

---

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **MaxMind** (offline GeoIP lookups from `.mmdb`)
- **OpenAI SDK** (NOVA endpoints)

---

## Repository structure (high level)

- `app/` – Next.js routes and UI (App Router)
- `app/api/` – backend endpoints (cases, geoip, recon, nova)
- `app/scanner/` – execution layer for system OSINT tools
- `components/` – UI components (incl. consoles / renderers)
- `lib/` – shared services (GeoIP helper, utils)
- `prisma/` – Prisma schema
- `data/` – offline GeoIP database (`GeoLite2-City.mmdb`)
- `public/` – static assets (**place `logo.png` here**)

---

## Requirements

### Runtime
- **Node.js 18+** (recommended: 20+)
- **PostgreSQL** (local or remote)

### System tools (for recon features)
NYMPHORA expects these tools available in your system `PATH`:

- `nmap`
- `rustscan`
- `whatweb`
- `whois`
- `dig` (package: `dnsutils` on Debian/Ubuntu)
- `amass`
- `naabu`
- `nuclei`

> **Linux is strongly recommended** (Debian/Ubuntu/Kali).  
> On Windows, use **WSL2** for best results.

---

## Installation

### Option A — Installer script (recommended)

This repo includes an installer:

```bash
python3 nymphora_setup.py
```

The installer will:
- verify Node/Python presence
- install Node dependencies
- run Prisma (`generate` + `db push`)
- optionally attempt to install some OSINT tools on Linux (requires `sudo`)

#### Note about “full” tool installation
The default installer may not install every optional OSINT tool used in the deep recon workflows (depending on your environment and distro).  
If you want a stricter “install-everything” approach, you can extend the installer to also handle: `dig`, `amass`, `naabu`, `nuclei` (and any future additions).

---

### Option B — Manual installation (developer friendly)

1) Install Node deps:

```bash
npm ci
```

2) Create `.env`:

```bash
cp .env.example .env
# or create it manually (see Configuration section below)
```

3) Prepare database (Prisma):

```bash
npx prisma generate
npx prisma db push
```

4) Start dev server:

```bash
npm run dev
```

App runs on: **http://localhost:3002**

---

## Configuration (.env)

Minimum required:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3002"
```

AI (optional but recommended for NOVA routes):

```env
OPENAI_API_KEY="your_api_key"
# Optional:
NOVA_MODEL="gpt-4o"
NOVA_REPORT_MODEL="gpt-4o"
```

> Without `OPENAI_API_KEY`, AI endpoints will fail.

---

## GeoIP database setup

NYMPHORA expects:

- `data/GeoLite2-City.mmdb`

If you see an error like **missing GeoLite2 DB**, place the file in `data/` exactly as above.

---

## Usage notes (legal + operational)

- Recon/scanning features can generate network traffic and touch external infrastructure.
- **Only scan assets you own or have explicit permission to test.**
- Consider running NYMPHORA inside a controlled lab environment.

---

## Troubleshooting

### “Brak pliku data/GeoLite2-City.mmdb”
Put the GeoLite2 City database into:

- `data/GeoLite2-City.mmdb`

### “command not found” for recon tools
Install the missing tool and ensure it is available in `PATH`, e.g.:

- Debian/Ubuntu/Kali:
  - `sudo apt-get install -y nmap whois whatweb dnsutils amass`
- Go-based tools:
  - `go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest`
  - `go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest`

### Prisma / DB issues
- Ensure Postgres is running.
- Verify your `DATABASE_URL`.
- Re-run:

```bash
npx prisma db push
```

---

## Roadmap (high level)

- deeper NOVA integration (tool calling, structured outputs, workflows)
- expanded enrichment sources (GeoIP API, ASN, passive DNS)
- better portability (Docker compose, cross-platform tool management)
- additional R.O.I. platform integrations as services become available

---

## Research & education notice

NYMPHORA is provided **for research and educational purposes only**.
