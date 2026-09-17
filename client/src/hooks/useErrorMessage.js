import { useTranslation } from 'react-i18next'

// Turns a server/client error code into a translated message
export function useErrorMessage() {
  const { t } = useTranslation()
  return (code) => (code ? t(`errors.${code}`, { defaultValue: t('errors.SERVER_ERROR') }) : '')
}
