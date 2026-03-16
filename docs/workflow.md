# Development Workflow — Qimi AI Web

> Created: 2026-03-16
> Status: ACTIVE
> Purpose: Define the exact collaboration workflow between Claude Code (Opus 4.6), Roo Code (GLM 5), and the human developer.

---

## 1. Role Assignment

| Role | Tool | Model | Billing |
|------|------|-------|---------|
| Planner / Reviewer / Debugger | Claude Code (VS Code extension) | Claude Opus 4.6 | Claude subscription |
| Executor (coder) | Roo Code (Cursor extension) | GLM 5 | GLM API pay-per-token |
| Final Acceptor | Human | — | — |

---

## 2. End-to-End Flow

```
Phase 1: Planning (Claude Code)
  ├── Read project-control.md → identify next module
  ├── Write or review module Spec + task list
  ├── Self-review + cross-review (P0=0, P1=0)
  └── Present to human for approval

Phase 1.5: Human Approval
  └── Human reviews Spec + task list → approve / request changes

Phase 2: Execution (Roo Code + GLM 5)
  ├── Human copies task instructions into Roo Code
  ├── GLM 5 executes task (write code, do NOT commit)
  ├── GLM 5 runs machine checks: lint, tsc, build
  ├── GLM 5 reports what files changed and what was done
  └── GLM 5 waits for human approval before ANY git commit

Phase 3: Human Acceptance (per-task)
  ├── Human reviews GLM 5's changes (read diff, check files)
  ├── Optionally asks Claude Code to review the diff
  ├── If OK → tells GLM 5 "可以 commit"
  ├── If not OK → tells GLM 5 what to fix, loop back to Phase 2
  └── After commit → GLM 5 proceeds to next task (back to Phase 2)

Phase 4: Module-level Review (Claude Code)
  ├── After all tasks in a module are committed
  ├── Claude Code reads full diff, reviews against Spec + AQS
  ├── Outputs review report (P0/P1/P2)
  └── If P0/P1 found → outputs fix instructions for human to feed to GLM 5

Phase 5: Module-level Human Acceptance
  ├── Human runs the app, manually tests core flows
  ├── Confirms pass / requests rework
  └── If pass → module complete, move to next module in project-control.md
```

---

## 3. Handoff Protocols

### 3.1 Claude Code → Human → Roo Code (task handoff)

Claude Code outputs task instructions in this format:

```markdown
## 任务 T00X：[任务名称]

### 目标
[一句话描述]

### 目标文件
- 创建/修改：`[文件路径]`

### 详细步骤
1. [步骤]
2. [步骤]

### 约束条件
- 参考文件：`[具体路径]`
- 不能修改：`[文件列表]`

### 验证标准
- [ ] npx eslint 通过
- [ ] npx tsc --noEmit 通过
- [ ] npm run build 通过

### 完成后
1. 运行机器验证（npx eslint、npx tsc --noEmit、npm run build）
2. 告诉我你改了哪些文件、改了什么内容
3. 等待我人工验收确认
4. 我说「可以 commit」后，执行 git commit -m "[T00X] feat/fix: [描述]"
5. 未经我确认，绝对不要执行 git commit

⚠️ 禁止自行 commit。所有 commit 必须经过人工验收。
```

Human copies this into Roo Code's chat. GLM 5 executes.

### 3.2 Human → Claude Code (review request)

When GLM 5 finishes a batch of tasks, human tells Claude Code:

> "GLM 5 完成了 T001-T003，请做机器验收。"

Claude Code then:
1. Reads git log to see new commits
2. Reads changed files
3. Runs lint/tsc/build checks
4. Reviews against the module Spec
5. Outputs a review report

### 3.3 Claude Code → Human → Roo Code (fix handoff)

If review finds P0/P1 issues, Claude Code outputs fix instructions:

```markdown
## 修复指令：[问题编号]

### 问题
[具体问题描述，包含文件路径和行号]

### 修复步骤
1. [具体步骤]

### 验证标准
- [ ] [具体验证]
```

Human copies this into Roo Code. GLM 5 fixes. Loop until P0=0 and P1=0.

---

## 4. Rules for Claude Code (Planner/Reviewer)

1. All communication with the user in Chinese (简体)
2. Code comments, commit messages, variable names in English
3. Before any planning, read: `formal-basis-entry.md` → `planning-review-rules.md` → `project-control.md`
4. Follow execution order in `project-control.md` — do not skip modules
5. Task instructions must be detailed enough for GLM 5 (a weaker model) to execute without understanding the overall architecture
6. Review reports must include specific file paths and line numbers
7. Do not modify NEVER-modify files listed in CLAUDE.md

---

## 5. Rules for GLM 5 (Executor via Roo Code)

See the Roo Code Code mode prompt. Core rules:

1. Only modify files specified in the task
2. Do not add features not requested
3. Follow existing project patterns (read reference files first)
4. Lint + tsc + build after every change
5. **禁止自行 git commit** — 完成任务后报告改动内容，等待人工确认后才能 commit
6. **禁止自行 git push** — 任何情况下都不允许
7. Stop and report after 5 failed fix attempts
8. Do not modify config files, shared types, or NEVER-modify files

### Commit Gate (强制流程)

```
GLM 5 写完代码
    ↓
运行 npx eslint、npx tsc --noEmit、npm run build
    ↓
机器验证通过？
  ├── 否 → 自修复（≤5轮）
  └── 是 ↓
报告给人类：改了哪些文件、改了什么
    ↓
人类验收：
  ├── 通过 → 人类说"可以 commit" → GLM 5 执行 git commit
  └── 不通过 → 人类说明问题 → GLM 5 修改 → 重新走验证
```

**违反此流程的行为视为 P0 级别错误。**

---

## 6. Escalation Flow

```
GLM 5 fails a task (5 rounds)
    ↓
Human tells Claude Code: "T00X 失败了，错误信息如下：[错误]"
    ↓
Claude Code analyzes root cause
    ↓
Claude Code searches for solutions (web search if needed)
    ↓
Claude Code outputs new fix instructions (must differ from previous attempts)
    ↓
Human feeds to GLM 5
    ↓
If still fails after 3 escalation rounds → mark BLOCKED, move to next task
```

---

## 7. Communication Language

- Claude Code ↔ Human: Chinese (简体)
- GLM 5 ↔ Human: Chinese (简体)
- Code, comments, commits, docs: English
- Task instructions from Claude Code: Chinese explanations + English code
