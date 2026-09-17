import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { listPlans } from '../../api/plansApi.js'
import { getCurrentSession, listSessions, startSession } from '../../api/sessionsApi.js'
import { ROUTES, sessionDetailPath } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { formatDateTime, formatDuration, getSessionTitle } from '../../utils/sessionFormat.js'
import { startOfWeek } from '../../utils/week.js'
import Loader from '../Loader/Loader.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import WeekSchedule from '../WeekSchedule/WeekSchedule.jsx'
import './HomePage.css'

const RECENT_COUNT = 3

function HomePage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const { user } = useAuth()
  const navigate = useNavigate()
  // null while loading
  const [data, setData] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    Promise.all([
      getCurrentSession(),
      listPlans(),
      listSessions({ from: startOfWeek().toISOString() }),
      listSessions(),
    ])
      .then(([current, plans, week, recent]) =>
        setData({
          current: current.session,
          activePlan: plans.plans.find((plan) => plan.isActive) ?? null,
          weekSessions: week.sessions,
          recent: recent.sessions.slice(0, RECENT_COUNT),
        }),
      )
      .catch((err) => setErrorCode(err.code))
  }, [])

  async function start(source) {
    setStarting(true)
    setErrorCode('')
    try {
      await startSession(source)
      navigate(ROUTES.workout)
    } catch (err) {
      // A workout is already running (e.g. started on another device): go to it
      if (err.code === 'SESSION_IN_PROGRESS') navigate(ROUTES.workout)
      else {
        setErrorCode(err.code)
        setStarting(false)
      }
    }
  }

  if (data === null) {
    return (
      <section className="home-page">
        <h1 className="home-page__title">{t('home.greeting', { username: user.username })}</h1>
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

  const { current, activePlan, weekSessions, recent } = data
  const today = new Date().getDay()
  const todaysWorkouts = activePlan
    ? activePlan.workouts
        .filter((workout) => workout.schedule.some((slot) => slot.day === today))
        .map((workout) => ({ ...workout, time: workout.schedule.find((slot) => slot.day === today).time }))
    : []
  const otherWorkouts = activePlan?.workouts.filter((workout) => !todaysWorkouts.some((item) => item.id === workout.id)) ?? []
  const doneThisWeek = weekSessions.length
  const plannedThisWeek = activePlan?.workoutsPerWeek ?? 0

  const startButton = (workout, primary) => (
    <button
      type="button"
      className={`button ${primary ? 'button--primary' : 'button--secondary'}`}
      disabled={starting || Boolean(current)}
      onClick={() => start({ planId: activePlan.id, workoutId: workout.id })}
      aria-label={t('home.startNamed', { name: workout.name })}
    >
      {t('home.start')}
    </button>
  )

  return (
    <section className="home-page">
      <h1 className="home-page__title">{t('home.greeting', { username: user.username })}</h1>

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      {current && (
        <div className="home-page__current">
          <div>
            <p className="home-page__current-label">{t('home.inProgress')}</p>
            <p className="home-page__current-name">{getSessionTitle(current, t)}</p>
          </div>
          <Link className="button button--primary" to={ROUTES.workout}>
            {t('home.continue')}
          </Link>
        </div>
      )}

      <SectionCard title={t('home.today')} description={activePlan?.name}>
        {!activePlan ? (
          <p className="home-page__muted">
            {t('home.noActivePlan')} <Link to={ROUTES.plans}>{t('home.goToPlans')}</Link>
          </p>
        ) : todaysWorkouts.length === 0 ? (
          <p className="home-page__muted">{t('home.nothingToday')}</p>
        ) : (
          <ul className="home-page__workouts">
            {todaysWorkouts.map((workout) => (
              <li key={workout.id} className="home-page__workout">
                <span>
                  <span className="home-page__workout-name">{workout.name}</span>
                  <span className="home-page__workout-meta">
                    {[workout.time, t('home.exerciseCount', { count: workout.exerciseCount })].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {startButton(workout, true)}
              </li>
            ))}
          </ul>
        )}
        {otherWorkouts.length > 0 && (
          <details className="home-page__other">
            <summary>{t('home.otherWorkouts')}</summary>
            <ul className="home-page__workouts">
              {otherWorkouts.map((workout) => (
                <li key={workout.id} className="home-page__workout">
                  <span className="home-page__workout-name">{workout.name}</span>
                  {startButton(workout, false)}
                </li>
              ))}
            </ul>
          </details>
        )}
        <button
          type="button"
          className="button button--secondary home-page__free"
          disabled={starting || Boolean(current)}
          onClick={() => start({})}
        >
          {t('home.startFree')}
        </button>
      </SectionCard>

      {activePlan && (
        <SectionCard title={t('home.thisWeek')} description={t('home.weekProgress', { done: doneThisWeek, count: plannedThisWeek })}>
          <div
            className="home-page__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={plannedThisWeek}
            aria-valuenow={Math.min(doneThisWeek, plannedThisWeek)}
            aria-label={t('home.thisWeek')}
          >
            <span style={{ width: `${plannedThisWeek ? Math.min(100, (doneThisWeek / plannedThisWeek) * 100) : 0}%` }} />
          </div>
          <WeekSchedule workouts={activePlan.workouts} completedSessions={weekSessions} />
        </SectionCard>
      )}

      <SectionCard title={t('home.recent')}>
        {recent.length === 0 ? (
          <p className="home-page__muted">{t('home.noRecent')}</p>
        ) : (
          <ul className="home-page__recent">
            {recent.map((session) => (
              <li key={session.id}>
                <Link className="home-page__recent-link" to={sessionDetailPath(session.id)}>
                  <span className="home-page__workout-name">{getSessionTitle(session, t)}</span>
                  <span className="home-page__workout-meta">
                    {formatDateTime(session.startedAt, i18n.resolvedLanguage)} · {formatDuration(session.durationSeconds)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link className="home-page__all" to={ROUTES.history}>
          {t('home.allHistory')}
        </Link>
      </SectionCard>
    </section>
  )
}

export default HomePage
