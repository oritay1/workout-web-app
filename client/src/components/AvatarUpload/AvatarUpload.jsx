import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resizeImage } from '../../utils/resizeImage.js'
import './AvatarUpload.css'

function AvatarUpload({ value, onChange, onProcessingChange, error }) {
  const { t } = useTranslation()
  const [processing, setProcessing] = useState(false)
  const [readError, setReadError] = useState(false)

  function setBusy(busy) {
    setProcessing(busy)
    onProcessingChange?.(busy)
  }

  async function handleFile(event) {
    const file = event.target.files[0]
    // Allow picking the same file again after removing it
    event.target.value = ''
    if (!file) return
    setReadError(false)
    setBusy(true)
    try {
      onChange(await resizeImage(file))
    } catch {
      setReadError(true)
    } finally {
      setBusy(false)
    }
  }

  const message = readError ? t('avatar.readError') : error

  return (
    <div className="avatar-upload">
      <label className={`avatar-upload__circle${processing ? ' avatar-upload__circle--processing' : ''}`}>
        {processing ? (
          <span className="avatar-upload__placeholder">{t('avatar.processing')}</span>
        ) : value ? (
          <img className="avatar-upload__preview" src={value} alt={t('avatar.alt')} />
        ) : (
          <span className="avatar-upload__placeholder">
            {t('avatar.add')}
            <span className="avatar-upload__optional">{t('common.optional')}</span>
          </span>
        )}
        <input
          className="avatar-upload__input"
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFile}
          disabled={processing}
        />
      </label>
      {value && !processing && (
        <button className="avatar-upload__remove" type="button" onClick={() => onChange('')}>
          {t('avatar.remove')}
        </button>
      )}
      {message && <span className="avatar-upload__error">{message}</span>}
    </div>
  )
}

export default AvatarUpload
