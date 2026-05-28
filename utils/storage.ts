import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, AnalysisResult } from '../types';

// AsyncStorage 存储键名
const PROFILE_KEY = '@food_ai_profile';
const HISTORY_KEY = '@food_ai_history';
const SERVER_URL_KEY = '@food_ai_server_url';

// ==================== 用户档案 ====================

/** 保存用户健康档案到本地 */
export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** 读取用户健康档案，首次使用返回 null */
export async function getProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

// ==================== 饮食记录 ====================

/** 保存一条分析结果到历史记录（最新的排最前） */
export async function saveAnalysisResult(result: AnalysisResult): Promise<void> {
  const history = await getHistory();
  history.unshift(result); // 插入到数组头部
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/** 获取全部历史记录 */
export async function getHistory(): Promise<AnalysisResult[]> {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

/** 获取今天的饮食记录（按日期过滤） */
export async function getTodayRecords(): Promise<AnalysisResult[]> {
  const history = await getHistory();
  const todayStr = new Date().toDateString();
  return history.filter(
    (record) => new Date(record.timestamp).toDateString() === todayStr
  );
}

/** 获取今日营养素汇总 */
export async function getTodaySummary(): Promise<{
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  count: number;
}> {
  const todayRecords = await getTodayRecords();
  return {
    totalCalories: todayRecords.reduce((s, r) => s + r.totalCalories, 0),
    totalProtein: todayRecords.reduce((s, r) => s + r.totalProtein, 0),
    totalCarbs: todayRecords.reduce((s, r) => s + r.totalCarbs, 0),
    totalFat: todayRecords.reduce((s, r) => s + r.totalFat, 0),
    count: todayRecords.length,
  };
}

/** 删除所有历史记录 */
export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

/** 删除单条记录 */
export async function deleteRecord(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

// ==================== 服务器地址 ====================

/** 保存后端服务地址 */
export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url);
}

/** 读取后端服务地址，未设置返回 null */
export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}
