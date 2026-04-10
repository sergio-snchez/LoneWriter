import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonES from './locales/es/common.json';
import commonEN from './locales/en/common.json';
import appES from './locales/es/app.json';
import appEN from './locales/en/app.json';
import editorES from './locales/es/editor.json';
import editorEN from './locales/en/editor.json';
import compendiumES from './locales/es/compendium.json';
import compendiumEN from './locales/en/compendium.json';
import resourcesES from './locales/es/resources.json';
import resourcesEN from './locales/en/resources.json';
import aiES from './locales/es/ai.json';
import aiEN from './locales/en/ai.json';
import settingsES from './locales/es/settings.json';
import settingsEN from './locales/en/settings.json';

const resources = {
  es: {
    common: commonES,
    app: appES,
    editor: editorES,
    compendium: compendiumES,
    resources: resourcesES,
    ai: aiES,
    settings: settingsES,
  },
  en: {
    common: commonEN,
    app: appEN,
    editor: editorEN,
    compendium: compendiumEN,
    resources: resourcesEN,
    ai: aiEN,
    settings: settingsEN,
  },
};

const savedLanguage = localStorage.getItem('app_language') || 'en';
const defaultLanguage = savedLanguage;

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app_language', lng);
});

export default i18n;
