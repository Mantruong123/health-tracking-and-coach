import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/profile_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:line_icons/line_icons.dart';

import '../services/notification_service.dart';
import 'active_workout_screen.dart';

class MobileDashboardScreen extends StatefulWidget {
  const MobileDashboardScreen({super.key});

  @override
  State<MobileDashboardScreen> createState() => _MobileDashboardScreenState();
}

class _MobileDashboardScreenState extends State<MobileDashboardScreen> {
  bool _remindersEnabled = false;
  TimeOfDay _reminderTime = const TimeOfDay(hour: 17, minute: 0);

  @override
  void initState() {
    super.initState();
    NotificationService().init();
  }

  String _getTodayKey() {
    final now = DateTime.now();
    switch (now.weekday) {
      case 1: return "Thứ 2";
      case 2: return "Thứ 3";
      case 3: return "Thứ 4";
      case 4: return "Thứ 5";
      case 5: return "Thứ 6";
      case 6: return "Thứ 7";
      case 7: return "Chủ Nhật";
      default: return "Thứ 2";
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    final profile = profileProvider.profile;

    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text(
          't_4309da38'.tr(),
          style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: -0.5, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: profileProvider.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4)))
          : profile == null
              ? Center(child: Text('t_89903ba3'.tr(), style: const TextStyle(color: Colors.white)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // AI Welcome Banner
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF8B5CF6),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Chào ${profile.name}! 👋',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'AuraFit AI đã gom cụm thể trạng của bạn vào nhóm "${profile.fitnessLevelLabel}". Lịch tập và chế độ dinh dưỡng đã sẵn sàng.',
                              style: const TextStyle(fontSize: 14, color: Colors.white, height: 1.4),
                            ),
                          ],
                        ),
                      ).animate().fade(duration: 500.ms).slideY(begin: 0.2, end: 0),
                      const SizedBox(height: 24),

                      // Health stats cards
                      Text(
                        't_5a466031'.tr(),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Card(
                              color: const Color(0xFF0F172A),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('t_2c31b3cd'.tr(), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                    const SizedBox(height: 6),
                                    Text('${profile.bmi}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF06B6D4))),
                                    const SizedBox(height: 4),
                                    Text(profile.bmiStatus.tr(), style: TextStyle(color: profile.bmi < 18.5 || profile.bmi > 25 ? Colors.orange : Colors.green, fontSize: 11)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Card(
                              color: const Color(0xFF0F172A),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('t_11627437'.tr(), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                    const SizedBox(height: 6),
                                    Text('${profile.targetCalories} kcal', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                                    const SizedBox(height: 4),
                                    Text('TDEE: ${profile.tdee}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ).animate(delay: 200.ms).fade(duration: 500.ms).slideY(begin: 0.2, end: 0),
                      const SizedBox(height: 24),

                      // Workout routines list card
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            't_975efe0e'.tr(),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Text(
                            _getTodayKey(),
                            style: const TextStyle(color: Color(0xFF06B6D4), fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Builder(builder: (context) {
                        final todayExercises = profile.workoutSchedule[_getTodayKey()] ?? [];
                        if (todayExercises.isEmpty) {
                          return Card(
                            color: const Color(0xFF0F172A),
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Center(
                                child: Text('t_a45efa1e'.tr(), style: const TextStyle(color: Colors.white)),
                              ),
                            ),
                          );
                        }

                        return ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: todayExercises.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final ex = todayExercises[index];
                            return ListTile(
                              tileColor: const Color(0xFF0F172A),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              leading: const Icon(LineIcons.dumbbell, color: Color(0xFF06B6D4), size: 28),
                              title: Text(ex.name.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              subtitle: Text('${ex.recommendedSetsReps} | ${ex.muscleGroup} | ${_translateDifficulty(ex.difficulty)}', style: const TextStyle(color: Colors.grey)),
                              trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ActiveWorkoutScreen(
                                      day: _getTodayKey(),
                                      exercises: todayExercises,
                                    ),
                                  ),
                                );
                              },
                            ).animate(delay: (400 + index * 100).ms).fade().slideX(begin: 0.1, end: 0);
                          },
                        );
                      }),
                      const SizedBox(height: 24),

                      // Reminders toggle
                      Card(
                        color: const Color(0xFF0F172A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            SwitchListTile(
                              title: Text('t_0986f16f'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              subtitle: Text('Gửi thông báo đẩy lúc ${_reminderTime.hour.toString().padLeft(2, '0')}:${_reminderTime.minute.toString().padLeft(2, '0')}', style: const TextStyle(color: Colors.grey)),
                              value: _remindersEnabled,
                              activeThumbColor: const Color(0xFF8B5CF6),
                              onChanged: (bool value) {
                                setState(() {
                                  _remindersEnabled = value;
                                });
                                if (value) {
                                  NotificationService().scheduleDailyReminder(context, hour: _reminderTime.hour, minute: _reminderTime.minute);
                                } else {
                                  NotificationService().cancelAllReminders();
                                }
                              },
                            ),
                            if (_remindersEnabled)
                              ListTile(
                                leading: const Icon(Icons.access_time, color: Colors.grey),
                                title: Text('t_26030230'.tr(), style: const TextStyle(color: Colors.white)),
                                trailing: TextButton(
                                  style: TextButton.styleFrom(
                                    backgroundColor: const Color(0xFF1E293B),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  onPressed: () async {
                                    final TimeOfDay? picked = await showTimePicker(
                                      context: context,
                                      initialTime: _reminderTime,
                                      builder: (context, child) {
                                        return Theme(
                                          data: ThemeData.dark().copyWith(
                                            colorScheme: const ColorScheme.dark(
                                              primary: Color(0xFF8B5CF6),
                                              onPrimary: Colors.white,
                                              surface: Color(0xFF1E293B),
                                              onSurface: Colors.white,
                                            ),
                                          ),
                                          child: child!,
                                        );
                                      },
                                    );
                                    if (picked != null && picked != _reminderTime) {
                                      setState(() {
                                        _reminderTime = picked;
                                      });
                                      NotificationService().scheduleDailyReminder(context, hour: picked.hour, minute: picked.minute);
                                    }
                                  },
                                  child: Text(
                                    '${_reminderTime.hour.toString().padLeft(2, '0')}:${_reminderTime.minute.toString().padLeft(2, '0')}', 
                                    style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 16, fontWeight: FontWeight.bold)
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ).animate(delay: 800.ms).fade().scale(begin: const Offset(0.9, 0.9)),
                    ],
                  ),
                ),
    );
  } // Added closing bracket for the build method

  String _translateDifficulty(String diff) {
    switch (diff) {
      case 'beginner': return 'Sơ cấp';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Cao cấp';
      default: return diff;
    }
  }
}

