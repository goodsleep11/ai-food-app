import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { UserProfile, DIETARY_OPTIONS, estimateDailyCalories, GOAL_LABELS } from '../types';
import { saveProfile } from '../utils/storage';
import { Colors, Typography, Shadow, Radius, Spacing } from '../constants/theme';

export default function ProfileSetupScreen() {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [customRestriction, setCustomRestriction] = useState('');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState('');

  const toggleRestriction = (item: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  const handleAutoEstimate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w && h && a) {
      setDailyCalorieTarget(estimateDailyCalories(gender, w, h, a, goal).toString());
    } else {
      Alert.alert('提示', '请先填写体重、身高和年龄');
    }
  };

  const handleGenderChange = (g: UserProfile['gender']) => {
    setGender(g);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w && h && a) {
      setDailyCalorieTarget(estimateDailyCalories(g, w, h, a, goal).toString());
    }
  };

  const handleGoalChange = (g: UserProfile['goal']) => {
    setGoal(g);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w && h && a) {
      setDailyCalorieTarget(estimateDailyCalories(gender, w, h, a, g).toString());
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) return Alert.alert('提示', '请输入昵称');
    if (!age || isNaN(Number(age))) return Alert.alert('提示', '请输入有效年龄');
    if (!height || isNaN(Number(height))) return Alert.alert('提示', '请输入有效身高');
    if (!weight || isNaN(Number(weight))) return Alert.alert('提示', '请输入有效体重');
    if (!dailyCalorieTarget || isNaN(Number(dailyCalorieTarget)))
      return Alert.alert('提示', '请设置每日目标热量');

    const profile: UserProfile = {
      nickname: nickname.trim(),
      age: parseInt(age),
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      goal,
      dietaryRestrictions,
      customRestriction: customRestriction.trim(),
      dailyCalorieTarget: parseInt(dailyCalorieTarget),
    };

    try {
      await saveProfile(profile);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>📋</Text>
          </View>
          <Text style={styles.headerTitle}>设置健康档案</Text>
          <Text style={styles.headerDesc}>AI 将根据您的个人档案提供个性化饮食建议</Text>
        </View>

        {/* 基本信息 */}
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionLabel}>基本信息</Text>

          <Field label="昵称">
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入您的昵称"
              placeholderTextColor={Colors.textTertiary}
              maxLength={20}
            />
          </Field>

          <Field label="年龄">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="请输入年龄"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
            />
          </Field>

          <Field label="性别">
            <View style={styles.optionRow}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionBtn, gender === g && styles.optionBtnActive]}
                  onPress={() => handleGenderChange(g)}
                >
                  <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>
                    {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <View style={styles.rowFields}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Field label="身高 (cm)">
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="如 170"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="体重 (kg)">
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="如 65"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </Field>
            </View>
          </View>
        </View>

        {/* 饮食目标 */}
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionLabel}>饮食目标</Text>
          <View style={styles.optionRow}>
            {(['lose_fat', 'gain_muscle', 'maintain'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.goalBtn, goal === g && styles.goalBtnActive]}
                onPress={() => handleGoalChange(g)}
              >
                <Text style={styles.goalEmoji}>
                  {g === 'lose_fat' ? '🔥' : g === 'gain_muscle' ? '💪' : '⚖️'}
                </Text>
                <Text style={[styles.goalText, goal === g && styles.goalTextActive]}>
                  {GOAL_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 饮食限制 */}
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionLabel}>饮食限制（可多选）</Text>
          <View style={styles.tagGrid}>
            {DIETARY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.tag, dietaryRestrictions.includes(item) && styles.tagActive]}
                onPress={() => toggleRestriction(item)}
              >
                <Text style={[styles.tagText, dietaryRestrictions.includes(item) && styles.tagTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: Spacing.md }]}
            value={customRestriction}
            onChangeText={setCustomRestriction}
            placeholder="其他自定义限制（选填）"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* 每日目标热量 */}
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionLabel}>每日目标热量 (kcal)</Text>
          <View style={styles.calorieRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              value={dailyCalorieTarget}
              onChangeText={setDailyCalorieTarget}
              placeholder="如 2000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity style={styles.estimateBtn} onPress={handleAutoEstimate}>
              <Text style={styles.estimateBtnText}>自动估算</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>根据您的身高体重和运动目标自动计算推荐值</Text>
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity style={[styles.saveBtn, Shadow.button]} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveBtnText}>完成设置，开始使用</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.xxl,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  headerIconText: { fontSize: 32 },
  headerTitle: { ...Typography.largeTitle },
  headerDesc: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.caption2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },
  fieldContainer: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  rowFields: { flexDirection: 'row' },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionText: { fontSize: 15, color: Colors.textSecondary },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  goalBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  goalBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  goalEmoji: { fontSize: 24, marginBottom: 6 },
  goalText: { fontSize: 14, color: Colors.textSecondary },
  goalTextActive: { color: Colors.primary, fontWeight: '600' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tagActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  tagText: { fontSize: 13, color: Colors.textSecondary },
  tagTextActive: { color: Colors.primary, fontWeight: '500' },
  calorieRow: { flexDirection: 'row', alignItems: 'center' },
  estimateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  estimateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.sm },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
