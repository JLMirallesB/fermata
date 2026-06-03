import { jsPDF } from 'jspdf';
import type { Task } from './model';
import { formatDate } from './edit';

const MARGIN = 15;
const ROW_PAD = 3;
const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 13;
const LINE_H = 4;

function safe(s: string): string {
  return s.replace(/[◆✓]/g, (c) => {
    if (c === '◆') return '*';
    if (c === '✓') return 'x';
    return c;
  });
}

function addPageHeader(pdf: jsPDF, title: string, pageWidth: number): number {
  pdf.setFontSize(TITLE_FONT_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.text(safe(title), MARGIN, MARGIN + 5);
  pdf.setDrawColor(180);
  pdf.line(MARGIN, MARGIN + 8, pageWidth - MARGIN, MARGIN + 8);
  return MARGIN + 14;
}

function needsNewPage(y: number, needed: number, pageHeight: number): boolean {
  return y + needed > pageHeight - MARGIN;
}

function newPage(pdf: jsPDF, title: string, pageWidth: number): number {
  pdf.addPage();
  return addPageHeader(pdf, title, pageWidth);
}

function textLines(pdf: jsPDF, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(safe(text), maxWidth) as string[];
}

function rowHeight(lineCount: number): number {
  return Math.max(lineCount, 1) * LINE_H + ROW_PAD * 2;
}

export function exportListPdf(
  pdf: jsPDF,
  tasks: Task[],
  labels: { title: string; header: string; start: string; end: string; section: string; assignees: string; tags: string },
) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const cw = pw - MARGIN * 2;

  const dateW = 28;
  const fixedW = dateW * 2;
  const flexW = cw - fixedW;
  const cols = [
    { label: labels.header, width: flexW * 0.35 },
    { label: labels.start, width: dateW },
    { label: labels.end, width: dateW },
    { label: labels.section, width: flexW * 0.25 },
    { label: labels.assignees, width: flexW * 0.20 },
    { label: labels.tags, width: flexW * 0.20 },
  ];
  const colW = cols.map((c) => c.width);

  function drawTableHeader(): number {
    let hy = addPageHeader(pdf, labels.title, pw);
    pdf.setFontSize(HEADER_FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(235, 235, 235);
    pdf.rect(MARGIN, hy, cw, LINE_H + ROW_PAD * 2, 'F');
    let hx = MARGIN;
    for (let i = 0; i < cols.length; i++) {
      pdf.text(safe(cols[i].label), hx + 2, hy + ROW_PAD + LINE_H - 1);
      hx += colW[i];
    }
    hy += LINE_H + ROW_PAD * 2 + 1;
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont('helvetica', 'normal');
    return hy;
  }

  let y = drawTableHeader();

  const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const task of sorted) {
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont('helvetica', 'normal');

    const titleLines = textLines(pdf, (task.milestone ? '* ' : '') + task.title, colW[0] - 4);
    const sectionLines = textLines(pdf, task.section, colW[3] - 4);
    const assigneeLines = textLines(pdf, task.assignees.join(', '), colW[4] - 4);
    const tagLines = textLines(pdf, task.tags.join(', '), colW[5] - 4);
    const startStr = safe(formatDate(task.start));
    const endStr = safe(formatDate(task.end));

    const maxLines = Math.max(titleLines.length, sectionLines.length, assigneeLines.length, tagLines.length, 1);
    const rh = rowHeight(maxLines);

    if (needsNewPage(y, rh, ph)) {
      pdf.addPage();
      y = drawTableHeader();
    }

    pdf.setFont('helvetica', 'normal');
    let x = MARGIN;

    // Title (wraps)
    for (let l = 0; l < titleLines.length; l++) {
      pdf.text(titleLines[l], x + 2, y + ROW_PAD + LINE_H * (l + 1) - 1);
    }
    x += colW[0];

    // Start date (never wraps)
    pdf.text(startStr, x + 2, y + ROW_PAD + LINE_H - 1);
    x += colW[1];

    // End date (never wraps)
    pdf.text(endStr, x + 2, y + ROW_PAD + LINE_H - 1);
    x += colW[2];

    // Section (wraps)
    for (let l = 0; l < sectionLines.length; l++) {
      pdf.text(sectionLines[l], x + 2, y + ROW_PAD + LINE_H * (l + 1) - 1);
    }
    x += colW[3];

    // Assignees (wraps)
    for (let l = 0; l < assigneeLines.length; l++) {
      pdf.text(assigneeLines[l], x + 2, y + ROW_PAD + LINE_H * (l + 1) - 1);
    }
    x += colW[4];

    // Tags (wraps)
    for (let l = 0; l < tagLines.length; l++) {
      pdf.text(tagLines[l], x + 2, y + ROW_PAD + LINE_H * (l + 1) - 1);
    }

    pdf.setDrawColor(220);
    pdf.line(MARGIN, y + rh, MARGIN + cw, y + rh);
    y += rh;
  }
}

export function exportAgendaPdf(
  pdf: jsPDF,
  tasks: Task[],
  labels: { title: string; date: string; event: string },
) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const cw = pw - MARGIN * 2;
  const dateColW = 60;
  const titleColW = cw - dateColW;

  function resetFont() {
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont('helvetica', 'normal');
  }

  let y = addPageHeader(pdf, labels.title, pw);
  resetFont();

  const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());
  let currentMonth = '';

  for (const task of sorted) {
    const month = task.start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    if (month !== currentMonth) {
      if (needsNewPage(y, 20, ph)) {
        pdf.addPage();
        y = addPageHeader(pdf, labels.title, pw);
      }
      currentMonth = month;
      y += 4;
      pdf.setFontSize(HEADER_FONT_SIZE);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(235, 240, 250);
      pdf.rect(MARGIN, y, cw, LINE_H + ROW_PAD * 2, 'F');
      pdf.text(safe(month.charAt(0).toUpperCase() + month.slice(1)), MARGIN + 3, y + ROW_PAD + LINE_H - 1);
      y += LINE_H + ROW_PAD * 2 + 3;
    }

    resetFont();

    const titleStr = (task.milestone ? '* ' : '') + task.title;
    const titleLines = textLines(pdf, titleStr, titleColW - 4);
    const assigneeStr = task.assignees.length > 0 ? task.assignees.join(', ') : '';
    const totalLines = titleLines.length + (assigneeStr ? 1 : 0);
    const rh = rowHeight(totalLines);

    if (needsNewPage(y, rh, ph)) {
      pdf.addPage();
      y = addPageHeader(pdf, labels.title, pw);
      resetFont();
    }

    pdf.setFontSize(FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    const dateStr = formatDate(task.start) + (task.milestone ? '' : '  ->  ' + formatDate(task.end));
    pdf.text(safe(dateStr), MARGIN + 2, y + ROW_PAD + LINE_H - 1);

    pdf.setFont('helvetica', 'normal');
    for (let l = 0; l < titleLines.length; l++) {
      pdf.text(titleLines[l], MARGIN + dateColW, y + ROW_PAD + LINE_H * (l + 1) - 1);
    }

    if (assigneeStr) {
      pdf.setFontSize(7);
      pdf.setTextColor(130);
      pdf.text(safe(assigneeStr), MARGIN + dateColW, y + ROW_PAD + LINE_H * (titleLines.length + 1) - 1);
      pdf.setTextColor(0);
      pdf.setFontSize(FONT_SIZE);
    }

    pdf.setDrawColor(230);
    pdf.line(MARGIN, y + rh, MARGIN + cw, y + rh);
    y += rh;

    if (task.checklist.length > 0) {
      pdf.setFontSize(7);
      for (const item of task.checklist) {
        if (needsNewPage(y, LINE_H + 2, ph)) {
          y = newPage(pdf, labels.title, pw);
        }
        const check = item.checked ? '[x]' : '[ ]';
        pdf.text(safe(`    ${check} ${item.label}`), MARGIN + dateColW, y + LINE_H);
        y += LINE_H;
      }
      pdf.setFontSize(FONT_SIZE);
      y += 2;
    }
  }
}
