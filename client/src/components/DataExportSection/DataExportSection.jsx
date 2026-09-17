import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { exportMarkdown } from '../../api/meApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { toDateInputValue } from '../../utils/date.js'
import FormField from '../FormField/FormField.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './DataExportSection.css'

const PERIODS = ['30', '90', '365', 'all']

const userTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Export of everything we store about the user as Markdown, ready for AI tools (ChatGPT, Claude...)
function DataExportSection() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { user } = useAuth()
  const [period, setPeriod] = useState('90')
  // 'download' | 'copy' | 'preview' while working
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [preview, setPreview] = useState(null)

  async function load(action) {
    setBusy(action)
    setStatus('')
    setErrorCode('')
    try {
      return await exportMarkdown(period, userTimeZone())
    } catch (err) {
      setErrorCode(err.code)
      return null
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    const markdown = await load('download')
    if (markdown === null) return
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `workout-app-${user.username}-${toDateInputValue()}.md`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setStatus(t('dataExport.downloaded'))
  }

  async function handleCopy() {
    const markdown = await load('copy')
    if (markdown === null) return
    try {
      await navigator.clipboard.writeText(markdown)
      setStatus(t('dataExport.copied'))
    } catch {
      // Clipboard needs HTTPS (or localhost) and permission
      setErrorCode('CLIPBOARD_UNAVAILABLE')
    }
  }

  async function handlePreview() {
    if (preview !== null) {
      setPreview(null)
      return
    }
    const markdown = await load('preview')
    if (markdown !== null) setPreview(markdown)
  }

  return (
    <SectionCard title={t('dataExport.title')} description={t('dataExport.description')}>
      <div className="data-export">
        <FormField
          as="select"
          label={t('dataExport.period')}
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value)
            setPreview(null)
          }}
        >
          {PERIODS.map((value) => (
            <option key={value} value={value}>
              {t(`dataExport.periods.${value}`)}
            </option>
          ))}
        </FormField>
        <div className="data-export__buttons">
          <button type="button" className="button button--primary" onClick={handleDownload} disabled={busy !== null}>
            {busy === 'download' ? t('dataExport.preparing') : t('dataExport.download')}
          </button>
          <button type="button" className="button button--secondary" onClick={handleCopy} disabled={busy !== null}>
            {t('dataExport.copy')}
          </button>
          <button type="button" className="button button--secondary" onClick={handlePreview} disabled={busy !== null} aria-expanded={preview !== null}>
            {preview !== null ? t('dataExport.hidePreview') : t('dataExport.preview')}
          </button>
        </div>
        {status && (
          <p className="section-form__status" role="status">
            {status}
          </p>
        )}
        {errorCode && (
          <p className="section-form__error" role="alert">
            {errorMessage(errorCode)}
          </p>
        )}
        {preview !== null && (
          <pre className="data-export__preview" dir="ltr" tabIndex={0} aria-label={t('dataExport.preview')}>
            {preview}
          </pre>
        )}
        <p className="data-export__note">{t('dataExport.privacy')}</p>
      </div>
    </SectionCard>
  )
}

export default DataExportSection
