import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { listSessions } from '../../api/sessionsApi.js'
import { sessionDetailPath } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { formatDateTime, formatDuration, getSessionTitle } from '../../utils/sessionFormat.js'
import Loader from '../Loader/Loader.jsx'
import './HistoryPage.css'

function HistoryPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  // null while loading
  const [sessions, setSessions] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorCode, setErrorCode] = useState('')

  useEffect(() => {
    listSessions()
      .then((data) => {
        setSessions(data.sessions)
        setHasMore(data.hasMore)
      })
      .catch((err) => setErrorCode(err.code))
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await listSessions({ before: sessions.at(-1).startedAt })
      setSessions((current) => [...current, ...data.sessions])
      setHasMore(data.hasMore)
    } catch (err) {
      setErrorCode(err.code)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section className="history-page">
      <h1 className="history-page__title">{t('history.title')}</h1>
      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}
      {sessions === null ? (
        !errorCode && <Loader />
      ) : sessions.length === 0 ? (
        <p className="history-page__empty">{t('history.empty')}</p>
      ) : (
        <>
          <ul className="history-page__list">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link className="history-page__item" to={sessionDetailPath(session.id)}>
                  <span className="history-page__name">{getSessionTitle(session, t)}</span>
                  <span className="history-page__meta">
                    {formatDateTime(session.startedAt, i18n.resolvedLanguage)} · {formatDuration(session.durationSeconds)}
                  </span>
                  <span className="history-page__meta">
                    {session.plannedSets > 0
                      ? t('history.setsOfPlanned', { done: session.completedSets, count: session.plannedSets })
                      : t('history.sets', { count: session.completedSets })}
                    {session.volumeKg > 0 && ` · ${t('history.volume', { value: session.volumeKg })}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button type="button" className="button button--secondary" onClick={loadMore} disabled={loadingMore}>
              {t('history.loadMore')}
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default HistoryPage
