import { useTranslation } from 'react-i18next';
import type { ThemeMode } from '../hooks/useTheme';

interface ThemeToggleProps {
  mode: ThemeMode;
  onChangeMode: (mode: ThemeMode) => void;
}

const modes: ThemeMode[] = ['light', 'dark', 'system'];
const icons: Record<ThemeMode, string> = {
  light: '☀',
  dark: '☾',
  system: '◑',
};

export function ThemeToggle({ mode, onChangeMode }: ThemeToggleProps) {
  const { t } = useTranslation();

  const labelMap: Record<ThemeMode, string> = {
    light: t('toolbar.themeLight'),
    dark: t('toolbar.themeDark'),
    system: t('toolbar.themeSystem'),
  };

  const next = modes[(modes.indexOf(mode) + 1) % modes.length];

  return (
    <button
      onClick={() => onChangeMode(next)}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      title={`${t('toolbar.theme')}: ${labelMap[mode]}`}
      aria-label={`${t('toolbar.theme')}: ${labelMap[mode]}`}
    >
      <span>{icons[mode]}</span>
      <span className="hidden sm:inline">{labelMap[mode]}</span>
    </button>
  );
}
