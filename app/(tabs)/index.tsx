import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProgressCircle from '../../components/ProgressCircle';
import { getProfile, getTodaySummary } from '../../utils/storage';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [today, setToday] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, count: 0 });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, t] = await Promise.all([getProfile(), getTodaySummary()]);
        setProfile(p);
        setToday(t);
      })();
    }, [])
  );

  const dailyTarget = profile?.dailyCalorieTarget || 2000;
  const pct = dailyTarget > 0 ? Math.round((today.totalCalories / dailyTarget) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* ── 顶部：今日汇总 ── */}
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {profile ? `你好，${profile.nickname}` : '你好'}
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </Text>
        </View>

        {/* 今日热量环 */}
        <View style={styles.summaryCard}>
          <ProgressCircle percentage={pct} size={130} label={`${today.totalCalories}`} sublabel={`/ ${dailyTarget}`} />
          <View style={styles.macrosCol}>
            <MacroRow icon="fish" color="#4CAF50" label="蛋白质" value={`${today.totalProtein}g`} />
            <MacroRow icon="fast-food" color="#FFA726" label="碳水" value={`${today.totalCarbs}g`} />
            <MacroRow icon="flame" color="#EF5350" label="脂肪" value={`${today.totalFat}g`} />
          </View>
        </View>
      </View>

      {/* ── 中部：双按钮 ── */}
      <View style={styles.actionArea}>
        {/* 拍照按钮 */}
        <TouchableOpacity
          style={styles.captureBtn}
          onPress={() => router.push('/capture')}
          activeOpacity={0.85}
        >
          <View style={styles.captureBtnInner}>
            <View style={styles.captureIconWrap}>
              <Ionicons name="camera" size={36} color="#FFFFFF" />
            </View>
            <View style={styles.captureTextWrap}>
              <Text style={styles.captureTitle}>拍照识别</Text>
              <Text style={styles.captureDesc}>拍摄食物 · AI 自动分析</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* 查看记录按钮 */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.navigate('/(tabs)/history')}
          activeOpacity={0.85}
        >
          <View style={styles.historyBtnInner}>
            <View style={styles.historyIconWrap}>
              <Ionicons name="time-outline" size={28} color="#4CAF50" />
            </View>
            <View style={styles.historyTextWrap}>
              <Text style={styles.historyTitle}>查看记录</Text>
              <Text style={styles.historyDesc}>
                {today.count > 0 ? `今日已记录 ${today.count} 餐` : '开始记录你的第一餐'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 底部提示 ── */}
      <View style={styles.footer}>
        <Ionicons name="bulb-outline" size={16} color="#9CA3AF" />
        <Text style={styles.footerText}>
          {today.count === 0
            ? '拍一张照片，开启你的健康饮食之旅'
            : pct >= 100
              ? '今日目标已达成，太棒了！'
              : `还差 ${dailyTarget - today.totalCalories} kcal 达成今日目标`}
        </Text>
      </View>
    </View>
  );
}

function MacroRow({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={macroStyles.row}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={macroStyles.label}>{label}</Text>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, color: '#9CA3AF', width: 36 },
  value: { fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  greeting: { marginBottom: 16 },
  greetingText: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  dateText: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  macrosCol: { flex: 1, gap: 10 },
  actionArea: { paddingHorizontal: 24, paddingTop: 28, gap: 14 },
  // 拍照大按钮
  captureBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 18,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  captureBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
  },
  captureIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureTextWrap: { flex: 1, marginLeft: 18 },
  captureTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  captureDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  // 查看记录按钮
  historyBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  historyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  historyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextWrap: { flex: 1, marginLeft: 16 },
  historyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A2E' },
  historyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  // 底部
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    marginTop: 'auto',
    gap: 6,
  },
  footerText: { fontSize: 13, color: '#9CA3AF' },
});
