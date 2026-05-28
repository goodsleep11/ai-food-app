import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CameraModal from '../../components/CameraModal';
import FoodCard from '../../components/FoodCard';
import { analyzeFoodImage } from '../../utils/api';
import { getProfile, saveAnalysisResult } from '../../utils/storage';
import { AnalysisResult, UserProfile } from '../../types';

/**
 * 拍照识别页
 * 每次进入此页面时自动弹出相机 / 相册选择
 * 分析完成后展示食物卡片结果
 */
export default function CaptureScreen() {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // ---- 每次页面获得焦点时自动打开相机 ----
  useFocusEffect(
    useCallback(() => {
      // 延迟一帧确保页面渲染完成
      const timer = setTimeout(() => {
        setCameraVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  // ---- 加载用户档案 ----
  React.useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  // ---- 处理拍摄的图片 ----
  const handleImageCaptured = async (base64: string) => {
    setCameraVisible(false);
    setLoading(true);
    setResult(null);

    try {
      const p = profile || (await getProfile());
      if (!p) {
        Alert.alert('提示', '请先设置健康档案');
        setLoading(false);
        return;
      }

      const analysisResult = await analyzeFoodImage(base64, p);
      setResult(analysisResult);

      // 自动保存到本地历史
      await saveAnalysisResult(analysisResult);
    } catch (err: any) {
      Alert.alert('分析失败', err.message || '请检查网络连接和后端服务');
    } finally {
      setLoading(false);
    }
  };

  // ---- 重新拍照 ----
  const handleRetake = () => {
    setResult(null);
    setCameraVisible(true);
  };

  // ---- 加载中 ----
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingTitle}>AI 正在分析中...</Text>
          <Text style={styles.loadingDesc}>识别食物、计算热量、检查饮食限制</Text>
          {/* 加载动画点 */}
          <View style={styles.dotRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { opacity: 1 - i * 0.3 }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ---- 结果展示 ----
  if (result) {
    return (
      <View style={styles.container}>
        <FoodCard result={result} />
        {/* 底部按钮 */}
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} activeOpacity={0.7}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>继续拍照</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- 默认页面（相机关闭后显示） ----
  return (
    <View style={styles.centerContainer}>
      <TouchableOpacity style={styles.openCameraBtn} onPress={() => setCameraVisible(true)} activeOpacity={0.7}>
        <View style={styles.openCameraCircle}>
          <Ionicons name="camera" size={36} color="#4CAF50" />
        </View>
        <Text style={styles.openCameraTitle}>拍照识别食物</Text>
        <Text style={styles.openCameraDesc}>拍摄食物照片，AI 自动分析热量和营养</Text>
      </TouchableOpacity>

      {/* 相机模态框 */}
      <CameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onImageCaptured={handleImageCaptured}
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  // 加载状态
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 40,
    width: '100%',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    marginTop: 20,
  },
  loadingDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  dotRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  // 打开相机按钮
  openCameraBtn: {
    alignItems: 'center',
  },
  openCameraCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  openCameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  openCameraDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  // 结果页底部按钮
  resultActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  retakeBtn: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
