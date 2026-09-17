import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import './HomePage.css'

function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <section className="home-page">
      <h1 className="home-page__title">{t('home.greeting', { username: user.username })}</h1>
      <p className="home-page__subtitle">{t('home.subtitle')}</p>
    </section>
  )
}

export default HomePage
