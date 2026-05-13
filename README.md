# SETT — Style it. Share it. Shop it.

> The social commerce fashion platform — Polyvore rebuilt for the creator economy.

## What is SETT?

SETT is a browser-based fashion collage platform. Users build outfit sets on an infinite canvas, add shoppable items, publish to a community feed, and earn affiliate commissions when followers buy what they styled.

**Three layers:**
- **Canvas** — Infinite drag-and-drop fashion collage (Fabric.js)
- **Commerce** — Affiliate link system with per-creator earnings dashboard
- **Community** — Feed, challenges, follows, remixes, Steal This Look pages

---

## Architecture

This is a **modular monolith** designed to decompose into microservices at scale.

```
sett/
├── apps/
│   └── web/                    # Next.js 14 App Router frontend
├── services/
│   └── api/                    # FastAPI backend (Python 3.12)
│       ├── domains/            # Product domains (DDD)
│       │   ├── users/
│       │   ├── canvas/
│       │   ├── items/
│       │   ├── sets/
│       │   ├── commerce/
│       │   ├── referrals/
│       │   ├── analytics/
│       │   └── ai/
│       └── core/              # Shared infrastructure (auth/db/cache/storage/logging/config)
│           ├── auth/
│           ├── database/
│           ├── cache/
│           ├── storage/
│           ├── logging/
│           └── config/
├── packages/
│   ├── contracts/              # API type contracts (shared FE/BE)
│   ├── design-system/          # Token system + base components
│   ├── utils/
│   └── config/
└── infrastructure/
    ├── env/                    # Environment configs
    ├── scripts/                # Dev/deploy scripts
    └── jobs/                   # Background job definitions
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Canvas | Fabric.js 6.x |
| State | Zustand |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | Supabase Auth |
| Background Removal | rembg (ONNX/CPU) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16 running locally

### 1. Clone and install

```bash
git clone https://github.com/sett-technologies/sett
cd sett
npm install
cd services/api && pip install -r requirements.txt
```

### 2. Environment setup

```bash
cp infrastructure/env/.env.example apps/web/.env.local
cp infrastructure/env/.env.example services/api/.env
# Fill in your values
```

### 3. Database setup

```bash
npm run db:migrate
npm run db:seed  # optional: loads sample data
```

### 4. Run development servers

```bash
npm run dev
# Frontend: http://localhost:3000
# API:      http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Domain Ownership

| Domain | Owner | Description |
|--------|-------|-------------|
| users | Backend Lead | Auth, profiles, follows, sessions |
| canvas | Frontend Lead | Fabric.js, state model, serialization |
| items | Backend | URL ingestion, background removal, metadata |
| sets | Fullstack | Create/edit/publish, feed, remix |
| commerce | Senior Backend | Affiliate links, click tracking, revenue |
| referrals | Backend | Referral codes, commission boosts |
| analytics | Platform | Event tracking, funnels, creator metrics |
| ai | ML (Month 9+) | Embeddings, recommendations, complete the look |

---

## Revenue Model

1. **Affiliate Commerce** (Month 1) — 30% platform share on conversions
2. **Pro Subscription** (Month 4) — $9.99/month
3. **Brand Challenges** (Month 8) — $2K–$10K per sponsored challenge
4. **Creator Marketplace** (Month 10) — 25% on Style Pack sales

---

## Status

Pre-launch. Building toward Series A.

**SETT Technologies Inc.** — Confidential — v1.0 2026
