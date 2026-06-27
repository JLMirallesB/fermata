import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '../editor/Editor';
import { TabBar, type ViewTab } from './TabBar';
import { Splitter } from './Splitter';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { ImportButton } from './ImportButton';
import { ExportMenu } from './ExportMenu';
import { EditTaskModal } from './EditTaskModal';
import { PdfExportModal } from './PdfExportModal';
import { AboutModal } from './AboutModal';
import { FilterDropdown } from './FilterDropdown';
import { CalendarView } from '../views/CalendarView';
import { GanttView } from '../views/GanttView';
import { TimelineView } from '../views/TimelineView';
import { ListView } from '../views/ListView';
import { KanbanView } from '../views/KanbanView';
import { AgendaView } from '../views/AgendaView';
import { useDocument } from '../hooks/useDocument';
import { useModel } from '../hooks/useModel';
import { useTheme } from '../hooks/useTheme';
import { editTask, toggleChecklistItem, editTaskNotes, editTaskDepends, editTaskId, formatDate } from '../core/edit';
import { exportListPdf, exportAgendaPdf } from '../core/pdfExport';
import { exportIcs } from '../core/icsExport';
import { parseTasks, type Task, type ChecklistItem } from '../core/model';
import type { KanbanStatus } from '../core/status';
import { collectUniqueSections } from '../core/sections';
import { jsPDF } from 'jspdf';

export function Layout() {
  const { t } = useTranslation();
  const { text, setText, importText } = useDocument();
  const { tasks, tagColors } = useModel(text);
  const { mode, resolved, setMode } = useTheme();

  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null;
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hiddenAssignees, setHiddenAssignees] = useState<Set<string>>(new Set());
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [hideWeekends, setHideWeekends] = useState(false);

  const viewContainerRef = useRef<HTMLDivElement>(null);

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      for (const a of task.assignees) set.add(a);
    }
    return [...set].sort();
  }, [tasks]);

  const allSections = useMemo(() => collectUniqueSections(tasks), [tasks]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    const statusTags = new Set(['todo', 'doing', 'done']);
    for (const task of tasks) {
      for (const tag of task.tags) {
        if (!statusTags.has(tag.toLowerCase())) set.add(tag);
      }
    }
    return [...set].sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (hiddenAssignees.size > 0 && task.assignees.length > 0) {
        if (!task.assignees.some((a) => !hiddenAssignees.has(a))) return false;
      }
      if (hiddenSections.size > 0 && task.sectionPath.length > 0) {
        for (let i = 0; i < task.sectionPath.length; i++) {
          const key = task.sectionPath.slice(0, i + 1).join(' > ');
          if (hiddenSections.has(key)) return false;
        }
      }
      return true;
    });
  }, [tasks, hiddenAssignees, hiddenSections]);

  const toggleSection = useCallback((key: string) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAssignee = useCallback((name: string) => {
    setHiddenAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTaskId(task.id);
  }, []);

  const handleSaveTask = useCallback((task: Task, changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>) => {
    const newText = editTask(text, task, changes);
    setText(newText);
  }, [text, setText]);

  const handleToggleChecklist = useCallback((item: ChecklistItem) => {
    const newText = toggleChecklistItem(text, item);
    setText(newText);
  }, [text, setText]);

  const handleStatusChange = useCallback((task: Task, newStatus: KanbanStatus) => {
    const newText = editTask(text, task, { status: newStatus });
    setText(newText);
  }, [text, setText]);

  const handleSaveNotes = useCallback((task: Task, notes: string[]) => {
    const newText = editTaskNotes(text, task, notes);
    setText(newText);
  }, [text, setText]);

  const handleSetDepends = useCallback((task: Task, depends: string[]) => {
    const newText = editTaskDepends(text, task, depends);
    setText(newText);
  }, [text, setText]);

  const handleSaveId = useCallback((task: Task, id: string) => {
    const newText = editTaskId(text, task, id);
    setText(newText);
  }, [text, setText]);

  const handleCreateEvent = useCallback((insertAt: number) => {
    const today = formatDate(new Date());
    const before = text.slice(0, insertAt);
    const after = text.slice(insertAt);

    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n\n') && !before.endsWith('\n');
    const prefixedBefore = needsNewlineBefore ? before + '\n' : before;

    const eventLine = `${today}: ${t('modal.newEvent')}\n`;

    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');
    const suffixedAfter = needsNewlineAfter ? '\n' + after : after;

    const newText = prefixedBefore + eventLine + suffixedAfter;
    setText(newText);

    const eventStart = prefixedBefore.length;
    setTimeout(() => {
      const parsed = parseTasks(newText);
      const created = parsed.tasks.find((task) =>
        task.textRange.from >= eventStart && task.textRange.from < eventStart + eventLine.length
      );
      if (created) setEditingTaskId(created.id);
    }, 50);
  }, [text, setText, t]);

  const handleIcsExport = useCallback(() => {
    const ics = exportIcs(filteredTasks);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fermata-export.ics';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTasks]);

  const handlePdfExport = useCallback(async (views: ViewTab[]) => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let pageAdded = false;

    for (const view of views) {
      if (pageAdded) pdf.addPage();

      if (view === 'list') {
        exportListPdf(pdf, filteredTasks, {
          title: `Fermata — ${t('tabs.list')}`,
          header: t('list.title'),
          start: t('list.start'),
          end: t('list.end'),
          section: t('list.section'),
          assignees: t('list.assignees'),
          tags: t('list.tags'),
        });
        pageAdded = true;
      } else if (view === 'agenda') {
        exportAgendaPdf(pdf, filteredTasks, {
          title: `Fermata — ${t('tabs.agenda')}`,
          date: t('list.start'),
          event: t('list.title'),
        });
        pageAdded = true;
      }
    }

    if (pageAdded) {
      pdf.save('fermata-export.pdf');
    }
  }, [filteredTasks, t]);

  const renderView = () => {
    const viewProps = { tasks: filteredTasks, tagColors, onTaskClick: handleTaskClick };
    switch (activeTab) {
      case 'calendar': return <CalendarView {...viewProps} hideWeekends={hideWeekends} />;
      case 'gantt': return <GanttView {...viewProps} />;
      case 'timeline': return <TimelineView {...viewProps} />;
      case 'list': return <ListView {...viewProps} />;
      case 'kanban': return <KanbanView {...viewProps} onStatusChange={handleStatusChange} />;
      case 'agenda': return <AgendaView {...viewProps} hideWeekends={hideWeekends} />;
    }
  };

  const showWeekendToggle = activeTab === 'calendar' || activeTab === 'agenda';
  const showSectionFilter = activeTab !== 'gantt';

  const sectionItems = allSections.map((key) => ({
    key,
    label: key.includes(' > ') ? key.split(' > ').pop()! : key,
    depth: key.split(' > ').length - 1,
  }));

  const assigneeItems = allAssignees.map((name) => ({ key: name, label: name }));

  const hasFilters = (allSections.length > 0 && showSectionFilter) || allAssignees.length > 0 || showWeekendToggle;

  const filterBar = hasFilters ? (
    <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
      {allSections.length > 0 && showSectionFilter && (
        <FilterDropdown
          label={t('list.section')}
          items={sectionItems}
          hidden={hiddenSections}
          onToggle={toggleSection}
          colorClass="bg-blue-500"
        />
      )}
      {allAssignees.length > 0 && (
        <FilterDropdown
          label={t('list.assignees')}
          items={assigneeItems}
          hidden={hiddenAssignees}
          onToggle={toggleAssignee}
          colorClass="bg-indigo-500"
        />
      )}
      {showWeekendToggle && (
        <button
          onClick={() => setHideWeekends(!hideWeekends)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            hideWeekends
              ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {hideWeekends ? t('calendar.showWeekends') : t('calendar.hideWeekends')}
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6">
            <circle cx="16" cy="18" r="3" fill="#6366f1" />
            <path d="M6 22 C6 10, 16 2, 26 22" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {t('app.name')}
          </h1>
          <button
            onClick={() => setAboutOpen(true)}
            className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="About"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title={showEditor ? t('toolbar.hideEditor') : t('toolbar.showEditor')}
            aria-label={showEditor ? t('toolbar.hideEditor') : t('toolbar.showEditor')}
          >
            {showEditor ? '⟨⟩' : '⟩⟨'}
          </button>
          <ImportButton onImport={importText} />
          <ExportMenu text={text} onOpenPdfModal={() => setPdfModalOpen(true)} onExportIcs={handleIcsExport} />
          <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <ThemeToggle mode={mode} onChangeMode={setMode} />
          <LanguageToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {showEditor ? (
          <Splitter
            left={<Editor value={text} onChange={setText} dark={resolved === 'dark'} onCreateEvent={handleCreateEvent} />}
            right={
              <div className="flex h-full flex-col">
                <TabBar active={activeTab} onChange={setActiveTab} />
                {filterBar}
                <div ref={viewContainerRef} className="flex-1 overflow-hidden" role="tabpanel">
                  {renderView()}
                </div>
              </div>
            }
          />
        ) : (
          <div className="flex h-full flex-col">
            <TabBar active={activeTab} onChange={setActiveTab} />
            {filterBar}
            <div ref={viewContainerRef} className="flex-1 overflow-hidden" role="tabpanel">
              {renderView()}
            </div>
          </div>
        )}
      </div>

      <EditTaskModal
        task={editingTask}
        allTasks={tasks}
        allTags={allTags}
        allAssignees={allAssignees}
        tagColors={tagColors}
        onSave={handleSaveTask}
        onClose={() => setEditingTaskId(null)}
        onToggleChecklist={handleToggleChecklist}
        onSaveNotes={handleSaveNotes}
        onSetDepends={handleSetDepends}
        onSaveId={handleSaveId}
      />
      <PdfExportModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onExport={handlePdfExport}
      />
      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  );
}
