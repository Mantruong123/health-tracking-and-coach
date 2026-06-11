from database import SessionLocal
import models

def seed_more_exercises():
    db = SessionLocal()
    
    additional_exercises = [
        {"name": "Chạy bộ (Treadmill)", "muscle_group": "Cardio", "difficulty": "beginner", "equipment": "machine", "calories_estimated": 15, "recommended_sets_reps": "30 phút", "description": "Chạy bộ trên máy giúp tăng cường tim mạch và đốt mỡ hiệu quả.", "emoji": "🏃"},
        {"name": "Đạp xe (Cycling)", "muscle_group": "Cardio", "difficulty": "beginner", "equipment": "machine", "calories_estimated": 12, "recommended_sets_reps": "20 phút", "description": "Đạp xe giúp phát triển cơ đùi và đốt cháy calo.", "emoji": "🚴"},
        {"name": "Đẩy tạ đòn (Bench Press)", "muscle_group": "Ngực", "difficulty": "intermediate", "equipment": "gym", "calories_estimated": 10, "recommended_sets_reps": "4 hiệp x 10 lần", "description": "Bài tập phát triển cơ ngực toàn diện với tạ đòn.", "emoji": "🏋️"},
        {"name": "Gập bụng (Crunch)", "muscle_group": "Bụng", "difficulty": "beginner", "equipment": "none", "calories_estimated": 6, "recommended_sets_reps": "3 hiệp x 20 lần", "description": "Tập trung lực vào nhóm cơ bụng trên.", "emoji": "🤸"},
        {"name": "Kéo cáp xô (Lat Pulldown)", "muscle_group": "Lưng & Xô", "difficulty": "intermediate", "equipment": "machine", "calories_estimated": 9, "recommended_sets_reps": "4 hiệp x 12 lần", "description": "Phát triển độ rộng của cơ lưng xô.", "emoji": "💪"},
        {"name": "Nâng tạ đôi vai (Dumbbell Shoulder Press)", "muscle_group": "Vai", "difficulty": "intermediate", "equipment": "dumbbell", "calories_estimated": 8, "recommended_sets_reps": "3 hiệp x 12 lần", "description": "Bài tập phát triển toàn diện cơ vai.", "emoji": "🦾"},
        {"name": "Đu xà ngang (Muscle-up)", "muscle_group": "Lưng & Xô", "difficulty": "advanced", "equipment": "gym", "calories_estimated": 14, "recommended_sets_reps": "3 hiệp x 5 lần", "description": "Kỹ thuật nâng cao đòi hỏi sức mạnh lớn từ thân trên.", "emoji": "🤸‍♂️"},
        {"name": "Nhảy dây (Jump Rope)", "muscle_group": "Cardio", "difficulty": "beginner", "equipment": "gym", "calories_estimated": 13, "recommended_sets_reps": "5 hiệp x 3 phút", "description": "Đốt calo nhanh và tăng cường phản xạ.", "emoji": "🪢"},
        {"name": "Squat với tạ đòn (Barbell Squat)", "muscle_group": "Đùi & Mông", "difficulty": "intermediate", "equipment": "gym", "calories_estimated": 12, "recommended_sets_reps": "4 hiệp x 10 lần", "description": "Vua của các bài tập thân dưới.", "emoji": "🦵"},
        {"name": "Nâng hông (Glute Bridge)", "muscle_group": "Đùi & Mông", "difficulty": "beginner", "equipment": "none", "calories_estimated": 7, "recommended_sets_reps": "3 hiệp x 15 lần", "description": "Bài tập nhẹ nhàng cô lập cơ mông.", "emoji": "🧘‍♀️"},
        
        # New exercises added
        {"name": "Plank", "muscle_group": "Bụng", "difficulty": "beginner", "equipment": "none", "calories_estimated": 8, "recommended_sets_reps": "3 hiệp x 60 giây", "description": "Tăng cường sức mạnh cốt lõi và sức bền cơ bụng.", "emoji": "🧘‍♂️"},
        {"name": "Chống đẩy (Push-up)", "muscle_group": "Ngực", "difficulty": "beginner", "equipment": "none", "calories_estimated": 9, "recommended_sets_reps": "3 hiệp x 15 lần", "description": "Bài tập cơ bản phát triển cơ ngực, vai và tay sau.", "emoji": "👐"},
        {"name": "Kéo xà đơn (Pull-up)", "muscle_group": "Lưng & Xô", "difficulty": "intermediate", "equipment": "gym", "calories_estimated": 11, "recommended_sets_reps": "3 hiệp x 8 lần", "description": "Phát triển sức mạnh kéo và cơ lưng rộng.", "emoji": "🧗"},
        {"name": "Deadlift", "muscle_group": "Toàn thân", "difficulty": "advanced", "equipment": "gym", "calories_estimated": 15, "recommended_sets_reps": "4 hiệp x 8 lần", "description": "Bài tập toàn diện cho cơ đùi sau, mông và lưng dưới.", "emoji": "🏋️‍♂️"},
        {"name": "Cuốn tạ đơn (Bicep Curls)", "muscle_group": "Tay trước", "difficulty": "beginner", "equipment": "dumbbell", "calories_estimated": 7, "recommended_sets_reps": "3 hiệp x 12 lần", "description": "Tập trung phát triển cơ bắp tay trước.", "emoji": "💪"},
        {"name": "Đạp đùi (Leg Press)", "muscle_group": "Đùi & Mông", "difficulty": "intermediate", "equipment": "machine", "calories_estimated": 10, "recommended_sets_reps": "4 hiệp x 12 lần", "description": "Phát triển cơ đùi mạnh mẽ và an toàn cho lưng.", "emoji": "🦵"},
        {"name": "Chùng chân (Lunges)", "muscle_group": "Đùi & Mông", "difficulty": "beginner", "equipment": "none", "calories_estimated": 9, "recommended_sets_reps": "3 hiệp x 12 lần (mỗi chân)", "description": "Giúp cải thiện khả năng giữ thăng bằng và cơ mông đùi.", "emoji": "🚶"},
        {"name": "Nhún tay sau (Tricep Dips)", "muscle_group": "Tay sau", "difficulty": "intermediate", "equipment": "gym", "calories_estimated": 8, "recommended_sets_reps": "3 hiệp x 12 lần", "description": "Bài tập hiệu quả cho bắp tay sau và ngực dưới.", "emoji": "💪"},
        {"name": "Leo núi tại chỗ (Mountain Climbers)", "muscle_group": "Cardio", "difficulty": "beginner", "equipment": "none", "calories_estimated": 14, "recommended_sets_reps": "4 hiệp x 45 giây", "description": "Đốt mỡ toàn thân và tăng nhịp tim nhanh chóng.", "emoji": "🏃‍♂️"},
        {"name": "Yoga cơ bản (Stretching)", "muscle_group": "Toàn thân", "difficulty": "beginner", "equipment": "none", "calories_estimated": 5, "recommended_sets_reps": "20 phút", "description": "Tăng cường độ dẻo dai và giảm căng thẳng.", "emoji": "🧘"}
    ]
    
    added_count = 0
    for ex in additional_exercises:
        existing = db.query(models.Exercise).filter(models.Exercise.name == ex["name"]).first()
        if not existing:
            db.add(models.Exercise(**ex))
            added_count += 1
            
    if added_count > 0:
        db.commit()
        print(f"✅ Đã thêm thành công {added_count} bài tập mới vào database!")
    else:
        print("⚠️ Các bài tập này đã có trong database, không cần thêm mới.")
        
    db.close()

if __name__ == "__main__":
    seed_more_exercises()
