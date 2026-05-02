import { useState, useRef } from 'react';
import type { Task } from '../core/model';

interface TaskTooltipProps {
  task: Task;
  children: React.ReactNode;
}

export function TaskTooltip({ task, children }: TaskTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  if (task.notes.length === 0) {
    return <>{children}</>;
  }

  const handleEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top });
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative"
    >
      {children}
      {visible && <TooltipPopup notes={task.notes} x={pos.x} y={pos.y} />}
    </div>
  );
}

function TooltipPopup({ notes, x, y }: { notes: string[]; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800"
      style={{ left: x, top: y - 4, transform: 'translateY(-100%)' }}
    >
      {notes.map((note, i) => (
        <p key={i} className="text-gray-600 dark:text-gray-300">
          {note}
        </p>
      ))}
      <div className="absolute left-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-200 dark:border-t-gray-600" />
    </div>
  );
}

export function attachDomTooltip(el: HTMLElement, notes: string[]) {
  if (notes.length === 0) return;

  let tooltip: HTMLDivElement | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const show = () => {
    const rect = el.getBoundingClientRect();
    tooltip = document.createElement('div');
    tooltip.className = 'fixed z-50 max-w-xs rounded-lg border px-3 py-2 text-xs shadow-lg pointer-events-none';

    const isDark = document.documentElement.classList.contains('dark');
    tooltip.style.cssText = `
      left: ${rect.left}px;
      top: ${rect.top - 4}px;
      transform: translateY(-100%);
      background: ${isDark ? '#1f2937' : '#fff'};
      border-color: ${isDark ? '#4b5563' : '#e5e7eb'};
      color: ${isDark ? '#d1d5db' : '#4b5563'};
    `;
    tooltip.innerHTML = notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('');
    document.body.appendChild(tooltip);
  };

  const hide = () => {
    if (timeout) clearTimeout(timeout);
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };

  el.addEventListener('mouseenter', () => {
    timeout = setTimeout(show, 300);
  });
  el.addEventListener('mouseleave', hide);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
