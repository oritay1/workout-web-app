import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteFood, getFood } from '../../api/foodsApi.js'
import { ROUTES, editFoodPath } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { formatAmount, formatPortionOption, getFoodName } from '../../utils/foods.js'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import NutrientTable from '../NutrientTable/NutrientTable.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './FoodDetailPage.css'

// "base" = grams/ml; a number = index of a portion ("1 cup")
const BASE_UNIT = 'base'

function FoodDetailPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { id } = useParams()
  const [food, setFood] = useState(null)
  const [errorCode, setErrorCode] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState(BASE_UNIT)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getFood(id)
      .then((data) => setFood(data.food))
      .catch((err) => setErrorCode(err.code))
  }, [id])

  const language = i18n.resolvedLanguage

  if (!food) {
    return (
      <section className="food-detail">
        <Link className="food-detail__back" to={ROUTES.foods}>
          {t('foods.back')}
        </Link>
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

  async function handleDelete() {
    if (!window.confirm(t('foods.confirmDelete', { name: food.name }))) return
    setDeleting(true)
    try {
      await deleteFood(food.id)
      navigate(ROUTES.foods, { replace: true })
    } catch (err) {
      setErrorCode(err.code)
      setDeleting(false)
    }
  }

  const name = getFoodName(food, language)
  const baseUnitLabel = t(`units.${food.basis}`)
  const count = Number(quantity)
  const validCount = Number.isFinite(count) && count >= 0 ? count : 0
  const amount = unit === BASE_UNIT ? validCount : validCount * food.portions[Number(unit)].amount
  const englishName = !food.isCustom && language !== 'en' && food.names.en !== name ? food.names.en : null

  return (
    <section className="food-detail">
      <Link className="food-detail__back" to={ROUTES.foods}>
        {t('foods.back')}
      </Link>
      <div>
        <h1 className="food-detail__title" dir="auto">
          {name}
        </h1>
        {englishName && (
          <p className="food-detail__subtitle" dir="ltr">
            {englishName}
          </p>
        )}
        <p className="food-detail__subtitle">
          {[food.brand, t(`foods.categories.${food.category}`)].filter(Boolean).join(' · ')}
        </p>
        <p className="food-detail__source">
          {food.isCustom ? (
            t('foods.sources.custom')
          ) : (
            <>
              {t('foods.sources.usda')} · {t(`foods.usdaDataTypes.${food.usdaDataType}`)} ·{' '}
              <a href={`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`} target="_blank" rel="noreferrer">
                #{food.fdcId}
              </a>
            </>
          )}
        </p>
      </div>

      <SectionCard title={t('foods.calculator')} description={t('foods.calculatorHint')}>
        <div className="food-detail__calculator">
          <FormField
            label={t('foods.quantity')}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <FormField as="select" label={t('foods.unit')} value={unit} onChange={(event) => {
            const next = event.target.value
            setUnit(next)
            setQuantity(next === BASE_UNIT ? '100' : '1')
          }}>
            <option value={BASE_UNIT}>{baseUnitLabel}</option>
            {food.portions.map((portion, index) => (
              <option key={portion.label} value={index}>
                {formatPortionOption(portion, language, baseUnitLabel)}
              </option>
            ))}
          </FormField>
        </div>
        <p className="food-detail__total">
          {t('foods.nutritionFor', { amount: formatAmount(amount, language), unit: baseUnitLabel })}
        </p>
        <NutrientTable nutrients={food.nutrients} amount={amount} />
        {food.isLiquid && food.basis === 'g' && <p className="food-detail__note">{t('foods.liquidNote')}</p>}
      </SectionCard>

      {food.isCustom && !food.isArchived && (
        <div className="food-detail__actions">
          <Link className="button button--secondary" to={editFoodPath(food.id)}>
            {t('common.edit')}
          </Link>
          <button type="button" className="button button--danger" onClick={handleDelete} disabled={deleting}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </section>
  )
}

export default FoodDetailPage
