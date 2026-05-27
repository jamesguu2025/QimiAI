# 会话持久化 Bug 修复方案（临时文档）

> **状态**: 待实施
> **创建日期**: 2026-02-06
> **关联 Bug**: Bug 1 (每条消息创建新会话) + Bug 2 (话题板块创建空会话)

---

## 一、问题根因

### Bug 1：每条消息创建新会话

```
用户发送消息
  → chatStore.sendMessage() 传 conversationId: currentConversation?.id
  → currentConversation 对新聊天始终为 null
  → API 收到 conversationId = undefined
  → 流式响应完成后，saveMessagesToDatabase() 发现 !convId
  → 在 Supabase 创建新 conversation 记录
  → 返回的 convId 没有任何机制传回前端
  → 用户发第二条消息，currentConversation 仍为 null
  → 重复 → 又创建一个新 conversation
```

**核心缺陷**: 服务端创建会话后，没有反馈机制将 conversationId 回传前端。

### Bug 2：话题板块创建空会话

`chat.tsx` 中 `handleSelectTopic` 直接调用 `createConversation()` API，立即在数据库创建空会话。

---

## 二、问题分级

### P0 — 必须修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| P0-1 | 会话 ID 反馈回路缺失 | `stream.ts:271-274`, `chatStore.ts:200` | 每条消息创建新会话 |
| P0-2 | SSE 协议缺少 `conversation_created` 事件 | `types/api.ts:15` | 无标准方式传递会话 ID |
| P0-3 | 会话创建时序错误（流结束后才创建） | `stream.ts:256-275` | 无法通过 SSE 返回 ID |

### P1 — 应该修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| P1-1 | 话题板块点击创建空会话 (Bug 2) | `chat.tsx:204-215` | 产生垃圾记录 |
| P1-2 | 缺少幂等性保护 | `stream.ts:50-66` | 网络重试可创建重复会话 |

### P2 — 可选优化

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| P2-1 | 会话列表刷新策略粗糙 | `chatStore.ts:254` | 每次 onDone 全量 reload |

---

## 三、修复方案

在流式响应开始前创建会话，通过 `conversation_created` SSE 事件将 ID 传回前端。

**设计要点**:
- 会话创建移到 handler 层（流前），确保 abort 时前端已拿到 ID
- `saveMessagesToDatabase` 不拆分，调用时传入已知 ID，跳过内部创建分支
- 仅对登录用户生效，访客不触发

---

## 四、数据流设计

```
首条消息:
  前端 sendMessage(conversationId=undefined)
    → 后端 handler 收到请求
    → 若登录用户 && 无 conversationId:
      → 在 Supabase 创建 conversation，得到 convId
    → 设置 SSE headers
    → 发送 SSE: { type: "conversation_created", conversationId: convId }
    → 调用 streamChatWithRAG() 正常流式响应
    → 流结束后调用 saveMessagesToDatabase(email, msg, response, convId)
      → 因 convId 已有值，跳过创建分支，直接保存消息
    → 前端收到 conversation_created 事件
    → set({ currentConversation: { id: convId, ... } })

后续消息:
  前端 sendMessage(conversationId=convId)
    → 后端收到 convId，不创建新会话
    → 正常流式响应 + 保存消息
    → 不发送 conversation_created 事件

用户中断 (abort):
  → conversation_created 事件已在流前发送 ✓
  → 前端已有 conversationId ✓
  → 后端保存部分响应到已有会话 ✓
  → 下次消息携带正确 ID ✓
```

---

## 五、具体改动清单

### 5.1 types/api.ts（~3 行）

```diff
- export type SSEEventType = 'token' | 'done' | 'error' | 'sources' | 'status';
+ export type SSEEventType = 'token' | 'done' | 'error' | 'sources' | 'status' | 'conversation_created';

  export interface SSEChunk {
    type: SSEEventType;
    content?: string;
    sources?: RAGSource[];
    error?: string;
    message?: string;
    totalTokens?: number;
+   conversationId?: string;
  }
```

### 5.2 pages/api/chat/stream.ts（~20 行，handler 函数内）

在 `streamChatWithRAG` 调用**之前**，SSE headers 设置**之后**：

```typescript
// 在 res.setHeader(...) 之后、streamChatWithRAG 之前
let activeConversationId = conversationId;

if (session?.user?.email && !activeConversationId) {
  // 为登录用户预创建会话
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('users').select('id').eq('email', session.user.email).single();

  if (user) {
    const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select('id').single();

    if (newConv) {
      activeConversationId = newConv.id;
      // 作为第一个 SSE 事件发送
      res.write(`data: ${JSON.stringify({
        type: 'conversation_created',
        conversationId: newConv.id
      })}\n\n`);
    }
  }
}

// 后续 saveMessagesToDatabase 调用改为传 activeConversationId
```

### 5.3 services/chat.ts（~10 行）

```diff
  export interface ChatStreamCallbacks {
    onToken: (content: string) => void;
    onSources: (sources: RAGSource[]) => void;
    onStatus: (message: string) => void;
    onDone: (totalTokens?: number) => void;
    onError: (error: string) => void;
+   onConversationCreated?: (conversationId: string) => void;
  }

  // switch 块内新增:
+ case 'conversation_created':
+   if (chunk.conversationId) {
+     callbacks.onConversationCreated?.(chunk.conversationId);
+   }
+   break;
```

### 5.4 stores/chatStore.ts（~15 行）

在 sendMessage 的 callbacks 中新增：

```typescript
onConversationCreated: (conversationId) => {
  const newConversation: Conversation = {
    id: conversationId,
    title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  set({
    currentConversation: newConversation,
    conversations: [newConversation, ...get().conversations],
  });
  saveConversationsToCache([newConversation, ...get().conversations]);
},
```

### 5.5 pages/chat.tsx（~3 行，Bug 2 修复）

```diff
  const handleSelectTopic = async (folderKey: string) => {
-   try {
-     await createConversation(
-       `${folderKey.charAt(0).toUpperCase() + folderKey.slice(1)} Chat`,
-       folderKey as any
-     );
-     setDrawerOpen(false);
-   } catch (error) {
-     console.error('Failed to create topic conversation:', error);
-   }
+   createNewChat();
+   setDrawerOpen(false);
  };
```

---

## 六、影响范围

| 文件 | 改动类型 | 改动量 |
|------|----------|--------|
| `types/api.ts` | 新增事件类型 + 字段 | ~3 行 |
| `pages/api/chat/stream.ts` | handler 层新增预创建逻辑 | ~20 行 |
| `services/chat.ts` | 新增回调 + switch case | ~10 行 |
| `stores/chatStore.ts` | 新增 onConversationCreated 处理 | ~15 行 |
| `pages/chat.tsx` | 简化 handleSelectTopic | ~5 行 |

**总计 ~50 行改动**，无数据库 schema 变更，无新依赖。

---

## 七、风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 会话创建失败 | 低 | 降级处理：创建失败时不影响聊天体验，仅跳过持久化 |
| 首 token 延迟增加 | 低 | 单次 INSERT ~50ms，用户不可感知 |
| DeepSeek API 失败导致空会话 | 低 | API 失败概率极低；且会话有标题，不算"空" |
| 访客用户误触发 | 无 | `if (session?.user?.email && !activeConversationId)` 已过滤 |
| abort 时 ID 丢失 | 无 | conversation_created 在流前发送，abort 前已送达 |

---

## 八、测试计划

### 功能测试
- [ ] 新聊天发首条消息 → 仅创建 1 个会话，侧边栏出现 1 条
- [ ] 同一聊天连发 3 条消息 → 侧边栏始终 1 个会话
- [ ] 刷新页面 → 侧边栏选择会话 → 正确加载历史消息
- [ ] 点击话题板块 → 不创建空会话

### 边界测试
- [ ] 访客模式发消息 → 不创建数据库会话
- [ ] 流式被中断（Stop）→ 会话已创建，部分内容已保存
- [ ] Force RAG 模式 → 会话创建不受影响

### 回归测试
- [ ] 已有会话继续聊天 → conversationId 正确传递
- [ ] 会话删除 / 重命名 / 置顶 → 不受影响

---

## ⚠️ 重要提醒

**本文档为临时实施方案文档。任务完成并验证通过后，请删除此文档。**

```
清理命令:
rm docs/临时-会话持久化Bug修复方案.md
```
