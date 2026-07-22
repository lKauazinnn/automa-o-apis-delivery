"""Conexão com o banco. SQLite para desenvolvimento; trocar DATABASE_URL por Postgres
depois é a única mudança necessária (os modelos são agnósticos)."""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
# Ex.: DATABASE_URL=postgresql+psycopg://user:pass@host/db  → basta setar a env var.
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'dev.db'}")

# check_same_thread só é necessário/ válido no SQLite.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency do FastAPI: abre uma sessão por request e fecha no fim."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401  (registra os modelos no metadata)

    Base.metadata.create_all(bind=engine)
