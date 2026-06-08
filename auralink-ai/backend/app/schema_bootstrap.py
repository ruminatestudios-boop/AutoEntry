"""Ensure developer API tables exist (DDL via direct Postgres when password configured)."""
from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_MIGRATION = (
    Path(__file__).resolve().parent.parent.parent
    / "supabase/migrations/20260525000000_developer_public_api.sql"
)


def _postgres_dsn() -> str | None:
    if os.environ.get("DATABASE_URL", "").strip():
        return os.environ["DATABASE_URL"].strip()
    url = os.environ.get("SUPABASE_URL", "").strip()
    password = os.environ.get("SUPABASE_DB_PASSWORD", "").strip()
    if not url or not password:
        return None
    ref = url.replace("https://", "").replace(".supabase.co", "").strip()
    return f"postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres"


def developer_tables_exist(supabase) -> bool:
    if not supabase:
        return False
    try:
        supabase.table("developer_api_keys").select("id").limit(1).execute()
        return True
    except Exception as exc:
        err = str(exc).lower()
        if "pgrst205" in err or "does not exist" in err or "42p01" in err:
            return False
        logger.warning("developer_api_keys probe failed: %s", exc)
        return False


def apply_developer_migration_sql() -> bool:
    dsn = _postgres_dsn()
    if not dsn or not _MIGRATION.is_file():
        return False
    try:
        import psycopg2

        sql = _MIGRATION.read_text(encoding="utf-8")
        conn = psycopg2.connect(dsn)
        conn.autocommit = True
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
        finally:
            conn.close()
        logger.info("developer_api_keys migration applied")
        return True
    except Exception as exc:
        logger.error("developer migration failed: %s", exc)
        return False


def ensure_developer_schema(supabase) -> None:
    if developer_tables_exist(supabase):
        return
    if apply_developer_migration_sql():
        return
    logger.warning(
        "developer_api_keys table missing — set SUPABASE_DB_PASSWORD on Cloud Run "
        "or run supabase/migrations/20260525000000_developer_public_api.sql in SQL Editor"
    )
