import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import caESValencia from './locales/ca-ES-valencia.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      'ca-ES-valencia': { translation: caESValencia },
      en: { translation: en },
    },
    fallbackLng: ['es', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fermata.language',
      caches: ['localStorage'],
    },
  });

export default i18n;
