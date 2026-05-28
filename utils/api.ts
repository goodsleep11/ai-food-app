import { UserProfile, AnalysisResult, AnalyzeRequest } from '../types';

// 后端服务地址（部署在 Render 云端）
const API_BASE_URL = 'https://ai-food-app-t51p.onrender.com';

/**
 * 发送食物图片到后端进行 AI 分析
 */
export async function analyzeFoodImage(
  imageBase64: string,
  profile: UserProfile
): Promise<AnalysisResult> {
  const body: AnalyzeRequest = { imageBase64, profile };

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
