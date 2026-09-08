import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'apps/backend'))

from database import SessionLocal
import models

db = SessionLocal()

try:
    user_id = 5 # ID 5 from screenshot (test7)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        print(f"Found user: {user.username}")
        db.delete(user)
        db.commit()
        print("Deleted successfully")
    else:
        print("User not found")
except Exception as e:
    print(f"Error: {e}")
