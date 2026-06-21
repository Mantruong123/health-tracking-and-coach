import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/profile_provider.dart';

class UpdateProfileScreen extends StatefulWidget {
  const UpdateProfileScreen({super.key});

  @override
  _UpdateProfileScreenState createState() => _UpdateProfileScreenState();
}

class _UpdateProfileScreenState extends State<UpdateProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Profile
  final _nameController = TextEditingController();
  final _dobController = TextEditingController();
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();
  String _gender = 'Nam';

  // Security
  final _emailController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = Provider.of<ProfileProvider>(context, listen: false).profile;
      if (profile != null) {
        _nameController.text = profile.name;
        _dobController.text = profile.dob;
        _heightController.text = profile.height.round().toString();
        _weightController.text = profile.weight.round().toString();
        _gender = profile.gender.tr();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _dobController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final profileProvider = Provider.of<ProfileProvider>(context, listen: false);
    final token = auth.token;

    try {
      if (token == null) return;

      // 1. Update Security if password entered
      if (_currentPasswordController.text.isNotEmpty) {
        if (_newPasswordController.text != _confirmPasswordController.text) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_a21eea33'.tr())));
          setState(() => _isSaving = false);
          return;
        }
        if (_emailController.text.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_6e516039'.tr())));
          setState(() => _isSaving = false);
          return;
        }

        final success = await auth.updateSecurity(
          _emailController.text,
          _currentPasswordController.text,
          _newPasswordController.text.isNotEmpty ? _newPasswordController.text : null,
        );

        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage)));
          setState(() => _isSaving = false);
          return;
        }
      } else if (_emailController.text.isNotEmpty || _newPasswordController.text.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_a1f4b47c'.tr())));
          setState(() => _isSaving = false);
          return;
      }

      // 2. Update Profile
      if (_nameController.text.isNotEmpty) {
        final currentProfile = profileProvider.profile;
        if (currentProfile != null) {
          final profileData = {
            "name": _nameController.text,
            "dob": _dobController.text,
            "gender": _gender,
            "height": double.tryParse(_heightController.text) ?? currentProfile.height,
            "weight": double.tryParse(_weightController.text) ?? currentProfile.weight,
            "goal": currentProfile.goal,
            "equipment": currentProfile.equipment,
            "experience": currentProfile.experience,
          };
          
          final profileSuccess = await profileProvider.updateProfile(token, profileData);
          if (!profileSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(profileProvider.errorMessage)));
            setState(() => _isSaving = false);
            return;
          }
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_4a7d6a65'.tr()), backgroundColor: const Color(0xFF10B981)));
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_dc9c2b86'.tr())));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: Text('t_e22e9fb7'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF8B5CF6),
          labelColor: const Color(0xFF8B5CF6),
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'Thông tin cá nhân', icon: Icon(Icons.person)),
            Tab(text: 'Bảo mật', icon: Icon(Icons.security)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Cá nhân
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTextField('Tên hiển thị', _nameController),
                const SizedBox(height: 16),
                _buildTextField('Ngày sinh (DD-MM-YYYY)', _dobController),
                const SizedBox(height: 16),
                Text('t_e02f0878'.tr(), style: const TextStyle(color: Colors.grey, fontSize: 14)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _gender,
                      isExpanded: true,
                      dropdownColor: const Color(0xFF1E293B),
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      items: <String>['Nam', 'Nữ'].map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (newValue) {
                        if (newValue != null) setState(() => _gender = newValue);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField('Chiều cao (cm)', _heightController, isNumber: true)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildTextField('Cân nặng (kg)', _weightController, isNumber: true)),
                  ],
                ),
              ],
            ),
          ),
          
          // Tab 2: Bảo mật
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('t_04f6f9b3'.tr(), style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 14, fontStyle: FontStyle.italic)),
                const SizedBox(height: 16),
                _buildTextField('Email', _emailController),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFF1E293B)),
                const SizedBox(height: 16),
                _buildTextField('Mật khẩu hiện tại (Bắt buộc để lưu)', _currentPasswordController, isPassword: true),
                const SizedBox(height: 16),
                _buildTextField('Mật khẩu mới (Bỏ trống nếu không đổi)', _newPasswordController, isPassword: true),
                const SizedBox(height: 16),
                _buildTextField('Xác nhận mật khẩu mới', _confirmPasswordController, isPassword: true),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        color: const Color(0xFF0F172A),
        child: SizedBox(
          height: 55,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: _isSaving ? null : _handleSave,
            child: _isSaving
                ? const CircularProgressIndicator(color: Colors.white)
                : Text('t_512898d2'.tr(), style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, {bool isNumber = false, bool isPassword = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: isNumber ? TextInputType.number : TextInputType.text,
          obscureText: isPassword,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }
}
