# SETT — 

python -m uvicorn main:app --reload --port 8000 

## Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL running (your pgAdmin `sett-db` database)
- A free Supabase account (supabase.com)

---

## Step 1 — Clone & install

```bash
# Install Node deps
npm install

# Install Python deps
cd services/api
pip install -r requirements.txt
cd ../..
```

---

## Step 2 — Create .env files

```bash
# Copy template to both locations
cp infrastructure/env/.env.example apps/web/.env.local
cp infrastructure/env/.env.example services/api/.env
```

**Fill in these values in BOTH files:**

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Already set: `postgresql://postgres:DiskCart5@localhost:5432/sett-db` |
| `SUPABASE_URL` | Supabase Dashboard > Project Settings > API |
| `SUPABASE_ANON_KEY` | Same page |
| `SUPABASE_JWT_SECRET` | Project Settings > API > JWT Settings > JWT Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY |

Everything else (R2, Resend, affiliate networks) can be left blank — the app works without them.

**Generate a SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 3 — Run database migrations

```bash
cd services/api
python scripts/migrate.py --seed
cd ../..
```

This creates all 12 tables and seeds the merchants table with affiliate programs.

---

## Step 4 — Enable Google OAuth in Supabase

1. Supabase Dashboard > Authentication > Providers > Google
2. Enable it
3. Add your Google OAuth credentials (or use Supabase's built-in Google OAuth for dev)
4. Set callback URL: `http://localhost:3000/api/auth/callback`

---

## Step 5 — Run dev servers

```bash
# In one terminal:
cd services/api && uvicorn main:app --reload --port 8000

# In another terminal:
cd apps/web && npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## What works immediately

| Feature | Status |
|---|---|
| Landing page | ✅ Fully working |
| Sign up / Sign in | ✅ Email + Google OAuth |
| Onboarding flow | ✅ 4-step flow |
| Canvas editor | ✅ Full Fabric.js canvas |
| Item URL clipping | ✅ (background removal needs rembg) |
| Image upload | ✅ |
| Canvas save + autosave | ✅ |
| Publish set | ✅ (thumbnail upload needs R2) |
| Feed page | ✅ Infinite scroll |
| Set detail / Steal This Look | ✅ |
| Profile pages | ✅ |
| Earnings dashboard | ✅ |
| Settings | ✅ |
| Challenges page | ✅ |

## What needs external services

| Feature | Needs |
|---|---|
| Set thumbnails | Cloudflare R2 credentials |
| Background removal | `rembg` working on your machine (`pip install rembg`) |
| Affiliate earnings | ShareASale / CJ account |
| Email (welcome, reset) | Resend API key |