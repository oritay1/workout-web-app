import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import './TagInput.css'

// Free-text list (e.g. medications): type an item, press Enter or "Add".
// Controlled: `value` is { items, draft }. The parent includes a leftover draft when saving,
// so text typed without pressing "Add" is not lost
function TagInput({ label, placeholder, value, onChange, maxItems, maxLength, error }) {
  const { t } = useTranslation()
  const id = useId()
  const { items, draft } = value

  const isFull = items.length >= maxItems

  function addDraft() {
    const item = draft.trim()
    if (!item || isFull) return
    onChange({ items: items.includes(item) ? items : [...items, item], draft: '' })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addDraft()
    }
  }

  return (
    <fieldset className="tag-input" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="tag-input__legend">{label}</legend>
      {items.length > 0 && (
        <ul className="tag-input__list">
          {items.map((item) => (
            <li key={item} className="tag-input__tag">
              <span className="tag-input__text">{item}</span>
              <button
                type="button"
                className="tag-input__remove"
                onClick={() => onChange({ items: items.filter((current) => current !== item), draft })}
                aria-label={t('tagInput.remove', { item })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="tag-input__row">
        <input
          className="tag-input__input"
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          disabled={isFull}
          onChange={(event) => onChange({ items, draft: event.target.value })}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="tag-input__add"
          onClick={addDraft}
          disabled={!draft.trim() || isFull}
          aria-label={t('tagInput.addTo', { label })}
        >
          {t('tagInput.add')}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="tag-input__error">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default TagInput
