import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProgressCircle from '../../components/ProgressCircle';
import { getProfile, getTodaySummary } from '../../utils/storage';
import { checkForUpdate, showUpdatePrompt } from '../../utils/updater';
import { Colors, Typography, Shadow, Radius, Spacing } from '../../constants/theme';

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

  // 启动时检查更新
  useEffect(() => {
    checkForUpdate().then((release) => {
      if (release) showUpdatePrompt(release);
    });
  }, []);

  const dailyTarget = profile?.dailyCalorieTarget || 2000;
  const pct = dailyTarget > 0 ? Math.round((today.totalCalories / dailyTarget) * 100) : 0;

  return (
    <View style={styles.screen}>
      {/* ── 头部 ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{profile ? `你好, ${profile.nickname}` : '你好'}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── 今日热量卡片 ── */}
        <View style={[styles.card, Shadow.elevated]}>
          <Text style={styles.cardTitle}>今日摄入</Text>
          <View style={styles.calorieRow}>
            <ProgressCircle percentage={pct} size={140} strokeWidth={10} label={`${today.totalCalories}`} sublabel={`/ ${dailyTarget} kcal`} />
            <View style={styles.macros}>
              <MacroItem icon="fish-outline" color={Colors.protein} label="蛋白质" value={`${today.totalProtein}g`} />
              <MacroItem icon="nutrition-outline" color={Colors.carbs} label="碳水" value={`${today.totalCarbs}g`} />
              <MacroItem icon="flame-outline" color={Colors.fat} label="脂肪" value={`${today.totalFat}g`} />
            </View>
          </View>
        </View>

        {/* ── 双按钮 ── */}
        <View style={styles.actions}>
          {/* 拍照识别 */}
          <TouchableOpacity style={[styles.primaryBtn, Shadow.button]} onPress={() => router.push('/capture')} activeOpacity={0.9}>
            <View style={styles.primaryBtnIcon}>
              <Ionicons name="camera" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.primaryBtnText}>
              <Text style={styles.primaryBtnTitle}>拍照识别</Text>
              <Text style={styles.primaryBtnDesc}>拍摄食物 · AI 自动分析</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* 查看记录 */}
          <TouchableOpacity style={[styles.secondaryBtn, Shadow.card]} onPress={() => router.navigate('/(tabs)/history')} activeOpacity={0.9}>
            <View style={styles.secondaryBtnIcon}>
              <Ionicons name="time-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.secondaryBtnText}>
              <Text style={styles.secondaryBtnTitle}>查看记录</Text>
              <Text style={styles.secondaryBtnDesc}>
                {today.count > 0 ? `今日已记录 ${today.count} 餐` : '开始记录你的第一餐'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── 底部提示 ── */}
        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={15} color={Colors.textTertiary} />
          <Text style={styles.tipText}>
            {today.count === 0
              ? '拍一张照片，开启你的健康饮食之旅'
              : pct >= 100
                ? '今日目标已达成，太棒了！'
                : `还差 ${dailyTarget - today.totalCalories} kcal 达成今日目标`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MacroItem({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={macroStyles.row}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={macroStyles.label}>{label}</Text>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, color: Colors.textTertiary, width: 44 },
  value: { fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // 头部
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg,
  },
  greeting: { ...Typography.largeTitle },
  date: { ...Typography.caption, marginTop: 2 },

  // 卡片
  card: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  cardTitle: { ...Typography.caption2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  calorieRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  macros: { flex: 1, gap: 10 },

  // 按钮区域
  actions: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, gap: 12 },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  primaryBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { flex: 1, marginLeft: Spacing.lg },
  primaryBtnTitle: { fontSize: 19, fontWeight: '700', color: '#FFFFFF' },
  primaryBtnDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  secondaryBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  secondaryBtnIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { flex: 1, marginLeft: Spacing.lg },
  secondaryBtnTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  secondaryBtnDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  // 底部提示
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
    gap: 6,
  },
  tipText: { ...Typography.caption },
});
