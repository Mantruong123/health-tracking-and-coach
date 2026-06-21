import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/profile_model.dart';
import '../core/api_config.dart';

class ProfileProvider with ChangeNotifier {
  ProfileModel? _profile;
  bool _isLoading = false;
  String _errorMessage = '';
  bool _isPremium = false; // Mock trạng thái trả phí
  int _freeTrialsLeft = 3; // Lượt dùng thử tính năng PRO

  ProfileModel? get profile => _profile;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  bool get isPremium => _isPremium;
  int get freeTrialsLeft => _freeTrialsLeft;

  void upgradeToPremium() {
    _isPremium = true;
    notifyListeners();
  }

  void useFreeTrial() {
    if (_freeTrialsLeft > 0) {
      _freeTrialsLeft--;
      notifyListeners();
    }
  }

  Future<void> fetchProfile(String token) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        _profile = ProfileModel.fromJson(data);
      } else if (response.statusCode == 404) {
        _profile = null;
      } else {
        _errorMessage = 'Lỗi tải dữ liệu hồ sơ';
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối máy chủ';
      print("Fetch Profile Error: \$e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProfile(String token, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(data),
      );
      if (response.statusCode == 200) {
        final respData = json.decode(utf8.decode(response.bodyBytes));
        _profile = ProfileModel.fromJson(respData);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final respData = json.decode(utf8.decode(response.bodyBytes));
        _errorMessage = respData['detail'] ?? 'Cập nhật thất bại';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối máy chủ';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> uploadAvatar(String token, File imageFile) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();
    try {
      final request = http.MultipartRequest('POST', Uri.parse('${ApiConfig.baseUrl}/profile/avatar/upload'));
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath('file', imageFile.path));
      
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        await fetchProfile(token);
        return true;
      } else {
        final respData = json.decode(utf8.decode(response.bodyBytes));
        _errorMessage = respData['detail'] ?? 'Tải ảnh lên thất bại';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối máy chủ';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<String?> createZaloPayPayment(String token, {int amount = 50000}) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/payment/zalopay/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'amount': amount}),
      );
      _isLoading = false;
      notifyListeners();
      
      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        return data['payUrl'];
      } else {
        final data = json.decode(utf8.decode(response.bodyBytes));
        _errorMessage = data['detail'] ?? 'Lỗi tạo giao dịch ZaloPay';
        return null;
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối máy chủ';
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> checkPaymentStatus(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/payment/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );
      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        _isPremium = data['is_premium'] ?? false;
        notifyListeners();
        if (_isPremium) {
           await fetchProfile(token); // Tải lại profile mới
        }
      }
    } catch (e) {
      print("Error checking payment status: $e");
    }
  }

  void clear() {
    _profile = null;
    notifyListeners();
  }
}
