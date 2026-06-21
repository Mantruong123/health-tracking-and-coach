import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/progress_provider.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final progressProvider = Provider.of<ProgressProvider>(context);
    final measurements = progressProvider.measurements;

    if (progressProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (measurements.isEmpty) {
      return Center(child: Text('t_c3525a7e'.tr(), style: const TextStyle(color: Colors.white)));
    }

    // Sort by date ascending
    final sortedMeasurements = List.of(measurements)..sort((a, b) => DateTime.parse(a.date).compareTo(DateTime.parse(b.date)));

    List<FlSpot> spots = [];
    double minWeight = sortedMeasurements.first.weight;
    double maxWeight = sortedMeasurements.first.weight;

    for (int i = 0; i < sortedMeasurements.length; i++) {
      final m = sortedMeasurements[i];
      if (m.weight < minWeight) minWeight = m.weight;
      if (m.weight > maxWeight) maxWeight = m.weight;
      spots.add(FlSpot(i.toDouble(), m.weight));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('t_e5d70a66'.tr(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 16),
        Container(
          height: 200,
          padding: const EdgeInsets.only(right: 16, left: 0, top: 16, bottom: 0),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 22,
                    interval: 1,
                    getTitlesWidget: (value, meta) {
                      if (value.toInt() >= 0 && value.toInt() < sortedMeasurements.length) {
                        final date = DateTime.parse(sortedMeasurements[value.toInt()].date);
                        return Text(DateFormat('dd/MM').format(date), style: const TextStyle(color: Colors.grey, fontSize: 10));
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 5,
                    reservedSize: 32,
                    getTitlesWidget: (value, meta) {
                      return Text('${value.toInt()}', style: const TextStyle(color: Colors.grey, fontSize: 10));
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              minX: 0,
              maxX: (sortedMeasurements.length - 1).toDouble(),
              minY: minWeight - 5,
              maxY: maxWeight + 5,
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: const Color(0xFF0EA5E9),
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: true),
                  belowBarData: BarAreaData(
                    show: true,
                    color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
