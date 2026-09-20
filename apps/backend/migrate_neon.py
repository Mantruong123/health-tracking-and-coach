from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_lnHvQVyd7b2T@ep-cool-dew-ao5gabry.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE exercises ADD COLUMN reference_pose_data TEXT;"))
        conn.commit()
        print("Successfully added reference_pose_data column to exercises table on NeonDB.")
    except Exception as e:
        print(f"Error: {e}")
