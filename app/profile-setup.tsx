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

/**
 * 首次使用时的健康档案设置页面
 * 强制填写所有必填项后才可进入主界面
 */
export default function ProfileSetupScreen() {
  // ---- 表单状态 ----
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [customRestriction, setCustomRestriction] = useState('');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState('');

  // ---- 切换饮食限制标签 ----
  const toggleRestriction = (item: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  // ---- 自动估算热量 ----
  const handleAutoEstimate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w && h && a) {
      const estimated = estimateDailyCalories(gender, w, h, a, goal);
      setDailyCalorieTarget(estimated.toString());
    } else {
      Alert.alert('提示', '请先填写体重、身高和年龄');
    }
  };

  // ---- 保存档案 ----
  const handleSave = async () => {
    // 校验必填项
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
      router.replace('/(tabs)/history');
    } catch {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  // ---- 渲染 ----
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 顶部标题 */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={styles.headerTitle}>设置健康档案</Text>
          <Text style={styles.headerDesc}>AI 将根据您的个人档案提供个性化饮食建议</Text>
        </View>

        {/* 基本信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>基本信息</Text>

          <FormField label="昵称">
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入您的昵称"
              placeholderTextColor="#D1D5DB"
              maxLength={20}
            />
          </FormField>

          <FormField label="年龄">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="请输入年龄"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              maxLength={3}
            />
          </FormField>

          <FormField label="性别">
            <View style={styles.optionRow}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionBtn, gender === g && styles.optionBtnActive]}
                  onPress={() => {
                    setGender(g);
                    // 性别改变后重新估算热量
                    const w = parseFloat(weight);
                    const h = parseFloat(height);
                    const a = parseInt(age);
                    if (w && h && a) {
                      setDailyCalorieTarget(estimateDailyCalories(g, w, h, a, goal).toString());
                    }
                  }}
                >
                  <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>
                    {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <View style={styles.rowFields}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <FormField label="身高 (cm)">
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="如 170"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="体重 (kg)">
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="如 65"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </FormField>
            </View>
          </View>
        </View>

        {/* 饮食目标 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>饮食目标</Text>
          <View style={styles.optionRow}>
            {(['lose_fat', 'gain_muscle', 'maintain'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.goalBtn, goal === g && styles.goalBtnActive]}
                onPress={() => {
                  setGoal(g);
                  // 目标改变后重新估算热量
                  const w = parseFloat(weight);
                  const h = parseFloat(height);
                  const a = parseInt(age);
                  if (w && h && a) {
                    setDailyCalorieTarget(estimateDailyCalories(gender, w, h, a, g).toString());
                  }
                }}
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
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>饮食限制（可多选）</Text>
          <View style={styles.tagGrid}>
            {DIETARY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.tag,
                  dietaryRestrictions.includes(item) && styles.tagActive,
                ]}
                onPress={() => toggleRestriction(item)}
              >
                <Text
                  style={[
                    styles.tagText,
                    dietaryRestrictions.includes(item) && styles.tagTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={customRestriction}
            onChangeText={setCustomRestriction}
            placeholder="其他自定义限制（选填）"
            placeholderTextColor="#D1D5DB"
          />
        </View>

        {/* 每日目标热量 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>每日目标热量 (kcal)</Text>
          <View style={styles.calorieRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              value={dailyCalorieTarget}
              onChangeText={setDailyCalorieTarget}
              placeholder="如 2000"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity style={styles.estimateBtn} onPress={handleAutoEstimate}>
              <Text style={styles.estimateBtnText}>自动估算</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            根据您的身高体重和运动目标，系统可自动计算推荐值
          </Text>
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>完成设置，开始使用</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---- 表单字段包装组件 ----
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  headerIcon: { fontSize: 40, marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  headerDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 14,
  },
  fieldContainer: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowFields: { flexDirection: 'row' },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionText: { fontSize: 15, color: '#6B7280' },
  optionTextActive: { color: '#4CAF50', fontWeight: '600' },
  goalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  goalBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  goalEmoji: { fontSize: 24, marginBottom: 6 },
  goalText: { fontSize: 14, color: '#6B7280' },
  goalTextActive: { color: '#4CAF50', fontWeight: '600' },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  tagText: { fontSize: 13, color: '#6B7280' },
  tagTextActive: { color: '#4CAF50', fontWeight: '500' },
  calorieRow: { flexDirection: 'row', alignItems: 'center' },
  estimateBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  estimateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
