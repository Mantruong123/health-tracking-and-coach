from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    name = Column(String, nullable=False)
    dob = Column(String, nullable=False) # DD-MM-YYYY
    gender = Column(String, nullable=False)
    height = Column(Float, nullable=False) # cm
    weight = Column(Float, nullable=False) # kg
    goal = Column(String, nullable=False)
    equipment = Column(String, nullable=False)
    experience = Column(String, nullable=False)
    avatar_url = Column(Text, nullable=True)
    
    # AI Calculated fields
    bmi = Column(Float)
    bmi_status = Column(String)
    cluster_id = Column(Integer)
    fitness_level_label = Column(String)
    bmr = Column(Integer)
    tdee = Column(Integer)
    target_calories = Column(Integer)
    
    # JSON strings to store AI recommendations
    workout_schedule = Column(Text, nullable=True)
    nutrition_plan = Column(Text, nullable=True)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    muscle_group = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    equipment = Column(String, nullable=False)
    calories_estimated = Column(Integer, nullable=False)
    recommended_sets_reps = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    emoji = Column(String)
