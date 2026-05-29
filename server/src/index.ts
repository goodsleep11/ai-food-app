import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeFood, checkDeepSeekHealth } from './foodAnalysis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * POST /api/analyze
 * Body: {
 *   imageBase64: string,
 *   profile: UserProfile,
 *   textDescription?: string,      // 用户文字/语音描述（可选）
 *   recentHistory?: HistoryItem[]   // 今日已记录饮食（可选）
 * }
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, profile, textDescription, recentHistory } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '缺少图片数据' });
    }
    if (!profile) {
      return res.status(400).json({ error: '缺少用户档案数据' });
    }
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: '服务器未配置 DeepSeek API Key' });
    }

    console.log(`📸 收到分析请求 - 用户: ${profile.nickname}, 图片: ${(imageBase64.length / 1024).toFixed(1)}KB, 文字描述: ${textDescription ? '有' : '无'}`);

    const result = await analyzeFood(imageBase64, profile, textDescription, recentHistory);

    console.log(`✅ 分析完成 - 识别 ${result.foods.length} 种食物, 总热量 ${result.totalCalories}kcal`);

    res.json(result);
  } catch (error: any) {
    console.error('❌ 分析失败:', error.message);
    res.status(500).json({
      error: error.message || '分析失败，请重试',
    });
  }
});

app.get('/api/health', async (_req, res) => {
  const deepseekOk = await checkDeepSeekHealth().catch(() => false);
  res.json({
    status: 'ok',
    deepseek: deepseekOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('  🍽️  食物热量分析服务已启动');
  console.log('  🤖 AI: DeepSeek V4 Pro + 多模态分析');
  console.log(`  📡 地址: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════');
});
