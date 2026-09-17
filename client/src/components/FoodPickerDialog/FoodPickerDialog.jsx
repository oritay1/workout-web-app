import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchFoods } from '../../api/foodsApi.js'
import { SEARCH_DEBOUNCE_MS } from '../../constants/foods.js'
import { DIET_LIMITS } from '../../constants/diet.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { getLanguage } from '../../i18n/languages.js'
import { servingAmount, servingNutrients } from '../../utils/diet.js'
import { formatAmount, formatPortionOption, getFoodName } from '../../utils/foods.js'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import './FoodPickerDialog.css'

const BASE_UNIT = ''

// Two steps: find a food, then choose how much (and which meal). With `initial` it opens on the second
// step to edit an existing item. onConfirm({ food, quantity, portionLabel, meal })
function FoodPickerDialog({ open, meals, initial, confirmLabel, onConfirm, onClose }) {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const dialogRef = useRef(null)
  const language = i18n.resolvedLanguage

  const [search, setSearch] = useState('')
  const [results, setResults] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [food, setFood] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [portionLabel, setPortionLabel] = useState(BASE_UNIT)
  const [meal, setMeal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const requestIdRef = useRef(0)

  // Reset state each time the dialog opens
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) {
      dialog.showModal()
      setSearch('')
      setErrorCode('')
      setSubmitting(false)
      setFood(initial?.food ?? null)
      setQuantity(initial?.food ? String(initial.quantity) : '')
      setPortionLabel(initial?.portionLabel ?? BASE_UNIT)
      setMeal(initial?.meal ?? meals?.[0]?.value ?? '')
    }
    if (!open && dialog.open) dialog.close()
  }, [open, initial, meals])

  useEffect(() => {
    if (!open || food) return
    const requestId = ++requestIdRef.current
    searchFoods({ q: query, language, limit: 30 })
      .then((data) => requestId === requestIdRef.current && setResults(data.foods))
      .catch((err) => requestId === requestIdRef.current && setErrorCode(err.code))
  }, [open, food, query, language])

  function chooseFood(selected) {
    setFood(selected)
    // Start with the first household portion when there is one ("1 large"), otherwise 100 g/ml
    const firstPortion = selected.portions[0]
    setPortionLabel(firstPortion ? firstPortion.label : BASE_UNIT)
    setQuantity(firstPortion ? '1' : '100')
  }

  const amount = food ? servingAmount(food, quantity, portionLabel || null) : 0
  const quantityValid =
    Number(quantity) >= DIET_LIMITS.quantity.min && Number(quantity) <= DIET_LIMITS.quantity.max && amount > 0
  const preview = food ? servingNutrients(food, amount) : null

  async function handleConfirm(event) {
    event.preventDefault()
    if (!quantityValid) return
    setSubmitting(true)
    setErrorCode('')
    try {
      await onConfirm({ food, quantity: Number(quantity), portionLabel: portionLabel || null, meal })
      onClose()
    } catch (err) {
      setErrorCode(err.code)
      setSubmitting(false)
    }
  }

  const unitLabel = food ? t(`units.${food.basis}`) : ''

  return (
    <dialog ref={dialogRef} className="food-picker" aria-labelledby="food-picker-title" onClose={onClose}>
      <div className="food-picker__header">
        {food && !initial?.food && (
          <button type="button" className="icon-button" onClick={() => setFood(null)} aria-label={t('nutrition.picker.back')}>
            {getLanguage(language)?.dir === 'rtl' ? '→' : '←'}
          </button>
        )}
        <h2 id="food-picker-title" className="food-picker__title">
          {food ? t('nutrition.picker.howMuch') : t('nutrition.picker.chooseFood')}
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>
      </div>

      {!food ? (
        <>
          <div className="food-picker__search">
            <FormField
              label={t('foods.search')}
              type="search"
              value={search}
              placeholder={t('foods.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ul className="food-picker__results">
            {results === null ? (
              <li>
                <Loader />
              </li>
            ) : results.length === 0 ? (
              <li className="food-picker__empty">{t('foods.empty')}</li>
            ) : (
              results.map((item) => (
                <li key={item.id}>
                  <button type="button" className="food-picker__option" onClick={() => chooseFood(item)}>
                    <span className="food-picker__option-name" dir="auto">
                      {getFoodName(item, language)}
                      {item.isCustom && <span className="badge">{t('foods.customBadge')}</span>}
                    </span>
                    <span className="food-picker__option-meta">
                      {formatAmount(item.nutrients.energyKcal, language, 0)} {t('units.kcal')} {t(`foods.per100.${item.basis}`)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <form className="food-picker__serving" onSubmit={handleConfirm} noValidate>
          <p className="food-picker__food-name" dir="auto">
            {getFoodName(food, language)}
          </p>
          <div className="food-picker__amount">
            <FormField
              label={t('foods.quantity')}
              type="number"
              inputMode="decimal"
              min={DIET_LIMITS.quantity.min}
              step="any"
              value={quantity}
              error={quantity !== '' && !quantityValid ? t('errors.INVALID_FIELD') : ''}
              onChange={(event) => setQuantity(event.target.value)}
              autoFocus
            />
            <FormField as="select" label={t('foods.unit')} value={portionLabel} onChange={(event) => setPortionLabel(event.target.value)}>
              <option value={BASE_UNIT}>{unitLabel}</option>
              {food.portions.map((portion) => (
                <option key={portion.label} value={portion.label}>
                  {formatPortionOption(portion, language, unitLabel)}
                </option>
              ))}
            </FormField>
          </div>
          {meals && (
            <FormField as="select" label={t('nutrition.meal')} value={meal} onChange={(event) => setMeal(event.target.value)}>
              {meals.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormField>
          )}
          <p className="food-picker__preview" role="status">
            <strong>
              {formatAmount(preview.energyKcal, language, 0)} {t('units.kcal')}
            </strong>{' '}
            · {formatAmount(amount, language)} {unitLabel} · {t('foods.macroShort.protein')} {formatAmount(preview.proteinG, language)} ·{' '}
            {t('foods.macroShort.carbs')} {formatAmount(preview.carbsG, language)} · {t('foods.macroShort.fat')}{' '}
            {formatAmount(preview.fatG, language)}
          </p>
          {errorCode && (
            <p className="section-form__error" role="alert">
              {errorMessage(errorCode)}
            </p>
          )}
          <button type="submit" className="button button--primary" disabled={!quantityValid || submitting}>
            {confirmLabel}
          </button>
        </form>
      )}
    </dialog>
  )
}

export default FoodPickerDialog
