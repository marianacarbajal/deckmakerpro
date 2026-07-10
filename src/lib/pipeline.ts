import * as XLSX from "xlsx";
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
  { id: "completed", label: "Completado", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
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

export function downloadPipelineXlsx(fileBase: string, stages: WorkflowStage[]) {
  const rows = stages.map((s, i) => ({
    "#": i + 1,
    Etapa: s.name,
    "Sección padre": s.parentName ?? "",
    "Área responsable": s.responsibleArea ?? "",
    Responsable: s.owner ?? "",
    Estado: statusMeta(s.status).label,
    "Fecha límite": s.dueDate ?? "",
    "Inicio": s.startedAt ? new Date(s.startedAt).toLocaleDateString() : "",
    "Completado": s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "",
    "% avance": stageProgressPct(s.status),
    Comentarios: s.comment ?? "",
    Actualizado: new Date(s.updatedAt).toLocaleString(),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 4 }, { wch: 32 }, { wch: 24 }, { wch: 20 }, { wch: 18 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 40 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Pipeline");

  const done = stages.filter((s) => s.status === "completed").length;
  const summary = [
    { KPI: "Etapas totales", Valor: stages.length },
    { KPI: "Completadas", Valor: done },
    { KPI: "En progreso", Valor: stages.filter((s) => s.status === "in_progress").length },
    { KPI: "En revisión", Valor: stages.filter((s) => s.status === "review").length },
    { KPI: "Bloqueadas", Valor: stages.filter((s) => s.status === "blocked").length },
    { KPI: "No iniciadas", Valor: stages.filter((s) => s.status === "not_started").length },
    { KPI: "% Global", Valor: stages.length ? Math.round((done / stages.length) * 100) : 0 },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Resumen");

  XLSX.writeFile(wb, `${fileBase.replace(/\s+/g, "_") || "pipeline"}__pipeline.xlsx`);
}
