import XLSX from "xlsx-js-style";
import type { PresentationStructure } from "./library-store";

export type WorkflowStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";

export interface WorkflowStage {
  id: string;
  sectionId: string;
  name: string;
  parentName?: string;
  responsibleArea?: string;
  dataSource?: string;
  status: WorkflowStatus;
  owner?: string;
  startedAt?: string;
  dueDate?: string;
  completedAt?: string;
  updatedAt: string;
  comment?: string;
}

export const WORKFLOW_STATUSES: { id: WorkflowStatus; label: string; tone: string }[] = [
  { id: "not_started", label: "No iniciado", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  { id: "in_progress", label: "En progreso", tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { id: "review", label: "En revisión", tone: "bg-amber-50 text-amber-700 border-amber-100" },
  {
    id: "completed",
    label: "Completado",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  { id: "blocked", label: "Bloqueado", tone: "bg-rose-50 text-rose-700 border-rose-100" },
];

export function statusMeta(s: WorkflowStatus) {
  return WORKFLOW_STATUSES.find((w) => w.id === s) ?? WORKFLOW_STATUSES[0];
}

export function generateWorkflowFromStructure(structure: PresentationStructure): WorkflowStage[] {
  const now = new Date().toISOString();
  const parentMap = new Map(structure.sections.map((s) => [s.id, s.name]));
  return structure.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((sec) => ({
      id: `stg-${sec.id}`,
      sectionId: sec.id,
      name: sec.name,
      parentName: sec.parentId ? parentMap.get(sec.parentId) : undefined,
      responsibleArea: sec.responsibleArea,
      dataSource: sec.dataSource,
      status: "not_started" as WorkflowStatus,
      updatedAt: now,
    }));
}

export function workflowProgress(stages: WorkflowStage[]) {
  if (!stages.length) return { done: 0, total: 0, pct: 0 };
  const done = stages.filter((s) => s.status === "completed").length;
  return { done, total: stages.length, pct: Math.round((done / stages.length) * 100) };
}

export function currentStage(stages: WorkflowStage[]) {
  return (
    stages.find((s) => s.status === "in_progress" || s.status === "review") ??
    stages.find((s) => s.status !== "completed")
  );
}

export function makeManualStage(input: {
  name: string;
  responsibleArea?: string;
  owner?: string;
  status?: WorkflowStatus;
  dueDate?: string;
  comment?: string;
}): WorkflowStage {
  const now = new Date().toISOString();
  return {
    id: `stg-manual-${Date.now().toString(36)}`,
    sectionId: `manual-${Date.now().toString(36)}`,
    name: input.name,
    responsibleArea: input.responsibleArea,
    dataSource: "user",
    status: input.status ?? "not_started",
    owner: input.owner,
    dueDate: input.dueDate,
    comment: input.comment,
    updatedAt: now,
  };
}

const STATUS_WEIGHT: Record<WorkflowStatus, number> = {
  not_started: 0,
  in_progress: 0.4,
  review: 0.75,
  completed: 1,
  blocked: 0.15,
};

export function stageProgressPct(status: WorkflowStatus) {
  return Math.round(STATUS_WEIGHT[status] * 100);
}

// ────────────────────────────────────────────────────────────────
// Executive tracker export
// ────────────────────────────────────────────────────────────────

export interface PipelineExportMeta {
  projectName: string;
  client?: string;
  account?: string;
  presentationStructure?: string;
  owner?: string;
  date?: string;
}

// Palette matches the reference template.
const NAVY = "2F4A67";
const NAVY_SOFT = "E9EEF5";
const WHITE = "FFFFFF";
const TEXT_DARK = "1F2937";
const TEXT_MUTED = "6B7280";
const GREEN = "5BAE74";
const AMBER = "F59E0B";
const RED = "DC2626";
const BLUE_LIGHT = "DBEAFE";
const GRAY_LIGHT = "F3F4F6";

const STATUS_FILL: Record<WorkflowStatus, string> = {
  not_started: GRAY_LIGHT,
  in_progress: BLUE_LIGHT,
  review: "FEF3C7",
  completed: "D1FAE5",
  blocked: "FEE2E2",
};
const STATUS_TEXT: Record<WorkflowStatus, string> = {
  not_started: TEXT_MUTED,
  in_progress: "1E40AF",
  review: "92400E",
  completed: "065F46",
  blocked: "991B1B",
};

const border = (color = "D1D5DB") => ({
  top: { style: "thin", color: { rgb: color } },
  bottom: { style: "thin", color: { rgb: color } },
  left: { style: "thin", color: { rgb: color } },
  right: { style: "thin", color: { rgb: color } },
});

const FONT_BASE = { name: "Calibri" };

function styled(value: string | number, style: Record<string, unknown>) {
  return { v: value, t: typeof value === "number" ? "n" : "s", s: style };
}

function setCell(ws: XLSX.WorkSheet, addr: string, cell: unknown) {
  ws[addr] = cell;
}

function ensureRef(ws: XLSX.WorkSheet, addr: string) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const cur = XLSX.utils.decode_cell(addr);
  if (cur.r > range.e.r) range.e.r = cur.r;
  if (cur.c > range.e.c) range.e.c = cur.c;
  ws["!ref"] = XLSX.utils.encode_range(range);
}

export function downloadPipelineXlsx(
  fileBase: string,
  stages: WorkflowStage[],
  meta: PipelineExportMeta = { projectName: fileBase },
) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };

  // Column widths: A-P
  ws["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 22 },
    { wch: 24 },
    { wch: 6 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 8 },
  ];

  // Row heights
  ws["!rows"] = [{ hpt: 30 }, { hpt: 22 }];

  const done = stages.filter((s) => s.status === "completed").length;
  const total = stages.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const blocked = stages.filter((s) => s.status === "blocked").length;
  const pending = total - done - blocked;

  const kpiHeader = {
    font: { ...FONT_BASE, bold: true, color: { rgb: WHITE }, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: NAVY } },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(NAVY),
  };
  const kpiValue = {
    font: { ...FONT_BASE, bold: true, color: { rgb: GREEN }, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(),
    fill: { patternType: "solid", fgColor: { rgb: WHITE } },
  };

  // ── Row 1: Title
  setCell(
    ws,
    "A1",
    styled("PROJECT PIPELINE TRACKER", {
      font: { ...FONT_BASE, bold: true, sz: 16, color: { rgb: NAVY } },
      alignment: { horizontal: "left", vertical: "center" },
    }),
  );
  ensureRef(ws, "A1");

  // ── Row 2: KPI strip on the right (cols G–P)
  const kpis: Array<[string, string, number | string]> = [
    ["G2", "% Avance", `${pct}%`],
    ["I2", "Etapas", total],
    ["K2", "Completadas", done],
    ["M2", "Pendientes", pending],
    ["O2", "Bloqueadas", blocked],
  ];
  kpis.forEach(([addr, label, value]) => {
    const col = addr[0];
    const nextCol = String.fromCharCode(col.charCodeAt(0) + 1);
    setCell(ws, addr, styled(label, kpiHeader));
    setCell(ws, `${nextCol}2`, styled(value, kpiValue));
    ensureRef(ws, `${nextCol}2`);
  });

  // ── Rows 3–5: Project info block (labels col A/D, values col B–C / E–F)
  const infoLabel = {
    font: { ...FONT_BASE, bold: true, sz: 10, color: { rgb: TEXT_DARK } },
    fill: { patternType: "solid", fgColor: { rgb: NAVY_SOFT } },
    alignment: { horizontal: "left", vertical: "center", indent: 1 },
    border: border(),
  };
  const infoValue = {
    font: { ...FONT_BASE, sz: 10, color: { rgb: TEXT_DARK } },
    alignment: { horizontal: "left", vertical: "center", indent: 1 },
    border: border(),
    fill: { patternType: "solid", fgColor: { rgb: WHITE } },
  };
  const rowsInfo: Array<[string, string, string, string]> = [
    ["A3", "Proyecto", "B3", meta.projectName || ""],
    ["D3", "Presentation Structure", "E3", meta.presentationStructure ?? ""],
    ["A4", "Cliente", "B4", meta.client ?? ""],
    ["D4", "Responsable", "E4", meta.owner ?? ""],
    ["A5", "Cuenta", "B5", meta.account ?? ""],
    ["D5", "Fecha", "E5", meta.date ?? new Date().toLocaleDateString()],
  ];
  ws["!merges"] = ws["!merges"] ?? [];
  rowsInfo.forEach(([la, lv, va, vv]) => {
    setCell(ws, la, styled(lv, infoLabel));
    setCell(ws, va, styled(vv, infoValue));
    // Merge value across 2 columns
    const start = XLSX.utils.decode_cell(va);
    ws["!merges"]!.push({ s: { r: start.r, c: start.c }, e: { r: start.r, c: start.c + 1 } });
    ensureRef(ws, XLSX.utils.encode_cell({ r: start.r, c: start.c + 1 }));
  });

  // Section headers row 7 (leave row 6 spacer)
  ws["!rows"][6] = { hpt: 10 };
  const sectionHeader = {
    font: { ...FONT_BASE, bold: true, color: { rgb: WHITE }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: NAVY } },
    alignment: { horizontal: "left", vertical: "center", indent: 1 },
    border: border(NAVY),
  };
  setCell(ws, "A8", styled("RESUMEN POR ÁREA", sectionHeader));
  setCell(ws, "D8", styled("RESUMEN POR ESTADO", sectionHeader));
  ws["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 1 } });
  ws["!merges"].push({ s: { r: 7, c: 3 }, e: { r: 7, c: 4 } });
  ensureRef(ws, "E8");

  // Aggregate by area
  const byArea = new Map<string, number>();
  stages.forEach((s) => {
    const key = s.responsibleArea?.trim() || "Sin asignar";
    byArea.set(key, (byArea.get(key) ?? 0) + 1);
  });
  const areaRows = Array.from(byArea.entries()).sort((a, b) => b[1] - a[1]);

  const cellText = {
    font: { ...FONT_BASE, sz: 10, color: { rgb: TEXT_DARK } },
    alignment: { horizontal: "left", vertical: "center", indent: 1 },
    border: border(),
    fill: { patternType: "solid", fgColor: { rgb: WHITE } },
  };
  const cellNum = {
    ...cellText,
    alignment: { horizontal: "center", vertical: "center" },
    font: { ...FONT_BASE, sz: 10, bold: true, color: { rgb: TEXT_DARK } },
  };
  const summaryStartRow = 9; // 1-indexed
  areaRows.forEach(([name, count], i) => {
    const r = summaryStartRow + i;
    setCell(ws, `A${r}`, styled(name, cellText));
    setCell(ws, `B${r}`, styled(count, cellNum));
    ensureRef(ws, `B${r}`);
  });
  if (areaRows.length === 0) {
    setCell(ws, `A${summaryStartRow}`, styled("—", cellText));
    setCell(ws, `B${summaryStartRow}`, styled(0, cellNum));
  }

  // Aggregate by status
  WORKFLOW_STATUSES.forEach((w, i) => {
    const r = summaryStartRow + i;
    const count = stages.filter((s) => s.status === w.id).length;
    setCell(
      ws,
      `D${r}`,
      styled(w.label, {
        ...cellText,
        fill: { patternType: "solid", fgColor: { rgb: STATUS_FILL[w.id] } },
        font: { ...FONT_BASE, sz: 10, bold: true, color: { rgb: STATUS_TEXT[w.id] } },
      }),
    );
    setCell(ws, `E${r}`, styled(count, cellNum));
    ensureRef(ws, `E${r}`);
  });

  // ── Main pipeline table
  const tableHeaderRow =
    Math.max(summaryStartRow + areaRows.length, summaryStartRow + WORKFLOW_STATUSES.length) + 2;
  const headers = [
    "#",
    "Sección",
    "Área",
    "Estado",
    "Responsable",
    "Fecha inicio",
    "Fecha límite",
    "% Avance",
    "Comentarios",
  ];
  const tableHeaderStyle = {
    font: { ...FONT_BASE, bold: true, color: { rgb: WHITE }, sz: 10 },
    fill: { patternType: "solid", fgColor: { rgb: NAVY } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: border(NAVY),
  };
  headers.forEach((h, i) => {
    const addr = XLSX.utils.encode_cell({ r: tableHeaderRow - 1, c: i });
    setCell(ws, addr, styled(h, tableHeaderStyle));
    ensureRef(ws, addr);
  });
  ws["!rows"][tableHeaderRow - 1] = { hpt: 26 };

  const rowStyle = (fillColor = WHITE) => ({
    font: { ...FONT_BASE, sz: 10, color: { rgb: TEXT_DARK } },
    alignment: { horizontal: "left", vertical: "center", indent: 1, wrapText: true },
    border: border(),
    fill: { patternType: "solid", fgColor: { rgb: fillColor } },
  });
  const centerStyle = (fillColor = WHITE) => ({
    ...rowStyle(fillColor),
    alignment: { horizontal: "center", vertical: "center" },
  });

  stages.forEach((s, i) => {
    const r = tableHeaderRow + i;
    const zebra = i % 2 === 0 ? WHITE : "F9FAFB";
    const meta = statusMeta(s.status);
    setCell(ws, `A${r}`, styled(i + 1, centerStyle(zebra)));
    setCell(
      ws,
      `B${r}`,
      styled(s.name + (s.parentName ? ` (${s.parentName})` : ""), rowStyle(zebra)),
    );
    setCell(ws, `C${r}`, styled(s.responsibleArea ?? "—", rowStyle(zebra)));
    setCell(
      ws,
      `D${r}`,
      styled(meta.label, {
        ...centerStyle(STATUS_FILL[s.status]),
        font: { ...FONT_BASE, sz: 10, bold: true, color: { rgb: STATUS_TEXT[s.status] } },
      }),
    );
    setCell(ws, `E${r}`, styled(s.owner ?? "—", rowStyle(zebra)));
    setCell(
      ws,
      `F${r}`,
      styled(s.startedAt ? new Date(s.startedAt).toLocaleDateString() : "—", centerStyle(zebra)),
    );
    setCell(ws, `G${r}`, styled(s.dueDate ?? "—", centerStyle(zebra)));
    const p = stageProgressPct(s.status);
    setCell(
      ws,
      `H${r}`,
      styled(`${p}%`, {
        ...centerStyle(zebra),
        font: {
          ...FONT_BASE,
          sz: 10,
          bold: true,
          color: { rgb: p >= 100 ? GREEN : p >= 40 ? AMBER : p === 0 ? TEXT_MUTED : NAVY },
        },
      }),
    );
    setCell(ws, `I${r}`, styled(s.comment ?? "", rowStyle(zebra)));
    ensureRef(ws, `I${r}`);
    ws["!rows"]![r - 1] = { hpt: 22 };
  });

  // Freeze header rows and enable autofilter on the main table
  const lastRow = tableHeaderRow + Math.max(stages.length - 1, 0);
  ws["!autofilter"] = { ref: `A${tableHeaderRow}:I${Math.max(lastRow, tableHeaderRow)}` };
  ws["!freeze"] = { xSplit: 0, ySplit: tableHeaderRow };

  XLSX.utils.book_append_sheet(wb, ws, "Pipeline Tracker");

  const safeName = (fileBase || "insightdeck").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  XLSX.writeFile(wb, `${safeName}__Pipeline_Tracker.xlsx`);
}
