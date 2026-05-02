import { useState, useCallback, useRef } from 'react';
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
import { CalendarView } from '../views/CalendarView';
import { GanttView } from '../views/GanttView';
import { TimelineView } from '../views/TimelineView';
import { ListView } from '../views/ListView';
import { KanbanView } from '../views/KanbanView';
import { AgendaView } from '../views/AgendaView';
import { useDocument } from '../hooks/useDocument';
import { useModel } from '../hooks/useModel';
import { useTheme } from '../hooks/useTheme';
import { editTask } from '../core/edit';
import type { Task } from '../core/model';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function Layout() {
  const { t } = useTranslation();
  const { text, setText, importText } = useDocument();
  const { tasks, tagColors } = useModel(text);
  const { mode, setMode } = useTheme();

  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const viewContainerRef = useRef<HTMLDivElement>(null);

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleSaveTask = useCallback((task: Task, changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>) => {
    const newText = editTask(text, task, changes);
    setText(newText);
  }, [text, setText]);

  const handlePdfExport = useCallback(async (views: ViewTab[]) => {
    const container = viewContainerRef.current;
    if (!container) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const savedTab = activeTab;

    for (let i = 0; i < views.length; i++) {
      setActiveTab(views[i]);
      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;

      let drawWidth = pdfWidth - 20;
      let drawHeight = drawWidth / imgRatio;
      if (drawHeight > pdfHeight - 20) {
        drawHeight = pdfHeight - 20;
        drawWidth = drawHeight * imgRatio;
      }

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10, drawWidth, drawHeight);
    }

    pdf.save('fermata-export.pdf');
    setActiveTab(savedTab);
  }, [activeTab]);

  const renderView = () => {
    const viewProps = { tasks, tagColors, onTaskClick: handleTaskClick };
    switch (activeTab) {
      case 'calendar': return <CalendarView {...viewProps} />;
      case 'gantt': return <GanttView {...viewProps} />;
      case 'timeline': return <TimelineView {...viewProps} />;
      case 'list': return <ListView {...viewProps} />;
      case 'kanban': return <KanbanView {...viewProps} />;
      case 'agenda': return <AgendaView {...viewProps} />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          {t('app.name')}
        </h1>
        <div className="flex items-center gap-2">
          <ImportButton onImport={importText} />
          <ExportMenu text={text} onOpenPdfModal={() => setPdfModalOpen(true)} />
          <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <ThemeToggle mode={mode} onChangeMode={setMode} />
          <LanguageToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Splitter
          left={<Editor value={text} onChange={setText} />}
          right={
            <div className="flex h-full flex-col">
              <TabBar active={activeTab} onChange={setActiveTab} />
              <div ref={viewContainerRef} className="flex-1 overflow-hidden" role="tabpanel">
                {renderView()}
              </div>
            </div>
          }
        />
      </div>

      <EditTaskModal
        task={editingTask}
        onSave={handleSaveTask}
        onClose={() => setEditingTask(null)}
      />
      <PdfExportModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onExport={handlePdfExport}
      />
    </div>
  );
}
