import './AuthLayout.css'

// Centered card used by the login and register pages
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <section className="auth-layout">
      <div className="auth-layout__card">
        <h1 className="auth-layout__title">{title}</h1>
        {subtitle && <p className="auth-layout__subtitle">{subtitle}</p>}
        {children}
      </div>
      {footer && <p className="auth-layout__footer">{footer}</p>}
    </section>
  )
}

export default AuthLayout
