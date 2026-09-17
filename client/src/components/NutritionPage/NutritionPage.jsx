import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import * as dietApi from '../../api/dietApi.js'
import { WATER_STEPS_ML } from '../../constants/diet.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { defaultMealFor, mealLabel, mealOptions, toMealSelectOptions } from '../../utils/diet.js'
import { toDateInputValue } from '../../utils/date.js'
import { formatAmount, getFoodName, translatePortionLabel } from '../../utils/foods.js'
import DayEntryItem from '../DayEntryItem/DayEntryItem.jsx'
import FoodPickerDialog from '../FoodPickerDialog/FoodPickerDialog.jsx'
import Loader from '../Loader/Loader.jsx'
import MacroProgress from '../MacroProgress/MacroProgress.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './NutritionPage.css'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function shiftDate(date, days) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return toDateInputValue(next)
}

// Daily food log for one date (?date=YYYY-MM-DD, default today), compared with the active diet plan
function NutritionPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const language = i18n.resolvedLanguage
  const [searchParams, setSearchParams] = useSearchParams()
  const today = toDateInputValue()
  const requestedDate = searchParams.get('date')
  const date = requestedDate && DATE_PATTERN.test(requestedDate) && requestedDate <= today ? requestedDate : today

  const [day, setDay] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [busy, setBusy] = useState(false)
  // null = closed; { meal } to add, { entry } to edit
  const [picker, setPicker] = useState(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    dietApi
      .getDay(date)
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setDay(data.day)
        setErrorCode('')
      })
      .catch((err) => requestId === requestIdRef.current && setErrorCode(err.code))
  }, [date])

  // Runs a change on the server; every day endpoint returns the updated day
  async function run(action) {
    setBusy(true)
    setErrorCode('')
    try {
      const data = await action()
      setDay(data.day)
    } catch (err) {
      setErrorCode(err.code)
      throw err
    } finally {
      setBusy(false)
    }
  }
  const runQuietly = (action) => run(action).catch(() => {})

  const goTo = (nextDate) => setSearchParams(nextDate === today ? {} : { date: nextDate })

  const activePlan = day?.activePlan ?? null
  const meals = useMemo(() => {
    if (!day) return []
    const options = mealOptions(activePlan)
    const extra = day.entries.map((entry) => entry.meal).filter((meal, index, all) => !options.includes(meal) && all.indexOf(meal) === index)
    return [...options, ...extra]
  }, [day, activePlan])

  const dateLabel = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${date}T12:00:00`),
  )

  if (!day) {
    return (
      <section className="nutrition-page">
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

  const { targets, totals } = day
  const loggedPlanItems = new Set(day.entries.map((entry) => entry.planItemId).filter(Boolean))

  return (
    <section className="nutrition-page">
      <div className="nutrition-page__links">
        <Link to={ROUTES.dietPlans}>{t('nutrition.dietPlans')}</Link>
        <Link to={ROUTES.foods}>{t('foods.title')}</Link>
      </div>

      <div className="nutrition-page__day">
        <button type="button" className="icon-button" onClick={() => goTo(shiftDate(date, -1))} aria-label={t('nutrition.previousDay')}>
          {i18n.dir() === 'rtl' ? '→' : '←'}
        </button>
        <div className="nutrition-page__date">
          <h1>{date === today ? t('nutrition.today') : dateLabel}</h1>
          {date === today ? (
            <span>{dateLabel}</span>
          ) : (
            <button type="button" className="nutrition-page__today" onClick={() => goTo(today)}>
              {t('nutrition.backToToday')}
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => goTo(shiftDate(date, 1))}
          disabled={date >= today}
          aria-label={t('nutrition.nextDay')}
        >
          {i18n.dir() === 'rtl' ? '←' : '→'}
        </button>
      </div>

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      <SectionCard title={t('nutrition.summary')} description={day.planName ? t('nutrition.planGoals', { name: day.planName }) : t('nutrition.noPlanGoals')}>
        {day.planChanged && (
          <div className="nutrition-page__notice">
            <span>{t('nutrition.planChanged', { name: activePlan.name })}</span>
            <button type="button" className="button button--secondary" disabled={busy} onClick={() => runQuietly(() => dietApi.syncDayTargets(date))}>
              {t('nutrition.updateGoals')}
            </button>
          </div>
        )}
        <div className="nutrition-page__macros">
          <MacroProgress large label={t('foods.nutrients.energyKcal')} value={totals.energyKcal} target={targets.energyKcal} unit="kcal" />
          <MacroProgress label={t('foods.nutrients.proteinG')} value={totals.proteinG} target={targets.proteinG} unit="g" />
          <MacroProgress label={t('foods.nutrients.carbsG')} value={totals.carbsG} target={targets.carbsG} unit="g" />
          <MacroProgress label={t('foods.nutrients.fatG')} value={totals.fatG} target={targets.fatG} unit="g" />
        </div>
        {!day.planName && (
          <p className="nutrition-page__hint">
            <Link to={ROUTES.dietPlans}>{t('nutrition.createPlanHint')}</Link>
          </p>
        )}
      </SectionCard>

      <SectionCard title={t('nutrition.water')}>
        <MacroProgress label={t('nutrition.waterDrunk')} value={day.waterMl} target={targets.waterMl} unit="ml" />
        <div className="nutrition-page__water">
          <button
            type="button"
            className="button button--secondary"
            disabled={busy || day.waterMl <= 0}
            onClick={() => runQuietly(() => dietApi.setWater(date, Math.max(0, day.waterMl - WATER_STEPS_ML[0])))}
            aria-label={t('nutrition.removeWater', { amount: WATER_STEPS_ML[0] })}
            dir="ltr"
          >
            −{WATER_STEPS_ML[0]}
          </button>
          {WATER_STEPS_ML.map((step) => (
            <button
              key={step}
              type="button"
              className="button button--secondary"
              disabled={busy}
              onClick={() => runQuietly(() => dietApi.setWater(date, day.waterMl + step))}
              aria-label={t('nutrition.addWater', { amount: step })}
              dir="ltr"
            >
              +{step} {t('units.ml')}
            </button>
          ))}
        </div>
      </SectionCard>

      {meals.map((meal) => {
        const entries = day.entries.filter((entry) => entry.meal === meal)
        const planMeal = activePlan?.meals.find((item) => item.name === meal)
        const missingPlanItems = planMeal?.items.filter((item) => !loggedPlanItems.has(item.id)) ?? []
        const mealKcal = entries.reduce((sum, entry) => sum + (entry.nutrients.energyKcal ?? 0), 0)
        const label = mealLabel(meal, t)

        return (
          <section key={meal} className="nutrition-meal" aria-label={label}>
            <div className="nutrition-meal__header">
              <h2 className="nutrition-meal__title">
                {label}
                {planMeal?.time && <span className="nutrition-meal__time">{planMeal.time}</span>}
              </h2>
              <span className="nutrition-meal__kcal">
                {formatAmount(mealKcal, language, 0)} {t('units.kcal')}
              </span>
            </div>

            {entries.length > 0 && (
              <ul className="nutrition-meal__entries">
                {entries.map((entry) => (
                  <DayEntryItem
                    key={entry.id}
                    entry={entry}
                    busy={busy}
                    onEdit={() => setPicker({ entry })}
                    onDelete={() => runQuietly(() => dietApi.deleteDayEntry(date, entry.id))}
                  />
                ))}
              </ul>
            )}

            {missingPlanItems.length > 0 && (
              <div className="nutrition-meal__plan">
                <div className="nutrition-meal__plan-header">
                  <span>{t('nutrition.fromPlan')}</span>
                  <button type="button" className="nutrition-meal__link" disabled={busy} onClick={() => runQuietly(() => dietApi.addPlanMeal(date, planMeal.id))}>
                    {t('nutrition.addAllFromPlan')}
                  </button>
                </div>
                <ul className="nutrition-meal__plan-items">
                  {missingPlanItems.map((item) => {
                    const name = getFoodName(item.food, language)
                    return (
                      <li key={item.id} className="nutrition-meal__plan-item">
                        <span className="nutrition-meal__plan-name" dir="auto">
                          {name}
                          <span className="nutrition-meal__plan-serving">
                            {item.portionLabel
                              ? `${formatAmount(item.quantity, language, 2)} × ${translatePortionLabel(item.portionLabel, language)}`
                              : `${formatAmount(item.amount, language)} ${t(`units.${item.food.basis}`)}`}{' '}
                            · {formatAmount(item.nutrients.energyKcal, language, 0)} {t('units.kcal')}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="button button--secondary nutrition-meal__plan-add"
                          disabled={busy}
                          aria-label={t('nutrition.addNamed', { name })}
                          onClick={() =>
                            runQuietly(() =>
                              dietApi.addDayEntry(date, {
                                foodId: item.food.id,
                                quantity: item.quantity,
                                portionLabel: item.portionLabel,
                                meal,
                                planItemId: item.id,
                              }),
                            )
                          }
                        >
                          +
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <button type="button" className="nutrition-meal__add" onClick={() => setPicker({ meal })}>
              + {t('nutrition.addFoodTo', { meal: label })}
            </button>
          </section>
        )
      })}

      <FoodPickerDialog
        open={picker !== null}
        meals={toMealSelectOptions(meals, t)}
        initial={
          picker?.entry
            ? { food: picker.entry.food, quantity: picker.entry.quantity, portionLabel: picker.entry.portionLabel, meal: picker.entry.meal }
            : picker && { food: null, quantity: '', portionLabel: null, meal: picker.meal ?? defaultMealFor(activePlan) }
        }
        confirmLabel={picker?.entry ? t('common.save') : t('nutrition.addToLog')}
        onConfirm={({ food, quantity, portionLabel, meal }) =>
          run(() =>
            picker.entry
              ? dietApi.updateDayEntry(date, picker.entry.id, { quantity, portionLabel, meal })
              : dietApi.addDayEntry(date, { foodId: food.id, quantity, portionLabel, meal }),
          )
        }
        onClose={() => setPicker(null)}
      />
    </section>
  )
}

export default NutritionPage
