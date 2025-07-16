import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

type Messages = typeof en;

const messages: { [key: string]: Messages } = {
  'en': en,
  'zh-CN': zhCN,
};

let currentLocale: string = 'zh-CN'; // Default to Simplified Chinese

export const setLocale = (locale: string) => {
  if (messages[locale]) {
    currentLocale = locale;
  } else {
    console.warn(`Locale ${locale} not found. Falling back to ${currentLocale}.`);
  }
};

export const t = (key: string, replacements?: { [key: string]: string | number }) => {
  const keys = key.split('.');
  let message: any = messages[currentLocale];

  for (const k of keys) {
    if (message && typeof message === 'object' && k in message) {
      message = message[k];
    } else {
      console.warn(`Translation key "${key}" not found for locale "${currentLocale}".`);
      return key; // Fallback to key if translation not found
    }
  }

  if (typeof message === 'string' && replacements) {
    for (const rKey in replacements) {
      message = message.replace(new RegExp(`{${rKey}}`, 'g'), replacements[rKey]);
    }
  }

  return message;
};
