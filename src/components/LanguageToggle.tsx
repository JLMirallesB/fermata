import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'es', label: 'ES' },
  { code: 'ca-ES-valencia', label: 'VA' },
  { code: 'en', label: 'EN' },
] as const;

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const currentIndex = languages.findIndex((l) => l.code === i18n.language);
  const nextIndex = (currentIndex + 1) % languages.length;

  return (
    <button
      onClick={() => i18n.changeLanguage(languages[nextIndex].code)}
      className="rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={`Language: ${languages[currentIndex >= 0 ? currentIndex : 0].label}`}
    >
      {languages[currentIndex >= 0 ? currentIndex : 0].label}
    </button>
  );
}
