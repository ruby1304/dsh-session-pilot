/**
 * Browser half of Newchat: a header action for blank conversations and a
 * per-assistant-message action for excerpt-seeded continuation — all through
 * official slots, no DOM injection. Copy ships through the `session-kit` locale
 * namespace (zh/en); without the locale service a local template
 * interpolator falls back to the English dictionary.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { SessionId, type SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import type { SessionKitLocaleKey } from '../shared.ts'
import { SessionKitController } from './controller.ts'
import { SESSION_KIT_EN, SESSION_KIT_ZH } from './locales.ts'
import { SessionKitHeaderAction } from './SessionKitHeaderAction.tsx'
import { ContinueInSessionKitAction } from './ContinueInSessionKitAction.tsx'

export const inject = ['slots', 'conversation', 'connection', 'sessions']

/** Browser context narrowed away from the host SessionStore augmentation. */
type ClientContext = Omit<Context, 'sessions'> & { readonly sessions: ISessions }

function templateFallback(template: string, params?: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (
    params === undefined || params[name] === undefined ? `{${name}}` : String(params[name])
  ))
}

/** Register both UI contributions over one per-session controller identity. */
export function apply(ctx: ClientContext): void {
  const locale = ctx.get('locale')
  const t: Translate<SessionKitLocaleKey> = locale !== undefined
    ? locale.bind('session-kit')
    : (key, params) => templateFallback(SESSION_KIT_EN[key], params)

  if (locale !== undefined) {
    ctx.effect(() => locale.register('session-kit', {
      zh: SESSION_KIT_ZH,
      en: SESSION_KIT_EN,
    }), 'session-kit: locale dictionaries')
  }

  const controllers = new Map<SessionIdType, SessionKitController>()
  const controllerFor = (sessionId: SessionIdType): SessionKitController => {
    let controller = controllers.get(sessionId)
    if (controller === undefined) {
      controller = new SessionKitController(ctx, sessionId, t)
      controllers.set(sessionId, controller)
    }
    return controller
  }

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'session-kit-open',
    order: 30,
    ...locale === undefined ? {} : { locale: 'session-kit' as const },
    inject: sessionId => controllerFor(SessionId(sessionId)).face,
  }, SessionKitHeaderAction))

  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'session-kit-continue',
    order: 110,
    ...locale === undefined ? {} : { locale: 'session-kit' as const },
    inject: sessionId => controllerFor(SessionId(sessionId)).face,
  }, ContinueInSessionKitAction))
}
