import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CameraModal from '../components/CameraModal';
import FoodCard from '../components/FoodCard';
import { analyzeFoodImage } from '../utils/api';
import { getProfile, saveAnalysisResult } from '../utils/storage';
import { AnalysisResult, UserProfile } from '../types';
import { Colors, Typography, Shadow, Radius, Spacing } from '../constants/theme';

export default function CaptureScreen() {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleImageCaptured = async (base64: string) => {
    setCameraVisible(false);
    setLoading(true);
    setResult(null);
    try {
      const p = profile || (await getProfile());
      if (!p) { Alert.alert('提示', '请先设置健康档案'); setLoading(false); return; }
      const r = await analyzeFoodImage(base64, p);
      setResult(r);
      await saveAnalysisResult(r);
    } catch (err: any) {
      Alert.alert('分析失败', err.message || '请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={[styles.loadingCard, Shadow.elevated]}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
          <Text style={styles.loadingTitle}>AI 正在分析中...</Text>
          <Text style={styles.loadingDesc}>识别食物 · 计算热量 · 检查饮食限制</Text>
          <View style={styles.dotRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { opacity: 1 - i * 0.3 }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (result) {
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
            onPress={() => { setResult(null); setCameraVisible(true); }}
            activeOpacity={0.9}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>继续拍照</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          <Text style={styles.heroDesc}>AI 自动分析热量、营养和饮食建议</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
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
  heroText: { ...Typography.title, marginTop: Spacing.xxl },
  heroDesc: { ...Typography.caption, marginTop: Spacing.sm, textAlign: 'center' },
  openCameraBtn: { alignItems: 'center' },
  camCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Results
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
