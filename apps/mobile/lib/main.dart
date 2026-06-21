import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/profile_provider.dart';
import 'providers/progress_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/main_navigator.dart';
import 'screens/onboarding_screen.dart';

import 'services/notification_service.dart';

import 'package:easy_localization/easy_localization.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  await NotificationService().init();
  
  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('vi'), Locale('en')],
      path: 'assets/translations',
      fallbackLocale: const Locale('vi'),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => ProfileProvider()),
          ChangeNotifierProvider(create: (_) => ProgressProvider()),
        ],
        child: const AuraFitApp(),
      ),
    ),
  );
}

class AuraFitApp extends StatelessWidget {
  const AuraFitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 't_9c3840f8'.tr(),
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF8B5CF6), // Neon Violet
        scaffoldBackgroundColor: const Color(0xFF080C14),
        textTheme: GoogleFonts.outfitTextTheme(Theme.of(context).textTheme).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFF06B6D4), // Electric Cyan
          surface: Color(0xFF0F172A),
        ),
      ),
      home: Consumer<AuthProvider>(
        builder: (context, auth, child) {
          if (auth.isAuthenticated) {
            if (auth.hasProfile) {
              return const MainNavigator(); // Đã có profile -> Dashboard
            } else {
              return const OnboardingScreen(); // Chưa có profile -> Khảo sát
            }
          }
          return const LoginScreen(); // Trả về màn Login mặc định nếu chưa đăng nhập
        },
      ),
    );
  }
}
