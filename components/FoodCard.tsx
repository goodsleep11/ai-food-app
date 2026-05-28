import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { AnalysisResult } from '../types';

interface FoodCardProps {
  result: AnalysisResult;
}

/**
 * 食物分析结果卡片
 * 展示识别出的食物清单、热量、营养素、警告和建议
 */
export default function FoodCard({ result }: FoodCardProps) {
  const { foods, totalCalories, totalProtein, totalCarbs, totalFat, warnings, suggestions, isCompliant, imageBase64, caloriePercentage } = result;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 食物缩略图 */}
      {imageBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      {/* 总热量 - 醒目大字 */}
      <View style={styles.calorieHero}>
        <Text style={styles.calorieNumber}>{totalCalories}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>
        <Text style={styles.caloriePercent}>占每日目标 {caloriePercentage}%</Text>
      </View>

      {/* 三大宏量素 */}
      <View style={styles.macrosRow}>
        <MacroItem label="蛋白质" value={totalProtein} unit="g" color="#4CAF50" />
        <MacroItem label="碳水" value={totalCarbs} unit="g" color="#FFA726" />
        <MacroItem label="脂肪" value={totalFat} unit="g" color="#EF5350" />
      </View>

      {/* 食物清单 */}
      {foods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ 识别食物</Text>
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

      {/* 警告信息 */}
      {warnings.length > 0 && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.sectionTitle}>⚠️ 饮食提醒</Text>
          {warnings.map((w, i) => (
            <View key={i} style={styles.warningItem}>
              <Text style={styles.warningDot}>•</Text>
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {isCompliant && foods.length > 0 && (
        <View style={[styles.section, styles.compliantSection]}>
          <Text style={styles.compliantText}>✅ 未检测到违反饮食限制的成分</Text>
        </View>
      )}

      {/* 个性化建议 */}
      {suggestions ? (
        <View style={[styles.section, styles.adviceSection]}>
          <Text style={styles.sectionTitle}>💡 营养建议</Text>
          <Text style={styles.adviceText}>{suggestions}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** 单个宏量素展示组件 */
function MacroItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  calorieHero: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 12,
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  calorieUnit: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: -4,
  },
  caloriePercent: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  macroLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  foodPortion: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  warningSection: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  warningItem: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  warningDot: {
    color: '#FF6B6B',
    marginRight: 8,
    fontSize: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#CC5555',
    lineHeight: 20,
  },
  compliantSection: {
    backgroundColor: '#F0FFF0',
    borderWidth: 1,
    borderColor: '#D4EDDA',
  },
  compliantText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  adviceSection: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F0FF',
  },
  adviceText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});
