class ExerciseLogModel {
  final int id;
  final int workoutLogId;
  final int exerciseId;
  final int setsCompleted;
  final int repsCompleted;
  final double weightKg;

  ExerciseLogModel({
    required this.id,
    required this.workoutLogId,
    required this.exerciseId,
    required this.setsCompleted,
    required this.repsCompleted,
    required this.weightKg,
  });

  factory ExerciseLogModel.fromJson(Map<String, dynamic> json) {
    return ExerciseLogModel(
      id: json['id'] ?? 0,
      workoutLogId: json['workout_log_id'] ?? 0,
      exerciseId: json['exercise_id'] ?? 0,
      setsCompleted: json['sets_completed'] ?? 0,
      repsCompleted: json['reps_completed'] ?? 0,
      weightKg: (json['weight_kg'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'exercise_id': exerciseId,
      'sets_completed': setsCompleted,
      'reps_completed': repsCompleted,
      'weight_kg': weightKg,
    };
  }
}

class WorkoutLogModel {
  final int id;
  final String date;
  final int durationMinutes;
  final int caloriesBurned;
  final String? notes;
  final List<ExerciseLogModel> exercises;

  WorkoutLogModel({
    required this.id,
    required this.date,
    required this.durationMinutes,
    required this.caloriesBurned,
    this.notes,
    required this.exercises,
  });

  factory WorkoutLogModel.fromJson(Map<String, dynamic> json) {
    var exList = json['exercises'] as List? ?? [];
    return WorkoutLogModel(
      id: json['id'] ?? 0,
      date: json['date'] ?? '',
      durationMinutes: json['duration_minutes'] ?? 0,
      caloriesBurned: json['calories_burned'] ?? 0,
      notes: json['notes'],
      exercises: exList.map((e) => ExerciseLogModel.fromJson(e)).toList(),
    );
  }
}

class BodyMeasurementModel {
  final int id;
  final String date;
  final double weight;
  final double? bodyFatPercentage;

  BodyMeasurementModel({
    required this.id,
    required this.date,
    required this.weight,
    this.bodyFatPercentage,
  });

  factory BodyMeasurementModel.fromJson(Map<String, dynamic> json) {
    return BodyMeasurementModel(
      id: json['id'] ?? 0,
      date: json['date'] ?? '',
      weight: (json['weight'] ?? 0).toDouble(),
      bodyFatPercentage: json['body_fat_percentage'] != null ? (json['body_fat_percentage'] as num).toDouble() : null,
    );
  }
}
