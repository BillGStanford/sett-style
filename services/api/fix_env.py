
import os
import re

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

if not os.path.exists(env_path):
    print(f"ERROR: .env not found at {env_path}")
    print("Make sure you run this from services/api/")
    exit(1)

with open(env_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix CORS_ORIGINS — replace comma-separated with JSON array
old = re.search(r'CORS_ORIGINS=.*', content)
if old:
    print(f"Found: {old.group()}")
    content = re.sub(
        r'CORS_ORIGINS=.*',
        'CORS_ORIGINS=["http://localhost:3000","https://sett.style"]',
        content
    )
    print('Fixed: CORS_ORIGINS=["http://localhost:3000","https://sett.style"]')
else:
    content += '\nCORS_ORIGINS=["http://localhost:3000","https://sett.style"]\n'
    print("Added CORS_ORIGINS")

# Also generate a SECRET_KEY if it's still the placeholder
if 'generate-with-python' in content or 'SECRET_KEY=\n' in content or 'SECRET_KEY= ' in content:
    import secrets
    new_key = secrets.token_hex(32)
    content = re.sub(r'SECRET_KEY=.*', f'SECRET_KEY={new_key}', content)
    print(f"Generated SECRET_KEY: {new_key[:16]}...")

with open(env_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nFixed: {env_path}")
print("\nNow run:  python -m uvicorn main:app --reload --port 8000")