/** Locale dictionaries for the `session-pilot` namespace (zh / en). */
import type { SessionPilotLocaleKey } from '../shared.ts'

export const SESSION_PILOT_EN: Record<SessionPilotLocaleKey, string> = {
  headerBlank: 'New chat',
  headerBlankTitle: 'Start a blank conversation in this workspace',
  continueTitle: 'Continue this reply in a new conversation',
  busy: 'Creating…',
  failed: 'Failed to create the conversation',
}

export const SESSION_PILOT_ZH: Record<SessionPilotLocaleKey, string> = {
  headerBlank: '新对话',
  headerBlankTitle: '在当前工作区开一个空白新对话',
  continueTitle: '把这条回复带进新对话继续',
  busy: '创建中…',
  failed: '创建新对话失败',
}
