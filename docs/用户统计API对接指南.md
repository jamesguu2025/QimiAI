# 用户统计 API 对接指南

## 概述

网页版需要对接小程序后端的用户统计 API，实现：
1. **显示全球用户数**：调用统计 API 获取小程序+网页版合并总数
2. **同步网页版用户数**：用户注册后，推送用户数到小程序后端

---

## API 端点

### 1. 获取全球用户统计

**用途**：在网页版前端显示用户总数

```
GET https://api.xingbanai.cn/api/stats/users
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total": 124,
    "breakdown": {
      "miniProgram": 124,
      "website": 0
    },
    "lastUpdated": "2025-01-03T10:48:14.603Z"
  },
  "meta": {
    "cached": true,
    "cacheLevel": "redis"
  }
}
```

**前端调用示例**（Next.js）：
```typescript
// pages/index.tsx 或 components/Header.tsx
const [userCount, setUserCount] = useState<number>(0);

useEffect(() => {
  const fetchUserCount = async () => {
    try {
      const response = await fetch('https://api.xingbanai.cn/api/stats/users');
      const data = await response.json();

      if (data.success && data.data) {
        setUserCount(data.data.total);
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
    }
  };

  fetchUserCount();
}, []);
```

---

### 2. 更新网页版用户数

**用途**：网页版用户注册后，同步用户数到统计系统

```
POST https://api.xingbanai.cn/api/stats/website-users
Content-Type: application/json
X-Admin-Key: <your_admin_key>

{
  "count": 100
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "success": true,
    "count": 100
  }
}
```

**⚠️ 注意**：
- 需要 `X-Admin-Key` 头进行鉴权
- `count` 是用户总数（非增量）
- Admin Key 需要在环境变量 `ADMIN_API_KEY` 中配置

---

## 对接方式

### 方式一：用户注册时推送（推荐）

在用户注册成功后，调用 API 更新用户数：

```typescript
// pages/api/auth/register.ts 或用户注册的地方
import { prisma } from '@/lib/prisma';  // 或你的数据库客户端

export async function onUserRegistered() {
  // 1. 获取网页版当前总用户数
  const totalWebUsers = await prisma.user.count();

  // 2. 推送到小程序后端
  try {
    await fetch('https://api.xingbanai.cn/api/stats/website-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': process.env.ADMIN_API_KEY!
      },
      body: JSON.stringify({ count: totalWebUsers })
    });
    console.log('[Stats] 用户数已同步:', totalWebUsers);
  } catch (error) {
    console.error('[Stats] 同步用户数失败:', error);
    // 失败不影响注册流程
  }
}
```

### 方式二：定时同步

每小时同步一次用户总数：

```typescript
// 可以用 Vercel Cron 或单独的定时任务
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-user-count",
    "schedule": "0 * * * *"
  }]
}

// pages/api/cron/sync-user-count.ts
export default async function handler(req, res) {
  const totalWebUsers = await prisma.user.count();

  await fetch('https://api.xingbanai.cn/api/stats/website-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': process.env.ADMIN_API_KEY!
    },
    body: JSON.stringify({ count: totalWebUsers })
  });

  res.status(200).json({ synced: true, count: totalWebUsers });
}
```

---

## 环境变量配置

在 `.env.local` 或 Vercel 环境变量中添加：

```env
# 小程序后端 Admin API Key（用于同步用户数）
ADMIN_API_KEY=your_admin_key_here
```

**获取 Admin Key**：联系小程序后端管理员，或在小程序后端 `.env` 中查看 `ADMIN_API_KEY`。

---

## 前置条件

在对接此 API 之前，网页版需要先完成：

1. **用户注册系统**
   - 数据库（推荐 Supabase 或 Prisma + PostgreSQL）
   - NextAuth.js 配置数据库适配器
   - 用户表 `users`

2. **当前状态**（截至 2025-01-03）
   - ✅ Google/Facebook OAuth 登录（NextAuth.js）
   - ❌ 用户数据持久化（目前只有 Mailchimp waitlist）
   - ❌ 聊天历史存储

---

## 相关文档

- 小程序后端实施计划：`~/.claude/plans/跨平台用户统计功能实施计划.md`
- 小程序统计服务代码：`adhdhelper-cursor/api/services/user-stats-service.js`

---

## 联系

如有问题，请联系小程序后端开发。
