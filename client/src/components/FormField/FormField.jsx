import { useId } from 'react'
import './FormField.css'

// Label + control + hint/error. Extra props go to the control (<input>, <select> or <textarea> via `as`).
// `adornment` is rendered inside the control area (e.g. a show-password button).
// `dir` applies to the control and its adornment together (e.g. LTR email/password in a Hebrew page)
function FormField({ label, hint, error, className, dir, as: Control = 'input', adornment, children, ...controlProps }) {
  const id = useId()
  const describedBy = error || hint ? `${id}-description` : undefined

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="form-field__control" dir={dir}>
        <Control
          id={id}
          className={[
            'form-field__input',
            `form-field__input--${Control}`,
            error && 'form-field__input--invalid',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...controlProps}
        >
          {children}
        </Control>
        {adornment}
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
