import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/progress_model.dart';
import '../core/api_config.dart';

class ProgressProvider with ChangeNotifier {
  List<WorkoutLogModel> _workoutLogs = [];
  List<BodyMeasurementModel> _measurements = [];
  bool _isLoading = false;
  String _errorMessage = '';

  List<WorkoutLogModel> get workoutLogs => _workoutLogs;
  List<BodyMeasurementModel> get measurements => _measurements;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  Future<void> fetchProgressData(String token) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      // Fetch workouts
      final workoutRes = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/progress/workout'),
        headers: {
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );

      // Fetch measurements
      final measureRes = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/progress/measurement'),
        headers: {
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );

      if (workoutRes.statusCode == 200 && measureRes.statusCode == 200) {
        final List<dynamic> wData = json.decode(utf8.decode(workoutRes.bodyBytes));
        _workoutLogs = wData.map((e) => WorkoutLogModel.fromJson(e)).toList();

        final List<dynamic> mData = json.decode(utf8.decode(measureRes.bodyBytes));
        _measurements = mData.map((e) => BodyMeasurementModel.fromJson(e)).toList();
      } else {
        _errorMessage = 'Lỗi tải dữ liệu tiến trình';
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối máy chủ';
      print("Fetch Progress Error: \$e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> saveWorkoutLog(String token, int duration, int calories, List<Map<String, dynamic>> exercises) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/progress/workout'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: json.encode({
          'duration_minutes': duration,
          'calories_burned': calories,
          'exercises': exercises
        }),
      );

      if (response.statusCode == 200) {
        // Refresh data
        await fetchProgressData(token);
        return true;
      }
    } catch (e) {
      print("Save Workout Error: \$e");
    }
    return false;
  }

  Future<bool> saveMeasurement(String token, double weight) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/progress/measurement'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: json.encode({
          'weight': weight
        }),
      );

      if (response.statusCode == 200) {
        // Refresh data
        await fetchProgressData(token);
        return true;
      }
    } catch (e) {
      print("Save Measurement Error: \$e");
    }
    return false;
  }

  void clear() {
    _workoutLogs = [];
    _measurements = [];
    notifyListeners();
  }
}
