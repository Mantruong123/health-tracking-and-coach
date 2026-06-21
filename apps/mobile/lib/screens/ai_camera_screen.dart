import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import 'dart:math';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';
import '../widgets/pose_painter.dart';

class AiCameraScreen extends StatefulWidget {
  final String exerciseName;
  final bool isHold;
  final int? targetReps;
  final double? targetWeight;
  const AiCameraScreen({super.key, this.exerciseName = "", this.isHold = false, this.targetReps, this.targetWeight});

  @override
  State<AiCameraScreen> createState() => _AiCameraScreenState();
}

class _AiCameraScreenState extends State<AiCameraScreen> {
  CameraController? _cameraController;
  final PoseDetector _poseDetector = PoseDetector(options: PoseDetectorOptions());
  bool _isBusy = false;
  final List<Pose> _poses = [];
  CustomPaint? _customPaint;

  // Squat counting logic
  int _repCount = 0;
  String _squatState = "UP";
  
  // Timer cho bài tập Hold
  Timer? _holdTimer;
  bool _isPersonInFrame = false;
  bool _isPaused = false;
  
  // Preparation Timer
  int _prepTime = 5;
  Timer? _prepTimer;
  
  bool _hasFinished = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _startPrepTimer();
  }

  void _startPrepTimer() {
    // Đếm chậm hơn (2 giây mỗi nhịp) để user có nhiều thời gian chuẩn bị vào tư thế hơn
    _prepTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!mounted) return;
      setState(() {
        if (_prepTime > 0) {
          _prepTime--;
        } else {
          timer.cancel();
          if (widget.isHold) {
            _startHoldTimer();
          }
        }
      });
    });
  }

  void _startHoldTimer() {
    _holdTimer = Timer.periodic(const Duration(milliseconds: 1200), (timer) {
      if (_isPersonInFrame && mounted && !_isPaused) {
        setState(() {
          _repCount++;
          _checkTargetReached();
        });
      }
    });
  }

  void _checkTargetReached() async {
    if (!_hasFinished && widget.targetReps != null && _repCount >= widget.targetReps!) {
      _hasFinished = true;
      _holdTimer?.cancel();
      _prepTimer?.cancel();
      
      if (mounted) {
        // Hiện popup chúc mừng
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 64),
                const SizedBox(height: 16),
                const Text('Hoàn thành!', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Chúc mừng bạn đã hoàn thành bài tập', style: TextStyle(color: Colors.white70, fontSize: 16), textAlign: TextAlign.center),
              ],
            ),
          ),
        );
        
        // Đợi 2 giây để user nhìn thấy thông báo, sau đó tự động tắt
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          Navigator.pop(context); // Đóng Dialog
          Navigator.pop(context, _repCount); // Đóng Camera Screen và trả về kết quả
        }
      }
    }
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    // Use front camera if available
    final camera = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _cameraController = CameraController(
      camera,
      ResolutionPreset.low,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.nv21,
    );

    await _cameraController?.initialize();
    if (!mounted) return;

    _cameraController?.startImageStream(_processCameraImage);
    setState(() {});
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isBusy) return;
    _isBusy = true;

    try {
      final WriteBuffer allBytes = WriteBuffer();
      for (final Plane plane in image.planes) {
        allBytes.putUint8List(plane.bytes);
      }
      final bytes = allBytes.done().buffer.asUint8List();

      final Size imageSize = Size(image.width.toDouble(), image.height.toDouble());
      final camera = _cameraController!.description;
      final imageRotation = InputImageRotationValue.fromRawValue(camera.sensorOrientation) ?? InputImageRotation.rotation0deg;
      
      final inputImageFormat = InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;
      
      final inputImageData = InputImageMetadata(
        size: imageSize,
        rotation: imageRotation,
        format: inputImageFormat,
        bytesPerRow: image.planes[0].bytesPerRow,
      );

      final inputImage = InputImage.fromBytes(bytes: bytes, metadata: inputImageData);
      
      final poses = await _poseDetector.processImage(inputImage);
      
      // Rep Counter Logic
      if (!widget.isHold && _prepTime == 0) {
        _processReps(poses);
        _checkTargetReached();
      }

      if (poses.isNotEmpty) {
        _isPersonInFrame = true;
        final painter = PosePainter(poses, imageSize, imageRotation);
        _customPaint = CustomPaint(painter: painter);
      } else {
        _isPersonInFrame = false;
        _customPaint = null;
      }
      
      if (mounted) {
        setState(() {});
      }
    } catch (e) {
      print("Camera Error: \$e");
    } finally {
      _isBusy = false;
    }
  }

  void _processReps(List<Pose> poses) {
    if (poses.isEmpty) return;
    final pose = poses.first;
    
    final nameLower = widget.exerciseName.toLowerCase();
    
    // Logic cho bài tập Tay (Cuốn tạ, Bicep Curl, Kéo xà)
    if (nameLower.contains('cuốn') || nameLower.contains('curl') || nameLower.contains('tay') || nameLower.contains('kéo')) {
      final shoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
      final elbow = pose.landmarks[PoseLandmarkType.rightElbow];
      final wrist = pose.landmarks[PoseLandmarkType.rightWrist];
      
      if (shoulder != null && elbow != null && wrist != null && 
          shoulder.likelihood > 0.5 && elbow.likelihood > 0.5 && wrist.likelihood > 0.5) {
        
        double angle = _calculateAngle(shoulder.x, shoulder.y, elbow.x, elbow.y, wrist.x, wrist.y);
        
        // Gập tay vào (co cơ)
        if (angle < 60) {
          _squatState = "UP"; // Dùng UP tượng trưng cho co tay
        } 
        // Duỗi tay ra
        else if (angle > 140 && _squatState == "UP") {
          _squatState = "DOWN"; // Dùng DOWN tượng trưng cho duỗi tay
          _repCount++;
        }
      }
    }
    // Logic cho Hít đất (Push-up, Đẩy tạ)
    else if (nameLower.contains('hít đất') || nameLower.contains('push') || nameLower.contains('đẩy')) {
      final shoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
      final elbow = pose.landmarks[PoseLandmarkType.rightElbow];
      final wrist = pose.landmarks[PoseLandmarkType.rightWrist];
      
      if (shoulder != null && elbow != null && wrist != null && 
          shoulder.likelihood > 0.5 && elbow.likelihood > 0.5 && wrist.likelihood > 0.5) {
        
        double angle = _calculateAngle(shoulder.x, shoulder.y, elbow.x, elbow.y, wrist.x, wrist.y);
        
        if (angle < 90) {
          _squatState = "DOWN";
        } else if (angle > 150 && _squatState == "DOWN") {
          _squatState = "UP";
          _repCount++;
        }
      }
    } 
    // Mặc định: Logic cho Squat / Thân dưới
    else {
      final hip = pose.landmarks[PoseLandmarkType.rightHip];
      final knee = pose.landmarks[PoseLandmarkType.rightKnee];
      final ankle = pose.landmarks[PoseLandmarkType.rightAnkle];
      
      if (hip != null && knee != null && ankle != null && 
          hip.likelihood > 0.5 && knee.likelihood > 0.5 && ankle.likelihood > 0.5) {
        
        double angle = _calculateAngle(hip.x, hip.y, knee.x, knee.y, ankle.x, ankle.y);

        if (angle < 100) {
          _squatState = "DOWN";
        } else if (angle > 160 && _squatState == "DOWN") {
          _squatState = "UP";
          _repCount++;
        }
      }
    }
  }

  double _calculateAngle(double ax, double ay, double bx, double by, double cx, double cy) {
    double radians = atan2(cy - by, cx - bx) - atan2(ay - by, ax - bx);
    double angle = (radians * 180.0 / pi).abs();
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return angle;
  }

  @override
  void dispose() {
    _prepTimer?.cancel();
    _holdTimer?.cancel();
    _cameraController?.stopImageStream();
    _cameraController?.dispose();
    _poseDetector.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4))),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraPreview(_cameraController!),
          if (_customPaint != null) Positioned.fill(child: _customPaint!),
          
          // UI Overlay
          Positioned(
            top: 50,
            left: 20,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 30),
              onPressed: () => Navigator.pop(context, _repCount),
            ),
          ),
          Positioned(
            top: 50,
            right: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      Text(
                        widget.exerciseName.isNotEmpty ? widget.exerciseName : 'Tập Luyện',
                        style: const TextStyle(fontSize: 14, color: Colors.white70),
                      ),
                      if (widget.targetWeight != null && widget.targetWeight! > 0)
                        Text(
                          'Tạ: ${widget.targetWeight} kg',
                          style: const TextStyle(fontSize: 14, color: Colors.white70),
                        ),
                      Text(
                        widget.isHold ? 'Thời gian: $_repCount giây${widget.targetReps != null ? ' / ${widget.targetReps}' : ''}' : 'Reps: $_repCount${widget.targetReps != null ? ' / ${widget.targetReps}' : ''}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                if (widget.isHold) ...[
                  const SizedBox(height: 10),
                  FloatingActionButton.extended(
                    heroTag: "pause_play",
                    backgroundColor: _isPaused ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    onPressed: () {
                      setState(() {
                        _isPaused = !_isPaused;
                      });
                    },
                    icon: Icon(_isPaused ? Icons.play_arrow : Icons.pause, color: Colors.white),
                    label: Text(_isPaused ? 'Tiếp tục' : 'Tạm dừng', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ]
              ],
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  't_f769e708'.tr(),
                  style: const TextStyle(color: Colors.white, fontSize: 16),
                ),
              ),
            ),
          ),

          // Hiển thị đếm ngược chuẩn bị
          if (_prepTime > 0)
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.5),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('t_12c5dbc0'.tr(), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 20),
                      Text(
                        '$_prepTime',
                        style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 120, fontWeight: FontWeight.bold),
                      ).animate().scale(duration: 500.ms).fade(),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
