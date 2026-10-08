import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import am from './locales/am.json';
import om from './locales/om.json';

const deviceLang = (Localization.locale || 'en').split('-')[0];
const supported = ['en', 'am', 'om'];
const fallback = supported.includes(deviceLang) ? deviceLang : 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    am: { translation: am },
    om: { translation: om },
  },
  lng: fallback,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
