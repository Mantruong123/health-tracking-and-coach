import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/profile_provider.dart';
import '../providers/auth_provider.dart';
import 'package:url_launcher/url_launcher.dart';
class PremiumScreen extends StatefulWidget {
  const PremiumScreen({super.key});

  @override
  State<PremiumScreen> createState() => _PremiumScreenState();
}

class _PremiumScreenState extends State<PremiumScreen> with WidgetsBindingObserver {
  bool _isCheckingPayment = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final profileProvider = Provider.of<ProfileProvider>(context, listen: false);
      if (auth.token != null && !profileProvider.isPremium && !_isCheckingPayment) {
        _checkStatus(profileProvider, auth.token!);
      }
    }
  }

  Future<void> _checkStatus(ProfileProvider profileProvider, String token) async {
    if (!mounted) return;
    setState(() => _isCheckingPayment = true);
    await profileProvider.checkPaymentStatus(token);
    if (mounted) {
      setState(() => _isCheckingPayment = false);
      if (profileProvider.isPremium) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nâng cấp Premium thành công!'), backgroundColor: Colors.green),
        );
        if (ModalRoute.of(context)?.isCurrent == true) {
          Navigator.pop(context); // Đóng màn hình Premium an toàn
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    
    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Background Gradient
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                    blurRadius: 100,
                    spreadRadius: 50,
                  )
                ],
              ),
            ),
          ),
          
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  // Crown Icon
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                    ),
                    child: const Icon(Icons.workspace_premium, size: 64, color: Color(0xFFF59E0B)),
                  ).animate().scale(duration: 500.ms, curve: Curves.easeOutBack),
                  
                  const SizedBox(height: 24),
                  Text(
                    't_06b55405'.tr(),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                  ).animate().fade().slideY(begin: 0.5),
                  
                  const SizedBox(height: 8),
                  Text(
                    't_3db47fc0'.tr(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ).animate().fade(delay: 200.ms),
                  
                  const SizedBox(height: 40),
                  
                  // Features List
                  _buildFeatureRow(Icons.camera_alt, 'AI Camera Pose Tracking không giới hạn', 300),
                  _buildFeatureRow(Icons.restaurant_menu, 'Mở khóa Chế độ ăn kiêng nâng cao (Keto, Eat Clean)', 400),
                  _buildFeatureRow(Icons.analytics, 'Phân tích chỉ số cơ thể chuyên sâu', 500),
                  _buildFeatureRow(Icons.block, 'Loại bỏ hoàn toàn quảng cáo', 600),
                  
                  const Spacer(),
                  
                  // Pricing Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF8B5CF6), Color(0xFF06B6D4)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('t_eb059eb7'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 14)),
                            Text('t_f9c1826f'.tr(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('t_95a70f8a'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ).animate().fade(delay: 700.ms).slideY(begin: 0.5),
                  
                  const SizedBox(height: 24),
                  
                  // Upgrade Button
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF008FE5), // ZaloPay Blue
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 5,
                        shadowColor: const Color(0xFF008FE5).withValues(alpha: 0.5),
                      ),
                      onPressed: _isCheckingPayment ? null : () {
                        _handlePayment(context);
                      },
                      child: _isCheckingPayment 
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Thanh toán bằng ZaloPay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ).animate().fade(delay: 800.ms).scale(),
                  
                  const SizedBox(height: 16),
                  Text('t_28437da0'.tr(), style: const TextStyle(color: Colors.grey, decoration: TextDecoration.underline)),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String text, int delayMs) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF06B6D4), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.4)),
          )
        ],
      ).animate().fade(delay: delayMs.ms).slideX(begin: 0.2),
    );
  }

  void _handlePayment(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final profileProvider = Provider.of<ProfileProvider>(context, listen: false);
    if (auth.token == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const PopScope(
        canPop: false,
        child: Center(child: CircularProgressIndicator(color: Color(0xFF008FE5))),
      ),
    );

    final payUrl = await profileProvider.createZaloPayPayment(auth.token!);
    
    // Tắt loading an toàn
    if (mounted) Navigator.of(context, rootNavigator: true).pop(); 

    if (payUrl != null) {
      final uri = Uri.parse(payUrl);
      try {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        
        // Vẫn giữ timeout 15 giây dự phòng nếu user không chuyển về app
        Future.delayed(const Duration(seconds: 15), () {
           if (mounted && !profileProvider.isPremium) {
             _checkStatus(profileProvider, auth.token!);
           }
        });
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Không thể mở trang thanh toán ZaloPay')));
        }
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(profileProvider.errorMessage), backgroundColor: Colors.red),
        );
      }
    }
  }
}

