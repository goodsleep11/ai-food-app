import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressCircleProps {
  percentage: number;   // 0-100+，可超过 100
  size?: number;        // 圆的直径
  strokeWidth?: number;
  color?: string;       // 进度条颜色
  bgColor?: string;     // 背景圆弧颜色
  label: string;        // 中间主文字
  sublabel?: string;    // 中间副文字
}

/**
 * 简约环形进度指示器，用于展示每日热量达成率
 */
export default function ProgressCircle({
  percentage,
  size = 160,
  strokeWidth = 10,
  color = '#4CAF50',
  bgColor = '#E8F5E9',
  label,
  sublabel,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const progress = circumference * (1 - clampedPct / 100);

  // 超过 100% 时颜色变红
  const activeColor = percentage > 100 ? '#FF6B6B' : percentage > 80 ? '#FFA726' : color;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* 背景圆环 */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 进度圆环 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* 中间文字 */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: activeColor }]}>{label}</Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
  },
  sublabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
