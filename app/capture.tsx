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
      <View style={styles.center}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#4CAF50" />
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
      <View style={styles.container}>
        {/* 顶部导航 */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>分析结果</Text>
          <View style={{ width: 40 }} />
        </View>
        <FoodCard result={result} />
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => { setResult(null); setCameraVisible(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>继续拍照</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      {/* 顶部导航 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>拍照识别</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroArea}>
        <TouchableOpacity style={styles.openCameraBtn} onPress={() => setCameraVisible(true)} activeOpacity={0.7}>
          <View style={styles.camCircle}>
            <Ionicons name="camera" size={48} color="#4CAF50" />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  heroArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  openCameraBtn: { alignItems: 'center' },
  camCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroText: { fontSize: 20, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  heroDesc: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 40,
    marginHorizontal: 30,
    marginTop: 200,
  },
  loadingTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A2E', marginTop: 20 },
  loadingDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  dotRow: { flexDirection: 'row', marginTop: 20, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  resultActions: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  retakeBtn: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
