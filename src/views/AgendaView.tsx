import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';

interface AgendaViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

export function AgendaView({ tasks, tagColors, onTaskClick }: AgendaViewProps) {
  const { i18n } = useTranslation();

  const events = tasks.map((task) => ({
    id: task.id,
    title: (task.milestone ? '◆ ' : '') + task.title,
    start: task.start,
    end: task.milestone ? undefined : task.end,
    allDay: true,
    backgroundColor: task.color ?? tagColors[task.tags[0]] ?? '#6366f1',
    borderColor: task.color ?? tagColors[task.tags[0]] ?? '#6366f1',
    extendedProps: { task },
  }));

  const locale = i18n.language === 'ca-ES-valencia' ? 'ca' : i18n.language;

  return (
    <div className="h-full overflow-auto p-4">
      <FullCalendar
        plugins={[listPlugin]}
        initialView="listMonth"
        events={events}
        locale={locale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'listWeek,listMonth',
        }}
        height="100%"
        eventClick={(info) => {
          const task = info.event.extendedProps.task as Task;
          onTaskClick(task);
        }}
      />
    </div>
  );
}
