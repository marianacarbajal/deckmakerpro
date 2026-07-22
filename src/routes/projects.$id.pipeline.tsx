import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProjectHeader } from "@/components/project-header";
import { useProjects } from "@/lib/store";
import { useLibrary } from "@/lib/library-store";
import { useOrg } from "@/lib/org-store";
import {
  WORKFLOW_STATUSES,
  downloadPipelineXlsx,
  generateWorkflowFromStructure,
  makeManualStage,
  stageProgressPct,
  statusMeta,
  workflowProgress,
  type WorkflowStage,
  type WorkflowStatus,
} from "@/lib/pipeline";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/projects/$id/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · InsightDeck Pro" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const { id } = Route.useParams();
  const { getProject, updateProject } = useProjects();
  const { getStructure, structures } = useLibrary();
  const { areaNames, ownerNames } = useOrg();
  const AREAS = areaNames;
  const project = getProject(id);

  const structure = getStructure(project?.general_information.presentationStructureId);
  const stages = useMemo<WorkflowStage[]>(() => {
    if (project?.workflow?.length) return project.workflow;
    if (structure) return generateWorkflowFromStructure(structure);
    return [];
  }, [project, structure]);

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    responsibleArea: string;
    owner: string;
    status: WorkflowStatus;
    dueDate: string;
    comment: string;
  }>({
    name: "",
    responsibleArea: AREAS[0] ?? "",
    owner: "",
    status: "not_started",
    dueDate: "",
    comment: "",
  });

  if (!project) return <Navigate to="/" replace />;

  const persistIfMissing = () => {
    if (!project.workflow?.length && stages.length) {
      updateProject(project.id, (p) => ({ ...p, workflow: stages }));
    }
  };
  persistIfMissing();

  const setStage = (stageId: string, patch: Partial<WorkflowStage>) => {
    updateProject(project.id, (p) => {
      const base = p.workflow?.length ? p.workflow : stages;
      const next = base.map((s) =>
        s.id === stageId
          ? {
              ...s,
              ...patch,
              updatedAt: new Date().toISOString(),
              completedAt: patch.status === "completed" ? new Date().toISOString() : s.completedAt,
              startedAt:
                patch.status === "in_progress" && !s.startedAt
                  ? new Date().toISOString()
                  : s.startedAt,
            }
          : s,
      );
      return { ...p, workflow: next };
    });
  };

  const addStage = () => {
    if (!draft.name.trim()) return;
    const stage = makeManualStage(draft);
    updateProject(project.id, (p) => {
      const base = p.workflow?.length ? p.workflow : stages;
      return { ...p, workflow: [...base, stage] };
    });
    setDraft({
      name: "",
      responsibleArea: AREAS[0] ?? "",
      owner: "",
      status: "not_started",
      dueDate: "",
      comment: "",
    });
    setShowNew(false);
  };

  const removeStage = (stageId: string, name: string) => {
    if (
      !window.confirm(
        `¿Eliminar la etapa "${name}"?\n\nEl porcentaje del pipeline se recalculará automáticamente.`,
      )
    )
      return;
    updateProject(project.id, (p) => {
      const base = p.workflow?.length ? p.workflow : stages;
      return { ...p, workflow: base.filter((s) => s.id !== stageId) };
    });
  };

  const exportXlsx = () =>
    downloadPipelineXlsx(project.general_information.name || "insightdeck", stages, {
      projectName: project.general_information.name || "Sin nombre",
      client: project.general_information.client,
      account: project.general_information.account || undefined,
      presentationStructure:
        structure?.name ??
        structures.find((s) => s.id === project.general_information.presentationStructureId)?.name,
      owner: project.general_information.owner,
      date: new Date().toLocaleDateString(),
    });

  const progress = workflowProgress(stages);

  return (
    <AppShell>
      <ProjectHeader
        projectId={project.id}
        projectName={project.general_information.name || "Sin nombre"}
        currentStep="context"
        action={
          <Link
            to="/projects/$id/$step"
            params={{ id: project.id, step: "context" }}
            className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface"
          >
            ← Volver al flujo
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-6xl mx-auto p-10 animate-in-slide">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Project Pipeline</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Etapas auto-generadas desde la Presentation Structure. Agrega, edita o elimina
                etapas y comparte el seguimiento con las demás áreas exportando a Excel.
              </p>
            </div>
            <div className="flex items-end gap-6">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Progreso global
                </div>
                <div className="text-3xl font-bold">{progress.pct}%</div>
                <div className="text-[11px] text-muted-foreground">
                  {progress.done} de {progress.total} etapas
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={exportXlsx}
                  disabled={stages.length === 0}
                  className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-white disabled:opacity-40"
                >
                  ⬇ Exportar a Excel
                </button>
                <button
                  onClick={() => setShowNew((v) => !v)}
                  className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary-hover"
                >
                  {showNew ? "Cancelar" : "+ Nueva etapa"}
                </button>
              </div>
            </div>
          </div>

          {showNew && (
            <div className="bg-white border border-primary/30 rounded-xl p-5 mb-6 grid grid-cols-6 gap-3 text-xs">
              <input
                placeholder="Nombre de la etapa"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="col-span-2 bg-white border border-border rounded-md px-3 py-2 text-sm"
              />
              <select
                value={draft.responsibleArea}
                onChange={(e) => setDraft({ ...draft, responsibleArea: e.target.value })}
                className="bg-white border border-border rounded-md px-3 py-2"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={draft.owner}
                onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                className="bg-white border border-border rounded-md px-3 py-2"
              >
                <option value="">Responsable…</option>
                {ownerNames.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as WorkflowStatus })}
                className="bg-white border border-border rounded-md px-3 py-2"
              >
                {WORKFLOW_STATUSES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                className="bg-white border border-border rounded-md px-3 py-2"
              />
              <input
                placeholder="Comentarios"
                value={draft.comment}
                onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
                className="col-span-5 bg-white border border-border rounded-md px-3 py-2"
              />
              <button
                onClick={addStage}
                disabled={!draft.name.trim()}
                className="bg-primary text-white rounded-md font-semibold disabled:opacity-40"
              >
                Agregar
              </button>
            </div>
          )}

          {!structure && stages.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 text-sm">
              Este proyecto no tiene una <strong>Presentation Structure</strong> asignada. Ve al
              paso{" "}
              <Link
                to="/projects/$id/$step"
                params={{ id: project.id, step: "context" }}
                className="underline font-semibold"
              >
                Contexto
              </Link>{" "}
              para asignar una, o usa <strong>+ Nueva etapa</strong> para crear el pipeline
              manualmente.
            </div>
          )}

          {stages.length > 0 && (
            <div className="bg-white border border-border rounded-xl overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[220px]">Sección</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[140px]">Área</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[130px]">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[150px]">Responsable</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[130px]">
                      Fecha límite
                    </th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[130px]">% Avance</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[240px]">Comentario</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s, i) => {
                    const meta = statusMeta(s.status);
                    const ownerOptions =
                      s.owner && !ownerNames.includes(s.owner)
                        ? [s.owner, ...ownerNames]
                        : ownerNames;
                    const areaOptions =
                      s.responsibleArea && !AREAS.includes(s.responsibleArea)
                        ? [s.responsibleArea, ...AREAS]
                        : AREAS;
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{s.name}</div>
                          {s.parentName && (
                            <div className="text-[10px] text-muted-foreground">
                              ↳ {s.parentName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <select
                            value={s.responsibleArea ?? ""}
                            onChange={(e) => setStage(s.id, { responsibleArea: e.target.value })}
                            className="text-xs bg-transparent outline-none border-b border-transparent focus:border-primary/40"
                          >
                            <option value="">—</option>
                            {areaOptions.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.status}
                            onChange={(e) =>
                              setStage(s.id, { status: e.target.value as WorkflowStatus })
                            }
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full border outline-none ${meta.tone}`}
                          >
                            {WORKFLOW_STATUSES.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.owner ?? ""}
                            onChange={(e) => setStage(s.id, { owner: e.target.value })}
                            className="text-xs bg-transparent outline-none border-b border-transparent focus:border-primary/40"
                          >
                            <option value="">—</option>
                            {ownerOptions.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={s.dueDate ?? ""}
                            onChange={(e) => setStage(s.id, { dueDate: e.target.value })}
                            className="text-xs bg-transparent outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${stageProgressPct(s.status)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {stageProgressPct(s.status)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={s.comment ?? ""}
                            onChange={(e) => setStage(s.id, { comment: e.target.value })}
                            placeholder="Notas…"
                            className="w-full min-w-[220px] bg-transparent text-xs outline-none border-b border-transparent focus:border-primary/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeStage(s.id, s.name)}
                            className="text-muted-foreground hover:text-destructive text-sm"
                            title="Eliminar etapa"
                            aria-label={`Eliminar etapa ${s.name}`}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
