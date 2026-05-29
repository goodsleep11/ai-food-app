import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { AnalysisResult } from '../types';
import { Colors, Typography, Shadow, Radius, Spacing } from '../constants/theme';

interface FoodCardProps {
  result: AnalysisResult;
}

export default function FoodCard({ result }: FoodCardProps) {
  const { foods, totalCalories, totalProtein, totalCarbs, totalFat, warnings, suggestions, isCompliant, imageBase64, caloriePercentage } = result;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {imageBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      {/* 总热量 */}
      <View style={[styles.calorieHero, Shadow.card]}>
        <Text style={styles.calorieNumber}>{totalCalories}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>
        <View style={styles.caloriePercentBadge}>
          <Text style={styles.caloriePercentText}>占每日目标 {caloriePercentage}%</Text>
        </View>
      </View>

      {/* 三大宏量素 */}
      <View style={[styles.macrosRow, Shadow.card]}>
        <MacroItem label="蛋白质" value={totalProtein} unit="g" color={Colors.protein} />
        <View style={styles.macroDivider} />
        <MacroItem label="碳水" value={totalCarbs} unit="g" color={Colors.carbs} />
        <View style={styles.macroDivider} />
        <MacroItem label="脂肪" value={totalFat} unit="g" color={Colors.fat} />
      </View>

      {/* 食物清单 */}
      {foods.length > 0 && (
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionTitle}>识别食物</Text>
          {foods.map((food, index) => (
            <View key={index} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodPortion}>{food.portion}</Text>
              </View>
              <Text style={styles.foodCalories}>{food.calories} kcal</Text>
            </View>
          ))}
        </View>
      )}

      {/* 警告 */}
      {warnings.length > 0 && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.sectionTitle}>饮食提醒</Text>
          {warnings.map((w, i) => (
            <View key={i} style={styles.warningItem}>
              <View style={styles.warningDot} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {isCompliant && foods.length > 0 && (
        <View style={[styles.section, styles.compliantSection]}>
          <Text style={styles.compliantText}>未检测到违反饮食限制的成分</Text>
        </View>
      )}

      {/* 建议 */}
      {suggestions ? (
        <View style={[styles.section, styles.adviceSection]}>
          <Text style={styles.sectionTitle}>营养建议</Text>
          <Text style={styles.adviceText}>{suggestions}</Text>
        </View>
      ) : null}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function MacroItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl },
  image: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  calorieHero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  calorieNumber: { fontSize: 48, fontWeight: '800', color: Colors.text },
  calorieUnit: { fontSize: 15, color: Colors.textSecondary, marginTop: -4 },
  caloriePercentBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  caloriePercentText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  macroItem: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 20, fontWeight: '700' },
  macroUnit: { fontSize: 12, color: Colors.textTertiary },
  macroLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  macroDivider: { width: 1, height: 30, backgroundColor: Colors.separator, alignSelf: 'center' },
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.caption2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '500', color: Colors.text },
  foodPortion: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  foodCalories: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  warningSection: {
    backgroundColor: Colors.dangerLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFE0E0',
  },
  warningItem: { flexDirection: 'row', paddingVertical: 3, gap: 8, alignItems: 'center' },
  warningDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.danger },
  warningText: { flex: 1, fontSize: 14, color: '#CC4444', lineHeight: 20 },
  compliantSection: {
    backgroundColor: Colors.primaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D4EDDA',
  },
  compliantText: { fontSize: 14, color: Colors.primary, textAlign: 'center' },
  adviceSection: {
    backgroundColor: '#F0F7FF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0EEFF',
  },
  adviceText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
