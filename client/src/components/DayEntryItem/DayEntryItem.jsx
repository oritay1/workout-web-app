import { useTranslation } from 'react-i18next'
import { formatAmount, getFoodName, translatePortionLabel } from '../../utils/foods.js'
import './DayEntryItem.css'

// A logged food: name, amount and calories, with edit/delete
function DayEntryItem({ entry, onEdit, onDelete, busy }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const name = getFoodName(entry.food, language)
  const unit = t(`units.${entry.food.basis}`)
  const serving = entry.portionLabel
    ? `${formatAmount(entry.quantity, language, 2)} × ${translatePortionLabel(entry.portionLabel, language)} (${formatAmount(entry.amount, language)} ${unit})`
    : `${formatAmount(entry.amount, language)} ${unit}`

  return (
    <li className="day-entry">
      <button type="button" className="day-entry__main" onClick={onEdit} aria-label={t('nutrition.editEntry', { name })}>
        <span className="day-entry__name" dir="auto">
          {name}
        </span>
        <span className="day-entry__serving">{serving}</span>
      </button>
      <span className="day-entry__kcal">
        {formatAmount(entry.nutrients.energyKcal, language, 0)} <span>{t('units.kcal')}</span>
      </span>
      <button
        type="button"
        className="icon-button day-entry__delete"
        onClick={onDelete}
        disabled={busy}
        aria-label={t('nutrition.deleteEntry', { name })}
      >
        ×
      </button>
    </li>
  )
}

export default DayEntryItem
