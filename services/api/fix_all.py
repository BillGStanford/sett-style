
import os, re, secrets, shutil

BASE = os.path.dirname(os.path.abspath(__file__))
API_ENV = os.path.join(BASE, ".env")
WEB_ENV = os.path.join(BASE, "..", "..", "apps", "web", ".env.local")

# ── 1. Fix services/api/.env ──────────────────────────────────────────────────
print("=" * 60)
print("Step 1: Fixing services/api/.env")

if not os.path.exists(API_ENV):
    print(f"  ERROR: {API_ENV} not found")
    exit(1)

with open(API_ENV, "r", encoding="utf-8") as f:
    raw = f.read()

lines = raw.splitlines()
clean_lines = []
removed = []
for line in lines:
    stripped = line.strip()
    # Remove NEXT_PUBLIC_ lines — they don't belong in the backend
    if stripped.startswith("NEXT_PUBLIC_"):
        removed.append(stripped)
        continue
    clean_lines.append(line)

if removed:
    print(f"  Removed {len(removed)} NEXT_PUBLIC_ lines from backend .env:")
    for r in removed:
        print(f"    - {r[:60]}")

content = "\n".join(clean_lines)

# Fix CORS_ORIGINS — must be JSON array for pydantic-settings
content = re.sub(
    r'CORS_ORIGINS=(?!\[).*',
    'CORS_ORIGINS=["http://localhost:3000","https://sett.style"]',
    content
)
print('  Set CORS_ORIGINS=["http://localhost:3000","https://sett.style"]')

# Generate SECRET_KEY if placeholder
if 'generate-with-python' in content or re.search(r'SECRET_KEY=\s*$', content, re.MULTILINE):
    key = secrets.token_hex(32)
    content = re.sub(r'SECRET_KEY=.*', f'SECRET_KEY={key}', content)
    print(f"  Generated SECRET_KEY")

with open(API_ENV, "w", encoding="utf-8") as f:
    f.write(content)
print(f"  Saved: {API_ENV}")

# ── 2. Fix apps/web/.env.local ────────────────────────────────────────────────
print()
print("Step 2: Fixing apps/web/.env.local")

if not os.path.exists(WEB_ENV):
    print(f"  ERROR: {WEB_ENV} not found")
    print(f"  Expected at: {os.path.abspath(WEB_ENV)}")
    exit(1)

with open(WEB_ENV, "r", encoding="utf-8") as f:
    web = f.read()

# Extract real values from the api .env if present
supabase_url = ""
anon_key = ""
for line in content.splitlines():
    if line.startswith("SUPABASE_URL="):
        supabase_url = line.split("=", 1)[1].strip()
    if line.startswith("SUPABASE_ANON_KEY="):
        anon_key = line.split("=", 1)[1].strip()

# Fix the placeholder NEXT_PUBLIC_ vars in the web .env
if supabase_url:
    web = re.sub(r'NEXT_PUBLIC_SUPABASE_URL=.*', f'NEXT_PUBLIC_SUPABASE_URL={supabase_url}', web)
    print(f"  Set NEXT_PUBLIC_SUPABASE_URL={supabase_url}")
if anon_key:
    web = re.sub(r'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*', f'NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}', web)
    print(f"  Set NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key[:30]}...")

# Make sure NEXT_PUBLIC_API_URL is correct
web = re.sub(r'NEXT_PUBLIC_API_URL=.*', 'NEXT_PUBLIC_API_URL=http://localhost:8000', web)
print("  Set NEXT_PUBLIC_API_URL=http://localhost:8000")

with open(WEB_ENV, "w", encoding="utf-8") as f:
    f.write(web)
print(f"  Saved: {WEB_ENV}")

print()
print("=" * 60)
print("ALL FIXED.")
print()
print("Now do these steps:")
print()
print("  1. In this terminal (services/api):")
print("       python -m uvicorn main:app --reload --port 8000")
print()
print("  2. In a NEW terminal (apps/web):")
print("       cd apps\\web")
print("       npm run dev")
print()
print("  3. Visit http://localhost:8000/health")
print("     Should return: {status: ok, db: ok}")