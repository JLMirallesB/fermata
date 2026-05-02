import { useState, useRef, useEffect } from 'react';

interface FilterItem {
  key: string;
  label: string;
  depth?: number;
}

interface FilterDropdownProps {
  label: string;
  items: FilterItem[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  colorClass?: string;
}

export function FilterDropdown({ label, items, hidden, onToggle, colorClass = 'bg-indigo-500' }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = items.filter((i) => !hidden.has(i.key)).length;
  const allActive = activeCount === items.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <span>{label}</span>
        {!allActive && (
          <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${colorClass}`}>
            {activeCount}
          </span>
        )}
        <span className="text-[10px] text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {items.map((item) => {
            const active = !hidden.has(item.key);
            const depth = item.depth ?? 0;
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{ paddingLeft: 12 + depth * 16 }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(item.key)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`${active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 line-through dark:text-gray-500'}`}>
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
