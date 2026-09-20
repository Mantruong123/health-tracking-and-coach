import cv2
import math
import json
import mediapipe as mp
import os

from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

def calculate_angle(a, b, c):
    radians = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    angle = abs(radians * 180.0 / math.pi)
    if angle > 180.0:
        angle = 360.0 - angle
    return angle

def extract_reference_angles(video_path: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'pose_landmarker_lite.task')
    
    base_options = mp_tasks.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO
    )
    
    pose_time_series = []
    
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0 or math.isnan(fps):
            fps = 30
            
        frame_idx = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Timestamp must be strictly increasing for Video mode
            timestamp_ms = int((frame_idx * 1000.0) / fps)
            
            pose_result = landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if pose_result.pose_landmarks and len(pose_result.pose_landmarks) > 0:
                landmarks = pose_result.pose_landmarks[0]
                
                try:
                    shoulder = [landmarks[12].x, landmarks[12].y]
                    elbow = [landmarks[14].x, landmarks[14].y]
                    wrist = [landmarks[16].x, landmarks[16].y]
                    
                    hip = [landmarks[24].x, landmarks[24].y]
                    knee = [landmarks[26].x, landmarks[26].y]
                    ankle = [landmarks[28].x, landmarks[28].y]
                    
                    arm_angle = calculate_angle(shoulder, elbow, wrist)
                    body_angle = calculate_angle(shoulder, hip, ankle)
                    knee_angle = calculate_angle(hip, knee, ankle)
                    
                    pose_time_series.append({
                        "frame": frame_idx,
                        "arm_angle": round(arm_angle, 2),
                        "body_angle": round(body_angle, 2),
                        "knee_angle": round(knee_angle, 2)
                    })
                except Exception as e:
                    pass
            
            frame_idx += 1
            
        cap.release()
        
    return json.dumps(pose_time_series)
