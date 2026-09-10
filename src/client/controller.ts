/**
 * Per-session client controller: the two creation actions, backed by the
 * host plugin's same-origin route, then navigation to the new conversation.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { SessionId, type SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import {
  SESSION_KIT_PATH,
  boundedExcerpt,
  composeContinuePrompt,
  type SessionKitLocaleKey,
  type SessionKitResult,
} from '../shared.ts'

/** Face injected into this plugin's slot components. */
export interface SessionKitFace {
  readonly t: Translate<SessionKitLocaleKey>
  /** Create an empty conversation beside this session and open it. */
  openBlankChat(): Promise<void>
  /** Create a conversation seeded with one assistant reply and open it. */
  continueFromText(text: string): Promise<void>
}

/** Browser context narrowed to the session-controller client face. */
type ClientContext = Omit<Context, 'sessions'> & { readonly sessions: ISessions }

export class SessionKitController {
  readonly face: SessionKitFace

  constructor(
    private readonly ctx: ClientContext,
    private readonly sessionId: SessionIdType,
    t: Translate<SessionKitLocaleKey>,
  ) {
    this.face = {
      t,
      openBlankChat: () => this.run({ action: 'blank', sourceSessionId: this.sessionId }),
      continueFromText: (text) => {
        const excerpt = boundedExcerpt(text)
        if (excerpt === undefined) return Promise.reject(new Error('message has no text to carry'))
        return this.run({
          action: 'continue',
          sourceSessionId: this.sessionId,
          prompt: composeContinuePrompt(excerpt),
        })
      },
    }
  }

  private async run(operation: Record<string, unknown>): Promise<void> {
    const response = await fetch(SESSION_KIT_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operation),
    })
    const value = await response.json() as Partial<SessionKitResult> & { error?: string }
    if (!response.ok || typeof value.sessionId !== 'string') {
      throw new Error(value.error ?? `request failed with HTTP ${response.status}`)
    }
    this.ctx.sessions.open(SessionId(value.sessionId))
  }
}
