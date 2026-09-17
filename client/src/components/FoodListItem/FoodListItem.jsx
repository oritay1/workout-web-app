import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { foodDetailPath } from '../../constants/routes.js'
import { formatAmount, getFoodName } from '../../utils/foods.js'
import './FoodListItem.css'

function FoodListItem({ food }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { energyKcal, proteinG, carbsG, fatG } = food.nutrients
  const per = t(`foods.per100.${food.basis}`)

  return (
    <li>
      <Link className="food-item" to={foodDetailPath(food.id)}>
        <span className="food-item__name" dir="auto">
          {getFoodName(food, language)}
          {food.isCustom && <span className="badge">{t('foods.customBadge')}</span>}
        </span>
        <span className="food-item__meta">
          {[food.brand, t(`foods.categories.${food.category}`)].filter(Boolean).join(' · ')}
        </span>
        <span className="food-item__macros">
          <strong>
            {formatAmount(energyKcal, language, 0)} {t('units.kcal')}
          </strong>{' '}
          {per} · {t('foods.macroShort.protein')} {formatAmount(proteinG, language)} · {t('foods.macroShort.carbs')}{' '}
          {formatAmount(carbsG, language)} · {t('foods.macroShort.fat')} {formatAmount(fatG, language)}
        </span>
      </Link>
    </li>
  )
}

export default FoodListItem
