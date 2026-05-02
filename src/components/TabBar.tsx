import { useTranslation } from 'react-i18next';

export type ViewTab = 'calendar' | 'gantt' | 'timeline' | 'list' | 'kanban' | 'agenda';

const TABS: ViewTab[] = ['calendar', 'gantt', 'timeline', 'list', 'kanban', 'agenda'];

interface TabBarProps {
  active: ViewTab;
  onChange: (tab: ViewTab) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            active === tab
              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
}
