import Anthropic from '@anthropic-ai/sdk';

// ============================================================
//  Anthropic SDK 客户端 → DeepSeek 后端
//  使用 Anthropic 原生图片格式，DeepSeek V4 Pro 支持多模态识图
// ============================================================
const anthropic = new Anthropic({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/anthropic',
});

const VISION_MODEL = 'deepseek-v4-pro';

// 用户档案类型
interface UserProfile {
  nickname: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: 'lose_fat' | 'gain_muscle' | 'maintain';
  dietaryRestrictions: string[];
  customRestriction?: string;
  dailyCalorieTarget: number;
}

// ============================================================
//  联网搜索模块
// ============================================================

async function searchDuckDuckGo(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const data: any = await response.json();

    const parts: string[] = [];
    if (data.AbstractText && data.AbstractText.trim()) {
      parts.push(data.AbstractText);
    }
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 3)) {
        if (topic.Text && topic.Text.trim()) {
          parts.push(topic.Text);
        }
      }
    }
    return parts.join(' | ') || '';
  } catch {
    return '';
  }
}

async function searchDuckDuckGoHTML(query: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIFoodAssistant/1.0)',
      },
    });
    clearTimeout(timeout);

    const html = await response.text();

    const snippets: string[] = [];
    const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    let count = 0;
    while ((match = snippetRegex.exec(html)) !== null && count < 5) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        snippets.push(text);
        count++;
      }
    }
    return snippets.join(' | ') || '';
  } catch {
    return '';
  }
}

async function fetchNutritionFromWeb(foodNames: string[]): Promise<string> {
  if (foodNames.length === 0) return '';

  const queries = foodNames.flatMap((name) => [
    `${name} 热量 每100克 营养成分`,
    `${name} calories per 100g nutrition facts`,
    `${name} 蛋白质 碳水 脂肪`,
  ]);

  const results = await Promise.all(
    queries.slice(0, 6).map(async (q) => {
      const instantResult = await searchDuckDuckGo(q);
      if (instantResult) return instantResult;
      return searchDuckDuckGoHTML(q);
    })
  );

  const validResults = results.filter((r) => r.length > 10);
  const uniqueResults = [...new Set(validResults)];
  return uniqueResults.slice(0, 4).join('\n---\n');
}

// ============================================================
//  DeepSeek Vision API 调用（Anthropic 原生格式）
// ============================================================

/**
 * 使用 Anthropic 原生图片格式调用 DeepSeek 视觉模型识别食物
 */
async function identifyFoodsWithVision(imageBase64: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg' as const,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: '请识别这张图片中的所有食物和饮品，只返回食物名称，每行一个，不要其他内容。如果无法识别请返回"无法识别"。',
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n');

  return text
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line !== '无法识别');
}

/**
 * 核心：调用 DeepSeek V4 Pro 做完整食物营养分析
 */
async function visionFullAnalysis(
  imageBase64: string,
  profile: UserProfile,
  webReference: string
): Promise<any> {
  const restrictions = profile.dietaryRestrictions.join('、');
  const customRestriction = profile.customRestriction
    ? `，额外限制：${profile.customRestriction}`
    : '';
  const restrictionText = restrictions
    ? `用户饮食限制：${restrictions}${customRestriction}`
    : '用户无特殊饮食限制';

  const goalMap: Record<string, string> = {
    lose_fat: '减脂',
    gain_muscle: '增肌',
    maintain: '维持体重',
  };

  const webRefSnippet = webReference
    ? webReference.slice(0, 2000)
    : '（无联网参考数据，请使用你的训练知识估算）';

  const systemPrompt = `你是一位持有营养师资质的专业饮食分析助手。你的任务是根据食物图片进行精确的营养分析。

你必须严格遵循以下规则：
1. 仔细识别图片中所有食物和饮品
2. 估算每种食物的份量和营养素含量
3. 优先参考提供的联网搜索数据（如有），结合你的训练知识做精确估算
4. 重点检查用户饮食限制，任何违规必须在 warnings 中明确指出
5. 只返回 JSON，不要包含任何其他文字`;

  const userPrompt = `${restrictionText}
用户目标：${goalMap[profile.goal]}
用户每日目标热量：${profile.dailyCalorieTarget} kcal
用户信息：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}，${profile.age}岁，${profile.height}cm，${profile.weight}kg

=== 以下是从互联网实时搜索到的食物营养参考数据，请优先参考 ===
${webRefSnippet}
=== 联网数据结束 ===

请分析图片中的食物，返回严格符合此 JSON 格式的结果（不要包含 markdown 代码块标记）：
{
  "foods": [
    {
      "name": "食物名称",
      "portion": "份量估算（如：约200g/约1碗）",
      "calories": 数字(千卡),
      "protein": 数字(克),
      "carbs": 数字(克),
      "fat": 数字(克)
    }
  ],
  "warnings": ["如果食物违反用户饮食限制，在此列出具体警告；如果没有违规，返回空数组"],
  "generalAdvice": "针对用户饮食目标的个性化建议（1-2句，中文）"
}

重要：
- 若完全无法识别图片中的食物，foods 返回空数组，warnings 中说明原因
- 热量和三大宏量素需尽量精确，参考联网数据提高准确性
- 每项营养素都是必填数字
- 份量要用中文描述具体数量`;

  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg' as const,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n');
}

// ============================================================
//  主分析流程
// ============================================================

export async function analyzeFood(
  imageBase64: string,
  profile: UserProfile
) {
  // Step 1: 视觉识别食物
  console.log('🔍 Step 1: Vision 识别图片中的食物...');
  const foodNames = await identifyFoodsWithVision(imageBase64);
  console.log(`   识别到 ${foodNames.length} 种食物: ${foodNames.join(', ') || '无'}`);

  // Step 2: 联网搜索营养数据
  console.log('🌐 Step 2: 联网搜索营养参考数据...');
  const webReference = await fetchNutritionFromWeb(foodNames);
  console.log(`   获取到 ${webReference.length} 字符的参考数据`);

  // Step 3: Vision 完整分析
  console.log('🤖 Step 3: Vision 深度分析...');
  const rawResponse = await visionFullAnalysis(imageBase64, profile, webReference);

  // Step 4: 解析 JSON
  let jsonStr = rawResponse.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let aiResult: any;
  try {
    aiResult = JSON.parse(jsonStr);
  } catch {
    const bracketMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (bracketMatch) {
      try {
        aiResult = JSON.parse(bracketMatch[0]);
      } catch {
        throw new Error('AI 返回结果解析失败，请重试');
      }
    } else {
      throw new Error('AI 返回结果解析失败，请重试');
    }
  }

  // Step 5: 本地计算汇总
  const foods = Array.isArray(aiResult.foods) ? aiResult.foods : [];
  const totalCalories = foods.reduce((sum: number, f: any) => sum + (f.calories || 0), 0);
  const totalProtein = foods.reduce((sum: number, f: any) => sum + (f.protein || 0), 0);
  const totalCarbs = foods.reduce((sum: number, f: any) => sum + (f.carbs || 0), 0);
  const totalFat = foods.reduce((sum: number, f: any) => sum + (f.fat || 0), 0);

  const caloriePercentage =
    profile.dailyCalorieTarget > 0
      ? Math.round((totalCalories / profile.dailyCalorieTarget) * 100)
      : 0;

  const isCompliant = !(aiResult.warnings && aiResult.warnings.length > 0);

  let goalAdvice = aiResult.generalAdvice || '';
  if (!goalAdvice) {
    if (profile.goal === 'lose_fat' && caloriePercentage > 35) {
      goalAdvice = '这餐热量占比较高，建议适当减少主食份量，增加蔬菜比例。';
    } else if (profile.goal === 'gain_muscle' && totalProtein < 25) {
      goalAdvice = '蛋白质摄入偏低，建议增加鸡胸肉、鱼虾、豆腐等高蛋白食物。';
    } else if (totalCalories === 0) {
      goalAdvice = '未能识别食物，请尝试在光线充足处重新拍摄。';
    } else {
      goalAdvice = '营养搭配不错，继续保持均衡饮食！';
    }
  }

  console.log(`✅ 分析完成 - ${foods.length} 种食物, 总热量 ${totalCalories}kcal`);

  return {
    foods,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    caloriePercentage,
    warnings: aiResult.warnings || [],
    suggestions: goalAdvice,
    isCompliant,
    webSearchSummary: webReference
      ? `已联网查询 ${foodNames.length} 种食物的营养数据`
      : '使用 AI 内置知识库分析',
  };
}

/**
 * 健康检查 —— 验证 DeepSeek API 连通性
 */
export async function checkDeepSeekHealth(): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Ping' }],
    });
    return response.content.length > 0;
  } catch {
    return false;
  }
}
