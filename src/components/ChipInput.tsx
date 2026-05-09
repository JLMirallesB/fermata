import { useState, useRef, useEffect } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  chipColor?: (item: string) => string | undefined;
}

export function ChipInput({ value, onChange, suggestions, placeholder, chipColor }: ChipInputProps) {
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addItem = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputText('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeItem = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputText.trim()) addItem(inputText);
    } else if (e.key === 'Backspace' && inputText === '' && value.length > 0) {
      removeItem(value[value.length - 1]);
    }
  };

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(inputText.toLowerCase()),
  );

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="flex min-h-[38px] flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item) => {
          const bg = chipColor?.(item);
          return (
            <span
              key={item}
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: bg ?? '#6b7280' }}
            >
              {item}
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item); }}
                className="ml-0.5 hover:text-red-200"
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[60px] flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none dark:text-gray-100"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[150px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.map((item) => {
            const bg = chipColor?.(item);
            return (
              <button
                key={item}
                onClick={() => addItem(item)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {bg && (
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bg }} />
                )}
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
