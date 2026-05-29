import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  UserProfile,
  DIETARY_OPTIONS,
  estimateDailyCalories,
  GOAL_LABELS,
} from '../../types';
import { getProfile, saveProfile, clearHistory } from '../../utils/storage';
import { Colors, Typography, Shadow, Radius, Spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [customRestriction, setCustomRestriction] = useState('');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  async function loadProfileData() {
    const p = await getProfile();
    if (p) {
      setNickname(p.nickname);
      setAge(p.age.toString());
      setGender(p.gender);
      setHeight(p.height.toString());
      setWeight(p.weight.toString());
      setGoal(p.goal);
      setDietaryRestrictions(p.dietaryRestrictions);
      setCustomRestriction(p.customRestriction || '');
      setDailyCalorieTarget(p.dailyCalorieTarget.toString());
      setHasChanges(false);
    }
  }

  const toggleRestriction = (item: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
    setHasChanges(true);
  };

  const handleAutoEstimate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w && h && a) {
      setDailyCalorieTarget(estimateDailyCalories(gender, w, h, a, goal).toString());
      setHasChanges(true);
    } else {
      Alert.alert('提示', '请先填写体重、身高和年龄');
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
      setHasChanges(false);
      Alert.alert('保存成功', '个人档案已更新');
    } catch {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleClearHistory = () => {
    Alert.alert('清除历史记录', '此操作不可恢复，确定要清除所有饮食记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('已清除', '所有饮食记录已删除');
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* 基本信息 */}
        <View style={[styles.section, Shadow.card]}>
          <Text style={styles.sectionLabel}>基本信息</Text>

          <Field label="昵称">
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={(t) => { setNickname(t); setHasChanges(true); }}
              placeholder="请输入昵称"
              placeholderTextColor={Colors.textTertiary}
              maxLength={20}
            />
          </Field>

          <Field label="年龄">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={(t) => { setAge(t); setHasChanges(true); }}
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
                  onPress={() => { setGender(g); setHasChanges(true); }}
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
                  onChangeText={(t) => { setHeight(t); setHasChanges(true); }}
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
                  onChangeText={(t) => { setWeight(t); setHasChanges(true); }}
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
                onPress={() => { setGoal(g); setHasChanges(true); }}
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
            onChangeText={(t) => { setCustomRestriction(t); setHasChanges(true); }}
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
              onChangeText={(t) => { setDailyCalorieTarget(t); setHasChanges(true); }}
              placeholder="如 2000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity style={styles.estimateBtn} onPress={handleAutoEstimate}>
              <Text style={styles.estimateBtnText}>自动估算</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 保存按钮 */}
        {hasChanges && (
          <TouchableOpacity style={[styles.saveBtn, Shadow.button]} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.saveBtnText}>保存修改</Text>
          </TouchableOpacity>
        )}

        {/* 危险区域 */}
        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={17} color={Colors.danger} />
            <Text style={styles.dangerBtnText}>清除所有历史记录</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  section: {
    marginTop: Spacing.lg,
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
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  dangerSection: { marginTop: Spacing.xxxl },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
  },
  dangerBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '500' },
});
