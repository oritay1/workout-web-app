import { useTranslation } from 'react-i18next'
import { WEEK_DAYS } from '../../constants/plans.js'
import { getWeekdayName } from '../../utils/weekdays.js'
import './WeekSchedule.css'

// Read-only week view: which workouts happen on each day. `workouts` is [{ name, schedule: [{ day, time }] }]
function WeekSchedule({ workouts }) {
  const { t, i18n } = useTranslation()
  const today = new Date().getDay()

  return (
    <ol className="week-schedule">
      {WEEK_DAYS.map((day) => {
        const slots = workouts
          .flatMap((workout, index) =>
            workout.schedule
              .filter((slot) => slot.day === day)
              .map((slot) => ({
                key: `${index}-${day}`,
                name: workout.name.trim() || t('plans.untitledWorkout'),
                time: slot.time || '',
              })),
          )
          // Workouts with a time first, in time order
          .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

        return (
          <li key={day} className={`week-schedule__day${day === today ? ' week-schedule__day--today' : ''}`}>
            <span className="week-schedule__day-name">
              {getWeekdayName(day, i18n.resolvedLanguage, 'short')}
              {day === today && <span className="visually-hidden"> ({t('plans.today')})</span>}
            </span>
            {slots.length === 0 ? (
              <span className="week-schedule__rest">{t('plans.restDay')}</span>
            ) : (
              <span className="week-schedule__workouts">
                {slots.map((slot) => (
                  <span key={slot.key} className="week-schedule__workout">
                    {slot.name}
                    {slot.time && <span className="week-schedule__time">{slot.time}</span>}
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
