import { useTranslation } from 'react-i18next'
import { NUTRIENTS } from '../../constants/foods.js'
import { formatAmount, scaleNutrient } from '../../utils/foods.js'
import './NutrientTable.css'

// Nutrients of a food for `amount` grams/ml (the food's values are per 100)
function NutrientTable({ nutrients, amount }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  return (
    <table className="nutrient-table">
      <tbody>
        {NUTRIENTS.map(({ field, unit, main }) => (
          <tr key={field} className={main ? 'nutrient-table__row--main' : undefined}>
            <th scope="row">{t(`foods.nutrients.${field}`)}</th>
            <td>
              {formatAmount(scaleNutrient(nutrients[field], amount), language)}
              {nutrients[field] !== null && <span className="nutrient-table__unit"> {t(`units.${unit}`)}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default NutrientTable
