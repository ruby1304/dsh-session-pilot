/** Session-header action: start a blank conversation beside this one. */
import { useState, type ReactElement } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionKitFace } from './controller.ts'

type HeaderProps = PropsRuntime<'conversation.session.header.actions'> & InjectFace<SessionKitFace>

export function SessionKitHeaderAction(props: HeaderProps): ReactElement {
  const face: InjectFace<SessionKitFace> = props
  const { t } = face
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const onClick = (): void => {
    setBusy(true)
    setFailed(false)
    face.openBlankChat()
      .catch((error: unknown) => {
        console.error('[dsh-session-kit] blank conversation failed:', error)
        setFailed(true)
      })
      .finally(() => { setBusy(false) })
  }

  return (
    <button
      type="button"
      disabled={busy}
      title={failed ? t('failed') : t('headerBlankTitle')}
      onClick={onClick}
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      {busy ? t('busy') : `＋ ${t('headerBlank')}`}
    </button>
  )
}
