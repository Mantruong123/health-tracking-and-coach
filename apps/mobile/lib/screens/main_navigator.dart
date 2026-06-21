import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/profile_provider.dart';
import '../providers/progress_provider.dart';
import 'dashboard_screen.dart';
import 'workouts_screen.dart';
import 'nutrition_screen.dart';
import 'profile_screen.dart';

import 'package:easy_localization/easy_localization.dart';

class MainNavigator extends StatefulWidget {
  const MainNavigator({super.key});

  @override
  _MainNavigatorState createState() => _MainNavigatorState();
}

class _MainNavigatorState extends State<MainNavigator> {
  int _selectedIndex = 0;

  static const List<Widget> _widgetOptions = <Widget>[
    MobileDashboardScreen(),
    WorkoutsScreen(),
    NutritionScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      if (token != null) {
        Provider.of<ProfileProvider>(context, listen: false).fetchProfile(token);
        Provider.of<ProgressProvider>(context, listen: false).fetchProgressData(token);
      }
    });
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: _widgetOptions.elementAt(_selectedIndex),
      bottomNavigationBar: BottomNavigationBar(
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard),
            label: 't_dc7161be'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.fitness_center),
            label: 't_510117ab'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.restaurant),
            label: 't_0595a756'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.person),
            label: 't_7d97481b'.tr(),
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: const Color(0xFF0EA5E9),
        unselectedItemColor: Colors.grey,
        backgroundColor: const Color(0xFF1E293B),
        type: BottomNavigationBarType.fixed,
        onTap: _onItemTapped,
      ),
    );
  }
}
