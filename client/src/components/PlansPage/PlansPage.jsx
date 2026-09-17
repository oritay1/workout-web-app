import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { activatePlan, deletePlan, listPlans } from '../../api/plansApi.js'
import { listSessions } from '../../api/sessionsApi.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { startOfWeek } from '../../utils/week.js'
import Loader from '../Loader/Loader.jsx'
import PlanCard from '../PlanCard/PlanCard.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import WeekSchedule from '../WeekSchedule/WeekSchedule.jsx'
import './PlansPage.css'

function PlansPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  // null while loading
  const [plans, setPlans] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [weekSessions, setWeekSessions] = useState([])

  useEffect(() => {
    listPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) => setErrorCode(err.code))
    listSessions({ from: startOfWeek().toISOString() })
      .then((data) => setWeekSessions(data.sessions))
      .catch(() => {})
  }, [])

  async function runAction(plan, action) {
    setBusyId(plan.id)
    setErrorCode('')
    try {
      await action()
      setPlans((await listPlans()).plans)
    } catch (err) {
      setErrorCode(err.code)
    } finally {
      setBusyId(null)
    }
  }

  function handleDelete(plan) {
    if (!window.confirm(t('plans.confirmDelete', { name: plan.name }))) return
    runAction(plan, () => deletePlan(plan.id))
  }

  const activePlan = plans?.find((plan) => plan.isActive)

  return (
    <section className="plans-page">
      <div className="plans-page__header">
        <h1 className="plans-page__title">{t('plans.title')}</h1>
        <Link className="button button--primary" to={ROUTES.newPlan}>
          {t('plans.new')}
        </Link>
      </div>

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      {plans === null ? (
        !errorCode && <Loader />
      ) : plans.length === 0 ? (
        <div className="plans-page__empty">
          <p>{t('plans.empty')}</p>
          <Link className="button button--primary" to={ROUTES.newPlan}>
            {t('plans.createFirst')}
          </Link>
        </div>
      ) : (
        <>
          {activePlan ? (
            <SectionCard title={t('plans.thisWeek')} description={activePlan.name}>
              <WeekSchedule workouts={activePlan.workouts} completedSessions={weekSessions} />
            </SectionCard>
          ) : (
            <p className="plans-page__hint">{t('plans.noActive')}</p>
          )}
          <ul className="plans-page__list">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                busy={busyId === plan.id}
                onActivate={(item) => runAction(item, () => activatePlan(item.id))}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default PlansPage
