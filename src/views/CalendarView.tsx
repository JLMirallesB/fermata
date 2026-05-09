import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import caLocale from '@fullcalendar/core/locales/ca';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import { attachDomTooltip } from '../components/TaskTooltip';
import { multiColorGradient } from '../core/colorUtils';

interface CalendarViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
  hideWeekends: boolean;
}

const localeMap: Record<string, typeof esLocale> = {
  es: esLocale,
  'ca-ES-valencia': caLocale,
};

export function CalendarView({ tasks, tagColors: _tagColors, onTaskClick, hideWeekends }: CalendarViewProps) {
  const { i18n } = useTranslation();

  const events = tasks.map((task) => ({
    id: task.id,
    title: (task.milestone ? '◆ ' : '') + task.title,
    start: task.start,
    end: task.milestone ? undefined : task.end,
    allDay: true,
    backgroundColor: task.colors.length > 0 ? task.colors[0] : '#6366f1',
    borderColor: task.colors.length > 0 ? task.colors[0] : '#6366f1',
    extendedProps: { task },
  }));

  const fcLocale = localeMap[i18n.language];

  return (
    <div className="h-full overflow-auto p-4">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        locale={fcLocale ?? undefined}
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
          if (task.colors.length > 1) {
            info.el.style.background = multiColorGradient(task.colors);
            info.el.style.borderColor = task.colors[0];
          }
        }}
      />
    </div>
  );
}
