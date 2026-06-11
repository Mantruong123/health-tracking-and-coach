import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Lấy DATABASE_URL từ biến môi trường (mặc định nếu không có thì dùng sqlite cho local dev ngoài docker)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./aurafit.db")

# Nếu dùng sqlite thì cần thêm check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
