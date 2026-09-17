import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { editPlanPath } from '../../constants/routes.js'
import './PlanCard.css'

function PlanCard({ plan, onActivate, onDelete, busy }) {
  const { t } = useTranslation()

  return (
    <li className={`plan-card${plan.isActive ? ' plan-card--active' : ''}`}>
      <div className="plan-card__header">
        <h2 className="plan-card__name">{plan.name}</h2>
        {plan.isActive && <span className="badge">{t('plans.activeBadge')}</span>}
      </div>
      <p className="plan-card__meta">
        {t('plans.perWeek', { count: plan.workoutsPerWeek })} · {t('plans.workoutCount', { count: plan.workouts.length })}
      </p>
      {plan.workouts.length > 0 && (
        <p className="plan-card__workouts">{plan.workouts.map((workout) => workout.name).join(' · ')}</p>
      )}
      <div className="plan-card__actions">
        <Link className="button button--secondary" to={editPlanPath(plan.id)} aria-label={t('plans.editNamed', { name: plan.name })}>
          {t('common.edit')}
        </Link>
        {!plan.isActive && (
          <button type="button" className="button button--secondary" onClick={() => onActivate(plan)} disabled={busy}>
            {t('plans.setActive')}
          </button>
        )}
        <button
          type="button"
          className="button button--danger"
          onClick={() => onDelete(plan)}
          disabled={busy}
          aria-label={t('plans.deleteNamed', { name: plan.name })}
        >
          {t('common.delete')}
        </button>
      </div>
    </li>
  )
}

export default PlanCard
