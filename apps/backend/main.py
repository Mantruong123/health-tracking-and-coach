from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile

import os
import shutil
import uuid
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Union
import json
import base64
from datetime import datetime
from pydantic import BaseModel

import models
import schemas
import auth
import email_service
import payment
from database import engine, get_db, Base

# Create tables
Base.metadata.create_all(bind=engine)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI(title="AuraFit AI Core API", version="1.0.0")

app.include_router(payment.router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"VALIDATION ERROR: {exc.errors()} \n BODY: {exc.body}")
    return JSONResponse(status_code=422, content={"detail": exc.errors(), "body": exc.body})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SEED DATA ---
def seed_database(db: Session):
    # Check if admin exists
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        hashed_pw = auth.get_password_hash("admin")
        admin = models.User(username="admin", email="admin@aurafit.com", password_hash=hashed_pw, is_admin=True, is_active=True)
        db.add(admin)
        
    demo_user = db.query(models.User).filter(models.User.username == "demo").first()
    if not demo_user:
        hashed_pw = auth.get_password_hash("123")
        demo = models.User(username="demo", email="demo@aurafit.com", password_hash=hashed_pw, is_admin=False, is_active=True)
        db.add(demo)
        
    # Check if exercises exist
    if db.query(models.Exercise).count() == 0:
        initial_exercises = [
            {"name": "Hít đất cơ bản (Push-up)", "muscle_group": "Ngực", "difficulty": "beginner", "equipment": "none", "calories_estimated": 8, "recommended_sets_reps": "3 hiệp x 12 lần", "description": "Động tác chống đẩy cơ bản giúp phát triển cơ ngực.", "emoji": "💪"},
            {"name": "Thụt dầu (Air Squat)", "muscle_group": "Đùi & Mông", "difficulty": "beginner", "equipment": "none", "calories_estimated": 7, "recommended_sets_reps": "3 hiệp x 15 lần", "description": "Bài tập squat không tạ.", "emoji": "🦵"},
            {"name": "Tấm ván siết cơ bụng (Plank)", "muscle_group": "Bụng", "difficulty": "beginner", "equipment": "none", "calories_estimated": 5, "recommended_sets_reps": "3 hiệp x 45 giây", "description": "Giữ tư thế thẳng người để kích hoạt cơ bụng.", "emoji": "🧘"},
            {"name": "Hít đất kim cương (Diamond Push-up)", "muscle_group": "Tay sau", "difficulty": "intermediate", "equipment": "none", "calories_estimated": 10, "recommended_sets_reps": "4 hiệp x 12 lần", "description": "Tập trung lực vào bắp tay sau.", "emoji": "⚡"},
            {"name": "Đu xà đơn (Pull-up)", "muscle_group": "Lưng & Xô", "difficulty": "intermediate", "equipment": "gym", "calories_estimated": 11, "recommended_sets_reps": "4 hiệp x 8 lần", "description": "Kéo xà đơn phát triển cơ xô.", "emoji": "🧗"},
        ]
        for ex in initial_exercises:
            db.add(models.Exercise(**ex))
    db.commit()

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_database(db)
    except Exception as e:
        print(f"Skipping seed_database due to error: {e}")

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter((models.User.username == user.username) | (models.User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc Email đã tồn tại")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, password_hash=hashed_password, is_active=False)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    activation_token = auth.create_activation_token(new_user.email)
    email_service.send_activation_email(new_user.email, activation_token)
    return {"message": "Vui lòng kiểm tra email để kích hoạt tài khoản."}

@app.get("/api/auth/activate/{token}")
def activate_account(token: str, db: Session = Depends(get_db)):
    email = auth.verify_activation_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Link kích hoạt không hợp lệ hoặc đã hết hạn")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    if user.is_active:
        return {"message": "Tài khoản đã được kích hoạt trước đó"}
        
    user.is_active = True
    db.commit()
    return {"message": "Kích hoạt tài khoản thành công"}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter((models.User.username == form_data.identifier) | (models.User.email == form_data.identifier)).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc mật khẩu không chính xác")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.")
        
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

class ForgotPasswordRequest(BaseModel):
    email: str

@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"message": "Nếu email tồn tại, link đổi mật khẩu sẽ được gửi đi."}
    reset_token = auth.create_reset_token(user.email)
    email_service.send_reset_password_email(user.email, reset_token)
    return {"message": "Vui lòng kiểm tra email để đặt lại mật khẩu."}

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = auth.verify_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    hashed_password = auth.get_password_hash(payload.new_password)
    user.password_hash = hashed_password
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}

@app.put("/api/auth/account")
def update_account(payload: schemas.AccountUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not auth.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác")
        
    if payload.email != current_user.email:
        existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng")
        current_user.email = payload.email
        
    if payload.new_password:
        current_user.password_hash = auth.get_password_hash(payload.new_password)
        
    db.commit()
    return {"message": "Cập nhật tài khoản thành công"}


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        has_profile=current_user.profile is not None
    )

# --- PROFILE & AI RECOMMENDATION ---
@app.get("/api/profile", response_model=schemas.ProfileResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return current_user.profile

@app.post("/api/profile", response_model=schemas.ProfileResponse)
def save_profile(profile_data: schemas.ProfileCreateUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        dob_date = datetime.strptime(profile_data.dob, "%d-%m-%Y")
        today = datetime.today()
        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    except ValueError:
        raise HTTPException(status_code=400, detail="Ngày sinh phải theo định dạng DD-MM-YYYY")

    height_m = profile_data.height / 100
    bmi = round(profile_data.weight / (height_m * height_m), 1)
    
    bmi_status = "Bình thường"
    if bmi < 18.5: bmi_status = "Thiếu cân"
    elif 25 <= bmi < 30: bmi_status = "Thừa cân"
    elif bmi >= 30: bmi_status = "Béo phì"

    cluster_id = 1
    fitness_level_label = "Trung cấp"
    if profile_data.experience == "sedentary" or bmi >= 30 or age > 60:
        cluster_id = 0
        fitness_level_label = "Sơ cấp"
    elif profile_data.experience == "athletic" and (18.5 <= bmi < 25):
        cluster_id = 2
        fitness_level_label = "Cao cấp"

    if profile_data.gender == "Nam":
        bmr = round(88.362 + (13.397 * profile_data.weight) + (4.799 * profile_data.height) - (5.677 * age))
    else:
        bmr = round(447.593 + (9.247 * profile_data.weight) + (3.098 * profile_data.height) - (4.330 * age))

    multiplier = 1.2 if profile_data.experience == "sedentary" else (1.4 if profile_data.experience == "active" else 1.7)
    tdee = round(bmr * multiplier)

    target_calories = tdee
    if profile_data.goal == "lose_weight": target_calories = tdee - 500
    elif profile_data.goal == "build_muscle": target_calories = tdee + 300
    elif profile_data.goal == "improve_endurance": target_calories = tdee + 100

    # Calculate AI macros & meals
    protein_pct, carb_pct, fat_pct = 25, 50, 25
    if profile_data.goal == 'lose_weight':
        protein_pct, carb_pct, fat_pct = 35, 40, 25
    elif profile_data.goal == 'build_muscle':
        protein_pct, carb_pct, fat_pct = 30, 45, 25
    elif profile_data.goal == 'improve_endurance':
        protein_pct, carb_pct, fat_pct = 25, 55, 20

    protein_grams = round((target_calories * (protein_pct / 100)) / 4)
    carb_grams = round((target_calories * (carb_pct / 100)) / 4)
    fat_grams = round((target_calories * (fat_pct / 100)) / 9)

    meals = [
        {"type": 'Bữa Sáng', "name": 'Cháo yến mạch + 3 lòng trắng trứng' if profile_data.goal == 'lose_weight' else '4 quả trứng ốp + Bánh mì ngũ cốc', "cal": round(target_calories * 0.25)},
        {"type": 'Bữa Trưa', "name": 'Ức gà áp chảo + Bông cải luộc' if profile_data.goal == 'lose_weight' else 'Bò xào bông cải + Cơm gạo lứt', "cal": round(target_calories * 0.35)},
        {"type": 'Bữa Phụ', "name": '1 quả táo + 1 muỗng Whey' if profile_data.goal == 'lose_weight' else 'Sữa chua Hy Lạp + Hạt chia', "cal": round(target_calories * 0.15)},
        {"type": 'Bữa Tối', "name": 'Cá hồi nướng + Salad dầu giấm' if profile_data.goal == 'lose_weight' else 'Thịt heo nạc nướng + Cơm trắng', "cal": round(target_calories * 0.25)}
    ]
    nutrition_plan = json.dumps({"macros": {"protein": protein_grams, "carbs": carb_grams, "fat": fat_grams}, "meals": meals})

    # Recommended Exercises logic
    equipment_rank = {'none': 0, 'dumbbell': 1, 'barbell': 2, 'machine': 3, 'cable': 4, 'gym': 5}
    diff_rank = {'beginner': 0, 'intermediate': 1, 'advanced': 2}
    predicted_difficulty = 'intermediate'
    if cluster_id == 0: predicted_difficulty = 'beginner'
    elif cluster_id == 2: predicted_difficulty = 'advanced'

    max_equip_rank = equipment_rank.get(profile_data.equipment, 0)
    user_diff_rank = diff_rank.get(predicted_difficulty, 1)

    target_muscle_groups = {
        'lose_weight': ['Toàn thân', 'Bụng', 'Đùi & Mông', 'Ngực', 'Cardio'],
        'build_muscle': ['Ngực', 'Lưng & Xô', 'Đùi & Mông', 'Tay trước', 'Tay sau', 'Vai'],
        'improve_endurance': ['Toàn thân', 'Bụng', 'Đùi & Mông', 'Vai', 'Cardio'],
        'stay_fit': ['Toàn thân', 'Bụng', 'Ngực', 'Lưng & Xô', 'Cardio']
    }.get(profile_data.goal, ['Toàn thân'])

    all_ex = db.query(models.Exercise).all()
    filtered_ex = [ex for ex in all_ex if equipment_rank.get(ex.equipment, 0) <= max_equip_rank]
    filtered_ex = [ex for ex in filtered_ex if abs(diff_rank.get(ex.difficulty, 0) - user_diff_rank) <= 1]
    
    # Format exercise helper
    def format_ex(ex):
        return {"id": ex.id, "name": ex.name, "muscle_group": ex.muscle_group, "difficulty": ex.difficulty, "equipment": ex.equipment, "recommended_sets_reps": ex.recommended_sets_reps, "calories_estimated": ex.calories_estimated, "emoji": ex.emoji, "description": ex.description}

    weekly_schedule = {
        "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [], "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": []
    }

    # Group filtered exercises by muscle group
    ex_by_muscle = {}
    for ex in filtered_ex:
        ex_by_muscle.setdefault(ex.muscle_group, []).append(format_ex(ex))
        
    def get_exercises(muscle_keys, count=2):
        result = []
        for mk in muscle_keys:
            if mk in ex_by_muscle and ex_by_muscle[mk]:
                result.extend(ex_by_muscle[mk][:count])
        return result

    if profile_data.goal == 'build_muscle':
        weekly_schedule["Thứ 2"] = get_exercises(["Ngực", "Tay sau"], 3)
        weekly_schedule["Thứ 3"] = get_exercises(["Lưng & Xô", "Tay trước"], 3)
        weekly_schedule["Thứ 5"] = get_exercises(["Đùi & Mông", "Bụng"], 3)
        weekly_schedule["Thứ 6"] = get_exercises(["Vai", "Ngực", "Toàn thân"], 2)
    elif profile_data.goal in ['lose_weight', 'stay_fit']:
        weekly_schedule["Thứ 2"] = get_exercises(["Toàn thân", "Cardio"], 3)
        weekly_schedule["Thứ 3"] = get_exercises(["Bụng", "Đùi & Mông"], 3)
        weekly_schedule["Thứ 5"] = get_exercises(["Ngực", "Lưng & Xô", "Cardio"], 2)
        weekly_schedule["Thứ 6"] = get_exercises(["Toàn thân", "Bụng"], 3)
    else:
        weekly_schedule["Thứ 2"] = get_exercises(["Cardio", "Toàn thân"], 3)
        weekly_schedule["Thứ 4"] = get_exercises(["Đùi & Mông", "Bụng"], 3)
        weekly_schedule["Thứ 6"] = get_exercises(["Vai", "Tay trước", "Tay sau"], 3)
        
    if not any(weekly_schedule.values()):
        weekly_schedule["Thứ 2"] = [format_ex(ex) for ex in filtered_ex[:4]]

    workout_schedule = json.dumps(weekly_schedule)

    # 2. Save to DB
    profile = current_user.profile
    
    # Check if we should regenerate workout schedule
    should_regenerate_workout = True
    if profile:
        # If user already has a profile, only regenerate if goal, equipment, or experience changed
        if (profile.goal == profile_data.goal and 
            profile.equipment == profile_data.equipment and 
            profile.experience == profile_data.experience and 
            profile.workout_schedule):
            should_regenerate_workout = False

    if not profile:
        profile = models.UserProfile(user_id=current_user.id)
        db.add(profile)
        
    for key, value in profile_data.dict().items():
        setattr(profile, key, value)
        
    profile.bmi = bmi
    profile.bmi_status = bmi_status
    profile.cluster_id = cluster_id
    profile.fitness_level_label = fitness_level_label
    profile.bmr = bmr
    profile.tdee = tdee
    profile.target_calories = target_calories
    
    if should_regenerate_workout:
        profile.workout_schedule = workout_schedule
        
    profile.nutrition_plan = nutrition_plan

    db.commit()
    db.refresh(profile)
    return profile

class UpdateExercisesRequest(BaseModel):
    exercises: Union[List[dict], Dict[str, List[dict]]]

@app.put("/api/profile/exercises")
def update_profile_exercises(payload: UpdateExercisesRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.workout_schedule = json.dumps(payload.exercises)
    db.commit()
    return {"message": "Updated exercises successfully"}

class UpdateAvatarRequest(BaseModel):
    avatar_url: str

@app.put("/api/profile/avatar")
def update_profile_avatar(payload: UpdateAvatarRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.avatar_url = payload.avatar_url
    db.commit()
    return {"avatar_url": profile.avatar_url}

@app.post("/api/profile/avatar/upload")
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Giới hạn 5MB
    contents = file.file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.")
    
    # Encode thành base64 data URL và lưu vào database
    file_extension = file.filename.split(".")[-1].lower()
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
    mime_type = mime_map.get(file_extension, "image/png")
    b64_data = base64.b64encode(contents).decode("utf-8")
    avatar_url = f"data:{mime_type};base64,{b64_data}"
    
    profile.avatar_url = avatar_url
    db.commit()
    return {"avatar_url": avatar_url}

# --- EXERCISES ---
@app.get("/api/exercises", response_model=List[schemas.ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    return db.query(models.Exercise).all()

@app.post("/api/exercises", response_model=schemas.ExerciseResponse)
def create_exercise(exercise: schemas.ExerciseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_ex = models.Exercise(**exercise.dict())
    db.add(db_ex)
    db.commit()
    db.refresh(db_ex)
    return db_ex

@app.delete("/api/exercises/{ex_id}")
def delete_exercise(ex_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    ex = db.query(models.Exercise).filter(models.Exercise.id == ex_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ex)
    db.commit()
    return {"message": "Deleted"}

@app.put("/api/exercises/{ex_id}", response_model=schemas.ExerciseResponse)
def update_exercise(ex_id: int, exercise: schemas.ExerciseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_ex = db.query(models.Exercise).filter(models.Exercise.id == ex_id).first()
    if not db_ex:
        raise HTTPException(status_code=404, detail="Not found")
    
    for key, value in exercise.dict().items():
        setattr(db_ex, key, value)
        
    db.commit()
    db.refresh(db_ex)
    return db_ex

# --- ADMIN USER MANAGEMENT ---
@app.get("/api/users")
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    users = db.query(models.User).all()
    return [{
        "id": u.id, "username": u.username, "email": u.email,
        "is_admin": u.is_admin, "is_active": u.is_active,
        "has_profile": u.profile is not None
    } for u in users]

@app.post("/api/users")
def admin_create_user(user: schemas.AdminUserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_user = db.query(models.User).filter((models.User.username == user.username) | (models.User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc Email đã tồn tại")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, password_hash=hashed_password, is_admin=user.is_admin, is_active=True)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Tạo user thành công", "id": new_user.id}

@app.put("/api/users/{user_id}/role")
def change_user_role(user_id: int, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    if user.username == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi quyền của System Admin")
    user.is_admin = payload.get("is_admin", False)
    db.commit()
    return {"message": "Đã cập nhật quyền"}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    if user.username == "admin":
        raise HTTPException(status_code=403, detail="Không thể xóa System Admin")
        
    try:
        # Xóa các dữ liệu phụ thuộc
        workout_logs = db.query(models.WorkoutLog).filter(models.WorkoutLog.user_id == user_id).all()
        for wl in workout_logs:
            db.query(models.ExerciseLog).filter(models.ExerciseLog.workout_log_id == wl.id).delete()
            
        db.query(models.WorkoutLog).filter(models.WorkoutLog.user_id == user_id).delete()
        db.query(models.BodyMeasurement).filter(models.BodyMeasurement.user_id == user_id).delete()
        db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).delete()
        
        db.delete(user)
        db.commit()
        return {"message": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- PROGRESS TRACKING APIs ---

@app.post("/api/progress/workout", response_model=schemas.WorkoutLogResponse)
def create_workout_log(
    payload: schemas.WorkoutLogCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    new_log = models.WorkoutLog(
        user_id=current_user.id,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        notes=payload.notes
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    for ex in payload.exercises:
        ex_log = models.ExerciseLog(
            workout_log_id=new_log.id,
            exercise_id=ex.exercise_id,
            sets_completed=ex.sets_completed,
            reps_completed=ex.reps_completed,
            weight_kg=ex.weight_kg
        )
        db.add(ex_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@app.get("/api/progress/workout", response_model=List[schemas.WorkoutLogResponse])
def get_workout_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    logs = db.query(models.WorkoutLog).filter(models.WorkoutLog.user_id == current_user.id).order_by(models.WorkoutLog.date.desc()).all()
    return logs

@app.post("/api/progress/measurement", response_model=schemas.BodyMeasurementResponse)
def create_measurement(
    payload: schemas.BodyMeasurementCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    new_measurement = models.BodyMeasurement(
        user_id=current_user.id,
        weight=payload.weight,
        body_fat_percentage=payload.body_fat_percentage
    )
    db.add(new_measurement)
    
    # Update current profile weight
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    if profile:
        profile.weight = payload.weight
        height_m = profile.height / 100
        profile.bmi = round(payload.weight / (height_m * height_m), 1)
        
    db.commit()
    db.refresh(new_measurement)
    return new_measurement

@app.get("/api/progress/measurement", response_model=List[schemas.BodyMeasurementResponse])
def get_measurements(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    measurements = db.query(models.BodyMeasurement).filter(models.BodyMeasurement.user_id == current_user.id).order_by(models.BodyMeasurement.date.asc()).all()
    return measurements
