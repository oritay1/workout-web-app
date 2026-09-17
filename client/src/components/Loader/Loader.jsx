import { useTranslation } from 'react-i18next'
import './Loader.css'

function Loader() {
  const { t } = useTranslation()
  return <div className="loader" role="status" aria-label={t('common.loading')} />
}

export default Loader
