import OpenAI from 'openai';

// DeepSeek 原生 OpenAI 兼容端点 — 支持 image_url 视觉识别
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const MODEL = 'deepseek-chat';

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

interface HistoryItem {
  foods: { name: string; calories: number }[];
  totalCalories: number;
  timestamp: string;
}

// ============================================================
//  联网搜索
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
    if (data.AbstractText?.trim()) parts.push(data.AbstractText);
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 3)) {
        if (topic.Text?.trim()) parts.push(topic.Text);
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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIFoodAssistant/1.0)' },
    });
    clearTimeout(timeout);
    const html = await response.text();
    const snippets: string[] = [];
    const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    let match, count = 0;
    while ((match = snippetRegex.exec(html)) !== null && count < 5) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) { snippets.push(text); count++; }
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
//  历史上下文
// ============================================================

function buildHistoryContext(history: HistoryItem[]): string {
  if (!history || history.length === 0) return '';

  const today = new Date().toDateString();
  const todayItems = history.filter(
    (h) => new Date(h.timestamp).toDateString() === today
  );

  if (todayItems.length === 0) return '';

  const todayCalories = todayItems.reduce((sum, h) => sum + h.totalCalories, 0);
  const allFoods = todayItems.flatMap((h) => h.foods.map((f) => f.name));

  return `
=== 用户今日已记录饮食 ===
今日已摄入: ${todayCalories} kcal
已记录餐数: ${todayItems.length} 餐
已吃食物: ${allFoods.join('、') || '无'}
`;
}

// ============================================================
//  多模态分析（图片 + 文字 + 历史）
// ============================================================

async function multimodalAnalysis(
  imageBase64: string,
  textDescription: string,
  profile: UserProfile,
  webReference: string,
  historyContext: string
): Promise<string> {
  const goalMap: Record<string, string> = {
    lose_fat: '减脂',
    gain_muscle: '增肌',
    maintain: '维持体重',
  };

  const restrictions = profile.dietaryRestrictions.join('、');
  const customRestriction = profile.customRestriction
    ? `，额外限制：${profile.customRestriction}`
    : '';
  const restrictionText = restrictions
    ? `用户饮食限制：${restrictions}${customRestriction}`
    : '用户无特殊饮食限制';

  const webRefSnippet = webReference
    ? webReference.slice(0, 2000)
    : '（无联网参考数据，请使用你的训练知识估算）';

  const descriptionBlock = textDescription
    ? `\n【用户对食物的描述】: ${textDescription}\n请以用户描述为准，结合图片进行精确识别。`
    : '';

  const todayCaloriesMatch = historyContext.match(/今日已摄入: (\d+) kcal/);
  const remainingCalories = todayCaloriesMatch
    ? profile.dailyCalorieTarget - parseInt(todayCaloriesMatch[1])
    : profile.dailyCalorieTarget;

  const systemPrompt = `你是一位资深营养师兼 AI 饮食分析专家。你的任务是通过图片和用户描述，进行多模态食物识别和精准营养分析。

核心能力要求:
1. 优先以用户的文字描述为主（用户最清楚自己吃了什么），图片作为辅助验证
2. 如果图片与描述有出入，以描述为准，但在 warnings 中提及差异
3. 对中餐有深度理解：能准确识别各种中式菜肴、主食、汤品
4. 份量估算要结合中国人日常饮食习惯（碗、碟、份等）
5. 营养数据优先参考联网搜索结果，提高准确性
6. 结合用户目标和历史，给出具体的、可执行的个性化建议

只返回 JSON，不要包含任何其他文字。`;

  const userPrompt = `${restrictionText}
用户目标：${goalMap[profile.goal]}（每日目标 ${profile.dailyCalorieTarget} kcal）
用户信息：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}，${profile.age}岁，${profile.height}cm，${profile.weight}kg
今日剩余可摄入: ${Math.max(0, remainingCalories)} kcal
${historyContext}
${descriptionBlock}

=== 联网营养参考数据 ===
${webRefSnippet}
=== 联网数据结束 ===

请分析这份食物，返回严格 JSON（不要 markdown 代码块）：
{
  "foods": [
    {
      "name": "食物名称（中文，尽量具体，如：红烧排骨、番茄炒蛋、白米饭）",
      "portion": "份量估算（如：约200g/约1碗/约1份）",
      "calories": 数字(千卡),
      "protein": 数字(克),
      "carbs": 数字(克),
      "fat": 数字(克)
    }
  ],
  "warnings": ["饮食限制违规警告，无则空数组"],
  "generalAdvice": "2-3句个性化建议，结合用户目标、今日已摄入、营养均衡度，给出具体可执行的建议"
}

重要规则：
- 若完全无法识别，foods 返回空数组，generalAdvice 建议用户用文字描述
- 用户文字描述与图片冲突时，以描述为准
- 中餐菜名要具体（不要只写"肉"、"菜"这种模糊名称）
- generalAdvice 必须基于实际数据给出具体建议`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 1536,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
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

  return response.choices[0]?.message?.content || '';
}

/**
 * 仅从图片快速识别食物名称（用于联网搜索关键词）
 */
async function identifyFoodsFromImage(imageBase64: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          {
            type: 'text',
            text: '列出图片中所有食物和饮品的名称，每行一个，只返回名称。如果无法识别返回"无法识别"。',
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line !== '无法识别');
}

// ============================================================
//  主分析流程
// ============================================================

export async function analyzeFood(
  imageBase64: string,
  profile: UserProfile,
  textDescription?: string,
  recentHistory?: HistoryItem[]
) {
  const desc = (textDescription || '').trim();

  // Step 1: 提取食物名称
  let foodNames: string[] = [];
  if (desc) {
    foodNames = desc.split(/[,，、\s]+/).filter((n) => n.length > 0);
    console.log(`📝 用户描述食物: ${foodNames.join(', ')}`);
  } else {
    console.log('🔍 Step 1: Vision 识别图片中的食物...');
    foodNames = await identifyFoodsFromImage(imageBase64);
  }
  console.log(`   食物关键词: ${foodNames.join(', ') || '无'}`);

  // Step 2: 联网搜索
  console.log('🌐 Step 2: 联网搜索营养参考数据...');
  const webReference = await fetchNutritionFromWeb(foodNames);
  console.log(`   获取到 ${webReference.length} 字符的参考数据`);

  // Step 3: 构建历史上下文
  const historyContext = buildHistoryContext(recentHistory || []);

  // Step 4: 多模态分析
  console.log('🤖 Step 3: 多模态深度分析（图片 + 文字 + 历史）...');
  const rawResponse = await multimodalAnalysis(
    imageBase64,
    desc,
    profile,
    webReference,
    historyContext
  );

  // Step 5: 解析 JSON
  let jsonStr = rawResponse.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

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

  // Step 6: 计算汇总
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

  const goalAdvice = aiResult.generalAdvice ||
    (totalCalories === 0
      ? '未能识别食物。建议用文字/语音描述你吃了什么，AI 会基于描述进行分析。'
      : '营养搭配不错，继续保持均衡饮食！');

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
      ? `已联网查询营养数据`
      : '使用 AI 内置知识库分析',
  };
}

export async function checkDeepSeekHealth(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Ping' }],
    });
    return !!response.choices[0]?.message?.content;
  } catch {
    return false;
  }
}
