"""
Database Migration Runner

Usage:
    python scripts/migrate.py
    python scripts/migrate.py --reset  (drops and recreates all tables)

Runs all .sql files in migrations/ in order.
Tracks applied migrations in a _migrations table.

At scale: replace with Flyway or Alembic for proper versioned migrations.
"""

import asyncio
import asyncpg
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:DiskCart5@localhost:5432/sett-db")
MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


async def run_migrations(reset: bool = False):
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        if reset:
            print("⚠️  Resetting database — dropping all tables...")
            await conn.execute("""
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO postgres;
                GRANT ALL ON SCHEMA public TO public;
            """)
            print("✓ Schema reset complete")

        # Create migrations tracking table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # Get already-applied migrations
        applied = {row["filename"] for row in await conn.fetch("SELECT filename FROM _migrations")}

        # Get all migration files in order
        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        if not migration_files:
            print("No migration files found in", MIGRATIONS_DIR)
            return

        applied_count = 0
        for mf in migration_files:
            if mf.name in applied:
                print(f"  ↷ {mf.name} (already applied)")
                continue

            print(f"  ▶ Running {mf.name}...")
            sql = mf.read_text(encoding="utf-8")

            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO _migrations (filename) VALUES ($1)", mf.name
                )

            print(f"  ✓ {mf.name} applied")
            applied_count += 1

        if applied_count == 0:
            print("✓ Database is up to date")
        else:
            print(f"\n✓ Applied {applied_count} migration(s)")

    finally:
        await conn.close()


async def seed_merchants():
    """Seed the merchants table with major fashion affiliate programs."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        merchants = [
            ("asos.com", "ASOS", "cj", "4607476", "", 12.0, 30),
            ("zara.com", "Zara", "shareasale", "19966", "", 8.0, 30),
            ("cos.com", "COS", "shareasale", "71280", "", 10.0, 30),
            ("hm.com", "H&M", "shareasale", "43136", "", 10.0, 30),
            ("amazon.com", "Amazon Fashion", "amazon", "", "sett-20", 6.0, 24),
            ("revolve.com", "Revolve", "shareasale", "52164", "", 15.0, 30),
            ("nordstrom.com", "Nordstrom", "rakuten", "38349", "", 2.0, 7),
            ("anthropologie.com", "Anthropologie", "shareasale", "10039", "", 6.0, 30),
            ("urbanoutfitters.com", "Urban Outfitters", "shareasale", "68974", "", 6.0, 30),
            ("arket.com", "ARKET", "awin", "14586", "", 10.0, 30),
        ]

        for domain, name, network, program_id, affiliate_id, commission, cookie in merchants:
            await conn.execute(
                """
                INSERT INTO merchants (domain, name, network, program_id, affiliate_id, commission_rate, cookie_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (domain) DO NOTHING
                """,
                domain, name, network, program_id, affiliate_id, commission, cookie,
            )
            print(f"  ✓ Seeded merchant: {name}")

        print(f"\n✓ Seeded {len(merchants)} merchants")
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SETT database migration runner")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables")
    parser.add_argument("--seed", action="store_true", help="Seed sample data after migration")
    args = parser.parse_args()

    asyncio.run(run_migrations(reset=args.reset))

    if args.seed:
        print("\nSeeding merchant data...")
        asyncio.run(seed_merchants())
