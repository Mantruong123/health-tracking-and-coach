import sys
import os

from database import SessionLocal
from models import User

db = SessionLocal()
users = db.query(User).all()
for u in users:
    u.is_premium = False
db.commit()
print("Successfully reset all users to free.")
