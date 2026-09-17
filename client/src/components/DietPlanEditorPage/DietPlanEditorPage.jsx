import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { createDietPlan, getDietPlan, replaceDietPlan } from '../../api/dietApi.js'
import { getHealth, getLatestMeasurements } from '../../api/meApi.js'
import { DIET_LIMITS, TARGETS } from '../../constants/diet.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.js'
import { servingAmount, servingNutrients, suggestTargets, sumMacros } from '../../utils/diet.js'
import { formatAmount, getFoodName, translatePortionLabel } from '../../utils/foods.js'
import FoodPickerDialog from '../FoodPickerDialog/FoodPickerDialog.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import MacroProgress from '../MacroProgress/MacroProgress.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './DietPlanEditorPage.css'

let lastKey = 0
const newKey = () => `diet-${++lastKey}`

const emptyTargets = () => Object.fromEntries(TARGETS.map(({ field }) => [field, '']))

function toForm(plan) {
  return {
    name: plan.name,
    notes: plan.notes ?? '',
    targets: Object.fromEntries(TARGETS.map(({ field }) => [field, plan.targets[field] === null ? '' : String(plan.targets[field])])),
    meals: plan.meals.map((meal) => ({
      key: newKey(),
      id: meal.id,
      name: meal.name,
      time: meal.time ?? '',
      items: meal.items.map((item) => ({ key: newKey(), id: item.id, food: item.food, quantity: item.quantity, portionLabel: item.portionLabel })),
    })),
  }
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    notes: form.notes.trim() || null,
    targets: Object.fromEntries(TARGETS.map(({ field }) => [field, form.targets[field].trim() === '' ? null : Number(form.targets[field])])),
    meals: form.meals.map((meal) => ({
      id: meal.id,
      name: meal.name.trim(),
      time: meal.time || null,
      items: meal.items.map((item) => ({ id: item.id, foodId: item.food.id, quantity: item.quantity, portionLabel: item.portionLabel })),
    })),
  }
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = true
  for (const { field, min, max } of TARGETS) {
    const text = form.targets[field].trim()
    if (text !== '' && !(Number(text) >= min && Number(text) <= max)) errors[`targets.${field}`] = true
  }
  form.meals.forEach((meal, index) => {
    if (!meal.name.trim()) errors[`meals.${index}.name`] = true
  })
  return errors
}

function DietPlanEditorPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(() =>
    isEdit
      ? null
      : {
          name: '',
          notes: '',
          targets: emptyTargets(),
          meals: ['breakfast', 'lunch', 'dinner'].map((meal) => ({ key: newKey(), id: null, name: t(`nutrition.meals.${meal}`), time: '', items: [] })),
        },
  )
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  // null = closed; { mealKey } to add, { mealKey, itemKey } to edit
  const [picker, setPicker] = useState(null)

  const allowLeave = useUnsavedChangesWarning(isDirty, t('plans.editor.unsavedConfirm'))

  useEffect(() => {
    if (!id) return
    getDietPlan(id)
      .then((data) => setForm(toForm(data.plan)))
      .catch((err) => setFormError(err.code))
  }, [id])

  function change(updater, clearPath) {
    setForm((current) => updater(current))
    setIsDirty(true)
    setFormError('')
    if (clearPath) setErrors((current) => ({ ...current, [clearPath]: undefined }))
  }

  const updateMeal = (key, changes) =>
    change((current) => ({ ...current, meals: current.meals.map((meal) => (meal.key === key ? { ...meal, ...changes } : meal)) }))

  async function suggest() {
    setSuggestion({ loading: true })
    try {
      const [{ health }, { latest }] = await Promise.all([getHealth(), getLatestMeasurements()])
      setSuggestion(suggestTargets(health, latest.weight?.value))
    } catch (err) {
      setSuggestion({ errorCode: err.code })
    }
  }

  function applySuggestion() {
    change((current) => ({
      ...current,
      targets: Object.fromEntries(TARGETS.map(({ field }) => [field, String(suggestion.targets[field])])),
    }))
    setSuggestion(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('PLAN_HAS_ERRORS')
      requestAnimationFrame(() => document.querySelector('.diet-editor [aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      if (isEdit) await replaceDietPlan(id, toPayload(form))
      else await createDietPlan(toPayload(form))
      allowLeave()
      navigate(ROUTES.dietPlans)
    } catch (err) {
      if (err.field) setErrors({ [err.field]: true })
      setFormError(err.field ? 'PLAN_HAS_ERRORS' : err.code)
      setSaving(false)
    }
  }

  if (form === null) {
    return (
      <section className="diet-editor">
        {formError ? (
          <p className="section-form__error" role="alert">
            {errorMessage(formError)}
          </p>
        ) : (
          <Loader />
        )}
      </section>
    )
  }

  const itemNutrients = (item) => servingNutrients(item.food, servingAmount(item.food, item.quantity, item.portionLabel))
  const planTotals = sumMacros(form.meals.flatMap((meal) => meal.items.map(itemNutrients)))
  const numericTarget = (field) => (form.targets[field].trim() === '' ? null : Number(form.targets[field]))
  const editingItem = picker?.itemKey
    ? form.meals.find((meal) => meal.key === picker.mealKey)?.items.find((item) => item.key === picker.itemKey)
    : null

  return (
    <>
      <form className="diet-editor" onSubmit={handleSubmit} noValidate>
        <Link className="diet-editor__back" to={ROUTES.dietPlans}>
          {t('dietPlans.back')}
        </Link>
        <h1 className="diet-editor__title">{isEdit ? t('dietPlans.editTitle') : t('dietPlans.newTitle')}</h1>

        <SectionCard title={t('plans.editor.details')}>
          <div className="section-form">
            <FormField
              label={t('plans.editor.name')}
              value={form.name}
              maxLength={DIET_LIMITS.nameLength}
              placeholder={t('dietPlans.namePlaceholder')}
              error={errors.name ? t('plans.editor.required') : ''}
              onChange={(event) => {
                const { value } = event.target
                change((current) => ({ ...current, name: value }), 'name')
              }}
            />
            <FormField
              as="textarea"
              label={t('plans.editor.notes')}
              value={form.notes}
              maxLength={DIET_LIMITS.notesLength}
              onChange={(event) => {
                const { value } = event.target
                change((current) => ({ ...current, notes: value }))
              }}
            />
          </div>
        </SectionCard>

        <SectionCard title={t('dietPlans.targets')} description={t('dietPlans.targetsHint')}>
          <div className="diet-editor__targets">
            {TARGETS.map(({ field, unit, min, max, step }) => (
              <FormField
                key={field}
                label={t('health.labelWithUnit', { label: t(`dietPlans.targetFields.${field}`), unit: t(`units.${unit}`) })}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={step}
                value={form.targets[field]}
                error={errors[`targets.${field}`] ? t('health.rangeError', { min, max }) : ''}
                onChange={(event) => {
                  const { value } = event.target
                  change((current) => ({ ...current, targets: { ...current.targets, [field]: value } }), `targets.${field}`)
                }}
              />
            ))}
          </div>
          <button type="button" className="button button--secondary diet-editor__suggest" onClick={suggest} disabled={suggestion?.loading}>
            {t('dietPlans.suggest')}
          </button>
          {suggestion?.targets && (
            <div className="diet-editor__suggestion" role="status">
              <p>
                {t('dietPlans.suggestion', {
                  kcal: suggestion.targets.energyKcal,
                  protein: suggestion.targets.proteinG,
                  carbs: suggestion.targets.carbsG,
                  fat: suggestion.targets.fatG,
                  water: suggestion.targets.waterMl,
                })}
              </p>
              <p className="diet-editor__muted">{t('dietPlans.suggestionNote')}</p>
              <button type="button" className="button button--primary" onClick={applySuggestion}>
                {t('dietPlans.useSuggestion')}
              </button>
            </div>
          )}
          {suggestion?.missing && (
            <p className="diet-editor__suggestion" role="status">
              {t('dietPlans.suggestionMissing', { fields: suggestion.missing.map((field) => t(`dietPlans.profileFields.${field}`)).join(', ') })}{' '}
              <Link to={ROUTES.profile}>{t('dietPlans.goToProfile')}</Link>
            </p>
          )}
          {suggestion?.errorCode && (
            <p className="section-form__error" role="alert">
              {errorMessage(suggestion.errorCode)}
            </p>
          )}
        </SectionCard>

        <h2 className="diet-editor__section-title">{t('dietPlans.meals')}</h2>
        <p className="diet-editor__muted">{t('dietPlans.mealsHint')}</p>
        {form.meals.map((meal, mealIndex) => {
          const mealTotals = sumMacros(meal.items.map(itemNutrients))
          const title = meal.name.trim() || t('dietPlans.mealNumber', { number: mealIndex + 1 })
          return (
            <section key={meal.key} className="diet-editor__meal" aria-label={title}>
              <div className="diet-editor__meal-header">
                <FormField
                  label={t('dietPlans.mealName')}
                  value={meal.name}
                  maxLength={DIET_LIMITS.mealNameLength}
                  error={errors[`meals.${mealIndex}.name`] ? t('plans.editor.required') : ''}
                  onChange={(event) => {
                    updateMeal(meal.key, { name: event.target.value })
                    setErrors((current) => ({ ...current, [`meals.${mealIndex}.name`]: undefined }))
                  }}
                />
                <FormField
                  label={t('dietPlans.mealTime')}
                  type="time"
                  value={meal.time}
                  onChange={(event) => updateMeal(meal.key, { time: event.target.value })}
                />
                <button
                  type="button"
                  className="icon-button icon-button--danger diet-editor__remove-meal"
                  aria-label={t('dietPlans.removeMeal', { name: title })}
                  onClick={() =>
                    (meal.items.length === 0 || window.confirm(t('plans.editor.confirmRemoveWorkout', { name: title }))) &&
                    change((current) => ({ ...current, meals: current.meals.filter((item) => item.key !== meal.key) }))
                  }
                >
                  ×
                </button>
              </div>

              {meal.items.length > 0 && (
                <ul className="diet-editor__items">
                  {meal.items.map((item) => {
                    const name = getFoodName(item.food, language)
                    const nutrients = itemNutrients(item)
                    return (
                      <li key={item.key} className="diet-editor__item">
                        <button
                          type="button"
                          className="diet-editor__item-main"
                          onClick={() => setPicker({ mealKey: meal.key, itemKey: item.key })}
                          aria-label={t('nutrition.editEntry', { name })}
                        >
                          <span dir="auto">{name}</span>
                          <span className="diet-editor__muted">
                            {item.portionLabel
                              ? `${formatAmount(item.quantity, language, 2)} × ${translatePortionLabel(item.portionLabel, language)}`
                              : `${formatAmount(item.quantity, language)} ${t(`units.${item.food.basis}`)}`}
                          </span>
                        </button>
                        <span className="diet-editor__item-kcal">
                          {formatAmount(nutrients.energyKcal, language, 0)} {t('units.kcal')}
                        </span>
                        <button
                          type="button"
                          className="icon-button diet-editor__item-remove"
                          aria-label={t('plans.editor.removeExercise', { name })}
                          onClick={() => updateMeal(meal.key, { items: meal.items.filter((other) => other.key !== item.key) })}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="diet-editor__meal-footer">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setPicker({ mealKey: meal.key })}
                  disabled={meal.items.length >= DIET_LIMITS.itemsPerMeal}
                >
                  + {t('dietPlans.addFood')}
                </button>
                <span className="diet-editor__muted">
                  {formatAmount(mealTotals.energyKcal, language, 0)} {t('units.kcal')}
                </span>
              </div>
            </section>
          )
        })}
        <button
          type="button"
          className="button button--secondary diet-editor__add-meal"
          disabled={form.meals.length >= DIET_LIMITS.meals}
          onClick={() => change((current) => ({ ...current, meals: [...current.meals, { key: newKey(), id: null, name: '', time: '', items: [] }] }))}
        >
          + {t('dietPlans.addMeal')}
        </button>

        <SectionCard title={t('dietPlans.planTotals')} description={t('dietPlans.planTotalsHint')}>
          <div className="diet-editor__totals">
            <MacroProgress large label={t('foods.nutrients.energyKcal')} value={planTotals.energyKcal} target={numericTarget('energyKcal')} unit="kcal" />
            <MacroProgress label={t('foods.nutrients.proteinG')} value={planTotals.proteinG} target={numericTarget('proteinG')} unit="g" />
            <MacroProgress label={t('foods.nutrients.carbsG')} value={planTotals.carbsG} target={numericTarget('carbsG')} unit="g" />
            <MacroProgress label={t('foods.nutrients.fatG')} value={planTotals.fatG} target={numericTarget('fatG')} unit="g" />
          </div>
        </SectionCard>

        <div className="plan-editor__savebar">
          {formError && (
            <p className="section-form__error plan-editor__error" role="alert">
              {errorMessage(formError)}
            </p>
          )}
          <div className="plan-editor__savebar-buttons">
            <Link className="button button--secondary" to={ROUTES.dietPlans}>
              {t('common.cancel')}
            </Link>
            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('plans.editor.save')}
            </button>
          </div>
        </div>
      </form>

      {/* Outside the <form>: the dialog has its own form, and nested forms submit the outer one */}
      <FoodPickerDialog
        open={picker !== null}
        initial={editingItem ? { food: editingItem.food, quantity: editingItem.quantity, portionLabel: editingItem.portionLabel } : null}
        confirmLabel={editingItem ? t('common.save') : t('dietPlans.addToMeal')}
        onConfirm={({ food, quantity, portionLabel }) => {
          const meal = form.meals.find((item) => item.key === picker.mealKey)
          updateMeal(picker.mealKey, {
            items: editingItem
              ? meal.items.map((item) => (item.key === editingItem.key ? { ...item, quantity, portionLabel } : item))
              : [...meal.items, { key: newKey(), id: null, food, quantity, portionLabel }],
          })
        }}
        onClose={() => setPicker(null)}
      />
    </>
  )
}

export default DietPlanEditorPage
