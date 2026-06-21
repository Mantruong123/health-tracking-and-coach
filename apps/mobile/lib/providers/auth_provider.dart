import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../core/api_config.dart';

class AuthProvider with ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final String _baseUrl = ApiConfig.baseUrl;

  String? _token;
  bool _isAuthenticated = false;
  bool _hasProfile = false;
  bool _isLoading = false;
  String _errorMessage = '';

  bool get isAuthenticated => _isAuthenticated;
  bool get hasProfile => _hasProfile;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  String? get token => _token;

  Future<void> setHasProfile(bool value) async {
    _hasProfile = value;
    notifyListeners();
  }

  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: json.encode({
          'identifier': identifier,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _token = data['access_token'];
        _isAuthenticated = true;
        await _storage.write(key: 'token', value: _token);

        // Fetch user info to see if profile exists
        final meResponse = await http.get(
          Uri.parse('$_baseUrl/auth/me'),
          headers: {
            'Authorization': 'Bearer $_token',
            'ngrok-skip-browser-warning': 'true',
          },
        );

        if (meResponse.statusCode == 200) {
          final meData = json.decode(meResponse.body);
          _hasProfile = meData['has_profile'] ?? false;
        }

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Sai tài khoản hoặc mật khẩu';
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

  Future<bool> updateSecurity(String email, String currentPassword, String? newPassword) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/auth/account'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: json.encode({
          'email': email,
          'current_password': currentPassword,
          if (newPassword != null && newPassword.isNotEmpty) 'new_password': newPassword,
        }),
      );
      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = json.decode(utf8.decode(response.bodyBytes));
        _errorMessage = data['detail'] ?? 'Cập nhật thất bại';
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

  Future<void> logout() async {
    _token = null;
    _isAuthenticated = false;
    _hasProfile = false;
    await _storage.delete(key: 'token');
    notifyListeners();
  }
}
