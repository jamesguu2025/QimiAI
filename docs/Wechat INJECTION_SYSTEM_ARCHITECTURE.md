# ADHD Helper - 注入系统架构文档

> 供 Qimi AI 网页版搭建 Agent 参考
> 版本: v2.1 | 更新日期: 2026-01-30

---

## 1. 注入系统总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    完整 System Prompt 组装                       │
└─────────────────────────────────────────────────────────────────┘
                              ↑
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Base Prompt   │  │  动态模块注入    │  │  静态附加注入    │
│ (主咨询/情绪)    │  │ (Context Inject) │  │ (Common Sections)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              ↑                    ↑
                     ┌────────┴────────┐   ┌──────┴──────┐
                     │  LLM 模块路由    │   │  用户档案    │
                     │ (module-router)  │   │  (Profile)  │
                     └─────────────────┘   └─────────────┘
```

---

## 2. 注入内容分类

| 类型 | 注入时机 | 注入条件 | 适用板块 | 来源文件 |
|------|---------|---------|---------|---------|
| **动态知识模块** | 每轮对话 | LLM 识别需要 | ⚠️ 仅主咨询 | `module-router.js` |
| **用户档案** | 每轮对话 | 用户有档案 | 所有板块 | `prompts.js` |
| **价值预告** | 每轮对话 | 始终注入 | 所有板块 | `prompts.js` (硬编码) |
| **方案前置检查** | 每轮对话 | 始终注入 | 所有板块 | `prompts.js` (硬编码) |
| **Interactive Trigger** | 每轮对话 | 始终注入 | 所有板块 | `prompts.js` (硬编码) |

---

## 3. 动态知识模块注入

### 3.1 模块列表

| 模块名 | 文件 | 触发场景 |
|--------|------|---------|
| `functional_medicine` | `functional_medicine.md` | 睡眠、肠胃、营养、血糖、过敏 |
| `adhd_dimensions` | `adhd_dimensions.md` | 综合分析、十维支架 |
| `intervention_exercise` | `intervention_exercise.md` | 运动、跳绳、体能 |
| `intervention_sensory` | `intervention_sensory.md` | 感统、前庭、触觉 |
| `intervention_tcm` | `intervention_tcm.md` | 中医症候、睡眠出汗 |
| `intervention_behavior` | `intervention_behavior.md` | 行为管理、习惯、拖延 |

### 3.2 注入流程

```javascript
// prompts.js - injectModules()
async function injectModules(userMessage, conversationHistory) {
  // 1. 调用 LLM 识别需要的模块
  const relevantModules = await identifyRelevantModules(userMessage, conversationHistory);

  // 2. 加载对应的 markdown 文件
  for (const moduleName of relevantModules) {
    const content = fs.readFileSync(`modules/${moduleName}.md`);
    injectedParts.push(`### Dynamic Module Injection: ${moduleName}\n${content}`);
  }

  // 3. 返回组装后的内容
  return `\n\n# Context Injection (Dynamic Knowledge Modules)\n${injectedParts.join('\n')}`;
}
```

### 3.3 模块路由 LLM Prompt

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

输出格式：JSON数组，如 ["functional_medicine", "intervention_tcm"]
```

---

## 4. 用户档案注入

### 4.1 档案数据结构 (`profile.js`)

```javascript
{
  userId: string,
  child_birthday: "YYYY-MM-DD",      // 必填
  child_age: number,                  // 自动计算
  challenges: [{                      // 引导流程选择的挑战
    category: "emotion",
    items: ["tantrums", "mood_swings"]
  }],
  familyNotes: string,                // 家庭情况自由文本
  extractedFacts: [{                  // AI 提取的事实 (Mem0)
    id: "fact_xxx",
    category: "child_info",           // 10种分类
    key: "child_name",
    value: "小明",
    confidence: 1.0,
    source: { threadId, messageIndex, extractedAt }
  }],
  onboarding_completed: boolean
}
```

### 4.2 档案注入策略 (`prompts.js` - `buildUserContextSection`)

| 字段 | 注入策略 | 说明 |
|------|---------|------|
| **孩子年龄** | ✅ 始终注入 | 核心信息 |
| **家长关注的挑战** | ✅ 始终注入 | 核心信息，格式化显示 |
| **相关背景信息** | 🔍 Mem0 语义检索 | 只注入与当前问题相关的事实（≤5条） |
| **家庭背景参考** | ✅ 始终注入 | 短文本（<500字），作为参考资料 |

### 4.3 Mem0 语义检索 (`retrieveRelevantFacts`)

**触发条件**: extractedFacts 数量 > 5 条

**LLM Prompt**:
```
你是一个信息筛选助手。请判断以下哪些事实与用户当前的问题**直接相关**。

## 用户当前问题
${userMessage}

## 已记录的事实
[{ index: 0, category: "concern", key: "parent_worry", value: "担心孩子专注力" }, ...]

## 判断标准
- 直接相关：该事实对回答用户问题有帮助
- 间接相关：可能有些关联但不是必须的
- 不相关：与当前问题完全无关

## 输出格式
返回相关事实的 index 数组，最多5个。
示例：[0, 2, 4]
```

### 4.4 挑战分类定义 (`challenge-config.js`)

| 分类 ID | 名称 | 子项示例 |
|--------|------|---------|
| `emotion` | 情绪管理 | 动不动发脾气、情绪说变就变、遇挫就崩溃 |
| `focus` | 注意力 | 做着做着走神、迟迟不开始、坚持不了几分钟 |
| `control` | 自控力 | 爱打断别人、想到就说、等不了 |
| `study` | 学习 | 作业拖拉磨蹭、读不懂题、写字歪扭 |
| `social` | 社交 | 没朋友、老起冲突、玩着就过火 |
| `daily` | 日常生活 | 晚不睡早不起、吃饭难伺候、离不开手机 |
| `parent` | 家长状态 | 忍不住发火、身心俱疲、觉得是我的错 |
| `medication` | 诊断用药 | 不确定是不是、犹豫要不要用药 |

### 4.5 事实提取分类 (extractedFacts)

| 分类 | 说明 | 示例 |
|------|------|------|
| `child_info` | 孩子基本信息 | 姓名、性别、学校 |
| `school` | 学习相关 | 年级、成绩、科目偏好 |
| `family` | 家庭情况 | 家庭结构、带娃主力 |
| `behavior` | 行为表现 | 具体行为描述 |
| `preference` | 偏好兴趣 | 喜欢的活动、讨厌的事 |
| `medical` | 医疗相关 | 诊断、用药、就医经历 |
| `concern` | 家长担忧 | "我担心..." |
| `goal` | 家长期望 | "我希望..." |
| `progress` | 进步记录 | "他今天主动..." |
| `sports` | 运动相关 | 正在学的运动 |

---

## 5. 静态附加注入

### 5.1 价值预告 (Value Preview)

**目的**: 第1轮就告诉用户继续聊可以获得个性化方案

**注入内容**:
```markdown
### 价值预告能力（重要）
当你识别到用户在讨论 ADHD 干预相关问题时，**必须在第1轮回复的末尾**就告诉用户继续聊下去能获得什么。

**触发条件**：用户提到任何 ADHD 干预相关话题

**做法**：在回复结束后加上：
"继续和我聊，我会帮你整理成一份**个性化成长方案**，可以保存下来随时查看~"

**注意**：
- 每次对话只提1次
- "个性化成长方案"必须用加粗格式
- 纯闲聊、打招呼时不提
```

---

### 5.2 方案生成前置检查 (Pre-Generation Check)

**目的**: 生成方案前确认时间安排和学校场景

**注入内容**:
```markdown
### 方案生成前置检查

**1. 时间安排（先给建议，再问调整）**
不要问家长"打算执行多久"——他们往往没概念。
直接给出合理的时间安排，然后问是否需要调整：
- "我建议先试2周，每天15-20分钟，放学后做。这个安排对您可行吗？"

**2. 学校场景（按需问 + 智能判断是否问老师沟通难度）**
当涉及学习、专注力、课堂表现等话题时：
- 先问："需要我也给一些学校里的建议吗？"
- 如果需要，AI 先判断自己要给的建议是否需要老师配合：
  - 需要老师配合（如座位调整）→ 问："您觉得孩子的老师好沟通吗？"
  - 只涉及孩子自己能做的事 → 跳过这个问题
- 根据回答调整建议：
  - 老师好沟通 → 正常给沟通话术
  - 老师不好沟通 → 给"低依赖老师"的方案
```

---

### 5.3 Interactive Trigger (交互触发)

**目的**: 让 AI 输出标记，触发前端显示"保存方案"按钮

**注入内容**:
```markdown
### 交互触发规则 (Interactive Trigger)
当你的回复包含**具体、可执行的干预方案**时，在回复最后一行输出标记：

<|DSML|invoke name="propose_save_plan" parameter="category:分类名称"/><|DSML|>

**分类选项**：math | exercise | sleep | diet | emotion | focus | social

**输出标记的条件**（必须同时满足）：
1. 至少2条具体行动步骤（不是方向或询问）
2. 包含时间/频率/数量等具体参数

**不输出标记**：询问、列举方向、解释原因、以问号结尾

**格式**：标记单独占一行，放在回复最后，不要解释
```

---

## 6. 注入顺序与组装

### 6.1 完整组装流程 (`buildSystemMessage`)

```javascript
async function buildSystemMessage(userProfile, ..., userMessage) {
  let basePrompt;

  // 1. 选择基础 Prompt
  if (folderKey === 'emotion') {
    basePrompt = loadEmotionSupportPrompt();  // 情绪模块
  } else {
    basePrompt = loadLitePrompt();            // 主咨询模块

    // 2. 动态模块注入（仅主咨询）
    const injectedModules = await injectModules(userMessage, conversationHistory);
    if (injectedModules) {
      basePrompt += injectedModules;
    }
  }

  // 3. 价值预告（始终注入）
  basePrompt += VALUE_PREVIEW_SECTION;

  // 4. 方案前置检查（始终注入）
  basePrompt += PRE_GENERATION_CHECK_SECTION;

  // 5. Interactive Trigger（始终注入）
  basePrompt += INTERACTIVE_TRIGGER_SECTION;

  // 6. 用户档案注入（如有）
  const userContextSection = await buildUserContextSection(userProfile, userMessage);
  if (userContextSection) {
    basePrompt += userContextSection;
  }

  return basePrompt;
}
```

### 6.2 最终 Prompt 结构

```
┌─────────────────────────────────────────────────────────────┐
│ # Base Prompt (SYSTEM_PROMPT_LITE.md 或 emotion_prompt.md)  │
│   - 角色定义                                                 │
│   - 核心规则 (#RULE_xxx)                                     │
│   - 对话流程                                                 │
├─────────────────────────────────────────────────────────────┤
│ # Context Injection (Dynamic Knowledge Modules)            │  ← 按需
│   - functional_medicine.md                                  │
│   - intervention_exercise.md                                │
│   - ...                                                     │
├─────────────────────────────────────────────────────────────┤
│ ### 价值预告能力                                             │  ← 始终
├─────────────────────────────────────────────────────────────┤
│ ### 方案生成前置检查                                         │  ← 始终
├─────────────────────────────────────────────────────────────┤
│ ### 交互触发规则 (Interactive Trigger)                       │  ← 始终
├─────────────────────────────────────────────────────────────┤
│ ### 用户档案信息 (User Profile Context)                      │  ← 如有
│   - 孩子年龄                                                 │
│   - 家长关注的挑战                                            │
│   - 相关背景信息 (Mem0 检索)                                  │
│   - 家庭背景参考                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 文件清单

```
api/
├── core/
│   ├── prompts.js              # 注入主逻辑
│   │   ├── buildSystemMessage()      # 完整组装
│   │   ├── injectModules()           # 动态模块注入
│   │   ├── buildUserContextSection() # 用户档案注入
│   │   └── retrieveRelevantFacts()   # Mem0 语义检索
│   │
│   ├── module-router.js        # LLM 模块识别
│   ├── profile.js              # 用户档案 CRUD
│   ├── memory-extractor.js     # 事实提取 (Mem0)
│   └── ...
│
├── config/
│   └── challenge-config.js     # 挑战分类定义
│
└── ...

data/knowledge_base/modules/
├── functional_medicine.md
├── adhd_dimensions.md
├── intervention_exercise.md
├── intervention_sensory.md
├── intervention_tcm.md
└── intervention_behavior.md
```

---

## 8. 网页版适配要点

### 8.1 档案同步

- 用户首次使用需完成引导流程（选择挑战、填写家庭情况）
- `onboarding_completed` 标记是否完成引导
- 档案存储在 Redis，用 `userId` 作为 key

### 8.2 Mem0 语义检索

- 事实 > 5 条时启用语义检索，减少 token 消耗
- 检索失败时降级返回前 5 条
- 每条事实带 `source` 追溯来源对话

### 8.3 模块路由

- **仅主咨询板块**会调用 LLM 判断需要哪些知识模块（情绪板块跳过）
- 模块文件存储在 `data/knowledge_base/modules/` 目录
- 注入格式：`### Dynamic Module Injection: {filename}\n{content}`

### 8.4 Interactive Trigger 解析

- 检测 `<|DSML|invoke name="propose_save_plan"...` 标记
- 提取 `category` 参数，用于分类展示
- 触发时显示"保存方案"按钮

---

## 9. 注意事项

1. **familyNotes 始终注入**：行业规范，短文本档案不做按需检索，而是标注为"参考资料"让 AI 按需提取
2. **挑战格式兼容**：支持前端格式 `[{id, name, categoryId}]` 和后端格式 `[{category, items}]`
3. **年龄自动计算**：每次读取档案时根据 `child_birthday` 重新计算年龄
4. **模块注入仅主咨询**：情绪支持模块使用单一 prompt，不做动态模块注入

---

*文档结束 - 如有疑问请联系开发团队*
