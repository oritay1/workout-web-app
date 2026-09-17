import { useId } from 'react'
import './FormField.css'

// Label + input + hint/error. Extra props go to the <input>
// `dir` applies to the input and its inline buttons together (e.g. LTR email/password in a Hebrew page)
function FormField({ label, hint, error, className, dir, children, ...inputProps }) {
  const id = useId()
  const describedBy = error || hint ? `${id}-description` : undefined

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="form-field__control" dir={dir}>
        <input
          id={id}
          className={['form-field__input', error && 'form-field__input--invalid', className].filter(Boolean).join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {children}
      </div>
      {(error || hint) && (
        <p id={describedBy} className={`form-field__description${error ? ' form-field__description--error' : ''}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export default FormField
