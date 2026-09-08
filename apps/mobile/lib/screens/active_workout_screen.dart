import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../models/profile_model.dart';
import '../providers/auth_provider.dart';
import 'package:line_icons/line_icons.dart';
import '../providers/progress_provider.dart';
import '../providers/profile_provider.dart';
import 'ai_camera_screen.dart';
import 'premium_screen.dart';

class ActiveWorkoutScreen extends StatefulWidget {
  final String day;
  final List<ExerciseModel> exercises;
  final int initialIndex;

  const ActiveWorkoutScreen({super.key, required this.day, required this.exercises, this.initialIndex = 0});

  @override
  State<ActiveWorkoutScreen> createState() => _ActiveWorkoutScreenState();
}

class _ActiveWorkoutScreenState extends State<ActiveWorkoutScreen> {
  late int _currentExerciseIndex;
  
  // Timer state
  int _restSeconds = 0;
  Timer? _timer;
  
  // Input state: [exerciseIndex][setIndex] -> {reps, weight}
  late List<List<Map<String, double>>> _loggedSets;
  final DateTime _startTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _currentExerciseIndex = widget.initialIndex;
    _loggedSets = widget.exercises.map((ex) {
      // Parse recommended sets, e.g. "3 sets x 12 reps" -> default to 3
      int sets = 3; 
      if (ex.recommendedSetsReps.contains('x') || ex.recommendedSetsReps.contains('hiệp')) {
        final match = RegExp(r'\d+').firstMatch(ex.recommendedSetsReps);
        if (match != null) {
          sets = int.tryParse(match.group(0)!) ?? 3;
        }
      }
      return List.generate(sets, (index) => {"reps": 0.0, "weight": 0.0, "completed": 0.0});
    }).toList();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startRestTimer(int seconds) {
    _timer?.cancel();
    setState(() {
      _restSeconds = seconds;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_restSeconds > 0) {
        setState(() {
          _restSeconds--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _finishWorkout() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    if (token == null) return;

    final duration = DateTime.now().difference(_startTime).inMinutes;
    int totalCalories = 0;
    List<Map<String, dynamic>> exLogs = [];

    for (int i = 0; i < widget.exercises.length; i++) {
      final ex = widget.exercises[i];
      final sets = _loggedSets[i];
      
      int completedSets = sets.where((s) => s["completed"] == 1.0).length;
      if (completedSets > 0) {
        double avgReps = sets.map((s) => s["reps"]!).reduce((a, b) => a + b) / sets.length;
        double maxWeight = sets.map((s) => s["weight"]!).reduce((a, b) => a > b ? a : b);
        
        exLogs.add({
          "exercise_id": ex.id,
          "sets_completed": completedSets,
          "reps_completed": avgReps.round(),
          "weight_kg": maxWeight
        });
        totalCalories += (ex.caloriesEstimated * (completedSets / sets.length)).round();
      }
    }

    final success = await Provider.of<ProgressProvider>(context, listen: false).saveWorkoutLog(
      token, duration, totalCalories, exLogs
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_702e352d'.tr())));
      Navigator.pop(context); // Trở về màn hình trước
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('t_1a7f9079'.tr())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.exercises.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFF080C14),
        appBar: AppBar(title: Text('t_ed2a0aa3'.tr())),
        body: Center(child: Text('t_79e81a56'.tr(), style: const TextStyle(color: Colors.white))),
      );
    }

    final ex = widget.exercises[_currentExerciseIndex];
    final currentSets = _loggedSets[_currentExerciseIndex];
    bool isHold = ex.recommendedSetsReps.toLowerCase().contains('giây') || 
                  ex.recommendedSetsReps.toLowerCase().contains('giữ') || 
                  ex.name.toLowerCase().contains('plank') || 
                  ex.name.toLowerCase().contains('wall sit');

    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text('Buổi tập ${widget.day}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _finishWorkout,
            child: Text('t_144f8bdc'.tr(), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
          )
        ],
      ),
      body: Column(
        children: [
          // Timer Bar
          if (_restSeconds > 0)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              color: const Color(0xFF0EA5E9).withValues(alpha: 0.2),
              child: Center(
                child: Text(
                  'Nghỉ ngơi: ${(_restSeconds ~/ 60).toString().padLeft(2, '0')}:${(_restSeconds % 60).toString().padLeft(2, '0')}',
                  style: const TextStyle(color: Color(0xFF0EA5E9), fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            
          // Exercise Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 60, height: 60,
                  decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(16)),
                  child: const Center(child: Icon(LineIcons.dumbbell, color: Color(0xFF06B6D4), size: 32)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ex.name.tr(), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(ex.recommendedSetsReps.replaceAll('hiệp', 'hiệp'.tr()).replaceAll('lần', 'lần'.tr()), style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          

          
          // Sets list
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: currentSets.length,
              separatorBuilder: (context, index) => const Divider(color: Color(0xFF1E293B)),
              itemBuilder: (context, setIndex) {
                final set = currentSets[setIndex];
                final isCompleted = set["completed"] == 1.0;
                
                return Row(
                  children: [
                    Text('Hiệp ${setIndex + 1}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 't_ebe86682'.tr(), hintStyle: const TextStyle(color: Colors.grey),
                          border: const UnderlineInputBorder(),
                        ),
                        onChanged: (val) => set["weight"] = double.tryParse(val) ?? 0.0,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: isHold ? 'Giây' : 't_25832fb3'.tr(), hintStyle: const TextStyle(color: Colors.grey),
                          border: const UnderlineInputBorder(),
                        ),
                        onChanged: (val) => set["reps"] = double.tryParse(val) ?? 0.0,
                      ),
                    ),
                    const SizedBox(width: 16),
                    IconButton(
                      icon: Icon(isCompleted ? Icons.check_circle : Icons.check_circle_outline),
                      color: isCompleted ? const Color(0xFF10B981) : Colors.grey,
                      onPressed: () {
                        setState(() {
                          set["completed"] = isCompleted ? 0.0 : 1.0;
                          if (set["completed"] == 1.0) {
                            _startRestTimer(60); // 60s rest
                          }
                        });
                      },
                    )
                  ],
                );
              },
            ),
          ),
          
          // Nút AI Camera nổi bật
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.workspace_premium, color: Colors.white),
                label: Text('t_ea5765ee'.tr(), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 5,
                  shadowColor: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                ),
                onPressed: () async {
                  final profileProvider = Provider.of<ProfileProvider>(context, listen: false);
                  
                  if (!profileProvider.isPremium) {
                    if (profileProvider.freeTrialsLeft > 0) {
                      profileProvider.useFreeTrial();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Bạn còn ${profileProvider.freeTrialsLeft} lượt dùng thử AI Camera (PRO)'),
                          backgroundColor: const Color(0xFFF59E0B),
                        ),
                      );
                    } else {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const PremiumScreen()),
                      );
                      return;
                    }
                  }

                  // Find current unfinished set
                  final currentSetIndex = currentSets.indexWhere((set) => set["completed"] == 0.0);
                  if (currentSetIndex == -1) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bạn đã hoàn thành tất cả các hiệp!')));
                    return;
                  }
                  
                  final currentSet = currentSets[currentSetIndex];
                  final targetReps = (currentSet["reps"] as num?)?.toInt() ?? 0;
                  final targetWeight = (currentSet["weight"] as num?)?.toDouble();

                  if (targetReps <= 0) {
                     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                       content: Text(isHold ? 'Vui lòng nhập số Giây cho Hiệp ${currentSetIndex + 1} ở trên trước khi dùng AI' : 'Vui lòng nhập số Reps cho Hiệp ${currentSetIndex + 1} ở trên trước khi dùng AI'),
                       backgroundColor: Colors.redAccent,
                     ));
                     return;
                  }

                  final reps = await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => AiCameraScreen(
                      exerciseName: ex.name, 
                      isHold: isHold,
                      targetReps: targetReps,
                      targetWeight: targetWeight,
                    )),
                  );
                  if (reps != null && reps is int && reps > 0) {
                    for (int i = 0; i < currentSets.length; i++) {
                      if (currentSets[i]["completed"] == 0.0) {
                        setState(() {
                          currentSets[i]["reps"] = reps.toDouble();
                          currentSets[i]["completed"] = 1.0;
                          _startRestTimer(60);
                        });
                        break;
                      }
                    }
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('AI đã ghi nhận $reps lần tập!')),
                    );
                  }
                },
              ),
            ),
          ),
          
          // Navigation
          Container(
            padding: const EdgeInsets.all(20),
            color: const Color(0xFF0F172A),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                  onPressed: _currentExerciseIndex > 0 ? () {
                    setState(() => _currentExerciseIndex--);
                  } : null,
                  child: Text('t_a39183cc'.tr()),
                ),
                Text('${_currentExerciseIndex + 1} / ${widget.exercises.length}', style: const TextStyle(color: Colors.white)),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6)),
                  onPressed: _currentExerciseIndex < widget.exercises.length - 1 ? () {
                    setState(() => _currentExerciseIndex++);
                  } : null,
                  child: Text('t_8cb00cf7'.tr(), style: const TextStyle(color: Colors.white)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
