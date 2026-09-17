import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteSession, getSession } from '../../api/sessionsApi.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import {
  formatDateTime,
  formatDuration,
  formatEntryName,
  formatPlanned,
  formatSet,
  getEntryStatus,
  getSessionTitle,
} from '../../utils/sessionFormat.js'
import Loader from '../Loader/Loader.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './SessionDetailPage.css'

// A finished workout: planned vs actual for each exercise
function SessionDetailPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getSession(id)
      .then((data) => setSession(data.session))
      .catch((err) => setErrorCode(err.code))
  }, [id])

  async function handleDelete() {
    if (!window.confirm(t('history.confirmDelete'))) return
    setDeleting(true)
    try {
      await deleteSession(id)
      navigate(ROUTES.history, { replace: true })
    } catch (err) {
      setErrorCode(err.code)
      setDeleting(false)
    }
  }

  if (!session) {
    return (
      <section className="session-detail">
        <Link className="session-detail__back" to={ROUTES.history}>
          {t('history.back')}
        </Link>
        {errorCode ? (
          <p className="section-form__error" role="alert">
            {errorMessage(errorCode)}
          </p>
        ) : (
          <Loader />
        )}
      </section>
    )
  }

  const language = i18n.resolvedLanguage

  return (
    <section className="session-detail">
      <Link className="session-detail__back" to={ROUTES.history}>
        {t('history.back')}
      </Link>
      <div>
        <h1 className="session-detail__title">{getSessionTitle(session, t)}</h1>
        <p className="session-detail__subtitle">
          {[session.planName, formatDateTime(session.startedAt, language)].filter(Boolean).join(' · ')}
        </p>
      </div>

      <dl className="session-detail__stats">
        <div>
          <dt>{t('history.duration')}</dt>
          <dd>{formatDuration(session.durationSeconds)}</dd>
        </div>
        <div>
          <dt>{t('history.setsLabel')}</dt>
          <dd>{session.plannedSets > 0 ? `${session.completedSets}/${session.plannedSets}` : session.completedSets}</dd>
        </div>
        <div>
          <dt>{t('history.volumeLabel')}</dt>
          <dd>
            {session.volumeKg} {t('units.kg')}
          </dd>
        </div>
      </dl>

      <SectionCard title={t('history.plannedVsActual')}>
        <ul className="session-detail__exercises">
          {session.exercises.map((entry) => {
            const status = getEntryStatus(entry)
            const completedSets = entry.sets.filter((set) => set.completed)
            return (
              <li key={entry.id} className="session-detail__exercise">
                <div className="session-detail__exercise-header">
                  <span className="session-detail__exercise-name">{formatEntryName(entry, language)}</span>
                  <span className={`badge session-detail__status session-detail__status--${status}`}>
                    {t(`history.status.${status}`)}
                  </span>
                </div>
                {entry.planned && (
                  <p className="session-detail__line">
                    <span className="session-detail__line-label">{t('history.planned')}</span>
                    <span className="session-detail__line-value">{formatPlanned(entry.planned, entry.exercise.type, t)}</span>
                  </p>
                )}
                <p className="session-detail__line">
                  <span className="session-detail__line-label">{t('history.actual')}</span>
                  <span className="session-detail__line-value">
                    {completedSets.length === 0
                      ? '—'
                      : completedSets.map((set) => formatSet(set, entry.exercise.type, t)).join(', ')}
                  </span>
                </p>
              </li>
            )
          })}
        </ul>
      </SectionCard>

      {session.notes && (
        <SectionCard title={t('workout.notes')}>
          <p className="session-detail__notes">{session.notes}</p>
        </SectionCard>
      )}

      <button type="button" className="button button--danger" onClick={handleDelete} disabled={deleting}>
        {t('history.delete')}
      </button>
    </section>
  )
}

export default SessionDetailPage
