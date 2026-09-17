import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { activateDietPlan, deleteDietPlan, listDietPlans } from '../../api/dietApi.js'
import { ROUTES, editDietPlanPath } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { formatAmount } from '../../utils/foods.js'
import Loader from '../Loader/Loader.jsx'
import './DietPlansPage.css'

function DietPlansPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const language = i18n.resolvedLanguage
  const [plans, setPlans] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    listDietPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) => setErrorCode(err.code))
  }, [])

  async function runAction(plan, action) {
    setBusyId(plan.id)
    setErrorCode('')
    try {
      await action()
      setPlans((await listDietPlans()).plans)
    } catch (err) {
      setErrorCode(err.code)
    } finally {
      setBusyId(null)
    }
  }

  const targetText = (plan) => {
    const { energyKcal, proteinG, carbsG, fatG } = plan.targets
    const parts = [
      energyKcal && `${formatAmount(energyKcal, language, 0)} ${t('units.kcal')}`,
      proteinG && `${t('foods.macroShort.protein')} ${proteinG}`,
      carbsG && `${t('foods.macroShort.carbs')} ${carbsG}`,
      fatG && `${t('foods.macroShort.fat')} ${fatG}`,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : t('dietPlans.noTargets')
  }

  return (
    <section className="diet-plans">
      <Link className="diet-plans__back" to={ROUTES.nutrition}>
        {t('nutrition.back')}
      </Link>
      <div className="diet-plans__header">
        <h1 className="diet-plans__title">{t('dietPlans.title')}</h1>
        <Link className="button button--primary" to={ROUTES.newDietPlan}>
          {t('dietPlans.new')}
        </Link>
      </div>
      <p className="diet-plans__intro">{t('dietPlans.intro')}</p>
      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}
      {plans === null ? (
        !errorCode && <Loader />
      ) : plans.length === 0 ? (
        <p className="diet-plans__empty">{t('dietPlans.empty')}</p>
      ) : (
        <ul className="diet-plans__list">
          {plans.map((plan) => (
            <li key={plan.id} className={`plan-card${plan.isActive ? ' plan-card--active' : ''}`}>
              <div className="plan-card__header">
                <h2 className="plan-card__name">{plan.name}</h2>
                {plan.isActive && <span className="badge">{t('plans.activeBadge')}</span>}
              </div>
              <p className="plan-card__meta">
                {t('dietPlans.targetsLabel')}: {targetText(plan)}
              </p>
              {plan.meals.length > 0 && (
                <p className="plan-card__workouts">
                  {t('dietPlans.mealsSummary', {
                    count: plan.meals.length,
                    kcal: formatAmount(plan.totals.energyKcal, language, 0),
                  })}
                </p>
              )}
              <div className="plan-card__actions">
                <Link className="button button--secondary" to={editDietPlanPath(plan.id)} aria-label={t('plans.editNamed', { name: plan.name })}>
                  {t('common.edit')}
                </Link>
                {!plan.isActive && (
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={busyId === plan.id}
                    onClick={() => runAction(plan, () => activateDietPlan(plan.id))}
                  >
                    {t('plans.setActive')}
                  </button>
                )}
                <button
                  type="button"
                  className="button button--danger"
                  disabled={busyId === plan.id}
                  aria-label={t('plans.deleteNamed', { name: plan.name })}
                  onClick={() => window.confirm(t('plans.confirmDelete', { name: plan.name })) && runAction(plan, () => deleteDietPlan(plan.id))}
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DietPlansPage
