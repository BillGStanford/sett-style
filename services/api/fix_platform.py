import os
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(BASE, "platform")
NEW = os.path.join(BASE, "core")

# Step 1: rename folder
if os.path.exists(OLD) and not os.path.exists(NEW):
    shutil.copytree(OLD, NEW)
    shutil.rmtree(OLD)
    print(f"Renamed: platform/ -> core/")
elif os.path.exists(NEW):
    print(f"core/ already exists - skipping rename")
    if os.path.exists(OLD):
        shutil.rmtree(OLD)
        print(f"Removed leftover platform/")
else:
    print("Neither platform/ nor core/ found - check your directory")

# Step 2: fix all imports in every .py file
fixed = 0
for root, dirs, files in os.walk(BASE):
    # skip __pycache__
    dirs[:] = [d for d in dirs if d != "__pycache__"]
    for fname in files:
        if not fname.endswith(".py"):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if "from core." in content:
            new_content = content.replace("from core.", "from core.")
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  Fixed imports: {os.path.relpath(fpath, BASE)}")
            fixed += 1

print(f"\nDone. Fixed {fixed} file(s).")
print("\nNow run:  python -m uvicorn main:app --reload --port 8000")