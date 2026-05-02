import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import { attachDomTooltip } from '../components/TaskTooltip';

interface CalendarViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
  hideWeekends: boolean;
}

export function CalendarView({ tasks, tagColors, onTaskClick, hideWeekends }: CalendarViewProps) {
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
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        locale={locale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek',
        }}
        firstDay={1}
        hiddenDays={hideWeekends ? [0, 6] : []}
        nowIndicator={true}
        height="100%"
        eventClick={(info) => {
          const task = info.event.extendedProps.task as Task;
          onTaskClick(task);
        }}
        eventDidMount={(info) => {
          const task = info.event.extendedProps.task as Task;
          attachDomTooltip(info.el, task.notes);
        }}
      />
    </div>
  );
}
