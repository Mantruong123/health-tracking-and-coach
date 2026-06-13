from pydantic import BaseModel, EmailStr
from typing import Optional, List

# --- AUTH SCHEMAS ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    identifier: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AdminUserCreate(UserCreate):
    is_admin: bool = False

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_admin: bool
    is_active: bool
    has_profile: bool

    class Config:
        from_attributes = True

class AccountUpdate(BaseModel):
    email: EmailStr
    current_password: str
    new_password: Optional[str] = None

# --- PROFILE SCHEMAS ---
class ProfileCreateUpdate(BaseModel):
    name: str
    dob: str
    gender: str
    height: float
    weight: float
    goal: str
    equipment: str
    experience: str

class ProfileResponse(ProfileCreateUpdate):
    id: int
    user_id: int
    avatar_url: Optional[str] = None
    bmi: float
    bmi_status: str
    cluster_id: int
    fitness_level_label: str
    bmr: int
    tdee: int
    target_calories: int
    workout_schedule: Optional[str] = None
    nutrition_plan: Optional[str] = None

    class Config:
        from_attributes = True

# --- EXERCISE SCHEMAS ---
class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    difficulty: str
    equipment: str
    calories_estimated: int
    recommended_sets_reps: str
    description: str
    emoji: str

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseResponse(ExerciseBase):
    id: int

    class Config:
        from_attributes = True
