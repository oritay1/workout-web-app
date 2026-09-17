import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { listExercises } from '../../api/exercisesApi.js'
import { deleteSession, finishSession, getCurrentSession, replaceSession } from '../../api/sessionsApi.js'
import { ROUTES, sessionDetailPath } from '../../constants/routes.js'
import { AUTOSAVE_DELAY_MS, AUTOSAVE_RETRY_MS, DEFAULT_REST_SECONDS, SESSION_LIMITS } from '../../constants/sessions.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { useNow } from '../../hooks/useNow.js'
import { createSessionEntry, toSessionForm, toSessionPayload } from '../../utils/sessionForm.js'
import { formatDuration, getSessionTitle } from '../../utils/sessionFormat.js'
import ExercisePicker from '../ExercisePicker/ExercisePicker.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import RestTimer from '../RestTimer/RestTimer.jsx'
import SessionExerciseCard from '../SessionExerciseCard/SessionExerciseCard.jsx'
import './LiveWorkoutPage.css'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The workout in progress. Every change is saved to the server shortly after it's made,
// so a refresh, a closed tab or a dead battery doesn't lose the workout
function LiveWorkoutPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const now = useNow(1000)

  // undefined = loading, null = no workout in progress
  const [session, setSession] = useState(undefined)
  const [form, setForm] = useState(null)
  const [exercises, setExercises] = useState([])
  // 'saved' | 'pending' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved')
  const [restEndsAt, setRestEndsAt] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorCode, setErrorCode] = useState('')
  // Bumped when changes arrived during a save, so the autosave effect runs again
  const [saveAgainTick, setSaveAgainTick] = useState(0)

  // Autosave bookkeeping lives in refs so saves always send the latest form
  const formRef = useRef(null)
  const versionRef = useRef(0)
  const savedVersionRef = useRef(0)
  const savingRef = useRef(false)
  const saveQueuedRef = useRef(false)
  const closedRef = useRef(false)
  const sessionId = session?.id

  useEffect(() => {
    getCurrentSession()
      .then(({ session: current }) => {
        setSession(current)
        if (current) {
          const initialForm = toSessionForm(current)
          formRef.current = initialForm
          setForm(initialForm)
        }
      })
      .catch((err) => setErrorCode(err.code))
    listExercises()
      .then((data) => setExercises(data.exercises))
      .catch(() => {})
  }, [])

  const save = useCallback(
    async ({ keepalive = false } = {}) => {
      if (!sessionId || closedRef.current) return
      if (savingRef.current) {
        saveQueuedRef.current = true
        return
      }
      if (versionRef.current === savedVersionRef.current) return

      savingRef.current = true
      const version = versionRef.current
      setSaveStatus('saving')
      try {
        await replaceSession(sessionId, toSessionPayload(formRef.current), { keepalive })
        savedVersionRef.current = version
        setSaveStatus(version === versionRef.current ? 'saved' : 'pending')
      } catch {
        setSaveStatus('error')
      } finally {
        savingRef.current = false
        if (saveQueuedRef.current) {
          saveQueuedRef.current = false
          setSaveAgainTick((tick) => tick + 1)
        }
      }
    },
    [sessionId],
  )

  // Debounced autosave, and a retry loop while offline
  useEffect(() => {
    if (saveStatus !== 'pending' && saveStatus !== 'error') return
    const timer = setTimeout(save, saveStatus === 'error' ? AUTOSAVE_RETRY_MS : AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [form, saveStatus, saveAgainTick, save])

  // Flush unsaved changes when leaving the page or closing the tab
  useEffect(() => {
    const flush = () => {
      if (versionRef.current !== savedVersionRef.current) save({ keepalive: true })
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [save])

  function changeForm(updater) {
    const next = updater(formRef.current)
    formRef.current = next
    versionRef.current += 1
    setForm(next)
    setSaveStatus('pending')
  }

  const updateEntry = (index, entry) =>
    changeForm((current) => ({ ...current, exercises: current.exercises.map((item, i) => (i === index ? entry : item)) }))

  function startRest(entry) {
    const seconds = entry.planned?.restSeconds ?? DEFAULT_REST_SECONDS[entry.exercise.type]
    if (seconds) setRestEndsAt(Date.now() + seconds * 1000)
  }

  const endRest = useCallback(() => setRestEndsAt(null), [])

  // Waits for in-flight saves and sends the latest changes; returns false if the server can't be reached
  async function flushSaves() {
    while (savingRef.current) await wait(100)
    if (versionRef.current !== savedVersionRef.current) await save()
    while (savingRef.current) await wait(100)
    return versionRef.current === savedVersionRef.current
  }

  async function handleFinish() {
    const unfinished = form.exercises.reduce((sum, entry) => sum + entry.sets.filter((set) => !set.completed).length, 0)
    const message = unfinished > 0 ? t('workout.confirmFinishUnfinished', { count: unfinished }) : t('workout.confirmFinish')
    if (!window.confirm(message)) return

    setBusy(true)
    setErrorCode('')
    try {
      if (!(await flushSaves())) throw Object.assign(new Error(), { code: 'NETWORK_ERROR' })
      await finishSession(sessionId)
      closedRef.current = true
      navigate(sessionDetailPath(sessionId), { replace: true })
    } catch (err) {
      setErrorCode(err.code)
      setBusy(false)
    }
  }

  async function handleDiscard() {
    if (!window.confirm(t('workout.confirmDiscard'))) return
    setBusy(true)
    setErrorCode('')
    try {
      closedRef.current = true
      await deleteSession(sessionId)
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      closedRef.current = false
      setErrorCode(err.code)
      setBusy(false)
    }
  }

  if (session === null) return <Navigate to={ROUTES.home} replace />
  if (session === undefined || form === null) {
    return errorCode ? (
      <p className="section-form__error live-workout__load-error" role="alert">
        {errorMessage(errorCode)}
      </p>
    ) : (
      <Loader />
    )
  }

  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000
  const saveLabel = {
    saved: t('workout.saved'),
    pending: t('workout.saving'),
    saving: t('workout.saving'),
    error: t('workout.saveFailed'),
  }[saveStatus]

  return (
    <section className="live-workout">
      <header className="live-workout__header">
        <div className="live-workout__heading">
          <h1 className="live-workout__title">{getSessionTitle(session, t)}</h1>
          {session.planName && <p className="live-workout__plan">{session.planName}</p>}
        </div>
        <div className="live-workout__status">
          <span className="live-workout__clock" aria-label={t('workout.elapsed')}>
            {formatDuration(elapsed)}
          </span>
          <span className={`live-workout__save live-workout__save--${saveStatus}`} role="status">
            {saveLabel}
          </span>
        </div>
      </header>

      {form.exercises.length === 0 ? (
        <p className="live-workout__empty">{t('workout.noExercises')}</p>
      ) : (
        <ol className="live-workout__exercises">
          {form.exercises.map((entry, index) => (
            <SessionExerciseCard
              key={entry.key}
              entry={entry}
              sessionId={sessionId}
              onChange={(updated) => updateEntry(index, updated)}
              onRemove={() => changeForm((current) => ({ ...current, exercises: current.exercises.filter((_, i) => i !== index) }))}
              onSetCompleted={startRest}
            />
          ))}
        </ol>
      )}

      <button
        type="button"
        className="button button--secondary live-workout__add"
        onClick={() => setPickerOpen(true)}
        disabled={form.exercises.length >= SESSION_LIMITS.exercises}
      >
        + {t('workout.addExercise')}
      </button>

      <FormField
        as="textarea"
        label={t('workout.notes')}
        value={form.notes}
        maxLength={SESSION_LIMITS.notesLength}
        placeholder={t('workout.notesPlaceholder')}
        onChange={(event) => {
          const { value } = event.target
          changeForm((current) => ({ ...current, notes: value }))
        }}
      />

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      <div className="live-workout__actions">
        <button type="button" className="button button--danger" onClick={handleDiscard} disabled={busy}>
          {t('workout.discard')}
        </button>
        <button type="button" className="button button--primary" onClick={handleFinish} disabled={busy}>
          {t('workout.finish')}
        </button>
      </div>

      {restEndsAt && (
        <RestTimer endsAt={restEndsAt} onAddTime={(seconds) => setRestEndsAt((current) => current + seconds * 1000)} onDone={endRest} />
      )}

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        onSelect={(exercise) =>
          changeForm((current) => ({ ...current, exercises: [...current.exercises, createSessionEntry(exercise)] }))
        }
        onClose={() => setPickerOpen(false)}
      />
    </section>
  )
}

export default LiveWorkoutPage
