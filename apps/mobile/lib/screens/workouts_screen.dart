import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/profile_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'active_workout_screen.dart';

class WorkoutsScreen extends StatefulWidget {
  const WorkoutsScreen({super.key});

  @override
  State<WorkoutsScreen> createState() => _WorkoutsScreenState();
}

class _WorkoutsScreenState extends State<WorkoutsScreen> {
  final List<String> _days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  String _selectedDay = "Thứ 2";

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDay = _days[now.weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    final profile = profileProvider.profile;

    if (profile == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF080C14),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4))),
      );
    }

    final dailyExercises = profile.workoutSchedule[_selectedDay] ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text('t_dbd46100'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Days selector
          Container(
            height: 70,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _days.length,
              itemBuilder: (context, index) {
                final day = _days[index];
                final isSelected = day == _selectedDay;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedDay = day;
                    });
                  },
                  child: Container(
                    margin: EdgeInsets.only(left: index == 0 ? 16 : 8, right: index == _days.length - 1 ? 16 : 0),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0EA5E9).withValues(alpha: 0.2) : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0EA5E9) : const Color(0xFF1E293B),
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      day,
                      style: TextStyle(
                        color: isSelected ? const Color(0xFF0EA5E9) : Colors.grey,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              },
            ),
          ).animate().fade().slideY(begin: -0.2, end: 0),

          // Exercise List
          Expanded(
            child: dailyExercises.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.weekend, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text('t_afddcbac'.tr(), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text('t_e0447117'.tr(), style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ).animate().fade(duration: 500.ms).scale(begin: const Offset(0.9, 0.9))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: dailyExercises.length,
                    itemBuilder: (context, index) {
                      final ex = dailyExercises[index];
                      return Card(
                        color: const Color(0xFF0F172A),
                        margin: const EdgeInsets.only(bottom: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: ExpansionTile(
                          iconColor: const Color(0xFF06B6D4),
                          collapsedIconColor: Colors.grey,
                          leading: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(child: Text(ex.emoji, style: const TextStyle(fontSize: 24))),
                          ),
                          title: Text(ex.name.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          subtitle: Text('${ex.recommendedSetsReps} | ${ex.caloriesEstimated} kcal', style: const TextStyle(color: Colors.grey)),
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      _buildTag(ex.muscleGroup, const Color(0xFF8B5CF6)),
                                      const SizedBox(width: 8),
                                      _buildTag(_translateDifficulty(ex.difficulty), const Color(0xFF10B981)),
                                      const SizedBox(width: 8),
                                      _buildTag(ex.equipment, const Color(0xFFF59E0B)),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  Text('t_712bf560'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                  const SizedBox(height: 8),
                                  Text(
                                    ex.description,
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), height: 1.5),
                                  ),
                                  const SizedBox(height: 16),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF06B6D4).withValues(alpha: 0.2),
                                        foregroundColor: const Color(0xFF06B6D4),
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => ActiveWorkoutScreen(
                                              day: _selectedDay,
                                              exercises: dailyExercises,
                                              initialIndex: index,
                                            ),
                                          ),
                                        );
                                      },
                                      child: Text('t_a6f13921'.tr()),
                                    ),
                                  )
                                ],
                              ),
                            )
                          ],
                        ),
                      ).animate(delay: (200 + index * 100).ms).fade().slideX(begin: 0.1, end: 0);
                    },
                  ),
          )
        ],
      ),
    );
  }

  Widget _buildTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  String _translateDifficulty(String diff) {
    switch (diff) {
      case 'beginner': return 'Sơ cấp';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Cao cấp';
      default: return diff;
    }
  }
}
