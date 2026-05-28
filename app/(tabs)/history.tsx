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

/**
 * 历史记录页 —— 顶部展示今日汇总，下方展示全部历史
 */
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

  // 每次页面获得焦点时刷新数据
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

  // 渲染每条历史记录
  const renderItem = ({ item }: { item: AnalysisResult }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTime}>
          {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {/* 食物列表 */}
      {item.foods.map((food, idx) => (
        <View key={idx} style={styles.miniFoodRow}>
          <Text style={styles.miniFoodName}>{food.name}</Text>
          <Text style={styles.miniFoodPortion}>{food.portion}</Text>
          <Text style={styles.miniFoodCal}>{food.calories} kcal</Text>
        </View>
      ))}

      {/* 底部汇总 + 警告 */}
      <View style={styles.recordFooter}>
        <Text style={styles.recordTotal}>合计 {item.totalCalories} kcal</Text>
        {item.warnings.length > 0 && (
          <View style={styles.recordWarning}>
            <Ionicons name="warning" size={12} color="#FF6B6B" />
            <Text style={styles.recordWarningText}>{item.warnings[0]}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📸</Text>
      <Text style={styles.emptyTitle}>暂无记录</Text>
      <Text style={styles.emptyDesc}>点击底部拍照按钮，开始记录你的饮食吧</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4CAF50" />
        }
        ListHeaderComponent={
          <View style={styles.todaySection}>
            {/* 今日热量圆环 */}
            <View style={styles.todayCircleRow}>
              <ProgressCircle
                percentage={caloriePercent}
                size={150}
                label={`${todaySummary.totalCalories}`}
                sublabel={`/ ${dailyTarget} kcal`}
              />
            </View>

            {/* 三大宏量素 */}
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#4CAF50' }]}>
                  {todaySummary.totalProtein}g
                </Text>
                <Text style={styles.macroLabel}>蛋白质</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#FFA726' }]}>
                  {todaySummary.totalCarbs}g
                </Text>
                <Text style={styles.macroLabel}>碳水</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#EF5350' }]}>
                  {todaySummary.totalFat}g
                </Text>
                <Text style={styles.macroLabel}>脂肪</Text>
              </View>
            </View>

            {/* 今日记录条数 */}
            <Text style={styles.todayCount}>
              今日已记录 {todaySummary.count} 餐
              {caloriePercent >= 100 ? ' —— 已达成今日目标！🎉' : ''}
            </Text>

            {/* 分隔线 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>历史记录</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  // 今日汇总区域
  todaySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  todayCircleRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  todayCount: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  // 分隔线
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9CA3AF',
  },
  // 记录卡片
  recordCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  miniFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  miniFoodName: {
    flex: 2,
    fontSize: 14,
    color: '#1A1A2E',
  },
  miniFoodPortion: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },
  miniFoodCal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  recordTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  recordWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recordWarningText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
  },
  // 空状态
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
