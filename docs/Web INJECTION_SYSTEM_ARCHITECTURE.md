# Qimi AI 网页版 - 注入系统架构文档

> 版本: v1.1 | 更新日期: 2026-01-30
> 基于微信小程序架构适配，针对 Next.js + Supabase 技术栈

---

## 1. 底层技术架构对比

### 1.1 基础设施差异

| 层级 | 微信小程序 | 网页版 | 备注 |
|------|-----------|--------|------|
| **运行环境** | 微信客户端 (WebView + Native) | 浏览器 (Chrome/Safari/Edge) | 完全不同的运行时 |
| **前端框架** | 微信原生 WXML/WXSS | **Next.js 14** (React 18) | 网页版用 App Router |
| **后端运行时** | 微信云函数 (Node.js) | **Vercel Serverless** (Node.js) | 都是 Node.js，但部署方式不同 |
| **部署平台** | 腾讯云 | **Vercel** | 网页版自动 CI/CD |
| **CDN** | 微信 CDN | **Vercel Edge Network** | 全球加速 |

### 1.2 数据存储差异

| 存储类型 | 微信小程序 | 网页版 | 备注 |
|----------|-----------|--------|------|
| **用户数据库** | Redis (腾讯云) | **Supabase** (PostgreSQL) | 网页版用关系型数据库 |
| **游客本地存储** | wx.setStorageSync() | **localStorage** | API 不同，概念相同 |
| **文件存储** | 微信云存储 | **Vercel 静态文件** 或 Supabase Storage | 知识模块放 `data/` 目录 |
| **Session 管理** | 微信登录态 | **NextAuth.js** | 网页版支持多种 OAuth |

### 1.3 认证方式差异

| 项目 | 微信小程序 | 网页版 | 备注 |
|------|-----------|--------|------|
| **登录方式** | 微信一键登录 (OpenID) | **Google OAuth** / Email | NextAuth.js 管理 |
| **游客模式** | 无需登录即可用 | 无需登录即可用 | 行为一致 |
| **用户标识** | OpenID / UnionID | **Supabase User ID** (UUID) | 格式不同 |

### 1.4 API 调用差异

| 项目 | 微信小程序 | 网页版 | 备注 |
|------|-----------|--------|------|
| **HTTP 请求** | wx.request() | **fetch()** | 标准 Web API |
| **流式响应** | 不支持原生 SSE | **SSE (Server-Sent Events)** | 网页版体验更好 |
| **API 路由** | 云函数路径 | **Next.js API Routes** (`/api/*`) | RESTful 风格 |

### 1.5 网页版技术栈汇总

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Frontend)                       │
├─────────────────────────────────────────────────────────────┤
│  Framework:     Next.js 14 (App Router)                     │
│  UI Library:    React 18 + TypeScript                       │
│  Styling:       Tailwind CSS                                │
│  State:         Zustand + React Context                     │
│  Auth UI:       NextAuth.js                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        后端 (Backend)                        │
├─────────────────────────────────────────────────────────────┤
│  Runtime:       Vercel Serverless Functions (Node.js 18)    │
│  API Style:     Next.js API Routes (/pages/api/*)           │
│  Auth:          NextAuth.js (JWT Sessions)                  │
│  LLM:           DeepSeek API (deepseek-chat)                │
│  RAG:           Custom implementation (可选)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       数据层 (Data)                          │
├─────────────────────────────────────────────────────────────┤
│  Database:      Supabase (PostgreSQL)                       │
│  ORM:           Supabase JS Client (直接查询)                │
│  Guest Storage: Browser localStorage                        │
│  File Storage:  Local /data directory (知识模块)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      部署 (Deployment)                       │
├─────────────────────────────────────────────────────────────┤
│  Platform:      Vercel                                      │
│  CI/CD:         Git Push → Auto Deploy                      │
│  Domain:        Custom domain via Vercel                    │
│  SSL:           Auto (Vercel managed)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 注入逻辑对比

### 2.1 可复用 vs 需重写

| 类别 | 可复用 ✅ | 需重写 ❌ |
|------|----------|----------|
| **Prompt 相关** | 模板 (.md)、注入逻辑、模块路由 Prompt | - |
| **业务逻辑** | 挑战分类定义、年龄计算逻辑 | - |
| **基础设施** | - | API 路由、数据库 Schema、认证流程、存储读写 |

### 2.2 代码映射关系

| 微信小程序 | 网页版 | 状态 |
|-----------|--------|------|
| `prompts.js` | `lib/prompts.ts` | ✅ 已移植 |
| `module-router.js` | `lib/module-router.ts` | ✅ 已移植 |
| `profile.js` | `utils/guest-storage.ts` + Supabase | ⚠️ 部分实现 |
| `memory-extractor.js` | 待实现 | ❌ Phase 3 |
| `challenge-config.js` | `GuestOnboarding.tsx` 内嵌 | ✅ 已有 |

**核心结论**：Prompt 注入逻辑已完整移植，只需接通前端数据流。

---

## 3. 注入系统总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    完整 System Prompt 组装                       │
│                   (lib/prompts.ts)                              │
└─────────────────────────────────────────────────────────────────┘
                              ↑
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Base Prompt   │  │  动态模块注入    │  │  静态附加注入    │
│ (system-prompt- │  │ (injectModules) │  │ (Value Preview  │
│   lite.ts)      │  │                 │  │  + Triggers)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              ↑                    ↑
                     ┌────────┴────────┐   ┌──────┴──────┐
                     │  DeepSeek 路由   │   │  用户档案    │
                     │ (module-router) │   │ (Profile)   │
                     └─────────────────┘   └─────────────┘
                                                  ↑
                                    ┌─────────────┴─────────────┐
                                    ↓                           ↓
                           ┌──────────────┐            ┌──────────────┐
                           │  游客模式     │            │  登录用户     │
                           │ localStorage │            │  Supabase   │
                           └──────────────┘            └──────────────┘
```

---

## 4. 数据流：从收集到注入

### 4.1 游客模式数据流

```
[Onboarding 引导页]
        │
        │ 1. 用户选择孩子生日、挑战、首个问题
        ↓
[guestStorage.initSession()]  ──→  localStorage
        │                              │
        │                              │ qimi_guest_data
        ↓                              ↓
[chat.tsx 发送消息]           {
        │                       childBirthday: {year, month},
        │ 2. 读取 localStorage    challenges: [...],
        │    构造 userProfile     chatHistory: [...]
        ↓                     }
[POST /api/chat/stream]
        │
        │ body: { content, userProfile }
        ↓
[buildSystemMessage(userProfile)]
        │
        │ 3. 注入到 system prompt
        ↓
[DeepSeek API 调用]
```

### 4.2 登录用户数据流

```
[登录成功]
        │
        │ 1. 迁移游客数据到 Supabase
        ↓
[/api/user/migrate-guest-data]  ──→  Supabase
        │                              │
        │                              │ user_profiles 表
        ↓                              ↓
[chat.tsx 发送消息]           {
        │                       user_id,
        │ 2. 从 Supabase 读取    child_birthday,
        │    或从 session 获取   challenges,
        ↓                       family_notes
[POST /api/chat/stream]       }
        │
        │ body: { content, userProfile }
        ↓
[buildSystemMessage(userProfile)]
```

---

## 5. 现有代码清单

### 5.1 已实现 ✅

| 文件 | 功能 | 状态 |
|------|------|------|
| `lib/prompts.ts` | Prompt 组装主入口 | ✅ 完整 |
| `lib/prompts.ts:buildSystemMessage()` | 完整组装函数 | ✅ 完整 |
| `lib/prompts.ts:buildUserContextSection()` | 用户档案注入 | ✅ 完整 |
| `lib/prompts.ts:injectModules()` | 动态模块注入 | ✅ 完整 |
| `lib/module-router.ts` | LLM 模块识别 | ✅ 完整 |
| `lib/system-prompt-lite.ts` | 基础 Prompt | ✅ 完整 |
| `utils/guest-storage.ts` | 游客数据存储 | ✅ 完整 |
| `pages/api/chat/stream.ts` | Chat API | ✅ 支持 userProfile 参数 |

### 5.2 待实现 ❌

| 文件 | 功能 | 状态 |
|------|------|------|
| `pages/chat.tsx` | 发送 userProfile 到 API | ❌ **未接入** |
| `lib/supabase.ts` | 用户档案表 | ❌ 需要新增表 |
| `pages/api/user/profile.ts` | 档案 CRUD API | ❌ 未创建 |

---

## 6. 实现计划

### Phase 1: 游客档案注入 (Sprint 1.4)

**目标**：让 AI 知道游客的孩子年龄和关注挑战

**改动文件**：
1. `pages/chat.tsx` - 读取 localStorage，传递 userProfile

**代码改动**：

```typescript
// pages/chat.tsx - 在发送消息时构造 userProfile

const sendMessage = async (content: string) => {
  // 构造 userProfile（游客模式）
  let userProfile = null;
  if (isGuest) {
    const guestData = guestStorage.get();
    if (guestData) {
      userProfile = {
        childBirthday: guestData.childBirthday,
        challenges: guestData.challenges,
      };
    }
  }

  // 发送到 API
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({
      content,
      conversationHistory,
      userProfile,  // ← 新增
    }),
  });
};
```

**验证方式**：
1. 完成 onboarding，选择孩子年龄和挑战
2. 发送消息 "我孩子最近专注力不好"
3. 检查 AI 回复是否提到了孩子的具体年龄

---

### Phase 2: 登录用户档案 (Sprint 2+)

**目标**：用户登录后，档案持久化到数据库

**数据库表设计**：

```sql
-- Supabase: user_profiles 表
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_birthday DATE,
  challenges JSONB,  -- [{id, name, categoryId, categoryName}]
  family_notes TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS 策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### Phase 3: Mem0 语义检索 (未来)

**触发条件**：用户 extractedFacts > 5 条

**架构选择**：

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| LLM 检索 (当前小程序方案) | 简单、准确 | 每次多一次 LLM 调用 | ✅ 先用这个 |
| 向量数据库 (Supabase pgvector) | 更快、更便宜 | 需要 embedding | 未来优化 |

---

## 7. 注入内容详解

### 7.1 用户档案注入格式

```typescript
// lib/prompts.ts:buildUserContextSection() 输出示例

### User Profile Context
The following is information about this user and their child. Please consider this background when responding:

**Child's Age**: 7 years 3 months

**Parent's Concerns**:
- 注意力: 做着做着走神
- 情绪管理: 动不动发脾气

**How to Use Profile Information**:
1. **Be accurate**: Profile info is from "records", not something the user "just mentioned"
2. **Use selectively**: Only reference information directly relevant to the current question
3. **Show understanding**: Make insights based on the profile, don't just repeat it
```

### 7.2 静态注入内容

| 模块 | 位置 | 内容摘要 |
|------|------|---------|
| Value Preview | `lib/prompts.ts:103` | 第1轮告知用户可获得个性化方案 |
| Plan Generation | `lib/prompts.ts:123` | 方案生成前先问时间安排和学校场景 |
| Interactive Trigger | `lib/prompts.ts:148` | 输出 `<\|DSML\|>` 标记触发保存按钮 |

---

## 8. 配置项

### 8.1 环境变量

```bash
# .env.local
DEEPSEEK_API_KEY=sk-xxx          # 主对话 LLM
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 模块路由也用 DeepSeek（在 module-router.ts 中配置）
```

### 8.2 挑战分类 (与小程序一致)

定义在 `components/Chat/GuestOnboarding.tsx` 中：

| 分类 ID | 名称 | 子项示例 |
|--------|------|---------|
| `emotion` | 情绪管理 | 动不动发脾气、情绪说变就变 |
| `focus` | 注意力 | 做着做着走神、迟迟不开始 |
| `control` | 自控力 | 爱打断别人、想到就说 |
| `study` | 学习 | 作业拖拉磨蹭、读不懂题 |
| `social` | 社交 | 没朋友、老起冲突 |
| `daily` | 日常生活 | 晚不睡早不起、吃饭难伺候 |
| `parent` | 家长状态 | 忍不住发火、身心俱疲 |

---

## 9. 测试验证

### 9.1 Phase 1 验证步骤

1. **准备**：清除 localStorage，重新完成 onboarding
2. **选择**：孩子 2019年3月出生，关注"注意力-做着做着走神"
3. **发送**：任意消息
4. **检查**：
   - 浏览器 Network 面板，查看 `/api/chat/stream` 请求 body
   - 确认 `userProfile` 字段包含 `childBirthday` 和 `challenges`
   - 检查 AI 回复是否针对 "6岁左右的孩子" 给建议

### 9.2 日志检查

```
[Prompts] Injected user context, added 342 characters
[Prompts] Complete system prompt built, total 8532 characters
```

---

## 10. 与微信版差异总结

| 项目 | 微信小程序 | 网页版 | 影响 |
|------|-----------|--------|------|
| familyNotes | Redis 存储 | Supabase 存储 | 无 |
| extractedFacts | Redis + Mem0 | Phase 3 实现 | 暂无 |
| 模块文件 | 云存储 | 本地 `data/` 目录 | 无 |
| Interactive Trigger | 触发小程序组件 | 触发 React 组件 | 前端适配 |

---

## 11. 下一步行动

- [ ] **Sprint 1.4**：实现 Phase 1（游客档案注入）
- [ ] **Sprint 2+**：实现 Phase 2（登录用户档案持久化）
- [ ] **未来**：实现 Phase 3（Mem0 语义检索）

---

*文档结束 - 技术团队讨论通过*
