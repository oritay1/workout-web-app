import './SectionCard.css'

function SectionCard({ title, description, children }) {
  return (
    <section className="section-card">
      <h2 className="section-card__title">{title}</h2>
      {description && <p className="section-card__description">{description}</p>}
      {children}
    </section>
  )
}

export default SectionCard
