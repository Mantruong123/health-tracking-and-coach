import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../core/api_config.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  _OnboardingScreenState createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  bool _isLoading = false;

  // Form Data
  final String _name = '';
  String _gender = 'Nam';
  final String _dob = '';
  double _height = 170.0;
  double _weight = 65.0;
  String _goal = 'Giảm cân';
  String _equipment = 'Không dụng cụ';
  String _experience = 'Người mới';

  final List<String> _genders = ['Nam', 'Nữ', 'Khác'];
  final List<String> _goals = ['Giảm cân', 'Tăng cơ', 'Giữ dáng', 'Tăng sức bền'];
  final List<String> _equipments = ['Không dụng cụ', 'Tạ đơn', 'Phòng gym', 'Dây kháng lực'];
  final List<String> _experiences = ['Người mới', 'Đã từng tập', 'Chuyên nghiệp'];

  final _nameController = TextEditingController();
  final _dobController = TextEditingController(); // Format DD-MM-YYYY

  Future<void> _submitProfile() async {
    setState(() {
      _isLoading = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.token;

    if (token == null) return;

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: json.encode({
          'name': _nameController.text.trim(),
          'dob': _dobController.text.trim(),
          'gender': _gender,
          'height': _height,
          'weight': _weight,
          'goal': _goal,
          'equipment': _equipment,
          'experience': _experience,
        }),
      );

      if (response.statusCode == 200) {
        // Cập nhật state sang đã có profile
        await authProvider.setHasProfile(true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('t_c98e00da'.tr())),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('t_d5178616'.tr())),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    } else {
      _submitProfile();
    }
  }

  void _prevPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _currentPage > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: _prevPage,
              )
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Thanh tiến trình
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
              child: Row(
                children: List.generate(3, (index) {
                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4.0),
                      height: 8,
                      decoration: BoxDecoration(
                        color: _currentPage >= index ? const Color(0xFF06B6D4) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                children: [
                  _buildStep1(),
                  _buildStep2(),
                  _buildStep3(),
                ],
              ),
            ),
            // Nút điều hướng
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B5CF6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: _isLoading ? null : _nextPage,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          _currentPage == 2 ? 'HOÀN THÀNH & TẠO LỊCH TẬP' : 'TIẾP TỤC',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('t_becb11d4'.tr(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          Text('t_5a32d041'.tr(), style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          TextField(
            controller: _nameController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Tên của bạn',
              labelStyle: const TextStyle(color: Colors.grey),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _dobController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Ngày sinh (DD-MM-YYYY)',
              hintText: 't_381c2d78'.tr(),
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
              labelStyle: const TextStyle(color: Colors.grey),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 24),
          Text('t_e02f0878'.tr(), style: const TextStyle(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: _genders.map((g) {
              final isSelected = _gender == g;
              return ChoiceChip(
                label: Text(g, style: TextStyle(color: isSelected ? Colors.white : Colors.grey)),
                selected: isSelected,
                selectedColor: const Color(0xFF06B6D4),
                backgroundColor: const Color(0xFF1E293B),
                onSelected: (selected) {
                  if (selected) setState(() => _gender = g);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('t_197d3794'.tr(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          Text('t_5496cfcb'.tr(), style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 48),
          Text('t_cbc610cb'.tr(), style: const TextStyle(color: Colors.white, fontSize: 18)),
          Slider(
            value: _height,
            min: 120,
            max: 220,
            divisions: 100,
            activeColor: const Color(0xFF8B5CF6),
            label: _height.round().toString(),
            onChanged: (val) => setState(() => _height = val),
          ),
          Center(child: Text('${_height.round()} cm', style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 32, fontWeight: FontWeight.bold))),
          const SizedBox(height: 48),
          Text('t_6c9e1f48'.tr(), style: const TextStyle(color: Colors.white, fontSize: 18)),
          Slider(
            value: _weight,
            min: 30,
            max: 150,
            divisions: 120,
            activeColor: const Color(0xFF8B5CF6),
            label: _weight.round().toString(),
            onChanged: (val) => setState(() => _weight = val),
          ),
          Center(child: Text('${_weight.round()} kg', style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 32, fontWeight: FontWeight.bold))),
        ],
      ),
    );
  }

  Widget _buildStep3() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('t_13ffc8f8'.tr(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          Text('t_5c311926'.tr(), style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          Text('t_e39aae01'.tr(), style: const TextStyle(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _goals.map((g) {
              final isSelected = _goal == g;
              return ChoiceChip(
                label: Text(g, style: TextStyle(color: isSelected ? Colors.white : Colors.grey)),
                selected: isSelected,
                selectedColor: const Color(0xFF06B6D4),
                backgroundColor: const Color(0xFF1E293B),
                onSelected: (selected) {
                  if (selected) setState(() => _goal = g);
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          Text('t_5173ddb0'.tr(), style: const TextStyle(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _equipments.map((g) {
              final isSelected = _equipment == g;
              return ChoiceChip(
                label: Text(g, style: TextStyle(color: isSelected ? Colors.white : Colors.grey)),
                selected: isSelected,
                selectedColor: const Color(0xFF8B5CF6),
                backgroundColor: const Color(0xFF1E293B),
                onSelected: (selected) {
                  if (selected) setState(() => _equipment = g);
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          Text('t_cc7fa927'.tr(), style: const TextStyle(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _experiences.map((g) {
              final isSelected = _experience == g;
              return ChoiceChip(
                label: Text(g, style: TextStyle(color: isSelected ? Colors.white : Colors.grey)),
                selected: isSelected,
                selectedColor: const Color(0xFF10B981),
                backgroundColor: const Color(0xFF1E293B),
                onSelected: (selected) {
                  if (selected) setState(() => _experience = g);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
