import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeFood, checkDeepSeekHealth } from './foodAnalysis';

// 加载 .env 文件中的环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ---- 中间件配置 ----
app.use(cors());                              // 允许跨域（App 端请求）
app.use(express.json({ limit: '50mb' }));     // 支持大体积的 base64 图片数据

/**
 * 核心接口：食物图片分析
 * POST /api/analyze
 * Body: { imageBase64: string, profile: UserProfile }
 *
 * 完整流程：
 *  1. DeepSeek Vision 识别食物
 *  2. 本地联网搜索营养参考数据
 *  3. DeepSeek 结合联网数据做精确分析
 *  4. 后端本地计算汇总 + 个性化建议
 *  → 返回结构化 JSON
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, profile } = req.body;

    // 参数校验
    if (!imageBase64) {
      return res.status(400).json({ error: '缺少图片数据' });
    }
    if (!profile) {
      return res.status(400).json({ error: '缺少用户档案数据' });
    }
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: '服务器未配置 DeepSeek API Key' });
    }

    console.log(`📸 收到分析请求 - 用户: ${profile.nickname}, 图片大小: ${(imageBase64.length / 1024).toFixed(1)}KB`);

    // 调用 DeepSeek + 联网搜索分析（全部在本地终端处理）
    const result = await analyzeFood(imageBase64, profile);

    console.log(`✅ 分析完成 - 识别 ${result.foods.length} 种食物, 总热量 ${result.totalCalories}kcal`);

    res.json(result);
  } catch (error: any) {
    console.error('❌ 分析失败:', error.message);
    res.status(500).json({
      error: error.message || '分析失败，请重试',
    });
  }
});

// 健康检查接口（含 DeepSeek 连通性检测）
app.get('/api/health', async (_req, res) => {
  const deepseekOk = await checkDeepSeekHealth().catch(() => false);
  res.json({
    status: 'ok',
    deepseek: deepseekOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ---- 启动服务 ----
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('  🍽️  食物热量分析服务已启动');
  console.log('  🤖 AI 引擎: DeepSeek Vision + 联网搜索');
  console.log(`  📡 地址: http://localhost:${PORT}`);
  console.log(`  💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════');
});
