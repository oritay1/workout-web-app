import { useTranslation } from 'react-i18next'
import { HEALTH_FIELD_DEFS } from '../../constants/health.js'
import { yearsAgoInputValue } from '../../utils/date.js'
import ChipGroup from '../ChipGroup/ChipGroup.jsx'
import FormField from '../FormField/FormField.jsx'
import TagInput from '../TagInput/TagInput.jsx'

// Renders health profile inputs from their definitions in constants/health.js
function HealthFields({ fields, values, errors, onChange }) {
  const { t } = useTranslation()

  return fields.map((field) => {
    const def = HEALTH_FIELD_DEFS[field]
    const label = def.unit
      ? t('health.labelWithUnit', { label: t(`health.fields.${field}`), unit: t(`units.${def.unit}`) })
      : t(`health.fields.${field}`)
    const error = errors[field]
      ? def.kind === 'number'
        ? t('health.rangeError', { min: def.min, max: def.max })
        : t('errors.INVALID_FIELD')
      : ''
    const options = def.options?.map((value) => ({ value, label: t(`health.options.${field}.${value}`) }))
    // `key` must not be spread into JSX, so it is passed separately
    const common = { label, error, value: values[field] }

    switch (def.kind) {
      case 'select':
        return (
          <FormField key={field} {...common} as="select" onChange={(event) => onChange(field, event.target.value)}>
            <option value="">{t('health.notSet')}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
        )
      case 'date':
        return (
          <FormField
            key={field}
            {...common}
            type="date"
            min={yearsAgoInputValue(def.maxAgeYears)}
            max={yearsAgoInputValue(def.minAgeYears)}
            onChange={(event) => onChange(field, event.target.value)}
          />
        )
      case 'number':
        return (
          <FormField
            key={field}
            {...common}
            type="number"
            inputMode="decimal"
            min={def.min}
            max={def.max}
            step={def.step}
            onChange={(event) => onChange(field, event.target.value)}
          />
        )
      case 'chips':
        return (
          <ChipGroup
            key={field}
            label={label}
            options={options}
            selected={values[field]}
            onChange={(selected) => onChange(field, selected)}
          />
        )
      case 'tags':
        return (
          <TagInput
            key={field}
            label={label}
            placeholder={t(`health.placeholders.${field}`)}
            value={values[field]}
            maxItems={def.maxItems}
            maxLength={def.maxLength}
            error={error}
            onChange={(value) => onChange(field, value)}
          />
        )
      case 'text':
        return (
          <FormField
            key={field}
            {...common}
            as="textarea"
            maxLength={def.maxLength}
            placeholder={t(`health.placeholders.${field}`)}
            onChange={(event) => onChange(field, event.target.value)}
          />
        )
      default:
        return null
    }
  })
}

export default HealthFields
