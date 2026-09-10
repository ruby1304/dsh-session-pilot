/**
 * Per-assistant-message action rendered inside the official
 * `conversation.chat.assistant-actions` slot: carry the message's text into a
 * freshly created conversation and continue there. No DOM injection, no text
 * guessing — the excerpt comes from the slot's own `useChat` standard prop.
 *
 * The Chat snapshot is narrowed structurally: ui-slots' standard-props merge
 * collapses to `any` in programs without the full UI adapter set, and the
 * excerpt extraction only needs these three shapes.
 */
import { useState, type ReactElement } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionPilotFace } from './controller.ts'

type AssistantActionsProps = PropsRuntime<'conversation.chat.assistant-actions'> & InjectFace<SessionPilotFace>

interface ChatTextBlock {
  readonly kind: string
  readonly text?: string
}

interface ChatNodeLike {
  readonly kind: string
  readonly messageId?: unknown
  readonly blocks?: readonly ChatTextBlock[]
}

interface ChatSnapshotLike {
  readonly order: readonly string[]
  readonly nodes: { get(key: string): ChatNodeLike | undefined }
}

type UseChatLike = <R>(selector: (value: ChatSnapshotLike) => R) => R

function isTextBlock(block: ChatTextBlock): block is ChatTextBlock & { readonly text: string } {
  return block.kind === 'text' && typeof block.text === 'string'
}

export function ContinueInSessionPilotAction(props: AssistantActionsProps): ReactElement | null {
  const face: InjectFace<SessionPilotFace> = props
  const { t } = face
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const useChat = props.useChat as UseChatLike
  const text = useChat((value) => {
    for (const key of value.order) {
      const node = value.nodes.get(key)
      if (node?.kind === 'assistant' && node.messageId === props.messageId) {
        return (node.blocks ?? []).filter(isTextBlock).map(block => block.text).join('\n\n')
      }
    }
    return undefined
  })

  const onClick = (): void => {
    if (text === undefined) return
    setBusy(true)
    setFailed(false)
    face.continueFromText(text)
      .catch((error: unknown) => {
        console.error('[dsh-session-pilot] continue-in-new-chat failed:', error)
        setFailed(true)
      })
      .finally(() => { setBusy(false) })
  }

  if (text === undefined || text.trim().length === 0) return null

  return (
    <button
      type="button"
      disabled={busy}
      title={failed ? t('failed') : t('continueTitle')}
      onClick={onClick}
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      {busy ? '…' : '⧉'}
    </button>
  )
}
