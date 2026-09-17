import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getHealth } from '../../api/meApi.js'
import { HEALTH_SECTIONS } from '../../constants/health.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import AccountSection from '../AccountSection/AccountSection.jsx'
import DataExportSection from '../DataExportSection/DataExportSection.jsx'
import DisplaySettingsSection from '../DisplaySettingsSection/DisplaySettingsSection.jsx'
import HealthSection from '../HealthSection/HealthSection.jsx'
import Loader from '../Loader/Loader.jsx'
import MeasurementsSection from '../MeasurementsSection/MeasurementsSection.jsx'
import SecuritySection from '../SecuritySection/SecuritySection.jsx'
import './ProfilePage.css'

function ProfilePage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  // null while loading
  const [health, setHealth] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    getHealth()
      .then((data) => setHealth(data.health))
      .catch((err) => setLoadError(err.code))
  }, [])

  return (
    <section className="profile-page">
      <h1 className="profile-page__title">{t('profile.title')}</h1>
      <AccountSection />
      <MeasurementsSection />
      {loadError ? (
        <p className="section-form__error" role="alert">
          {errorMessage(loadError)}
        </p>
      ) : health === null ? (
        <Loader />
      ) : (
        HEALTH_SECTIONS.map((section) => (
          <HealthSection
            key={section.id}
            sectionId={section.id}
            fields={section.fields}
            health={health}
            onSaved={setHealth}
          />
        ))
      )}
      <DisplaySettingsSection />
      <SecuritySection />
      <DataExportSection />
    </section>
  )
}

export default ProfilePage
