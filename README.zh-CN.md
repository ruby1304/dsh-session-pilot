# dsh-session-kit

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 补上"在对话中管理会话"的能力——模型与人都能在对话途中新建、重命名、列出、查看、归档会话。

[English](README.md)

**五个模型工具**（模型在对话里即可整理会话）：

| 工具 | 作用 |
| --- | --- |
| `new_conversation` | 把一个跑偏的话题、一个独立的子任务，带着完整的首条用户消息开成一个全新对话（出现在侧边栏，立即开跑） |
| `rename_session` | 重命名会话（默认当前会话） |
| `list_sessions` | 按最近活跃列出会话（标题、运行中、所在目录）；带 `query` 时按内容搜索 |
| `read_session` | 读取某会话的紧凑对话摘录（最近的用户/助手文本消息，有界） |
| `archive_session` | 归档会话：移出工作区会话列表（耐久日志保留） |

**两个官方插槽按钮**（无 DOM 注入）：

- **会话头部「＋ 新对话」**——在当前工作区一键开空白新对话
- **助手消息「⧉」**——把这条回复的正文作为上下文摘录，开一个全新对话继续讨论

只走官方路径：Host 复用 Web UI 同款的 `sessionController` / `sessionQuery` / `workspaceRegistry` 接缝；UI 只用官方插槽（`conversation.session.header.actions`、`conversation.chat.assistant-actions`）。通过 `dsh-client-locale` 接入中英双语界面。

## 安装

```bash
dsh plugin add dsh-session-kit
```

重启 dsh 后生效。模型会在工具列表里看到五个工具；会话头部出现「＋ 新对话」按钮；每条已落定的助手消息的操作区出现「⧉」按钮。

## 使用

- **新建对话**：直接说"把这个任务开个新对话去做"，模型调用 `new_conversation` 把任务简报作为首条消息。
- **整理会话**：说"把这个对话重命名为 XX"、"列出我最近的会话"、"看看 XX 会话里聊了什么"、"把 XX 会话归档"。
- **头部按钮**：点「＋ 新对话」，在当前工作区开一个空白对话并自动跳转。
- **消息操作**：点助手消息上的「⧉」，插件把该消息正文（限 4000 字符）包成 `<quoted-context>` 摘录，作为新对话的首条用户消息。

## 为什么不是 subagent / fork

| 既有能力 | 与本插件的差别 |
| --- | --- |
| `subagent` | 子代理是临时的、向父会话汇报的上下文节省机制，不是用户可见的独立对话 |
| 消息 fork（官方 / `dsh-turn-fork`） | fork 携带历史前缀分支；`new_conversation` 创建的是**零历史**的新对话，只携带你写下的首条消息 |
| 侧边栏「+」 | 只能开空白对话；本插件让**模型**和**消息级操作**也能开对话，并可带种子内容 |
| 官方只读的 `tool-session-query` 包（opt-in） | 提供事件级只读查询；本插件提供**写操作**（新建/重命名/归档）与面向整理的紧凑视图 |

## 相近社区插件（截至 2026-09 的普查）

| 插件 | 重叠点 | 关键差别 |
| --- | --- | --- |
| [`yangYzc/dsh-plugin-quote-reply`](https://github.com/yangYzc/dsh-plugin-quote-reply) | 「新窗口回复」也会创建新会话并带入引用 | 它是**划词引用 + 预填输入框草稿**（用户手动发送）；本插件是整条消息摘录**直接落为首条消息**（新对话立即开跑）。且它无模型工具、纯 client 创建（不经 `sessionController` 的工作区挂载） |
| [`bpc-oss/dsh-fork-to-preset`](https://github.com/bpc-oss/dsh-fork-to-preset) | 头部按钮创建新会话 | fork 语义：**继承已完成回合**并换 preset；本插件是零历史新对话 |
| [`qwert702/dsh-context-compressor`](https://github.com/qwert702/dsh-context-compressor) | 自动切到新会话 | 目的是压缩上下文、自动触发；本插件是模型/用户**主动**按话题拆分 |
| `weibaohui/dsh-tasks`、DSH Automation Center | 每次运行开新会话 | cron 定时驱动，非对话内即时创建 |

**没有插件提供这一组模型工具**——让模型自己创建、命名、整理用户可见的顶层对话；这是本插件的核心缺口定位。

## 设计说明

- **单一事务**：`new_conversation` 与 HTTP 路由共享 `createSessionKit`——解析来源会话的工作区（直连挂载），调用 `sessionController.create`（Host 侧自动完成工作区挂载），再按需 `rename` 与 `prompt`（`mode: 'queue'`，透传 `exec.signal`）。创建的会话就是普通的耐久 Session，重启后仍在。
- **工作区与 preset 继承**：新对话落在来源会话的工作区；未挂载时退化为继承 `cwd`；Agent preset 随来源会话的最近 `agent-preset/selected` 继承（工具路径）。
- **只读走独立接缝**：`list_sessions` 用 `sessionController.list/search`；`read_session` 用 `sessionQuery.readSession`（live 优先、冷读持久层）+ `readTitle`，消息级投影有界（每条 ≤600 字符、最多 100 条、总量 ≤12000 字符）。
- **HTTP 信任围栏**：路由仅接受回环 Origin/Host（与 `dsh-turn-fork` 同一约定），`application/json` 且正文 ≤ 64 KiB。
- **跨版本**：面向 `0.1.5-rc.1` 的 API 编写（peer deps），并在 `0.1.2-alpha.4` 运行时验证通过；`prompt` 始终显式传 `mode: 'queue'` 以兼容两个版本的 `SessionPromptRequest`。

## Known Limitations and Deferred Work

- **摘录只携带文本**——助手消息中的图片、工具调用块不进入新对话；需要文件上下文时请用 `@` 重新引用。
- **工具路径之外不传 preset**——路由（UI 按钮）创建的会话使用部署的默认 Agent preset，不继承来源会话的 preset（需要在路由侧加 `inspect` 才能读到来源 preset，v1 未做）。
- **归档不可在插件内撤销**——归档只是移出工作区列表（日志保留），恢复需要在工作区界面操作；插件不提供 unarchive。
- **`read_session` 不含工具事件**——只投影用户/助手文本消息，查看工具调用细节请用官方 `tool-session-query` 包。
- **空白对话与「继续」不可撤销**——新会话一旦创建即普通存在，请用 `archive_session` 或在会话列表中归档。

## 开发

```bash
pnpm install
pnpm run typecheck
pnpm test          # build + node --test
```

目录约定与 `dsh-turn-fork` 一致：`src/index.ts`（Host）、`src/client/`（Client）、`src/shared.ts`（共享值契约）、`scripts/dsh-client-preset.ts`（vendor 自 dsh 仓库的 client bundle preset，MIT）。
