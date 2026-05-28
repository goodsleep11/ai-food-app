import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 底部 Tab 导航布局
 * 三个标签：历史 | 拍照（中间突出大圆按钮） | 我的
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { color: '#1A1A2E', fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          title: '历史',
          headerTitle: '饮食记录',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: '',
          headerShown: false,
          tabBarButton: (props) => <CustomCenterButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          headerTitle: '个人档案',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

/**
 * 中间突出的圆形拍照按钮
 * 点击时导航到 capture 页面，触发相机模态框
 */
function CustomCenterButton(props: any) {
  const { onPress, accessibilityState } = props;
  const isFocused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      style={styles.centerBtnWrapper}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.centerBtn, isFocused && styles.centerBtnFocused]}>
        <Ionicons name="camera" size={28} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    height: 85,
    paddingBottom: 25,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  centerBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerBtnFocused: {
    backgroundColor: '#43A047',
    transform: [{ scale: 1.05 }],
  },
});
