import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import en from './en/translation.json';
import zh from './zh/translation.json';
import id from './id/translation.json';
import ko from './ko/translation.json';
import vn from './vn/translation.json';
import config from '../../pool.config';

i18n
  .use(initReactI18next)
  .init({
    lng: config.defaultLang || 'en',
    debug: true,
    resources: {
      en: {
        translation: en
      },
      zh: {
        translation: zh
      },
      id: {
        translation: id
      },
      vn: {
        translation: vn
      },
      ko: {
        translation: ko
      },
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
