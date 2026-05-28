// ========== 用户健康档案 ==========
export interface UserProfile {
  nickname: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number;          // 厘米
  weight: number;          // 公斤
  goal: 'lose_fat' | 'gain_muscle' | 'maintain';
  dietaryRestrictions: string[];  // 饮食限制标签列表
  customRestriction: string;       // 自定义饮食限制文字
  dailyCalorieTarget: number;      // 每日目标热量 (kcal)
}

// ========== 单项食物 ==========
export interface FoodItem {
  name: string;
  portion: string;    // 份量描述，如 "约 200g"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ========== 完整分析结果 ==========
export interface AnalysisResult {
  id: string;
  timestamp: string;         // ISO 时间字符串
  imageBase64: string;       // 压缩后的缩略图 base64
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriePercentage: number; // 占每日目标百分比
  warnings: string[];
  suggestions: string;
  isCompliant: boolean;
}

// ========== 后端请求体 ==========
export interface AnalyzeRequest {
  imageBase64: string;
  profile: UserProfile;
}

// ========== 默认用户档案 ==========
export const DIETARY_OPTIONS = [
  '素食',
  '清真',
  '无坚果',
  '无乳糖',
  '无麸质',
  '低盐',
  '低糖',
  '无海鲜',
];

export const GOAL_LABELS: Record<UserProfile['goal'], string> = {
  lose_fat: '减脂',
  gain_muscle: '增肌',
  maintain: '维持体重',
};

/**
 * 根据用户基础信息自动估算每日热量目标 (Mifflin-St Jeor 公式)
 */
export function estimateDailyCalories(
  gender: UserProfile['gender'],
  weight: number,
  height: number,
  age: number,
  goal: UserProfile['goal']
): number {
  // 基础代谢率 BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // 根据目标调整
  switch (goal) {
    case 'lose_fat':
      return Math.round(bmr * 1.2 - 300);   // 减脂：轻微活动 - 300kcal 缺口
    case 'gain_muscle':
      return Math.round(bmr * 1.4 + 300);   // 增肌：中度活动 + 300kcal 盈余
    case 'maintain':
    default:
      return Math.round(bmr * 1.3);         // 维持：轻微至中度活动
  }
}
