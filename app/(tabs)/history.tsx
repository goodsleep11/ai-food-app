import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProgressCircle from '../../components/ProgressCircle';
import { getHistory, getTodaySummary, getProfile, deleteRecord } from '../../utils/storage';
import { AnalysisResult, UserProfile } from '../../types';
import { Colors, Typography, Shadow, Radius, Spacing } from '../../constants/theme';

export default function HistoryScreen() {
  const [records, setRecords] = useState<AnalysisResult[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todaySummary, setTodaySummary] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    count: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [history, p, today] = await Promise.all([
      getHistory(),
      getProfile(),
      getTodaySummary(),
    ]);
    setRecords(history);
    setProfile(p);
    setTodaySummary(today);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleDelete(id: string) {
    Alert.alert('删除记录', '确定要删除这条饮食记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
          await loadData();
        },
      },
    ]);
  }

  const dailyTarget = profile?.dailyCalorieTarget || 2000;
  const caloriePercent =
    dailyTarget > 0 ? Math.round((todaySummary.totalCalories / dailyTarget) * 100) : 0;

  const renderItem = ({ item }: { item: AnalysisResult }) => (
    <View style={[styles.recordCard, Shadow.card]}>
      <View style={styles.recordHeader}>
        <View style={styles.recordTimeRow}>
          <View style={styles.recordDot} />
          <Text style={styles.recordTime}>
            {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {item.foods.map((food, idx) => (
        <View key={idx} style={styles.foodRow}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.foodPortion}>{food.portion}</Text>
          </View>
          <Text style={styles.foodCal}>{food.calories} kcal</Text>
        </View>
      ))}

      <View style={styles.recordFooter}>
        <Text style={styles.recordTotal}>合计 {item.totalCalories} kcal</Text>
        {item.warnings.length > 0 && (
          <View style={styles.warningTag}>
            <Ionicons name="alert-circle" size={12} color={Colors.danger} />
            <Text style={styles.warningText}>{item.warnings[0]}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="restaurant-outline" size={40} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>暂无记录</Text>
      <Text style={styles.emptyDesc}>点击首页「拍照识别」开始记录饮食</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* 今日汇总卡片 */}
            <View style={[styles.todayCard, Shadow.elevated]}>
              <View style={styles.todayCircleRow}>
                <ProgressCircle
                  percentage={caloriePercent}
                  size={130}
                  strokeWidth={10}
                  label={`${todaySummary.totalCalories}`}
                  sublabel={`/ ${dailyTarget} kcal`}
                />
              </View>

              <View style={styles.macrosRow}>
                <MacroItem color={Colors.protein} label="蛋白质" value={`${todaySummary.totalProtein}g`} />
                <View style={styles.macroDivider} />
                <MacroItem color={Colors.carbs} label="碳水" value={`${todaySummary.totalCarbs}g`} />
                <View style={styles.macroDivider} />
                <MacroItem color={Colors.fat} label="脂肪" value={`${todaySummary.totalFat}g`} />
              </View>

              <Text style={styles.todayCount}>
                今日已记录 {todaySummary.count} 餐
                {caloriePercent >= 100 ? ' · 已达成目标' : ''}
              </Text>
            </View>

            {/* 分隔 */}
            {records.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>历史记录</Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function MacroItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={macroStyles.item}>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  value: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingBottom: 30 },

  // 今日汇总
  todayCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  todayCircleRow: { alignItems: 'center', marginBottom: Spacing.lg },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  macroDivider: { width: 1, height: 28, backgroundColor: Colors.separator, alignSelf: 'center' },
  todayCount: { ...Typography.caption, textAlign: 'center' },

  // 历史分隔
  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.caption2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // 记录卡片
  recordCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recordTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  recordTime: { ...Typography.caption },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '500', color: Colors.text },
  foodPortion: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  foodCal: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  recordTotal: { fontSize: 14, fontWeight: '600', color: Colors.text },
  warningTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  warningText: { fontSize: 12, color: Colors.danger },

  // 空状态
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Typography.subtitle, marginBottom: 4 },
  emptyDesc: { ...Typography.caption },
});
