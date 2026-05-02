import { useRef, useCallback, useEffect, useState } from 'react';

interface SplitterProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftPercent?: number;
}

export function Splitter({ left, right, initialLeftPercent = 40 }: SplitterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setLeftPercent(Math.max(20, Math.min(80, percent)));
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      <div style={{ width: `${leftPercent}%` }} className="h-full overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="flex h-full w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-gray-200 transition-colors hover:bg-indigo-300 dark:bg-gray-700 dark:hover:bg-indigo-600"
        role="separator"
        aria-orientation="vertical"
      >
        <div className="h-8 w-0.5 rounded bg-gray-400 dark:bg-gray-500" />
      </div>
      <div style={{ width: `${100 - leftPercent}%` }} className="h-full overflow-hidden">
        {right}
      </div>
    </div>
  );
}
