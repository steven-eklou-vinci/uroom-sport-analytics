"use client";
import { useEffect, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

let initialized = false;

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!initialized) {
      i18n
        .use(initReactI18next)
        .init({
          resources: {
            fr: { translation: fr },
            en: { translation: en },
          },
          lng: 'fr',
          fallbackLng: 'fr',
          interpolation: { escapeValue: false },
          debug: false,
        })
        .then(() => {
          initialized = true;
          setIsReady(true);
        });
    } else {
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <div>Chargement...</div>;
  }

  return <>{children}</>;
}
