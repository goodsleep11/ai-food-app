import { UserProfile, AnalysisResult, AnalyzeRequest } from '../types';

const API_BASE_URL = 'https://ai-food-app-t51p.onrender.com';

export async function analyzeFoodImage(
  imageBase64: string,
  profile: UserProfile,
  textDescription?: string,
  recentHistory?: { foods: { name: string; calories: number }[]; totalCalories: number; timestamp: string }[]
): Promise<AnalysisResult> {
  const body: AnalyzeRequest = { imageBase64, profile, textDescription, recentHistory };

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
