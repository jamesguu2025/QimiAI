# ADHD Helper - Prompt 系统架构文档

> 供 Qimi AI 网页版搭建 Agent 参考
> 版本: v6.0 | 更新日期: 2026-01-28

---

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   folderKey 路由  │
                    └─────────────────┘
                     ↙               ↘
        ┌──────────────────┐    ┌──────────────────┐
        │ folderKey='emotion' │    │  其他 folderKey   │
        └──────────────────┘    └──────────────────┘
                 ↓                        ↓
        ┌──────────────────┐    ┌──────────────────┐
        │ emotion_prompt.md │    │ SYSTEM_PROMPT_   │
        │   (单一完整 prompt)  │    │  LITE.md        │
        └──────────────────┘    └──────────────────┘
                 ↓                        ↓
                 │              ┌──────────────────┐
                 │              │  动态模块注入      │
                 │              │ (Context Injection)│
                 │              └──────────────────┘
                 ↓                        ↓
        ┌─────────────────────────────────────────┐
        │           通用附加内容                    │
        │  • 价值预告 (Value Preview)              │
        │  • 方案生成前置检查                       │
        │  • Interactive Trigger                  │
        │  • 用户档案注入 (Mem0 语义检索)           │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │          完整 System Prompt              │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │            DeepSeek LLM                 │
        │      (支持 Prompt Caching)              │
        └─────────────────────────────────────────┘
```

---

## 2. 核心文件说明

### 2.1 主要 Prompt 文件

| 文件 | 用途 | 字符数 | 备注 |
|------|------|--------|------|
| `SYSTEM_PROMPT_LITE.md` | 主咨询顾问 prompt | ~12k | ADHD 家庭教育顾问角色 |
| `emotion_prompt.md` | 情绪支持模块 prompt | ~18k | 独立的情绪支持角色 |
| `prompts.js` | Prompt 构建逻辑 | ~20k | 组装、注入、路由 |

### 2.2 动态知识模块 (可选注入)

位于 `data/knowledge_base/modules/` 目录：

| 模块 | 文件名 | 触发场景 |
|------|--------|----------|
| 功能医学 | `functional_medicine.md` | 睡眠、肠胃、营养、过敏 |
| ADHD 十维支架 | `adhd_dimensions.md` | 综合分析需求 |
| 运动干预 | `intervention_exercise.md` | 运动相关问题 |
| 感统训练 | `intervention_sensory.md` | 感统相关问题 |
| 中医调理 | `intervention_tcm.md` | 中医体质问题 |
| 行为训练 | `intervention_behavior.md` | 行为管理问题 |

---

## 3. 两个主要 Prompt 详解

### 3.1 SYSTEM_PROMPT_LITE.md (主咨询顾问)

**角色定位**: ADHD 家庭教育顾问

**核心规则**:
- `#RULE_ASK`: 先答后问策略 - 简单问题直接答，复杂问题先给通用方向再追问
- `#RULE_RAG`: RAG 调用纪律 - 同一话题只调用一次，简单确认禁止调用
- `#RULE_STYLE`: 语气温和、生活化，避免医疗词汇
- `#RULE_FOCUS`: 用户问题优先，简洁原则，不过度发散
- `#RULE_ADHD_DIMENSION`: 参考十维支架分析
- `#RULE_PLAN_GENERATION`: 方案生成的双向触发机制
- `#RULE_PLAN_DETAILS`: 方案细化要求（时间安排、学校场景）

**知识模块目录** (按需加载):
- 神经功能、功能医学、感统运动、姿态体态、家庭结构
- 情绪调节、执行技能、社交功能、环境刺激、中医体质

**流程**:
1. Smart Response (智能响应)
2. Deep Analysis (深度分析)
3. Plan Confirmation (方案确认)
4. Plan Generation (方案生成)

---

### 3.2 emotion_prompt.md (情绪支持模块)

**角色定位**: 情绪支持伙伴 (非治疗师)

**核心能力**:
- 倾听和共情
- 引导探索 (苏格拉底式提问)
- 认知拓展 (心理学/教育学/社会学视角)
- 自驱力培养 (SDT、心流理论)
- 未来视角 (AI 时代 ADHD 优势)
- 层层深入挖掘根本原因

**结构层次**:

```
# Role (角色定义)
  └─ 核心能力 + 你不是什么

# Safety (最高优先级)
  └─ 危机识别规则
  └─ 危机响应流程
  └─ <|CRISIS_DETECTED|> 标记

# Boundaries (法律免责边界)
  └─ 首次对话必须声明 AI 身份 ⚠️ 法律要求
  └─ 漏说补救机制
  └─ 不做诊断、不开处方、不替代专业

# Core Techniques (核心对话技术)
  └─ OARS (动机访谈四技术)
  └─ 苏格拉底式提问
  └─ 焦点解决技术 (奇迹问题、例外问题、量表问题)
  └─ 情绪命名与正常化

# Cognitive Reframing Toolbox (认知拓展工具箱)
  └─ 使用时机 (✅ 适合 / ❌ 不适合)
  └─ 过渡话术 (获得许可)
  └─ 框架速查表:
       • 心理学视角 (归因理论、习得性无助、认知重构、ACT)
       • 教育学视角 (成长型思维、个体差异、兴趣导向神经系统)
       • 社会学视角 (标签理论、角色期望、污名对抗、家庭系统)
       • 自驱力视角 (内在动机、心流、自我决定理论)
       • AI 时代视角 (ADHD 优势、未来技能)

# Conversation Strategies (对话策略)
  └─ 阶段一: 情绪稳定 (先共情)
  └─ 阶段二: 探索问题 (OARS)
  └─ 阶段三: 深层探索 (挑战绝对化)
  └─ 阶段四: 行动整合 (具体化)

# Output Style (输出风格)
  └─ 温暖但不腻、平等对话、生活化

# Special Instructions
  └─ ADHD 相关情绪议题处理
  └─ 家长 vs 孩子的不同策略
  └─ 长对话管理 (超过10轮提醒休息)

# Reminders (7条核心原则)
  1. 首要任务共情，次要任务解决问题 (顺序不可颠倒，但都要做)
  2. 相信对方有找到答案的能力
  3. 不确定时就问
  4. 慢下来
  5. 照顾对话节奏
  6. 至少探索 3-5 轮再考虑建议
  7. 建议要从对方嘴里引出来
```

---

## 4. 通用附加内容 (所有板块都会追加)

### 4.1 价值预告 (Value Preview)

**触发条件**: 用户提到 ADHD 干预相关话题

**功能**: 在第1轮回复末尾告诉用户继续聊可以获得个性化方案

**情绪板块特殊措辞**: "情绪支持方案" 而非 "个性化成长方案"

---

### 4.2 方案生成前置检查

在生成完整方案前，AI 需要确认:
1. **时间安排**: 先给建议周期，再问是否需要调整
2. **学校场景**: 问是否需要学校建议 → 判断是否需要老师配合 → 了解老师沟通难度

---

### 4.3 Interactive Trigger

**功能**: 检测 AI 回复是否可以触发保存方案按钮

**输出标记**: `<|PLAN_READY|>`

**触发条件**: 回复包含完整执行方案（有具体步骤、时间、方法）

---

### 4.4 用户档案注入 (Mem0 语义检索)

**注入内容**:
- 孩子年龄 (核心信息，始终注入)
- 家长关注的挑战 (核心信息，始终注入)
- 相关背景信息 (Mem0 检索，最多5条相关事实)
- 家庭背景参考 (始终注入，作为参考资料)

**使用原则**:
- 只在回答需要时自然引用
- 措辞用 "根据之前的记录..."
- 不强行关联无关信息

---

## 5. Prompt 工程规范

### 5.1 结构规范
- 使用 `#` 标题层级组织
- 优先级高的内容放前面 (Safety > Boundaries > Techniques)
- 用 `**加粗**` 标注必须执行的规则
- 用 `⚠️` 标注法律/安全要求

### 5.2 指令规范
- 用 "必须"、"不可"、"禁止" 表示强制规则
- 用 "建议"、"可以"、"如果合适" 表示软性建议
- 提供正反例对比 (好的回复 vs 不好的回复)

### 5.3 输出控制
- 使用特殊标记控制系统行为: `<|CRISIS_DETECTED|>`, `<|PLAN_READY|>`
- 标记单独占一行，放在回复最后

---

## 6. 关键设计决策

### 6.1 单一 Prompt vs 分阶段加载
**决策**: 情绪支持模块使用单一完整 prompt

**原因**:
- 行业共识: 情感支持场景不适合机械分阶段
- LLM 自己判断策略更自然
- DeepSeek 支持 Prompt Caching，重复 prompt 成本降低 90%

### 6.2 危机识别: LLM 判断 vs 关键词匹配
**决策**: 完全使用 LLM 判断

**原因**:
- 人们表达痛苦的方式多种多样，可能很隐晦
- 关键词匹配容易漏检或误报
- "宁可谨慎处理" 原则

### 6.3 认知拓展时机
**决策**: 共情优先，时机合适才引入新视角

**信号**:
- ✅ 适合: 改变谈话出现、情绪已稳定、主动求解
- ❌ 不适合: 情绪高涨、明显阻抗、只想倾诉

---

## 7. 网页版适配建议

### 7.1 板块路由
```javascript
// 根据用户进入的板块选择 prompt
if (module === 'emotion') {
  prompt = loadEmotionPrompt();
} else {
  prompt = loadMainPrompt();
  prompt += injectDynamicModules(userMessage);
}
prompt += appendCommonSections(); // 价值预告、方案检查等
```

### 7.2 危机响应处理
- 检测 `<|CRISIS_DETECTED|>` 标记
- 触发时可考虑: 显示紧急联系方式、通知管理员、记录日志

### 7.3 方案保存按钮
- 检测 `<|PLAN_READY|>` 标记
- 触发时显示 "保存方案" 按钮

### 7.4 AI 身份声明
- 情绪支持板块首轮必须包含 AI 身份声明
- 前端可辅助检测，如果漏了提醒用户

---

## 8. LLM 辅助服务（非主对话）

除了主对话 LLM 调用外，系统还有多个辅助 LLM 服务：

### 8.1 模块智能路由 (`module-router.js`)

**功能**: 根据用户消息语义判断需要注入哪些知识模块

**LLM Prompt 核心逻辑**:
```
你是ADHD知识模块识别专家。根据用户消息和对话历史，判断需要注入哪些知识模块。

可用模块：
- functional_medicine（功能医学）：生理症状、睡眠、消化、营养、血糖、过敏
- adhd_dimensions（十维支架）：维度、原因、表现、分析
- intervention_exercise（运动干预）：运动、跳绳、体能
- intervention_sensory（感统训练）：感统、前庭、触觉
- intervention_tcm（中医调理）：中医症候、外观体征、睡眠出汗
- intervention_behavior（行为训练）：行为、习惯、拖延、奖惩

规则：
- 根据语义判断，非关键词匹配
- 用户用生活化语言（"睡觉总出汗" 而非 "盗汗"）
- 一个消息可触发多个模块
```

**输出**: 模块名数组，如 `['functional_medicine', 'intervention_tcm']`

---

### 8.2 记忆提取 (`memory-extractor.js`)

**功能**: 从对话中提取用户家庭信息，存入 Redis

#### 8.2.1 事实提取 (Fact Extraction)

**LLM Prompt 核心逻辑**:
```
你是信息提取专家。从家长与AI助手的对话中提取有价值信息。

提取规则：
- 关于孩子的客观事实（姓名、年龄、行为）
- 家长的担忧和痛点（"我很担心..."）
- 家长的期望和目标（"我希望他能..."）
- 孩子的偏好和兴趣（"他喜欢..."）
- 孩子/家长的进步（"他今天主动..."）
- 运动相关（"他在学游泳"）

分类（10类）：
- child_info: 孩子基本信息
- school: 学习相关
- family: 家庭情况
- behavior: 行为表现
- preference: 偏好兴趣
- medical: 医疗相关
- concern: 家长担忧
- goal: 家长期望
- progress: 进步记录
- sports: 运动相关

提取倾向：宁多勿漏
```

**输出**: 事实数组
```json
[
  {"category": "concern", "key": "parent_worry_homework", "value": "担心孩子不爱写作业", "confidence": 1.0},
  {"category": "sports", "key": "new_sport", "value": "喜欢打网球", "confidence": 1.0}
]
```

#### 8.2.2 A.U.D.N. 决策

**功能**: 对比新旧事实，决定 Add/Update/Delete/Noop

**LLM Prompt 核心逻辑**:
```
对比新提取的事实与已有事实，决定操作：
- ADD：全新事实
- UPDATE：值发生变化（如年龄从8岁变9岁）
- DELETE：用户明确否定（"他其实不叫小明"）
- NOOP：与已有事实相同
```

---

### 8.3 用户档案语义检索 (`prompts.js` - `retrieveRelevantFacts`)

**功能**: 从已存储的事实中检索与当前问题相关的条目（Mem0 模式）

**触发条件**: 用户事实 > 5 条时启用语义检索

**LLM Prompt 核心逻辑**:
```
你是信息筛选助手。判断哪些事实与用户当前问题直接相关。

判断标准：
- 直接相关：对回答有帮助（用户问运动，孩子喜欢篮球就相关）
- 间接相关：可能有关联但非必须
- 不相关：完全无关

输出：相关事实的 index 数组，最多5个
示例：[0, 2, 4]
```

---

### 8.4 RAG 智能摘要 (`rag-service.js` - `summarizePapers`)

**功能**: 将多篇论文综合成 500-800 字的摘要

**开关**: `ENABLE_SMART_SUMMARY=true` (环境变量)

**LLM Prompt 核心逻辑**:
```
你是科研文献阅读助手。综合以下论文，针对用户问题生成综合摘要。

用户问题：{userQuestion}

要求：
1. 提取与问题最相关的 3-5 个核心发现
2. 每个发现必须标注来源（作者/机构 + 年份）
3. 保留关键数据（样本量、效果百分比等）
4. 语言通俗，家长能听懂
5. 如果研究有局限性，诚实告知
```

**输出**: 综合摘要文本（500-800字）

---

### 8.5 论文主题分类 (`topic-classifier.js`)

**功能**: 对 RAG 检索到的论文进行主题分类

**优化策略**:
- 优先从 Redis 读取预打标签（0 延迟）
- 预打标签由后台脚本 `pre-label-papers.js` 负责
- 找不到标签时使用默认分类，不实时调用 LLM

**主题列表**:
- 家庭管教/家长训练
- 动机/奖赏系统
- 执行功能/认知
- 行为干预/疗法
- 营养/微量元素
- 肠道/菌群
- 睡眠/生物钟
- 环境/组织结构
- 中医/传统医学
- 神经/心理机制（默认）

---

### 8.6 成长方案生成 (`action-plan.js`)

**功能**: 从 AI 对话中提取结构化干预方案，支持保存、打卡、导出

#### 8.7.1 方案生成 (`generateGrowthPlan`)

**触发场景**: 用户在"成长方案"页面点击刷新

**LLM Prompt 核心逻辑**:
```
从最近对话中提取干预方案：
- category: 分类（emotion/study/exercise/diet/social/sleep/school）
- painPoint: 痛点描述
- content: 干预建议
- guide: 执行指南
```

#### 8.7.2 痛点总结 (`generateSummary`)

**触发场景**: 方案保存后自动生成

**LLM Prompt 核心逻辑**:
```
基于已保存的方案条目，生成 3-5 条核心痛点总结：
- 简洁明了，一句话概括
- 按重要性排序
- 合并相似问题
```

#### 8.7.3 对话方案提取 (`saveFromChat`)

**触发场景**: 用户点击"保存方案"按钮（检测到 `<|PLAN_READY|>` 标记后）

**LLM Prompt 核心逻辑**:
```
从AI回复中提取成长方案：
- painPoint 和 explanation 可以总结提炼
- interventions 数组：按原文大段落拆分，保留完整子结构

分类定义：
- emotion: 情绪疏导（愤怒管理、焦虑缓解）
- study: 学习规划（专注力训练、时间管理）
- exercise: 运动与体能（感统训练、协调性）
- diet: 饮食与营养
- social: 社交与人际
- sleep: 睡眠与作息
- school: 家校沟通（仅限与老师沟通话术）
```

---

### 8.7 PDF 辅助内容生成 (`pdf-generator.js`)

**功能**: 为导出的 PDF 生成标题、图标等辅助字段

**设计理念**:
- 用户的 painPoint、explanation、interventions **直接复用**，不让 LLM 重写
- 只让 LLM 生成 4 个辅助字段，减少幻觉风险

**LLM Prompt 核心逻辑**:
```
为每个方案生成辅助字段（不生成完整策略）：
1. 挑战标题（4-6字精炼概括）
2. emoji 图标（根据分类选择）
3. 分类英文名（如"情绪管理" → "Emotion Management"）
4. 家长执行提示（1-2句情景化指导）
```

**输出**:
```json
{
  "titles": ["标题1", "标题2"],
  "icons": ["😤", "📚"],
  "categoryEnNames": ["Emotion Management", "Study Support"],
  "parentTips": ["前5分钟陪同是关键...", "..."]
}
```

---

### 8.8 LLM 服务汇总表

| 服务 | 文件 | 触发时机 | Token 消耗 | 备注 |
|------|------|----------|-----------|------|
| 模块路由 | `module-router.js` | 每轮对话 | ~200 | 决定注入哪些知识 |
| 事实提取 | `memory-extractor.js` | 每轮对话 | ~300 | 提取用户信息 |
| A.U.D.N. 决策 | `memory-extractor.js` | 有新事实时 | ~200 | 决定新增/更新/删除 |
| 档案语义检索 | `prompts.js` | 事实>5条时 | ~200 | Mem0 模式检索 |
| RAG 智能摘要 | `rag-service.js` | Feature Flag | ~800 | 需开启 `ENABLE_SMART_SUMMARY` |
| 论文主题分类 | `topic-classifier.js` | Redis 未命中 | ~100 | 已优化为预打标签 |
| 成长方案生成 | `action-plan.js` | 用户刷新方案 | ~500 | 从对话提取方案 |
| 痛点总结 | `action-plan.js` | 方案保存后 | ~300 | 自动生成总结 |
| 对话方案提取 | `action-plan.js` | 保存按钮 | ~400 | 结构化提取干预 |
| PDF 辅助生成 | `pdf-generator.js` | 导出 PDF 时 | ~200 | 只生成辅助字段 |

---

## 9. 文件清单

```
api/
├── core/
│   ├── prompts.js              # Prompt 构建主逻辑
│   ├── prompts-action-plan.js  # 成长方案专用 Prompt
│   ├── SYSTEM_PROMPT_LITE.md   # 主咨询顾问 prompt (git tracked)
│   ├── emotion_prompt.md       # 情绪支持 prompt (gitignored, 核心IP)
│   ├── module-router.js        # LLM 模块识别
│   ├── memory-extractor.js     # 用户信息提取 (Mem0)
│   ├── action-plan.js          # 成长方案核心逻辑 (生成/保存/打卡)
│   ├── rag-tool-definition.js  # RAG 工具定义
│   └── ...
│
├── services/
│   ├── rag-service.js          # RAG 检索执行
│   ├── topic-classifier.js     # 论文主题分类
│   ├── pdf-generator.js        # PDF 生成服务
│   ├── pdf-storage.js          # PDF 存储服务
│   └── ...
│
├── templates/
│   └── growth-plan-v2.html     # 成长方案 PDF 模板
│
├── llm/
│   └── client.js               # LLM 调用统一入口
│
└── utils/
    ├── rag-cache.js            # RAG 缓存
    └── rag-monitor.js          # RAG 监控

data/knowledge_base/modules/
├── functional_medicine.md      # 功能医学知识
├── adhd_dimensions.md          # ADHD 十维支架
├── intervention_exercise.md    # 运动干预
├── intervention_sensory.md     # 感统训练
├── intervention_tcm.md         # 中医调理
├── intervention_behavior.md    # 行为训练
└── ...
```

---

## 10. 注意事项

1. **emotion_prompt.md 是核心 IP**，不入 git，需手动同步到服务器
2. **法律要求**: 情绪支持板块首轮必须声明 AI 身份
3. **危机响应**: 最高优先级，检测到风险立即响应
4. **认知拓展**: 共情不到位就给视角 = 说教，时机很重要
5. **方案输出**: 时间安排要具体，学校建议要独立小标题

---

*文档结束 - 如有疑问请联系开发团队*
