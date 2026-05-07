# SmartDrawer Topic Folder Planning Review — 2026-05-07

## Scope

Planning update for SmartDrawer topic folder behavior discovered during manual QA on `sprint0-complete`.

This is shared chat/navigation infrastructure. It is not a Growth Plan, Reports, Family Profile, or Settings module change.

## SOP Hydration

Current pass used full hydration because a new infrastructure planning item was added and the user explicitly requested SOP review plus external evidence.

Read:

- `agent-dev-sop/00-启动引导.md`
- `agent-dev-sop/01-总流程.md`
- `agent-dev-sop/02-规划者手册.md`
- `agent-dev-sop/03-执行者手册.md`
- `agent-dev-sop/04-项目启动模板.md`
- `agent-dev-sop/05-护栏与应急.md`
- `agent-dev-sop/06-快速启动指令.md`
- `agent-dev-sop/07-架构质量标准(AQS).md`
- `agent-dev-sop/08-设计阶段循证Gate(EBG).md`
- `agent-dev-sop/英文网页版-Agent并行开发交接文档.md`
- `docs/formal-basis-entry.md`
- `docs/planning-review-rules.md`
- `docs/project-control.md`
- `docs/system-architecture.md`
- `docs/specs/smartdrawer-unification.md`

## Current Code Facts

- `pages/chat.tsx:86-94` handles `topic` query params by starting a new chat and explicitly leaves topic-specific behavior for later.
- `pages/chat.tsx:244-247` handles SmartDrawer topic clicks by starting a new chat without saving the selected folder.
- `stores/chatStore.ts:243-258` handles `conversation_created` by creating an optimistic conversation with `folderKey: null`.
- `stores/chatStore.ts:457-468` already has a separate `createConversation(title, folderKey)` API path, but chat streaming does not use that path for first-message creation.
- `pages/api/chat/stream.ts:287-310` pre-creates logged-in conversations without writing `folder_key`.
- `components/Chat/SmartDrawer.tsx:336-345` defines the visible topic folders.
- `components/Chat/SmartDrawer.tsx:688-704` maps `folderKey` into display conversation objects.
- `components/Chat/SmartDrawer.tsx:877-932` renders a flat Topics section and a flat Recent section.

## External Evidence Sources

| Claim | URL | Source type | Retrieval log ref | Supported claim | Unsupported gap |
|---|---|---|---|---|---|
| AI chat products use dedicated spaces/projects to keep related chats and context together over time. | https://openai.com/academy/projects/ | official | `web.run turn3view0` | OpenAI describes Projects as dedicated spaces for specific work, holding chats/files/instructions/context together. | Does not prescribe Qimi's exact sidebar UI or topic names. |
| Claude supports moving chats into and out of projects and initiating chats within a project. | https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects | official | `web.run turn3view1` | Anthropic documents project creation, project chats, and moving standalone chats into projects. | Does not require a drawer child-list layout for Qimi. |
| Navigation drawers and in-context navigation can represent related sets of data and recent-vs-history movement. | https://m1.material.io/patterns/navigation.html | official framework documentation | `web.run turn3view2`, `web.run turn4view2` | Material Design supports side navigation, in-context navigation for related data, and examples like moving between recent items and complete history. | Does not define AI-chat project semantics. |
| User grouping can validate information architecture categories. | https://media.nngroup.com/media/articles/attachments/glossary-ux-research.pdf | specialist UX research reference | `web.run turn3view3`, search result `turn2search0` | NN/g defines card sorting as grouping labels to help create categories and information architecture. | Does not validate Qimi's eight existing topic labels without user research. |

## ADR-Lite

| Decision ID | Decision | Risk | External Evidence | Local Evidence | Supported Claim | Unsupported Gap | Status | Confirmation |
|---|---|---|---|---|---|---|---|---|
| ADR-SD-TOPIC-001 | Treat SmartDrawer topics as chat organization folders, not feature-module navigation pages. | Normal | Found(partial): OpenAI Projects, Claude Projects, Material navigation. | Existing `conversations.folder_key`; SmartDrawer topics; manual QA mismatch. | Related chats benefit from being kept in a dedicated space; drawers can support hierarchical navigation. | External sources do not dictate exact Qimi implementation. | Accepted | Build + local Supabase flow: topic click → first message → persisted `folder_key` → visible under topic after refresh. |
| ADR-SD-TOPIC-002 | Keep Recent as a global recent list while also showing topic-scoped child conversations under topics. | Normal | Found(partial): Material in-context navigation mentions recent items and complete history as related navigation. | Current SmartDrawer already has a Recent list and topic cards. | It is valid to support related data navigation and recent/history movement together. | External source does not mandate duplicated visibility. | Accepted | Manual flow verifies the same conversation can be opened from topic child and Recent without inconsistent state. |
| ADR-SD-TOPIC-003 | Do not create a separate right-side topic history page in this pass. | Normal | Exempt: MVP scoping / internal product choice. | Current chat page is the primary workspace; right-side topic page would expand route and state scope. | Keeping this pass to drawer grouping is the smallest fix for the observed defect. | No external source says a separate page is wrong. | Accepted | T006 task list explicitly excludes separate topic history pages. |

## Search Ledger

| Decision ID | Query | Result | Source URL |
|---|---|---|---|
| ADR-SD-TOPIC-001 | `OpenAI ChatGPT Projects organize chats files help article` | Found(partial) | https://openai.com/academy/projects/ |
| ADR-SD-TOPIC-001 | `Anthropic Claude Projects organize chats knowledge help article` | Found(partial) | https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects |
| ADR-SD-TOPIC-001 | `Material Design navigation drawer lists group items official documentation` | Found(partial) | https://m1.material.io/patterns/navigation.html |
| ADR-SD-TOPIC-002 | `Material Design navigation drawer lists group items official documentation` | Found(partial) | https://m1.material.io/patterns/navigation.html |
| ADR-SD-TOPIC-003 | `ChatGPT project separate history page versus sidebar folders` | Not Found | — |
| ADR-SD-TOPIC-003 | `Claude projects move chats into projects sidebar` | Found(partial) | https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects |

## Evidence Layering

- Topic folder grouping as a concept: `external research supported item` + `stable`, but only at the product-pattern level.
- Qimi implementation choice to show topic children under the existing SmartDrawer and keep Recent global: `internal method choice` + `stable`.
- Exact visual density, default expansion state, and whether Recent duplicates topic conversations: `internal method choice` + `Provisional` until human acceptance.

## AQS Self-Review

### Safety

- [PASS] No new high-risk privacy, payment, or medical decision is introduced by the planning update.
- [PASS] Future implementation must preserve authenticated user ownership checks already used by conversations APIs.

### Architecture

- [PASS] Keeps one global SmartDrawer and does not introduce a second sidebar pattern.
- [PASS] Uses existing `conversations.folder_key` rather than adding a new schema concept.
- [PASS] Avoids a separate topic page in this pass, keeping MVP scope small.

### Engineering Quality

- [PASS] Task is linear and has explicit machine gate and human gate.
- [PASS] Current code facts use file-line references.
- [PASS] External claims are separated from internal product choices.

### Technology Compliance

- [PASS] Uses existing Next.js Pages Router, Zustand store, and Supabase conversation persistence.
- [PASS] No new dependency is planned.

### Reverse Check

- [PASS] No feature flag or new abstraction is planned.
- [PASS] No new document was created for a standalone spec; the existing SmartDrawer infrastructure spec was extended. This review file is justified by lifecycle: it records the EBG/Search Ledger evidence for the planning change.

## Second-Pass Review

- The observed issue is not a Settings regression; it belongs to shared chat/navigation infrastructure.
- The issue should be fixed before Family/Profile acceptance continues because SmartDrawer appears globally on those pages.
- The plan should not merge old `feature/*` branches. Implementation must start from current `sprint0-complete`.

## Conclusion

Status: `Accepted for planning`.

Next implementation branch should be created from current `sprint0-complete`, with a short-lived branch such as `codex/smartdrawer-topic-folders`.
