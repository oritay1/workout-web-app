import { useTranslation } from 'react-i18next'
import { formatAmount } from '../../utils/foods.js'
import './MacroProgress.css'

// "Protein 96 / 160 g" with a bar. Over the target shows in the warning color
function MacroProgress({ label, value, target, unit, large }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const hasTarget = typeof target === 'number' && target > 0
  const ratio = hasTarget ? value / target : 0
  const over = hasTarget && ratio > 1.05

  return (
    <div className={`macro-progress${large ? ' macro-progress--large' : ''}`}>
      <div className="macro-progress__text">
        <span className="macro-progress__label">{label}</span>
        <span className="macro-progress__value">
          <strong>{formatAmount(value, language, 0)}</strong>
          {hasTarget && ` / ${formatAmount(target, language, 0)}`} {t(`units.${unit}`)}
        </span>
      </div>
      {hasTarget && (
        <div
          className={`macro-progress__bar${over ? ' macro-progress__bar--over' : ''}`}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={Math.round(value)}
        >
          <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export default MacroProgress
