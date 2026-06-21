import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/profile_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';

class NutritionScreen extends StatelessWidget {
  const NutritionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    final profile = profileProvider.profile;

    if (profile == null || profile.nutritionPlan == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF080C14),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
      );
    }

    final nutrition = profile.nutritionPlan!;

    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      appBar: AppBar(
        title: Text('t_b0923212'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Macros Summary Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  Text('Mục tiêu: ${profile.targetCalories} kcal/ngày', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildMacroIndicator('Protein', '${nutrition.protein}g', const Color(0xFF3B82F6)),
                      _buildMacroIndicator('Carb', '${nutrition.carbs}g', const Color(0xFF10B981)),
                      _buildMacroIndicator('Fat', '${nutrition.fat}g', const Color(0xFFF59E0B)),
                    ],
                  ),
                ],
              ),
            ).animate().fade(duration: 500.ms).scale(begin: const Offset(0.8, 0.8)),
            const SizedBox(height: 24),

            Text('t_50e6e4b3'.tr(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 12),

            // Meals List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: nutrition.meals.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final meal = nutrition.meals[index];
                IconData mealIcon;
                Color mealColor;

                if (meal.type.contains("Sáng")) {
                  mealIcon = Icons.wb_sunny;
                  mealColor = const Color(0xFFFBBF24);
                } else if (meal.type.contains("Trưa")) {
                  mealIcon = Icons.restaurant;
                  mealColor = const Color(0xFFEF4444);
                } else if (meal.type.contains("Tối")) {
                  mealIcon = Icons.nights_stay;
                  mealColor = const Color(0xFF8B5CF6);
                } else {
                  mealIcon = Icons.local_cafe;
                  mealColor = const Color(0xFF10B981);
                }

                return Card(
                  color: const Color(0xFF0F172A),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: mealColor.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(mealIcon, color: mealColor),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(meal.type, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text(meal.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('${meal.cal}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 16)),
                            Text('t_7bf6fc1d'.tr(), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ).animate(delay: (300 + index * 100).ms).fade().slideX(begin: 0.1, end: 0);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMacroIndicator(String title, String value, Color color) {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 4),
          ),
          child: Center(
            child: Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 8),
        Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
