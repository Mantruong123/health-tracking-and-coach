import 'dart:convert';

class ExerciseModel {
  final int id;
  final String name;
  final String muscleGroup;
  final String difficulty;
  final String equipment;
  final String recommendedSetsReps;
  final int caloriesEstimated;
  final String emoji;
  final String description;

  ExerciseModel({
    required this.id,
    required this.name,
    required this.muscleGroup,
    required this.difficulty,
    required this.equipment,
    required this.recommendedSetsReps,
    required this.caloriesEstimated,
    required this.emoji,
    required this.description,
  });

  factory ExerciseModel.fromJson(Map<String, dynamic> json) {
    return ExerciseModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      muscleGroup: json['muscle_group'] ?? '',
      difficulty: json['difficulty'] ?? '',
      equipment: json['equipment'] ?? '',
      recommendedSetsReps: json['recommended_sets_reps'] ?? '',
      caloriesEstimated: json['calories_estimated'] ?? 0,
      emoji: json['emoji'] ?? '💪',
      description: json['description'] ?? '',
    );
  }
}

class MealModel {
  final String type;
  final String name;
  final int cal;

  MealModel({required this.type, required this.name, required this.cal});

  factory MealModel.fromJson(Map<String, dynamic> json) {
    return MealModel(
      type: json['type'] ?? '',
      name: json['name'] ?? '',
      cal: json['cal'] ?? 0,
    );
  }
}

class NutritionPlanModel {
  final int protein;
  final int carbs;
  final int fat;
  final List<MealModel> meals;

  NutritionPlanModel({
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.meals,
  });

  factory NutritionPlanModel.fromJson(Map<String, dynamic> json) {
    final macros = json['macros'] ?? {};
    final mealsList = (json['meals'] as List<dynamic>?) ?? [];
    
    return NutritionPlanModel(
      protein: macros['protein'] ?? 0,
      carbs: macros['carbs'] ?? 0,
      fat: macros['fat'] ?? 0,
      meals: mealsList.map((m) => MealModel.fromJson(m)).toList(),
    );
  }
}

class ProfileModel {
  final int id;
  final String name;
  final String? avatarUrl;
  final String dob;
  final String gender;
  final double height;
  final double weight;
  final String goal;
  final String equipment;
  final String experience;
  final double bmi;
  final String bmiStatus;
  final String fitnessLevelLabel;
  final int bmr;
  final int tdee;
  final int targetCalories;
  
  final Map<String, List<ExerciseModel>> workoutSchedule;
  final NutritionPlanModel? nutritionPlan;

  ProfileModel({
    required this.id,
    required this.name,
    this.avatarUrl,
    required this.dob,
    required this.gender,
    required this.height,
    required this.weight,
    required this.goal,
    required this.equipment,
    required this.experience,
    required this.bmi,
    required this.bmiStatus,
    required this.fitnessLevelLabel,
    required this.bmr,
    required this.tdee,
    required this.targetCalories,
    required this.workoutSchedule,
    this.nutritionPlan,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    // Parse workout schedule
    Map<String, List<ExerciseModel>> schedule = {};
    if (json['workout_schedule'] != null && json['workout_schedule'] is String) {
      try {
        final Map<String, dynamic> parsedSchedule = jsonDecode(json['workout_schedule']);
        parsedSchedule.forEach((day, exercises) {
          if (exercises is List) {
            schedule[day] = exercises.map((e) => ExerciseModel.fromJson(e)).toList();
          }
        });
      } catch (e) {
        print("Lỗi parse workout_schedule: \$e");
      }
    }

    // Parse nutrition plan
    NutritionPlanModel? nutrition;
    if (json['nutrition_plan'] != null && json['nutrition_plan'] is String) {
      try {
        final parsedNutrition = jsonDecode(json['nutrition_plan']);
        nutrition = NutritionPlanModel.fromJson(parsedNutrition);
      } catch (e) {
        print("Lỗi parse nutrition_plan: \$e");
      }
    }

    return ProfileModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      avatarUrl: json['avatar_url'],
      dob: json['dob'] ?? '',
      gender: json['gender'] ?? '',
      height: (json['height'] ?? 0).toDouble(),
      weight: (json['weight'] ?? 0).toDouble(),
      goal: json['goal'] ?? '',
      equipment: json['equipment'] ?? 'Không có thiết bị',
      experience: json['experience'] ?? 'Mới bắt đầu',
      bmi: (json['bmi'] ?? 0).toDouble(),
      bmiStatus: json['bmi_status'] ?? '',
      fitnessLevelLabel: json['fitness_level_label'] ?? '',
      bmr: json['bmr'] ?? 0,
      tdee: json['tdee'] ?? 0,
      targetCalories: json['target_calories'] ?? 0,
      workoutSchedule: schedule,
      nutritionPlan: nutrition,
    );
  }
}
