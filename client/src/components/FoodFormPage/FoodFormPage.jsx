import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { createFood, getFood, updateFood } from '../../api/foodsApi.js'
import { FOOD_CATEGORIES, FOOD_LIMITS, NUTRIENTS } from '../../constants/foods.js'
import { ROUTES, foodDetailPath } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './FoodFormPage.css'

const MAIN_NUTRIENTS = NUTRIENTS.filter((nutrient) => nutrient.main)
const EXTRA_NUTRIENTS = NUTRIENTS.filter((nutrient) => !nutrient.main)

let lastPortionKey = 0
const newPortion = (label = '', amount = '') => ({ key: `portion-${++lastPortionKey}`, label, amount })

const EMPTY_FORM = {
  name: '',
  brand: '',
  category: 'other',
  basis: 'g',
  nutrients: Object.fromEntries(NUTRIENTS.map(({ field }) => [field, ''])),
  portions: [],
}

const toForm = (food) => ({
  name: food.name,
  brand: food.brand ?? '',
  category: food.category,
  basis: food.basis,
  nutrients: Object.fromEntries(NUTRIENTS.map(({ field }) => [field, food.nutrients[field] === null ? '' : String(food.nutrients[field])])),
  portions: food.portions.map((portion) => newPortion(portion.label, String(portion.amount))),
})

const toNumber = (text) => (text.trim() === '' ? null : Number(text))

function toPayload(form) {
  return {
    name: form.name.trim(),
    brand: form.brand.trim() || null,
    category: form.category,
    basis: form.basis,
    nutrients: Object.fromEntries(NUTRIENTS.map(({ field }) => [field, toNumber(form.nutrients[field])])),
    portions: form.portions.map((portion) => ({ label: portion.label.trim(), amount: toNumber(portion.amount) })),
  }
}

// Returns { path: errorCode } using the same paths as the server
function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'REQUIRED'
  for (const { field, min, max, main } of NUTRIENTS) {
    const text = form.nutrients[field].trim()
    const value = Number(text)
    if ((text === '' && main) || (text !== '' && (!Number.isFinite(value) || value < min || value > max))) {
      errors[`nutrients.${field}`] = text === '' ? 'REQUIRED' : 'RANGE'
    }
  }
  const macros = ['proteinG', 'carbsG', 'fatG'].reduce((sum, field) => sum + (Number(form.nutrients[field]) || 0), 0)
  if (macros > 100) errors['nutrients.fatG'] = 'MACROS_EXCEED_100'
  form.portions.forEach((portion, index) => {
    if (!portion.label.trim()) errors[`portions.${index}.label`] = 'REQUIRED'
    const amount = Number(portion.amount)
    if (!portion.amount.trim() || !(amount >= FOOD_LIMITS.portionAmount.min && amount <= FOOD_LIMITS.portionAmount.max)) {
      errors[`portions.${index}.amount`] = portion.amount.trim() ? 'RANGE' : 'REQUIRED'
    }
  })
  return errors
}

function FoodFormPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(isEdit ? null : EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getFood(id)
      .then(({ food }) => {
        if (food.isCustom && !food.isArchived) setForm(toForm(food))
        else setFormError('FOOD_NOT_FOUND')
      })
      .catch((err) => setFormError(err.code))
  }, [id])

  function update(changes, path) {
    setForm((current) => ({ ...current, ...changes }))
    if (path) setErrors((current) => ({ ...current, [path]: undefined }))
    setFormError('')
  }

  const setNutrient = (field, value) =>
    update({ nutrients: { ...form.nutrients, [field]: value } }, `nutrients.${field}`)

  const setPortion = (index, changes, path) =>
    update({ portions: form.portions.map((portion, current) => (current === index ? { ...portion, ...changes } : portion)) }, path)

  const errorText = (path, range) => {
    const code = errors[path]
    if (!code) return ''
    if (code === 'REQUIRED') return t('plans.editor.required')
    if (code === 'RANGE' && range) return t('health.rangeError', range)
    return errorMessage(code === 'RANGE' ? 'INVALID_FIELD' : code)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('PLAN_HAS_ERRORS')
      requestAnimationFrame(() => document.querySelector('.food-form [aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      const { food } = isEdit ? await updateFood(id, toPayload(form)) : await createFood(toPayload(form))
      navigate(foodDetailPath(food.id), { replace: true })
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.code === 'INVALID_FIELD' ? 'RANGE' : err.code })
      setFormError(err.field ? 'PLAN_HAS_ERRORS' : err.code)
      setSaving(false)
    }
  }

  const basisUnit = form ? t(`units.${form.basis}`) : ''
  const nutrientField = ({ field, unit, min, max }) => (
    <FormField
      key={field}
      label={t('health.labelWithUnit', { label: t(`foods.nutrients.${field}`), unit: t(`units.${unit}`) })}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step="any"
      value={form.nutrients[field]}
      error={errorText(`nutrients.${field}`, { min, max })}
      onChange={(event) => setNutrient(field, event.target.value)}
    />
  )

  return (
    <section className="food-form-page">
      <Link className="food-form-page__back" to={isEdit ? foodDetailPath(id) : ROUTES.foods}>
        {t('foods.back')}
      </Link>
      <h1 className="food-form-page__title">{isEdit ? t('foods.form.editTitle') : t('foods.form.newTitle')}</h1>

      {form === null ? (
        formError ? (
          <p className="section-form__error" role="alert">
            {errorMessage(formError)}
          </p>
        ) : (
          <Loader />
        )
      ) : (
        <form className="food-form" onSubmit={handleSubmit} noValidate>
          <SectionCard title={t('foods.form.details')}>
            <div className="section-form">
              <FormField
                label={t('foods.form.name')}
                value={form.name}
                maxLength={FOOD_LIMITS.nameLength}
                placeholder={t('foods.form.namePlaceholder')}
                error={errorText('name')}
                onChange={(event) => update({ name: event.target.value }, 'name')}
              />
              <FormField
                label={`${t('foods.form.brand')} ${t('common.optional')}`}
                value={form.brand}
                maxLength={FOOD_LIMITS.brandLength}
                onChange={(event) => update({ brand: event.target.value })}
              />
              <FormField as="select" label={t('foods.category')} value={form.category} onChange={(event) => update({ category: event.target.value })}>
                {FOOD_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`foods.categories.${value}`)}
                  </option>
                ))}
              </FormField>
              <FormField
                as="select"
                label={t('foods.form.basis')}
                hint={t('foods.form.basisHint')}
                value={form.basis}
                onChange={(event) => update({ basis: event.target.value })}
              >
                <option value="g">{t('foods.form.basisOptions.g')}</option>
                <option value="ml">{t('foods.form.basisOptions.ml')}</option>
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title={t('foods.form.nutrition')} description={t('foods.form.nutritionHint', { unit: basisUnit })}>
            <div className="food-form__grid">{MAIN_NUTRIENTS.map(nutrientField)}</div>
            <details className="food-form__more" open={EXTRA_NUTRIENTS.some(({ field }) => form.nutrients[field] !== '' || errors[`nutrients.${field}`])}>
              <summary>{t('foods.form.moreNutrients')}</summary>
              <div className="food-form__grid">{EXTRA_NUTRIENTS.map(nutrientField)}</div>
            </details>
          </SectionCard>

          <SectionCard title={t('foods.form.portions')} description={t('foods.form.portionsHint')}>
            {form.portions.length > 0 && (
              <ul className="food-form__portions">
                {form.portions.map((portion, index) => (
                  <li key={portion.key} className="food-form__portion">
                    <FormField
                      label={t('foods.form.portionLabel')}
                      value={portion.label}
                      maxLength={FOOD_LIMITS.portionLabelLength}
                      placeholder={t('foods.form.portionLabelPlaceholder')}
                      error={errorText(`portions.${index}.label`)}
                      onChange={(event) => setPortion(index, { label: event.target.value }, `portions.${index}.label`)}
                    />
                    <FormField
                      label={t('health.labelWithUnit', { label: t('foods.form.portionAmount'), unit: basisUnit })}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={portion.amount}
                      error={errorText(`portions.${index}.amount`, FOOD_LIMITS.portionAmount)}
                      onChange={(event) => setPortion(index, { amount: event.target.value }, `portions.${index}.amount`)}
                    />
                    <button
                      type="button"
                      className="icon-button icon-button--danger food-form__remove"
                      aria-label={t('foods.form.removePortion', { number: index + 1 })}
                      onClick={() => update({ portions: form.portions.filter((_, current) => current !== index) })}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="button button--secondary food-form__add"
              onClick={() => update({ portions: [...form.portions, newPortion()] })}
              disabled={form.portions.length >= FOOD_LIMITS.portions}
            >
              + {t('foods.form.addPortion')}
            </button>
          </SectionCard>

          {formError && (
            <p className="section-form__error" role="alert">
              {errorMessage(formError)}
            </p>
          )}
          <div className="food-form__actions">
            <Link className="button button--secondary" to={isEdit ? foodDetailPath(id) : ROUTES.foods}>
              {t('common.cancel')}
            </Link>
            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default FoodFormPage
