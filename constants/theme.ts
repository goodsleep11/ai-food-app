/**
 * Apple/Google 极简设计系统
 *
 * 灵感来源：iOS Human Interface Guidelines + Material Design 3
 */

export const Colors = {
  // 背景
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardSecondary: '#F9F9FB',

  // 主色调 — iOS 风格绿
  primary: '#34C759',
  primaryLight: '#E8F8ED',
  primaryDark: '#28A745',

  // 文字
  text: '#1C1C1E',
  textSecondary: '#6D6D72',
  textTertiary: '#AEAEB2',
  textInverse: '#FFFFFF',

  // 强调色
  accent: '#007AFF',
  warning: '#FF9500',
  danger: '#FF3B30',
  dangerLight: '#FFF0EF',

  // 分隔 & 边框
  separator: '#E5E5EA',
  border: '#E0E0E5',

  // 宏量素色
  protein: '#34C759',
  carbs: '#FF9500',
  fat: '#FF3B30',
} as const;

export const Typography = {
  largeTitle: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, letterSpacing: 0.3 },
  title: { fontSize: 20, fontWeight: '600' as const, color: Colors.text },
  subtitle: { fontSize: 17, fontWeight: '500' as const, color: Colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary },
  caption2: { fontSize: 11, fontWeight: '500' as const, color: Colors.textTertiary },
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
