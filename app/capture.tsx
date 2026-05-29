import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CameraModal from '../components/CameraModal';
import FoodCard from '../components/FoodCard';
import { analyzeFoodImage } from '../utils/api';
import { getProfile, saveAnalysisResult, getTodayRecords } from '../utils/storage';
import { AnalysisResult, UserProfile } from '../types';
import { Colors, Typography, Shadow, Radius, Spacing } from '../constants/theme';

type Step = 'camera' | 'describe' | 'loading' | 'result';

export default function CaptureScreen() {
  const [step, setStep] = useState<Step>('camera');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setCameraVisible(true), 100);
      return () => clearTimeout(timer);
    }, [])
  );

  React.useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  // Step 1: 照片捕获完成 → 进入描述阶段
  const handleImageCaptured = (base64: string) => {
    setCameraVisible(false);
    setCapturedImage(base64);
    setStep('describe');
  };

  // Step 2: 描述完成 → 开始分析
  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setStep('loading');
    try {
      const p = profile || (await getProfile());
      if (!p) {
        Alert.alert('提示', '请先设置健康档案');
        setStep('describe');
        return;
      }

      // 获取今日历史记录用于个性化分析
      const todayRecords = await getTodayRecords();

      const r = await analyzeFoodImage(
        capturedImage,
        p,
        description.trim() || undefined,
        todayRecords.length > 0 ? todayRecords : undefined
      );
      setResult(r);
      await saveAnalysisResult(r);
      setStep('result');
    } catch (err: any) {
      Alert.alert('分析失败', err.message || '请检查网络连接');
      setStep('describe');
    }
  };

  // 跳过描述直接分析（仅用图片）
  const handleSkipAndAnalyze = () => {
    handleAnalyze();
  };

  // ========== 相机阶段 ==========
  if (step === 'camera') {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>拍照识别</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centered}>
          <TouchableOpacity style={styles.openCameraBtn} onPress={() => setCameraVisible(true)} activeOpacity={0.8}>
            <View style={styles.camCircle}>
              <Ionicons name="camera" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.heroText}>点击拍照识别食物</Text>
            <Text style={styles.heroDesc}>拍照后可补充文字描述提高准确率</Text>
          </TouchableOpacity>
        </View>

        <CameraModal
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onImageCaptured={handleImageCaptured}
        />
      </View>
    );
  }

  // ========== 描述阶段（新：多模态输入） ==========
  if (step === 'describe' && capturedImage) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setStep('camera'); setCapturedImage(null); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>确认食物</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.describeScroll} keyboardShouldPersistTaps="handled">
          {/* 照片预览 */}
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${capturedImage}` }}
              style={styles.preview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.retakeBadge}
              onPress={() => { setStep('camera'); setCapturedImage(null); }}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.retakeBadgeText}>重拍</Text>
            </TouchableOpacity>
          </View>

          {/* 描述输入 */}
          <View style={styles.describeSection}>
            <View style={styles.describeHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.describeTitle}>描述你的食物（可选，但推荐）</Text>
            </View>
            <Text style={styles.describeHint}>
              告诉 AI 你吃的是什么，能大幅提高识别准确率。例如："红烧排骨、米饭、青菜"
            </Text>

            <View style={[styles.inputWrap, Shadow.card]}>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="例如：这是一碗红烧牛肉面，有牛肉、面条、青菜..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
              />
              {/* 语音按钮提示 — 键盘自带麦克风可用 */}
              <View style={styles.voiceHint}>
                <Ionicons name="mic-outline" size={14} color={Colors.primary} />
                <Text style={styles.voiceHintText}>键盘上的 🎤 按钮也可以语音输入</Text>
              </View>
            </View>
          </View>

          {/* 操作按钮 */}
          <View style={styles.describeActions}>
            <TouchableOpacity
              style={[styles.analyzeBtn, Shadow.button]}
              onPress={handleAnalyze}
              activeOpacity={0.9}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.analyzeBtnText}>
                {description.trim() ? '开始智能分析' : '直接分析（仅图片）'}
              </Text>
            </TouchableOpacity>

            {!description.trim() && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAndAnalyze}>
                <Text style={styles.skipBtnText}>跳过，仅用图片识别</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ========== 加载阶段 ==========
  if (step === 'loading') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={[styles.loadingCard, Shadow.elevated]}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
          <Text style={styles.loadingTitle}>AI 正在分析中...</Text>
          <Text style={styles.loadingDesc}>
            {description.trim()
              ? '结合图片和描述进行多模态识别'
              : '识别食物 · 计算热量 · 检查饮食限制'}
          </Text>
          <View style={styles.dotRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { opacity: 1 - i * 0.3 }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ========== 结果阶段 ==========
  if (step === 'result' && result) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>分析结果</Text>
          <View style={{ width: 40 }} />
        </View>
        <FoodCard result={result} />
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.retakeBtn, Shadow.button]}
            onPress={() => { setResult(null); setCapturedImage(null); setDescription(''); setStep('camera'); }}
            activeOpacity={0.9}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>继续拍照</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { ...Typography.subtitle },

  // Camera step
  openCameraBtn: { alignItems: 'center' },
  camCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { ...Typography.title, marginTop: Spacing.xxl },
  heroDesc: { ...Typography.caption, marginTop: Spacing.sm, textAlign: 'center' },

  // Describe step
  describeScroll: { flex: 1 },
  previewWrap: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
  },
  retakeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 4,
  },
  retakeBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

  describeSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  describeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  describeTitle: { ...Typography.subtitle, fontSize: 16 },
  describeHint: { ...Typography.caption, lineHeight: 20, marginBottom: Spacing.md },

  inputWrap: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  textInput: {
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    lineHeight: 22,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  voiceHintText: { fontSize: 12, color: Colors.textTertiary },

  // Buttons
  describeActions: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: 40,
  },
  analyzeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: 8,
  },
  analyzeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  skipBtnText: { fontSize: 14, color: Colors.textTertiary },

  // Loading
  loadingCard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 40,
    marginHorizontal: 30,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  loadingTitle: { ...Typography.subtitle, marginBottom: Spacing.sm },
  loadingDesc: { ...Typography.caption },
  dotRow: { flexDirection: 'row', marginTop: Spacing.xl, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  // Result
  resultActions: { paddingHorizontal: Spacing.xl, paddingBottom: 30, paddingTop: Spacing.md },
  retakeBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
