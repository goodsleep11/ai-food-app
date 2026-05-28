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

/**
 * 个人档案页面 —— 查看和编辑健康档案
 */
export default function ProfileScreen() {
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
  const [hasChanges, setHasChanges] = useState(false);

  // ---- 每次进入页面加载最新档案 ----
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

  // ---- 切换饮食限制 ----
  const toggleRestriction = (item: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
    setHasChanges(true);
  };

  // ---- 自动估算热量 ----
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

  // ---- 保存 ----
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

  // ---- 清除历史 ----
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

  // ---- 渲染 ----
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 基本信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>基本信息</Text>

          <FormField label="昵称">
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={(t) => { setNickname(t); setHasChanges(true); }}
              placeholder="请输入昵称"
              placeholderTextColor="#D1D5DB"
              maxLength={20}
            />
          </FormField>

          <FormField label="年龄">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={(t) => { setAge(t); setHasChanges(true); }}
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
                  onPress={() => { setGender(g); setHasChanges(true); }}
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
                  onChangeText={(t) => { setHeight(t); setHasChanges(true); }}
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
                  onChangeText={(t) => { setWeight(t); setHasChanges(true); }}
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
            onChangeText={(t) => { setCustomRestriction(t); setHasChanges(true); }}
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
              onChangeText={(t) => { setDailyCalorieTarget(t); setHasChanges(true); }}
              placeholder="如 2000"
              placeholderTextColor="#D1D5DB"
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
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>保存修改</Text>
          </TouchableOpacity>
        )}

        {/* 危险操作区域 */}
        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            <Text style={styles.dangerBtnText}>清除所有历史记录</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---- 表单字段组件 ----
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
  section: {
    marginBottom: 20,
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
  saveBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  // 危险区域
  dangerSection: {
    marginBottom: 20,
    paddingTop: 10,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    gap: 8,
  },
  dangerBtnText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '500',
  },
});
