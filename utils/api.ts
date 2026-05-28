import { UserProfile, AnalysisResult, AnalyzeRequest } from '../types';
import { getServerUrl } from './storage';

// API 地址缓存，避免每次请求都读 AsyncStorage
let cachedApiUrl: string | null = null;

/** 获取当前后端地址（优先用户设置，其次环境变量，最后默认值） */
export async function getApiBaseUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;

  // 1. 用户手动设置的值（存在 AsyncStorage 中）
  const storedUrl = await getServerUrl();
  if (storedUrl) {
    cachedApiUrl = storedUrl;
    return cachedApiUrl;
  }

  // 2. 环境变量
  if (process.env.EXPO_PUBLIC_API_URL) {
    cachedApiUrl = process.env.EXPO_PUBLIC_API_URL;
    return cachedApiUrl;
  }

  // 3. 默认值
  cachedApiUrl = 'http://localhost:3001';
  return cachedApiUrl;
}

/** 手动设置后端地址（用于 App 内修改） */
export async function setApiBaseUrl(url: string): Promise<void> {
  const { saveServerUrl } = await import('./storage');
  await saveServerUrl(url);
  cachedApiUrl = url;
}

/** 清除缓存（下次请求自动重新读取） */
export function clearApiCache(): void {
  cachedApiUrl = null;
}

/**
 * 发送食物图片到后端进行 AI 分析
 */
export async function analyzeFoodImage(
  imageBase64: string,
  profile: UserProfile
): Promise<AnalysisResult> {
  const baseUrl = await getApiBaseUrl();
  const body: AnalyzeRequest = { imageBase64, profile };

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `请求失败 (${response.status})`);
  }

  const data = await response.json();

  return {
    ...data,
    id: generateId(),
    timestamp: new Date().toISOString(),
    imageBase64,
  };
}

/** 检查后端服务是否可用 */
export async function checkHealth(): Promise<boolean> {
  try {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
