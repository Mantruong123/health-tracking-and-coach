import cv2
import math
import os
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

print("Testing MediaPipe...")
try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'pose_landmarker_lite.task')
    
    base_options = mp_tasks.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO
    )
    
    print("Creating landmarker...")
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        print("Landmarker created successfully!")
except Exception as e:
    print(f"Error: {e}")
