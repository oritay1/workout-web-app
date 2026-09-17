import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getHealth } from '../../api/healthApi.js'
import './Home.css'

function Home() {
  const { t } = useTranslation()
  // 'checking' | 'ok' | 'error'
  const [serverStatus, setServerStatus] = useState('checking')

  useEffect(() => {
    getHealth()
      .then(() => setServerStatus('ok'))
      .catch(() => setServerStatus('error'))
  }, [])

  const statusText = {
    checking: t('home.statusChecking'),
    ok: t('home.statusOk'),
    error: t('home.statusError'),
  }[serverStatus]

  return (
    <section className="home">
      <h1 className="home__title">{t('home.title')}</h1>
      <p className="home__subtitle">{t('home.subtitle')}</p>
      <p className="home__status">
        {t('home.serverStatus')}:{' '}
        <span className={`home__status-value home__status-value--${serverStatus}`}>{statusText}</span>
      </p>
    </section>
  )
}

export default Home
