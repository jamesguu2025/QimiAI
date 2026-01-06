# Qimi AI Web 版架构规划方案

## 项目概述

将现有微信小程序（星伴AI+）扩展为面向欧美市场的网页版，保持设计风格一致，集成 Stripe 支付，符合 GDPR 合规要求。

---

## 一、技术栈选型

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.1.1 (App Router) | 框架（SSR/SSG/ISR）✅ 已升级至最新版 |
| **React** | 18 | UI 库 |
| **TypeScript** | 5.x | 类型安全 |
| **Tailwind CSS** | 3.x | 样式系统 |
| **shadcn/ui** | latest | 组件库 |
| **Zustand** | 4.x | 状态管理 |
| **NextAuth.js** | 5.x | 认证 |

### 后端（复用现有 85-90%）
| 技术 | 说明 |
|------|------|
| **Node.js** | 20 LTS |
| **Express.js** | 现有 API 服务器 |
| **Redis** | 会话、缓存、消息历史 |
| **PostgreSQL** | 新增：支付记录、审计日志 |

### LLM 提供商
| 模型 | 用途 | 成本 |
|------|------|------|
| **GPT-4o-mini** | 主要对话（性价比最高） | $0.15/$0.60 per 1M tokens |
| **GPT-4o** | 复杂推理（Premium 用户） | $2.50/$10 per 1M tokens |
| **GPT-4-vision** | 图片识别 | 按 GPT-4o 计费 |

### 部署架构
```
CloudFlare (CDN + DDoS 防护)
    │
    ├─→ Vercel (前端托管)
    │   ├─ Next.js SSR/SSG
    │   ├─ Edge Functions
    │   └─ 自动 HTTPS
    │
    └─→ AWS / Railway (后端)
        ├─ Node.js API 服务器
        ├─ Redis (Upstash 或 AWS ElastiCache)
        └─ PostgreSQL (Supabase 或 AWS RDS)
```

---

## 二、核心功能模块

### 2.1 认证系统

**支持的登录方式**：
- Google OAuth 2.0
- Apple Sign-In
- Email Magic Link

**实现方案**：NextAuth.js v5 + JWT

```typescript
// 关键文件：web-app/app/api/auth/[...nextauth]/route.ts
const authOptions = {
  providers: [
    GoogleProvider({ clientId, clientSecret }),
    AppleProvider({ clientId, clientSecret }),
    EmailProvider({ sendVerificationRequest })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // 调用后端 /auth/login 映射 userId
      const { userId } = await mapPlatformUser(account.provider, user.id);
      return true;
    }
  }
};
```

**后端改造**：扩展 `api/core/user-manager.js`
- 新增平台类型：`web_google`, `web_apple`, `web_email`
- 复用现有 userId 映射逻辑

### 2.2 支付系统（Stripe）

**订阅方案**：

| 方案 | 价格 | 功能限制 |
|------|------|---------|
| **Free** | $0 | 10条对话/天，无PDF导出 |
| **Basic** | $9.99/月 | 100条对话/天，PDF导出 |
| **Premium** | $19.99/月 | 无限制，优先支持 |

**关键流程**：
```
用户点击订阅 → 创建 Stripe Checkout Session
    → 重定向到 Stripe 支付页
    → 支付成功 → Webhook 回调
    → 更新数据库订阅状态
    → 刷新前端权限
```

**新增文件**：
- `api/routes/stripe-webhook.js` - Webhook 处理
- `api/core/subscription.js` - 订阅管理逻辑

### 2.3 AI 对话（复用现有）

**复用模块**：
- `api/server.js` - POST `/adviser/chat` 端点
- `api/llm/client.js` - LLM 调用抽象层
- `api/services/rag-service.js` - RAG 检索
- `api/core/session.js` - Token 管理

**改造点**：
1. 扩展 `llm/client.js` 支持 OpenAI
2. 添加流式响应端点 `POST /adviser/chat-stream`
3. 添加订阅层级限流

### 2.4 成长方案 + PDF 导出

**复用模块**：
- `api/routes/action-plan.js` - 方案 CRUD
- `api/core/action-plan.js` - 业务逻辑

**新增功能**：
- PDF 生成：使用 `@react-pdf/renderer`
- 付费墙：Basic/Premium 用户可用

---

## 三、数据库设计

### PostgreSQL 新增表（支付 + 审计）

```sql
-- 用户表（扩展 Redis 用户数据）
CREATE TABLE users (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,  -- 关联 Redis userId
    email VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    tier VARCHAR(50) NOT NULL,  -- free, basic, premium
    status VARCHAR(50) NOT NULL,  -- active, canceled, past_due
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 支付记录
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 使用量日志（用于限流统计）
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50),  -- chat, rag, pdf_export
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Redis Key 扩展

```
# 新增 Web 相关 Key
adhd:web:subscription:{userId}     # 缓存订阅状态
adhd:web:usage:{userId}:{date}     # 每日使用量
adhd:web:rate_limit:{userId}:{min} # 分钟级限流
```

---

## 四、API 设计

### 新增端点（v2）

```
# 认证
POST   /api/v2/auth/callback      # OAuth 回调
POST   /api/v2/auth/refresh       # 刷新 Token
GET    /api/v2/auth/me            # 获取当前用户

# 订阅
GET    /api/v2/subscription       # 获取订阅状态
POST   /api/v2/subscription/checkout  # 创建支付会话
POST   /api/v2/subscription/portal    # 客户管理门户
POST   /api/v2/stripe/webhook     # Stripe Webhook

# 对话（扩展现有）
POST   /api/v2/chat/stream        # SSE 流式响应

# PDF 导出
POST   /api/v2/action-plan/export # 生成 PDF
```

### 版本策略
- `/api/v1/*` - 微信小程序（现有）
- `/api/v2/*` - Web 版本（新增）
- `/api/*` - 共享端点（auth, health）

---

## 五、前端页面结构

```
web-app/
├── app/
│   ├── (marketing)/          # 营销页面（SSG）
│   │   ├── page.tsx          # 首页
│   │   ├── pricing/page.tsx  # 定价页
│   │   └── about/page.tsx    # 关于
│   │
│   ├── (auth)/               # 认证页面
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── (dashboard)/          # 应用主体（需登录）
│   │   ├── layout.tsx        # 侧边栏布局
│   │   ├── chat/page.tsx     # 对话列表
│   │   ├── chat/[id]/page.tsx # 对话详情
│   │   ├── profile/page.tsx  # 用户档案
│   │   ├── action-plan/page.tsx # 成长方案
│   │   └── settings/page.tsx # 设置
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── stripe/webhook/route.ts
│   │
│   └── layout.tsx            # 根布局
│
├── components/
│   ├── chat/                 # 对话组件
│   ├── ui/                   # shadcn/ui
│   └── layout/               # 布局组件
│
└── lib/
    ├── api-client.ts         # API 调用封装
    ├── stripe.ts             # Stripe 客户端
    └── auth.ts               # 认证工具
```

---

## 六、安全措施

### 认证安全
- JWT RS256 签名（非对称加密）
- Access Token 15分钟过期
- Refresh Token 7天，单次使用后轮换
- PKCE 流程（OAuth）

### API 安全
- 所有请求 HTTPS（TLS 1.3）
- CORS 白名单
- Rate Limiting（Redis 滑动窗口）
- 输入验证（Zod）
- 输出过滤（复用现有 `filterOutputSafety()`）

### 支付安全
- Stripe Webhook 签名验证
- 幂等性处理（防重复）
- PCI DSS 合规（Stripe 托管）

### GDPR 合规
- 数据导出 API
- 账户删除 API
- Cookie 同意弹窗
- 隐私政策页面

---

## 七、国际化（i18n）

### 支持语言
- English (en) - 默认
- Spanish (es)
- German (de)
- French (fr)

### 实现方案
- `next-intl` 库
- URL 路径前缀：`/en/`, `/es/`, `/de/`, `/fr/`
- 服务端渲染翻译内容

---

## 八、实施阶段

### Phase 1: 基础设施（2周）
- [ ] 创建 Next.js 项目 + TypeScript 配置
- [ ] 部署 Vercel（前端）
- [ ] 部署后端（Railway/AWS）
- [ ] 配置 PostgreSQL（Supabase）
- [ ] 配置 Redis（Upstash）

### Phase 2: 认证系统（1周）
- [ ] NextAuth.js 配置（Google, Apple, Email）
- [ ] 后端 `/auth/login` 扩展 Web 平台
- [ ] JWT 刷新机制
- [ ] 用户注册流程

### Phase 3: 核心功能（3周）
- [ ] 对话页面 + 流式响应
- [ ] 侧边栏历史记录
- [ ] 用户档案页面
- [ ] 成长方案页面
- [ ] RAG 集成

### Phase 4: 支付系统（2周）
- [ ] Stripe 账户配置
- [ ] 订阅方案创建
- [ ] Checkout 流程
- [ ] Webhook 处理
- [ ] 订阅状态同步

### Phase 5: PDF + 高级功能（1周）
- [ ] PDF 生成模块
- [ ] 付费墙实现
- [ ] 使用量限流

### Phase 6: 合规 + 上线（1周）
- [ ] GDPR 功能（导出、删除）
- [ ] 隐私政策、服务条款
- [ ] Cookie 同意
- [ ] 监控告警配置
- [ ] 生产环境部署

**总计：约 10 周**

---

## 九、关键文件修改清单

### 后端（现有代码改造）

| 文件 | 改动 | 说明 |
|------|------|------|
| `api/core/user-manager.js` | 扩展 | 添加 web_google, web_apple, web_email 平台 |
| `api/llm/client.js` | 扩展 | 添加 OpenAI GPT-4 支持 |
| `api/core/session.js` | 扩展 | 添加订阅层级限流 |
| `api/server.js` | 扩展 | 添加 v2 路由、Stripe webhook |

### 后端（新增文件）

| 文件 | 用途 |
|------|------|
| `api/routes/stripe-webhook.js` | Stripe 事件处理 |
| `api/core/subscription.js` | 订阅管理逻辑 |
| `api/routes/v2/auth.js` | Web 认证路由 |
| `api/routes/v2/chat.js` | 流式对话路由 |

### 前端（全新项目）

| 目录/文件 | 用途 |
|----------|------|
| `web-app/` | Next.js 项目根目录 |
| `app/(dashboard)/chat/` | 对话页面 |
| `app/(dashboard)/action-plan/` | 成长方案页 |
| `components/chat/` | 对话组件 |
| `lib/api-client.ts` | 后端 API 封装 |

---

## 十、成本估算

### 月度固定成本
| 项目 | 免费层 | 付费层 |
|------|--------|--------|
| Vercel | $0 | $20/月起 |
| Railway/Render | $0 | $20/月起 |
| Supabase | $0 | $25/月起 |
| Upstash Redis | $0 | $10/月起 |
| CloudFlare | $0 | $20/月起 |

**初期（<1000用户）**：$0-50/月
**成长期（1000-10000用户）**：$100-300/月

### 变动成本（LLM）
- GPT-4o-mini：~$0.001/次对话（假设平均 1000 tokens）
- 1000 用户 × 10 对话/天 = ~$300/月

---

## 十一、风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| LLM 成本失控 | 严格限流 + 使用量监控 + 告警 |
| Stripe 支付纠纷 | 退款政策 + 客服响应 |
| GDPR 合规风险 | 法律审查 + 数据处理协议 |
| 安全漏洞 | 定期审计 + Dependabot + WAF |
| **Next.js RCE 漏洞** | ✅ 已使用 16.1.1 版本，已修复（CVE-2025-55182 React2Shell） |

---

---

## 十二、Landing Page 组件架构

### 已实现的 Landing 组件

```
components/Landing/
├── Hero.tsx           # Hero 区块（Premium Glass Capsules 设计）
├── HowItWorks.tsx     # 3 步骤使用指南
├── FAQ.tsx            # 常见问题手风琴
├── PricingCard.tsx    # 定价卡片
├── ArticleCard.tsx    # 博客/资源预览卡片
├── SocialProof.tsx    # 社会认证（waitlist 计数器）
└── FeatureCard.tsx    # 功能特性卡片
```

### 设计特点
- **Premium Glass Capsules**：Hero 区域交互式胶囊标签，hover 显示 tooltip
- **行业标准 Landing 结构**：Hero → Social Proof → How It Works → Resources → Pricing → FAQ → Footer
- **ADHD 友好设计**：减少认知负担、高对比度、清晰视觉层次

---

## 十三、博客系统方案

### 方案对比

| 方案 | 成本 | 安全性 | 便利性 | SEO | 推荐指数 |
|------|------|--------|--------|-----|---------|
| **MDX + Next.js (自建)** | $0 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Sanity CMS | $0-99/月 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Contentful | $0-489/月 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Ghost (托管) | $9-199/月 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| WordPress | $0-25/月 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

### 推荐方案：MDX + Next.js (自建)

**优势**：
- ✅ 零成本（无第三方服务费）
- ✅ 完全控制（无 vendor lock-in）
- ✅ 最佳 SEO（SSG 静态生成）
- ✅ 与现有 Next.js 项目无缝集成
- ✅ 安全（无数据库、无后台面板攻击面）
- ✅ 符合行业规范（Medium、Vercel Blog 同款技术）

**实现架构**：
```
content/
└── blog/
    ├── adhd-sleep-research-2025.mdx
    ├── executive-function-strategies.mdx
    └── nutrition-and-focus.mdx

pages/
└── blog/
    ├── index.tsx          # 博客列表页
    └── [slug].tsx         # 博客详情页

lib/
└── blog.ts                # 博客工具函数（读取 MDX、解析 frontmatter）
```

**文章格式**（MDX + Frontmatter）：
```mdx
---
title: "ADHD 与睡眠：2025 最新研究解读"
slug: "adhd-sleep-research-2025"
date: "2025-01-05"
category: "Research"
tags: ["ADHD", "睡眠", "研究"]
excerpt: "最新研究表明，改善睡眠质量可显著提升 ADHD 儿童的注意力..."
author: "Qimi AI"
sourceInfo: "基于 Harvard Medical School 2024 研究改写"
---

# ADHD 与睡眠的关系

研究表明...

<Callout type="tip">
  家长可以尝试以下方法...
</Callout>
```

**AI 转写版权合规流程**：
```
1. 收集论文 → PubMed, Google Scholar, 学术数据库
2. 提取核心发现 → 不复制原文，提取 insight
3. AI 改写 → 用自己的语言重新阐述
4. 添加原创分析 → 结合 Qimi AI 经验和家长视角
5. 标注来源 → sourceInfo 字段标明"基于 XX 研究改写"
6. 法律审查 → 确保符合 Fair Use / 合理使用原则
```

**依赖包**：
```bash
npm install @next/mdx gray-matter next-mdx-remote
```

### 备选方案：Sanity CMS

如果需要非技术人员（如运营、编辑）参与内容管理，可考虑 Sanity：
- 可视化编辑界面
- 实时预览
- 免费层支持 3 用户
- API 驱动，与 Next.js 集成良好

---

## 十四、Guest Mode（访客模式）

### 14.1 行业研究结果

**核心原则**：先体验价值，后注册（Value First, Signup Later）

| 策略 | 效果 | 来源 |
|------|------|------|
| **延迟邮箱验证** | Chargebee 转化率从 8% 提升到 15% | [Chargebee Blog](https://www.chargebee.com/blog/trial-to-paid-conversion-optimization/) |
| **Freemium > Free Trial** | 访客转化率高 140%（6% vs 3-4%） | [OpenView 2022 Benchmarks](https://openviewpartners.com/2022-product-benchmarks/) |
| **无需信用卡** | 访客转化率从 2% 提升到 10% | [Chargebee Trial Strategy](https://www.chargebee.com/resources/guides/subscription-pricing-trial-strategy/saas-trial-plans/) |
| **4 字段 vs 11 字段表单** | 120% 更高转化率 | [Custify Blog](https://www.custify.com/blog/optimize-saas-sign-up-flow-to-increase-conversion-rates/) |
| **Slack 渐进式转化** | 30% 转化率（行业领先） | [Userpilot](https://userpilot.com/blog/freemium-conversion-rate/) |

**行业共识**：
- "Sign-up forms must die" - Luke Wroblewski（Google VP）
- **静默数据迁移**：登录后自动合并数据，用户无感知
- **渐进式参与**：先展示产品价值，到特定阶段再收集信息

### 14.2 用户流程

```
Landing Page (/)
       ↓
点击 "Try Free" / "Start Chat"
       ↓
Chat Page (/chat) - Guest Mode
       ↓
┌─────────────────────────────────┐
│  Welcome! Let's personalize    │
│  your experience.              │
│                                │
│  Child's age: [___] years old  │
│  Main concerns: [dropdown]     │
│                                │
│  [Start Chatting →]            │
└─────────────────────────────────┘
       ↓
访客数据存入 localStorage
       ↓
开始 AI 对话（5 条免费消息）
       ↓
触发登录墙（Soft Login Wall）
┌─────────────────────────────────┐
│  💡 Save your progress!        │
│                                │
│  Sign up to:                   │
│  • Save chat history           │
│  • Get personalized insights   │
│  • Unlimited messages          │
│                                │
│  [Sign up with Google]         │
│  [Continue as Guest]           │
└─────────────────────────────────┘
       ↓
注册后：静默迁移 localStorage 数据到用户账户
```

### 14.3 技术实现

#### 数据存储层

**文件**：`utils/guest-storage.ts`

```typescript
interface GuestData {
  childAge?: number;
  concerns?: string[];
  chatHistory?: Message[];
  messageCount: number;
  createdAt: string;
}

const GUEST_KEY = 'qimi_guest_data';
const MAX_GUEST_MESSAGES = 5;

export const guestStorage = {
  save: (data: Partial<GuestData>) => {
    const existing = guestStorage.get();
    localStorage.setItem(GUEST_KEY, JSON.stringify({ ...existing, ...data }));
  },
  get: (): GuestData | null => {
    const data = localStorage.getItem(GUEST_KEY);
    return data ? JSON.parse(data) : null;
  },
  hasReachedLimit: (): boolean => {
    return (guestStorage.get()?.messageCount || 0) >= MAX_GUEST_MESSAGES;
  },
  incrementMessageCount: () => {
    const data = guestStorage.get() || { messageCount: 0, createdAt: new Date().toISOString() };
    guestStorage.save({ ...data, messageCount: data.messageCount + 1 });
  },
  clear: () => localStorage.removeItem(GUEST_KEY),
  migrateToUser: async (userId: string) => {
    const guestData = guestStorage.get();
    if (guestData) {
      await fetch('/api/user/migrate-guest-data', {
        method: 'POST',
        body: JSON.stringify({ userId, guestData })
      });
      guestStorage.clear();
    }
  }
};
```

#### 登录墙触发时机

| 触发点 | 优先级 | 说明 |
|--------|--------|------|
| 5条消息后 | 高 | 已体验核心价值 |
| 点击"保存对话" | 高 | 明确的保存意图 |
| 第二次访问 | 中 | 回头用户更有价值 |
| 尝试高级功能 | 中 | IEP助手、日程生成 |

### 14.4 文件清单

| 文件 | 说明 |
|------|------|
| `utils/guest-storage.ts` | 访客数据存储层 |
| `components/Chat/GuestOnboarding.tsx` | 访客引导组件 |
| `components/Chat/LoginWall.tsx` | 登录墙组件 |
| `pages/chat.tsx` | 集成访客模式 |
| `pages/api/user/migrate-guest-data.ts` | 数据迁移 API |

### 14.5 成功指标

- 访客转化率目标：20%+（行业平均 10-15%）
- Time to Value：< 30秒完成引导，< 2分钟获得首条 AI 回复
- 访客留存：3条消息后继续对话的比例 > 60%

---

## 十五、智能抽屉系统（Smart Drawer）

### 15.1 功能概述

智能抽屉是网页版的核心导航组件，复用小程序已验证的 8 大板块分类系统。

**核心功能**：
- 8 大主题板块快捷入口
- 对话历史列表（按时间排序）
- 快捷新建对话按钮
- 抽屉内搜索功能

### 15.2 板块定义

| 板块 | Key | 图标 | 描述 | 对应后端模块 |
|------|-----|------|------|-------------|
| 情绪疏导 | `emotion` | 💚 | 调节情绪，释放压力 | `rag-tool-definition-emotion.js` |
| 学习规划 | `learning` | 📚 | 学习策略，作业管理 | `module-router.js` |
| 运动与体能 | `exercise` | 🏃 | 运动干预，体能训练 | `module-router.js` |
| 饮食与营养 | `nutrition` | 🥗 | 营养搭配，饮食建议 | `module-router.js` |
| 社交与人际 | `social` | 👥 | 社交技巧，人际关系 | `module-router.js` |
| 睡眠与作息 | `sleep` | 🌙 | 睡眠改善，作息调整 | `module-router.js` |
| 家校沟通 | `school` | 🏫 | IEP 支持，老师沟通 | `module-router.js` |
| 营养品查询 | `supplements` | 💊 | 品牌调查，成分分析 | `nutrition-investigation` |

### 15.3 UI 组件架构

```
components/Chat/
├── SmartDrawer.tsx        # 抽屉主容器（左侧滑出）
├── TopicCard.tsx          # 板块卡片（图标 + 名称 + 箭头）
├── ConversationList.tsx   # 对话历史列表
├── ConversationItem.tsx   # 单个对话项（标题 + 时间 + 菜单）
└── DrawerSearch.tsx       # 抽屉内搜索框
```

### 15.4 数据结构

```typescript
// 对话元数据
interface Conversation {
  id: string;              // 对话唯一ID (thread_xxx)
  title: string;           // 对话标题（LLM 生成或默认"新对话"）
  folderKey: string;       // 所属板块 (emotion, learning, ...)
  createdAt: string;       // 创建时间 ISO
  updatedAt: string;       // 最后更新时间
  messageCount: number;    // 消息数量
  lastMessage?: string;    // 最后一条消息预览
}

// 板块配置
interface TopicFolder {
  key: string;
  name: string;
  icon: string;            // Lucide icon name 或 emoji
  description: string;
  color: string;           // 主题色
}
```

### 15.5 交互设计

**抽屉触发**：
- 桌面端：点击左上角汉堡菜单图标
- 移动端：点击 header 汉堡菜单或左滑手势

**抽屉内操作**：
- 点击板块卡片 → 进入该板块的对话列表页
- 点击对话项 → 进入对话详情
- 长按/右键对话项 → 显示菜单（重命名、移动、删除）
- 点击"新建对话"按钮 → 创建新对话

### 15.6 与小程序代码复用

| 小程序文件 | Web 对应 | 复用程度 |
|-----------|---------|---------|
| `pages/chat/chat.wxml` 抽屉部分 | `SmartDrawer.tsx` | UI 重写，逻辑复用 |
| `pages/section-chat/` | `pages/topic/[key].tsx` | 页面结构复用 |
| `utils/conversation-store.js` | `lib/conversation-store.ts` | 95% 逻辑复用 |

---

## 十六、RAG 知识库前端 UI

### 16.1 功能概述

在 AI 回复中展示知识来源引用，增强可信度和专业性。

### 16.2 UI 组件

```typescript
// components/Chat/RAGSources.tsx
interface Source {
  id: string;
  title: string;           // 论文/文章标题
  authors?: string;        // 作者
  year?: string;           // 发表年份
  journal?: string;        // 期刊名
  url?: string;            // 原文链接
  relevanceScore?: number; // 相关度评分
}

interface RAGSourcesProps {
  sources: Source[];
  collapsed?: boolean;     // 默认折叠
}
```

### 16.3 展示设计

```
┌─────────────────────────────────────────┐
│ AI 回复内容...                           │
│                                         │
│ ▼ 参考来源 (3)                           │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 ADHD and Sleep: A Meta-Analysis  │ │
│ │    Smith et al., 2024 · Pediatrics  │ │
│ │    [查看原文 ↗]                      │ │
│ ├─────────────────────────────────────┤ │
│ │ 📄 Executive Function Interventions │ │
│ │    Johnson, 2023 · J Child Psychol  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 16.4 与后端集成

后端 RAG 响应格式（已在小程序实现）：

```json
{
  "content": "AI 回复内容...",
  "sources": [
    {
      "id": "doc_001",
      "title": "ADHD and Sleep Quality",
      "authors": "Smith, J., et al.",
      "year": "2024",
      "relevanceScore": 0.92
    }
  ],
  "ragTriggered": true
}
```

---

## 十七、Family Profile Memory 系统

### 17.1 功能概述

记录用户家庭的核心困扰和干预历史，为 AI 提供长期上下文记忆。

### 17.2 数据结构

```typescript
interface FamilyProfile {
  // 基础信息（Guest Onboarding 收集）
  childAge: number;
  concerns: string[];        // ["attention", "emotion", "sleep"]

  // 困扰提取（AI 对话中自动识别）
  painPoints: PainPoint[];

  // 干预历史
  interventions: Intervention[];

  // 进展追踪
  progressNotes: ProgressNote[];
}

interface PainPoint {
  id: string;
  category: string;          // emotion, learning, social...
  description: string;       // "孩子写作业时容易分心"
  severity: 'low' | 'medium' | 'high';
  extractedAt: string;
  sourceMessageId: string;   // 来源对话
}

interface Intervention {
  id: string;
  painPointId: string;       // 关联的困扰
  title: string;
  steps: string[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}
```

### 17.3 AI 自动提取流程

```
用户对话 → AI 识别困扰关键词 → 生成 <dsml type="pain_point"> 标记
    ↓
前端解析 DSML → 弹出"保存困扰"按钮
    ↓
用户确认 → 调用 POST /api/family-profile/pain-points
    ↓
后续对话 → System Prompt 注入用户困扰历史
```

---

## 十八、开发规范与质量保障

### 18.1 小步快跑开发流程

**原则**：每个 PR 只做一件事，每天至少一次可部署版本

```
功能开发流程：
1. 创建 feature 分支 (feature/smart-drawer)
2. 拆分为 2-4 小时可完成的子任务
3. 每个子任务完成后：
   - 本地测试通过
   - 提交 commit（语义化 commit message）
   - 推送到远程
4. 功能完成后：
   - 创建 PR
   - 自动化测试通过
   - Code Review
   - 合并到 main
5. 自动部署到 Vercel Preview
```

### 18.2 模块化开发顺序

**依赖关系图**：

```
Phase 1: 基础设施（无依赖）
├── 认证系统 (NextAuth)
├── 后端 API 连接
└── Redis 配置

Phase 2: 核心功能（依赖 Phase 1）
├── 对话页面 + 流式响应
├── 智能抽屉 UI
└── 对话历史持久化

Phase 3: 增强功能（依赖 Phase 2）
├── RAG Sources UI
├── 成长方案系统
└── Family Memory

Phase 4: 高级功能（依赖 Phase 3）
├── PDF 导出
├── Stripe 支付
└── 订阅限流
```

### 18.3 模块验收标准

每个模块完成后必须通过以下检查：

| 检查项 | 工具 | 通过标准 |
|--------|------|---------|
| **类型检查** | `npx tsc --noEmit` | 0 errors |
| **Lint** | `npm run lint` | 0 errors, 0 warnings |
| **单元测试** | `npm run test` | 100% 通过 |
| **构建** | `npm run build` | 成功，无警告 |
| **E2E 测试** | Playwright | 关键路径通过 |
| **性能** | Lighthouse | Performance > 90 |
| **可访问性** | axe-core | 0 critical issues |

### 18.4 Git Commit 规范

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具链

示例：
feat(drawer): add smart drawer component
fix(chat): resolve streaming response flicker
docs: update deployment guide with drawer section
```

### 18.5 CI/CD 流水线

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Build
        run: npm run build

      - name: E2E tests
        run: npx playwright test
```

---

## 十九、技术框架完整性检查

### 19.1 前端技术栈验证

| 技术 | 当前状态 | 行业标准 | 备注 |
|------|---------|---------|------|
| **Next.js 16.1.1** | ✅ 已配置 | ✅ 最新版 | ✅ 安全版本，无需升级 |
| **TypeScript** | ✅ 已配置 | ✅ 必须 | - |
| **Tailwind CSS** | ✅ 已配置 | ✅ 主流 | - |
| **NextAuth.js** | ✅ 已配置 | ✅ 标准 | 建议升级到 v5 |
| **状态管理** | ⚠️ 未配置 | Zustand | 需添加 |
| **表单验证** | ⚠️ 未配置 | Zod + React Hook Form | 需添加 |
| **API 客户端** | ⚠️ 未配置 | TanStack Query | 需添加 |
| **UI 组件库** | ⚠️ 部分 | shadcn/ui | 需完善 |

### 19.2 后端技术栈验证

| 技术 | 当前状态 | 行业标准 | 备注 |
|------|---------|---------|------|
| **Node.js** | ✅ 小程序已有 | ✅ 标准 | 复用 85-90% |
| **Express.js** | ✅ 小程序已有 | ✅ 标准 | 复用 |
| **Redis** | ✅ 小程序已有 | ✅ 标准 | 复用 |
| **PostgreSQL** | ❌ 未配置 | ✅ 需要 | 支付/审计需要 |
| **OpenAI API** | ⚠️ 未配置 | ✅ 需要 | 国际版需要 |

### 19.3 缺失组件清单

**必须添加**（P0）：

```bash
# 状态管理
npm install zustand

# 表单验证
npm install zod react-hook-form @hookform/resolvers

# API 客户端（缓存、重试、乐观更新）
npm install @tanstack/react-query

# UI 组件（按需添加）
npx shadcn-ui@latest add button dialog dropdown-menu input textarea
```

**建议添加**（P1）：

```bash
# 日期处理
npm install date-fns

# 图标库（已有 lucide-react，确认版本）
npm install lucide-react@latest

# 动画
npm install framer-motion

# Toast 通知
npx shadcn-ui@latest add toast
```

### 19.4 架构改进建议

**1. API 层抽象**

当前：直接在组件中 fetch
建议：统一 API 客户端 + TanStack Query

```typescript
// lib/api-client.ts
const apiClient = {
  chat: {
    send: (message: string) => fetch('/api/chat', {...}),
    history: (threadId: string) => fetch(`/api/messages/${threadId}`),
  },
  profile: {
    get: () => fetch('/api/profile'),
    update: (data: Profile) => fetch('/api/profile', {...}),
  }
};

// 使用 TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['chat', threadId],
  queryFn: () => apiClient.chat.history(threadId),
});
```

**2. 错误边界**

```typescript
// components/ErrorBoundary.tsx
// 捕获组件错误，显示友好提示，上报错误日志
```

**3. 加载状态**

```typescript
// components/LoadingSkeleton.tsx
// 统一的骨架屏组件，提升用户体验
```

---

## 二十、部署检查清单

### 20.1 上线前检查

```markdown
## 代码质量
- [ ] TypeScript 编译无错误
- [ ] ESLint 无警告
- [ ] 所有测试通过
- [ ] 构建成功

## 安全性
- [ ] 环境变量已配置（生产环境）
- [ ] API Key 未硬编码
- [ ] CORS 配置正确
- [ ] CSP 头已设置
- [x] Next.js 版本 16.1.1（最新安全版本）

## 性能
- [ ] Lighthouse Performance > 90
- [ ] 首屏加载 < 3s
- [ ] 图片已优化（WebP/AVIF）
- [ ] 代码分割正常

## 监控
- [ ] 错误追踪已配置（Sentry）
- [ ] 性能监控已配置
- [ ] 日志收集已配置

## 业务
- [ ] 关键用户流程测试通过
- [ ] 支付流程测试通过（测试环境）
- [ ] 邮件发送测试通过
```

### 20.2 灰度发布策略

```
1. Preview 部署 → 内部测试（1-2天）
2. Canary 发布 → 5% 流量（1天）
3. 逐步扩大 → 25% → 50% → 100%
4. 监控指标：错误率 < 0.1%，P99 延迟 < 500ms
```

---

## 参考资源

- [Next.js 16 文档](https://nextjs.org/docs)
- [Stripe 订阅指南](https://stripe.com/docs/billing/subscriptions)
- [NextAuth.js v5](https://authjs.dev/)
- [shadcn/ui 组件](https://ui.shadcn.com/)
- [GDPR 开发者指南](https://gdpr.eu/developers/)
- [MDX 官方文档](https://mdxjs.com/)
- [Next.js Blog Starter](https://github.com/vercel/next.js/tree/canary/examples/blog-starter)
- [Chargebee 转化率优化](https://www.chargebee.com/blog/trial-to-paid-conversion-optimization/)
- [OpenView PLG Benchmarks](https://openviewpartners.com/2022-product-benchmarks/)
- [ProductLed Growth Benchmarks](https://productled.com/blog/product-led-growth-benchmarks)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Zod 文档](https://zod.dev/)
