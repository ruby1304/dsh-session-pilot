# dsh-session-kit

Manage conversations from inside a conversation, for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — model and human can both create, rename, list, read, and archive sessions mid-chat.

[中文](README.zh-CN.md)

**Five model tools** (the agent tidies sessions while chatting):

| Tool | What it does |
| --- | --- |
| `new_conversation` | Spin a drifted topic or a well-scoped task off into a brand-new sidebar conversation with a complete, self-contained first user message |
| `rename_session` | Rename a conversation (defaults to the current one) |
| `list_sessions` | List conversations by recent activity (title, running state, directory); pass `query` to content-search messages |
| `read_session` | Read a compact transcript of one conversation (latest user/assistant text messages, bounded) |
| `archive_session` | Archive a conversation out of its workspace's session list (durable log retained) |

**Two official-slot buttons** (no DOM injection):

- **Session-header "＋ New chat"** — one click to a blank conversation in the current workspace
- **Per-assistant-message "⧉"** — carry the message text as a bounded context excerpt into a fresh conversation

Official paths only: the Host half reuses the Web UI's own `sessionController` / `sessionQuery` / `workspaceRegistry` seams; the UI uses only official slots (`conversation.session.header.actions`, `conversation.chat.assistant-actions`). Bilingual UI (zh/en) through `dsh-client-locale`.

## Install

```bash
dsh plugin add dsh-session-kit
```

Restart dsh. The model then sees five tools, the session header gains a "＋ New chat" button, and every finalized assistant message gains a "⧉" action.

## Usage

- **New conversation**: say "spin this task off into a new conversation" — the model calls `new_conversation` with a self-contained briefing as the first message.
- **Session housekeeping**: "rename this conversation to X", "list my recent conversations", "what did we discuss in session X", "archive session X".
- **Header button**: click "＋ New chat" to open a blank conversation in the same workspace.
- **Message action**: click "⧉" on an assistant message — the plugin wraps its text (bounded to 4000 chars) as a `<quoted-context>` excerpt for the new conversation's first user message.

## Why not subagent / fork

| Existing capability | Difference |
| --- | --- |
| `subagent` | A temporary child that reports back to save this conversation's context — not a user-visible independent conversation |
| Message fork (official / `dsh-turn-fork`) | Forks carry the history prefix; `new_conversation` starts **zero-history** conversations carrying only the first message you write |
| Sidebar "+" | Blank conversations only, user-driven; this plugin lets the **model** and **message-level actions** create conversations too, optionally seeded |
| Official read-only `tool-session-query` package (opt-in) | Event-level read-only queries; this plugin adds **writes** (create/rename/archive) and a compact housekeeping view |

## Closest community plugins (survey, 2026-09)

| Plugin | Overlap | Key difference |
| --- | --- | --- |
| [`yangYzc/dsh-plugin-quote-reply`](https://github.com/yangYzc/dsh-plugin-quote-reply) | Its "reply in new window" also creates a session with a quote | It is **selection-based quoting into a composer draft** (you send manually); this plugin carries a whole message as the **first admitted user message** (the new conversation starts immediately). It also has no model tool and creates client-side (no `sessionController` workspace attach) |
| [`bpc-oss/dsh-fork-to-preset`](https://github.com/bpc-oss/dsh-fork-to-preset) | Header button creates a session | Fork semantics: **inherits completed turns** into another preset; this plugin starts zero-history |
| [`qwert702/dsh-context-compressor`](https://github.com/qwert702/dsh-context-compressor) | Switches to a fresh session | Auto-triggered context compression; this plugin is deliberate, topic-driven creation |
| `weibaohui/dsh-tasks`, DSH Automation Center | New session per run | Cron-driven, not in-conversation |

**No plugin ships this tool family** — letting the model create, rename, and organize user-visible top-level conversations; that gap is this plugin's core.

## Design notes

- **One transaction**: `new_conversation` and the HTTP route share `createSessionKit` — resolve the source session's workspace (direct attachment), call `sessionController.create` (the Host attaches the workspace), then optionally `rename` and `prompt` (`mode: 'queue'`, forwarding `exec.signal`). Created conversations are ordinary durable Sessions.
- **Workspace and preset inheritance**: the new conversation lands in the source's workspace, falls back to the source `cwd`, and (tool path) inherits the source's latest `agent-preset/selected`.
- **Reads through their own seams**: `list_sessions` uses `sessionController.list/search`; `read_session` uses `sessionQuery.readSession` (live-preferred, cold persistence reads) plus `readTitle`, with bounded message projection (≤600 chars per message, ≤100 messages, ≤12000 chars total).
- **HTTP trust fence**: the route accepts loopback Origin/Host only (same convention as `dsh-turn-fork`), `application/json`, bodies ≤ 64 KiB.
- **Cross-version**: written against the `0.1.5-rc.1` API (peer deps) and verified on the `0.1.2-alpha.4` runtime; `prompt` always passes `mode: 'queue'` explicitly to satisfy both versions' `SessionPromptRequest`.

## Known Limitations and Deferred Work

- **Text-only excerpts** — images and tool-call blocks of an assistant message are not carried; re-reference files with `@` in the new conversation.
- **Route path skips preset inheritance** — UI-created conversations use the deployment's default agent preset (reading the source preset route-side needs an extra inspect, deferred).
- **No in-plugin unarchive** — archiving only detaches a session from its workspace list (the log is retained); restoring happens in the workspace UI.
- **`read_session` skips tool events** — it projects user/assistant text only; use the official `tool-session-query` package for tool-call details.
- **No undo for creation** — a created conversation is an ordinary session; archive it with `archive_session` or from the session list.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm test          # build + node --test
```

Layout mirrors `dsh-turn-fork`: `src/index.ts` (Host), `src/client/` (Client), `src/shared.ts` (shared value contracts), `scripts/dsh-client-preset.ts` (client bundle preset vendored from the dsh repository, MIT).
