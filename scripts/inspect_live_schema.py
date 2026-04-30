#!/usr/bin/env python3
"""Inspect the live Postgres schema configured in api/.env."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterable

try:
    import psycopg
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "psycopg is required to run this script. Install it with: pip install psycopg[binary]"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
API_ENV = ROOT / "api" / ".env"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def print_section(title: str, rows: Iterable[tuple[object, ...]]) -> None:
    print(f"\n## {title}")
    for row in rows:
        print(" | ".join("" if value is None else str(value) for value in row))


def main() -> int:
    load_dotenv(API_ENV)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set. Expected it in api/.env or the environment.", file=sys.stderr)
        return 1

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            )
            print_section("Tables", cur.fetchall())

            cur.execute(
                """
                SELECT table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
                """
            )
            print_section("Columns", cur.fetchall())

            cur.execute(
                """
                SELECT t.typname AS enum_name, e.enumlabel AS enum_value
                FROM pg_type t
                JOIN pg_enum e ON e.enumtypid = t.oid
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public'
                ORDER BY t.typname, e.enumsortorder
                """
            )
            print_section("Enums", cur.fetchall())

            cur.execute(
                """
                SELECT
                  tc.table_name,
                  tc.constraint_name,
                  kcu.column_name,
                  ccu.table_name AS foreign_table_name,
                  ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON ccu.constraint_name = tc.constraint_name
                 AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
                ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
                """
            )
            print_section("Foreign Keys", cur.fetchall())

            cur.execute(
                """
                SELECT schemaname, tablename, indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
                """
            )
            print_section("Indexes", cur.fetchall())

            cur.execute(
                """
                SELECT
                  event_object_table AS table_name,
                  trigger_name,
                  action_timing,
                  event_manipulation,
                  action_statement
                FROM information_schema.triggers
                WHERE trigger_schema = 'public'
                ORDER BY event_object_table, trigger_name
                """
            )
            print_section("Triggers", cur.fetchall())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
