import 'package:flutter/material.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';

class PosePainter extends CustomPainter {
  final List<Pose> poses;
  final Size imageSize;
  final InputImageRotation rotation;

  PosePainter(this.poses, this.imageSize, this.rotation);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0
      ..color = const Color(0xFF06B6D4);

    final jointPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0xFF8B5CF6);

    for (final pose in poses) {
      pose.landmarks.forEach((_, landmark) {
        final pt = _translateX(landmark.x, size, imageSize, rotation);
        final py = _translateY(landmark.y, size, imageSize, rotation);
        canvas.drawCircle(Offset(pt, py), 6, jointPaint);
      });

      void paintLine(PoseLandmarkType type1, PoseLandmarkType type2) {
        final PoseLandmark? joint1 = pose.landmarks[type1];
        final PoseLandmark? joint2 = pose.landmarks[type2];
        if (joint1 != null && joint2 != null) {
          final p1x = _translateX(joint1.x, size, imageSize, rotation);
          final p1y = _translateY(joint1.y, size, imageSize, rotation);
          final p2x = _translateX(joint2.x, size, imageSize, rotation);
          final p2y = _translateY(joint2.y, size, imageSize, rotation);
          canvas.drawLine(Offset(p1x, p1y), Offset(p2x, p2y), paint);
        }
      }

      // Draw arms
      paintLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.leftElbow);
      paintLine(PoseLandmarkType.leftElbow, PoseLandmarkType.leftWrist);
      paintLine(PoseLandmarkType.rightShoulder, PoseLandmarkType.rightElbow);
      paintLine(PoseLandmarkType.rightElbow, PoseLandmarkType.rightWrist);

      // Draw Body
      paintLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.rightShoulder);
      paintLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.leftHip);
      paintLine(PoseLandmarkType.rightShoulder, PoseLandmarkType.rightHip);
      paintLine(PoseLandmarkType.leftHip, PoseLandmarkType.rightHip);

      // Draw legs
      paintLine(PoseLandmarkType.leftHip, PoseLandmarkType.leftKnee);
      paintLine(PoseLandmarkType.leftKnee, PoseLandmarkType.leftAnkle);
      paintLine(PoseLandmarkType.rightHip, PoseLandmarkType.rightKnee);
      paintLine(PoseLandmarkType.rightKnee, PoseLandmarkType.rightAnkle);
    }
  }

  double _translateX(double x, Size canvasSize, Size imageSize, InputImageRotation rotation) {
    switch (rotation) {
      case InputImageRotation.rotation90deg:
        return x * canvasSize.width / imageSize.height;
      case InputImageRotation.rotation270deg:
        return canvasSize.width - x * canvasSize.width / imageSize.height;
      default:
        return x * canvasSize.width / imageSize.width;
    }
  }

  double _translateY(double y, Size canvasSize, Size imageSize, InputImageRotation rotation) {
    switch (rotation) {
      case InputImageRotation.rotation90deg:
      case InputImageRotation.rotation270deg:
        return y * canvasSize.height / imageSize.width;
      default:
        return y * canvasSize.height / imageSize.height;
    }
  }

  @override
  bool shouldRepaint(covariant PosePainter oldDelegate) {
    return oldDelegate.imageSize != imageSize || oldDelegate.poses != poses;
  }
}
