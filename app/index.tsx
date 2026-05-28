import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getProfile } from '../utils/storage';

/**
 * 启动页 —— 检查用户档案
 * 有档案 → 跳转主页 (tabs)
 * 无档案 → 跳转档案设置页
 */
export default function IndexScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkProfile();
  }, []);

  async function checkProfile() {
    try {
      const profile = await getProfile();
      if (profile) {
        router.replace('/(tabs)/history');
      } else {
        router.replace('/profile-setup');
      }
    } catch {
      // 读取失败也进入设置页
      router.replace('/profile-setup');
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🥗</Text>
      <Text style={styles.title}>AI 食物识别助手</Text>
      <Text style={styles.subtitle}>拍照即知热量，健康饮食更简单</Text>
      {checking && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    fontSize: 72,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#9CA3AF',
  },
});
