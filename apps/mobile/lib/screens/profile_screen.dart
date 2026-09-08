import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import 'dart:convert' as dart_convert;
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../providers/profile_provider.dart';
import '../providers/progress_provider.dart';
import 'progress_screen.dart';
import 'update_profile_screen.dart';
import 'premium_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _showUpdateWeightDialog(BuildContext context) {
    final TextEditingController weightController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text('t_2ab1d93b'.tr(), style: const TextStyle(color: Colors.white)),
        content: TextField(
          controller: weightController,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 't_3a5cab83'.tr(),
            hintStyle: const TextStyle(color: Colors.grey),
            enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('t_1e405035'.tr(), style: const TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () async {
              final val = double.tryParse(weightController.text);
              if (val != null) {
                final token = Provider.of<AuthProvider>(context, listen: false).token;
                if (token != null) {
                  await Provider.of<ProgressProvider>(context, listen: false).saveMeasurement(token, val);
                  // Refresh profile to show new BMI
                  Provider.of<ProfileProvider>(context, listen: false).fetchProfile(token);
                }
              }
              Navigator.pop(ctx);
            },
            child: Text('t_49fac1fe'.tr()),
          )
        ],
      ),
    );
  }

  void _logout(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final profile = Provider.of<ProfileProvider>(context, listen: false);
    
    // Đăng xuất và xóa cache
    profile.clear();
    await auth.logout();
    
    // Lưu ý: Việc điều hướng sẽ tự động xảy ra do Consumer<AuthProvider> ở main.dart
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    final profile = profileProvider.profile;

    if (profile == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF080C14),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text('t_090cc82e'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Avatar & Name Info
            Center(
              child: Column(
                children: [
                  GestureDetector(
                    onTap: () async {
                      if (profileProvider.isLoading) return;
                      final picker = ImagePicker();
                      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
                      if (pickedFile != null) {
                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        final success = await profileProvider.uploadAvatar(auth.token!, File(pickedFile.path));
                        if (success) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_66086c35'.tr()), backgroundColor: const Color(0xFF10B981)));
                          }
                        } else {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(profileProvider.errorMessage), backgroundColor: Colors.red));
                          }
                        }
                      }
                    },
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF8B5CF6),
                        border: Border.all(color: const Color(0xFF1E293B), width: 4),
                        image: profile.avatarUrl != null && profile.avatarUrl!.isNotEmpty
                            ? DecorationImage(
                                image: profile.avatarUrl!.startsWith('data:image')
                                    ? MemoryImage(dart_convert.base64Decode(profile.avatarUrl!.split(',').last)) as ImageProvider
                                    : NetworkImage(profile.avatarUrl!),
                                fit: BoxFit.cover)
                            : null,
                      ),
                      child: Stack(
                        children: [
                          if (profile.avatarUrl == null)
                            Center(
                              child: Text(
                                profile.name.isNotEmpty ? profile.name[0].toUpperCase() : 'U',
                                style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          if (profileProvider.isLoading)
                            Container(
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.black54),
                              child: const Center(child: CircularProgressIndicator(color: Colors.white)),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        child: Text(
                          profile.name,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (profileProvider.isPremium) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.workspace_premium, color: Colors.white, size: 14),
                              SizedBox(width: 4),
                              Text('PREMIUM', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0EA5E9).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      profile.fitnessLevelLabel,
                      style: const TextStyle(color: Color(0xFF0EA5E9), fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ).animate().fade(duration: 500.ms).scale(begin: const Offset(0.8, 0.8)),
            const SizedBox(height: 32),

            // Health Info Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              childAspectRatio: 1.5,
              children: [
                _buildInfoCard('Giới tính', profile.gender.tr(), Icons.person),
                _buildInfoCard('Tuổi', profile.dob, Icons.cake), // Hiển thị ngày sinh tạm
                _buildInfoCard('Chiều cao', '${profile.height.round()} cm', Icons.height),
                _buildInfoCard('Cân nặng', '${profile.weight.round()} kg', Icons.monitor_weight),
              ],
            ).animate(delay: 200.ms).fade().slideY(begin: 0.2, end: 0),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('t_b43f6829'.tr(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: () {
                    _showUpdateWeightDialog(context);
                  },
                  icon: const Icon(Icons.add, color: Color(0xFF10B981), size: 18),
                  label: Text('t_3b7db4b6'.tr(), style: const TextStyle(color: Color(0xFF10B981))),
                )
              ],
            ),
            const ProgressScreen(),
            const SizedBox(height: 32),

            // Settings & Actions
            Align(
              alignment: Alignment.centerLeft,
              child: Text('t_1a691070'.tr(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            if (!profileProvider.isPremium)
              _buildActionTile(
                icon: Icons.workspace_premium,
                title: 'Nâng cấp Premium',
                color: const Color(0xFFF59E0B),
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const PremiumScreen()));
                },
              ),
            _buildActionTile(
              icon: Icons.edit,
              title: 't_a94c9158'.tr(),
              color: Colors.white,
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const UpdateProfileScreen()));
              },
            ),
            _buildActionTile(
              icon: Icons.language,
              title: 't_37ac7bf2'.tr(),
              color: Colors.white,
              onTap: () {
                showModalBottomSheet(
                  context: context,
                  backgroundColor: const Color(0xFF1E293B),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                  builder: (context) {
                    return SafeArea(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(height: 16),
                          Text('t_37ac7bf2'.tr(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 16),
                          ListTile(
                            title: Text('t_e6a72e0a'.tr()),
                            trailing: context.locale.languageCode == 'vi' ? const Icon(Icons.check, color: Color(0xFF10B981)) : null,
                            onTap: () {
                              context.setLocale(const Locale('vi'));
                              Navigator.pop(context);
                            },
                          ),
                          ListTile(
                            title: Text('t_f759fe35'.tr()),
                            trailing: context.locale.languageCode == 'en' ? const Icon(Icons.check, color: Color(0xFF10B981)) : null,
                            onTap: () {
                              context.setLocale(const Locale('en'));
                              Navigator.pop(context);
                            },
                          ),
                        ],
                      ),
                    );
                  }
                );
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.1),
                  foregroundColor: const Color(0xFFEF4444),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.logout),
                label: Text('t_4236a440'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                onPressed: () => _logout(context),
              ),
            ),
            const SizedBox(height: 32),
            Text('t_037545fc'.tr(), style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFF8B5CF6), size: 24),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildActionTile({required IconData icon, required String title, required Color color, required VoidCallback onTap}) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color),
      ),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      trailing: const Icon(Icons.arrow_forward_ios, color: Colors.grey, size: 16),
      onTap: onTap,
    );
  }
}
