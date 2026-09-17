import { useTranslation } from 'react-i18next'
import { WEEK_DAYS } from '../../constants/plans.js'
import { addDays, startOfWeek } from '../../utils/week.js'
import { getWeekdayName } from '../../utils/weekdays.js'
import './WeekSchedule.css'

// Week view: which workouts happen on each day. `workouts` is [{ id, name, schedule: [{ day, time }] }].
// With `completedSessions` (this week's finished workouts), planned slots get a check mark and
// workouts done on other days are listed too — planned vs actual at a glance
function WeekSchedule({ workouts, completedSessions }) {
  const { t, i18n } = useTranslation()
  const today = new Date().getDay()
  const weekStart = startOfWeek()

  const sessionsByDay = WEEK_DAYS.map(() => [])
  for (const session of completedSessions ?? []) {
    const started = new Date(session.startedAt)
    if (started >= weekStart && started < addDays(weekStart, 7)) sessionsByDay[started.getDay()].push(session)
  }

  return (
    <ol className="week-schedule">
      {WEEK_DAYS.map((day) => {
        const daySessions = [...sessionsByDay[day]]
        const slots = workouts
          .flatMap((workout, index) =>
            workout.schedule
              .filter((slot) => slot.day === day)
              .map((slot) => {
                const doneIndex = daySessions.findIndex((session) => workout.id && session.workoutId === workout.id)
                const done = doneIndex !== -1
                if (done) daySessions.splice(doneIndex, 1)
                return {
                  key: `${index}-${day}`,
                  name: workout.name.trim() || t('plans.untitledWorkout'),
                  time: slot.time || '',
                  done,
                }
              }),
          )
          // Workouts with a time first, in time order
          .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
        // Sessions that didn't match a planned slot on this day
        const extras = daySessions.map((session) => ({
          key: session.id,
          name: session.name || t('workout.freeWorkout'),
          time: '',
          done: true,
          extra: true,
        }))
        const items = [...slots, ...extras]

        return (
          <li key={day} className={`week-schedule__day${day === today ? ' week-schedule__day--today' : ''}`}>
            <span className="week-schedule__day-name">
              {getWeekdayName(day, i18n.resolvedLanguage, 'short')}
              {day === today && <span className="visually-hidden"> ({t('plans.today')})</span>}
            </span>
            {items.length === 0 ? (
              <span className="week-schedule__rest">{t('plans.restDay')}</span>
            ) : (
              <span className="week-schedule__workouts">
                {items.map((item) => (
                  <span
                    key={item.key}
                    className={`week-schedule__workout${item.done ? ' week-schedule__workout--done' : ''}`}
                  >
                    {item.done && (
                      <span className="week-schedule__check" aria-label={t('plans.done')}>
                        ✓
                      </span>
                    )}
                    {item.name}
                    {item.extra && <span className="week-schedule__time">{t('plans.unplanned')}</span>}
                    {item.time && <span className="week-schedule__time">{item.time}</span>}
                  </span>
                ))}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default WeekSchedule
