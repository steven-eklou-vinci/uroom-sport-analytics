"use client";
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      className="bg-neutral-900 text-white border border-neutral-700 rounded px-2 py-1 ml-4"
      value={i18n.language}
      onChange={e => i18n.changeLanguage(e.target.value)}
    >
      <option value="fr">FR</option>
      <option value="en">EN</option>
    </select>
  );
}
