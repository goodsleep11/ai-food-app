import OpenAI from 'openai';

// ============================================================
//  双模型流水线: Qwen-VL(免费看图) → DeepSeek(营养分析)
// ============================================================

// DeepSeek — 文本分析
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Qwen-VL — 图像识别（阿里云 DashScope，免费额度）
const qwen = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const DEEPSEEK_MODEL = 'deepseek-chat';
const QWEN_VISION_MODEL = 'qwen-vl-plus';

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
//  Stage 1: Qwen-VL 看图 → 详细食物描述
// ============================================================

async function describeImageWithQwenVL(imageBase64: string, userHint: string): Promise<string> {
  const hintText = userHint
    ? `用户提示这可能是一份：${userHint}。请结合提示和图片进行识别。`
    : '';

  const response = await qwen.chat.completions.create({
    model: QWEN_VISION_MODEL,
    max_tokens: 500,
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
            text: `请仔细识别这张图片中的所有食物和饮品，返回详细描述：

1. 列出每样食物/饮品的具体名称（中餐要具体，如"红烧排骨"不是"肉"）
2. 估算每样食物的大致份量（用克、碗、份等单位）
3. 描述食物的烹饪方式（炒、炖、蒸、炸等）

${hintText}

请直接返回描述文字，不要用 JSON。`,
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
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
  } catch { return ''; }
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
  } catch { return ''; }
}

async function fetchNutritionFromWeb(foodNames: string[]): Promise<string> {
  if (foodNames.length === 0) return '';
  const queries = foodNames.flatMap((name) => [
    `${name} 热量 每100克 营养成分`,
    `${name} calories per 100g nutrition facts`,
  ]);
  const results = await Promise.all(
    queries.slice(0, 6).map(async (q) => {
      const r = await searchDuckDuckGo(q);
      return r || searchDuckDuckGoHTML(q);
    })
  );
  const valid = results.filter((r) => r.length > 10);
  return [...new Set(valid)].slice(0, 4).join('\n---\n');
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
//  Stage 2: DeepSeek 文本 → 营养分析
// ============================================================

async function deepSeekNutritionAnalysis(
  foodDescription: string,
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
  const customRestriction = profile.customRestriction ? `，额外限制：${profile.customRestriction}` : '';
  const restrictionText = restrictions
    ? `用户饮食限制：${restrictions}${customRestriction}`
    : '用户无特殊饮食限制';

  const webRefSnippet = webReference
    ? webReference.slice(0, 2000)
    : '（参考你的训练知识估算营养数据）';

  const todayMatch = historyContext.match(/今日已摄入: (\d+) kcal/);
  const remaining = todayMatch
    ? profile.dailyCalorieTarget - parseInt(todayMatch[1])
    : profile.dailyCalorieTarget;

  const systemPrompt = `你是一位资深营养师兼 AI 饮食分析专家。根据食物描述进行精准营养分析。

核心原则:
1. 根据食物名称和份量估算精确的营养成分
2. 优先参考联网搜索的营养数据
3. 重点检查饮食限制，违规必须在 warnings 中明确指出
4. 结合用户目标、今日已摄入情况和营养均衡度，给出具体可执行的建议
5. 只返回 JSON，不要包含任何其他文字`;

  const userPrompt = `${restrictionText}
用户目标：${goalMap[profile.goal]}（每日目标 ${profile.dailyCalorieTarget} kcal）
用户信息：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}，${profile.age}岁，${profile.height}cm，${profile.weight}kg
今日剩余可摄入: ${Math.max(0, remaining)} kcal
${historyContext}

=== 联网营养参考数据 ===
${webRefSnippet}
=== 联网数据结束 ===

=== AI 视觉识别的食物 ===
${foodDescription}
=== 食物描述结束 ===

请分析这份食物，返回严格 JSON（不要 markdown 代码块）：
{
  "foods": [
    {
      "name": "食物名称（中文具体菜名）",
      "portion": "份量（约200g/约1碗）",
      "calories": 数字(千卡),
      "protein": 数字(克),
      "carbs": 数字(克),
      "fat": 数字(克)
    }
  ],
  "warnings": ["饮食限制违规或营养问题，无则空数组"],
  "generalAdvice": "2-3句个性化建议：结合目标+今日摄入+营养均衡，给出具体可执行的行动建议"
}

重要：
- 每项营养素必填，根据份量+联网数据精确计算
- generalAdvice 要具体，不要空话（例："今日碳水已摄入较多，建议这餐米饭减半" 而非 "注意均衡饮食"）`;

  const response = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    max_tokens: 1536,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// ============================================================
//  主分析流程（对外暴露）
// ============================================================

export async function analyzeFood(
  imageBase64: string,
  profile: UserProfile,
  textDescription?: string,
  recentHistory?: HistoryItem[]
) {
  const desc = (textDescription || '').trim();

  // Stage 1: 图片 → 食物描述（Qwen-VL 免费视觉模型）
  console.log('👁️  Stage 1: Qwen-VL 识别图片中的食物...');
  const foodDescription = await describeImageWithQwenVL(imageBase64, desc);
  console.log(`   识别结果: ${foodDescription.slice(0, 150)}...`);

  // 从描述中提取食物名称用于联网搜索
  const foodNames = extractFoodNames(foodDescription);
  console.log(`   食物关键词: ${foodNames.join(', ') || '无'}`);

  // Stage 2: 联网搜索
  console.log('🌐 Stage 2: 联网搜索营养参考数据...');
  const webReference = await fetchNutritionFromWeb(foodNames);
  console.log(`   获取到 ${webReference.length} 字符的参考数据`);

  // Stage 3: 历史上下文
  const historyContext = buildHistoryContext(recentHistory || []);

  // Stage 4: DeepSeek 营养分析
  console.log('🤖 Stage 3: DeepSeek 营养分析...');
  const rawResponse = await deepSeekNutritionAnalysis(
    foodDescription,
    profile,
    webReference,
    historyContext
  );

  // 解析 JSON
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

  // 计算汇总
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

  const suggestions = aiResult.generalAdvice ||
    (totalCalories === 0
      ? '未能识别食物。请用文字/语音描述你吃了什么。'
      : '营养搭配不错，继续保持！');

  console.log(`✅ 分析完成 - ${foods.length} 种食物, 总热量 ${totalCalories}kcal`);

  return {
    foods,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    caloriePercentage,
    warnings: aiResult.warnings || [],
    suggestions,
    isCompliant,
    webSearchSummary: webReference
      ? `已联网查询 + AI 视觉识别`
      : '使用 AI 视觉识别 + 内置知识库分析',
  };
}

/**
 * 从食物描述文本中提取食物名称
 */
function extractFoodNames(description: string): string[] {
  // 简单的关键词提取：找中文食物词汇
  const patterns = [
    /[一-鿿]{2,6}(?:排骨|牛肉|猪肉|鸡肉|鱼|虾|蛋|豆腐|面|米饭|菜|汤|煲|锅|炒|炖|蒸|炸|烤|煎)/g,
    /[一-鿿]{2,4}(?:汤|面|饭|粥|粉|煲|锅|饼|包|饺)/g,
  ];
  const names = new Set<string>();
  for (const pattern of patterns) {
    const matches = description.match(pattern);
    if (matches) matches.forEach((m) => names.add(m));
  }
  return [...names].slice(0, 10);
}

export async function checkDeepSeekHealth(): Promise<boolean> {
  try {
    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Ping' }],
    });
    return !!response.choices[0]?.message?.content;
  } catch {
    return false;
  }
}
