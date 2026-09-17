import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage } from './languages.js'
import { LANGUAGE_KEY } from '../utils/storageKeys.js'
import { readStorage, writeStorage } from '../utils/storage.js'

// Every JSON file in src/locales is bundled automatically
const localeFiles = import.meta.glob('../locales/*.json', { eager: true, import: 'default' })

const resources = Object.fromEntries(
  LANGUAGES.map(({ code }) => [code, { translation: localeFiles[`../locales/${code}.json`] }]),
)

function detectLanguage() {
  const saved = readStorage(LANGUAGE_KEY)
  if (getLanguage(saved)) return saved

  const browserLanguage = navigator.languages
    .map((tag) => tag.split('-')[0])
    .find((code) => getLanguage(code))
  return browserLanguage ?? DEFAULT_LANGUAGE
}

function applyDocumentLanguage(code) {
  const { dir } = getLanguage(code)
  document.documentElement.lang = code
  document.documentElement.dir = dir
}

i18n.on('languageChanged', (code) => {
  applyDocumentLanguage(code)
  writeStorage(LANGUAGE_KEY, code)
})

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map(({ code }) => code),
  interpolation: { escapeValue: false },
})

export default i18n
