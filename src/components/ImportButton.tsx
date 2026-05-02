import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ImportButtonProps {
  onImport: (content: string) => void;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        onImport(content);
      }
    };
    reader.readAsText(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {t('toolbar.import')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mw,.md"
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
