import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNow } from '../../hooks/useNow.js'
import { formatDuration } from '../../utils/sessionFormat.js'
import './RestTimer.css'

const HIDE_AFTER_FINISH_MS = 4000

// Countdown shown after completing a set. `endsAt` is a timestamp (ms)
function RestTimer({ endsAt, onAddTime, onDone }) {
  const { t } = useTranslation()
  const now = useNow(250)
  const remaining = Math.ceil((endsAt - now) / 1000)
  const finished = remaining <= 0

  useEffect(() => {
    if (!finished) return
    navigator.vibrate?.(300)
    const timer = setTimeout(onDone, HIDE_AFTER_FINISH_MS)
    return () => clearTimeout(timer)
  }, [finished, onDone])

  return (
    <div className={`rest-timer${finished ? ' rest-timer--finished' : ''}`} role="timer" aria-live={finished ? 'assertive' : 'off'}>
      <span className="rest-timer__label">{finished ? t('workout.restOver') : t('workout.rest')}</span>
      {!finished && <span className="rest-timer__time">{formatDuration(remaining)}</span>}
      <div className="rest-timer__actions">
        {!finished && (
          <button type="button" className="button button--secondary" onClick={() => onAddTime(15)}>
            +15{t('units.seconds')}
          </button>
        )}
        <button type="button" className="button button--secondary" onClick={onDone}>
          {finished ? t('common.close') : t('workout.skipRest')}
        </button>
      </div>
    </div>
  )
}

export default RestTimer
