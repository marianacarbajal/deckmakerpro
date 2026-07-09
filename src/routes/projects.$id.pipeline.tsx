import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProjectHeader } from "@/components/project-header";
import { useProjects } from "@/lib/store";
import { useLibrary } from "@/lib/library-store";
import {
  WORKFLOW_STATUSES,
  generateWorkflowFromStructure,
  statusMeta,
  workflowProgress,
  type WorkflowStage,
  type WorkflowStatus,
} from "@/lib/pipeline";
import { useMemo } from "react";

export const Route = createFileRoute("/projects/$id/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · InsightDeck Pro" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const { id } = Route.useParams();
  const { getProject, updateProject } = useProjects();
  const { getStructure } = useLibrary();
  const project = getProject(id);

  const structure = getStructure(project?.general_information.presentationStructureId);
  const stages = useMemo<WorkflowStage[]>(() => {
    if (project?.workflow?.length) return project.workflow;
    if (structure) return generateWorkflowFromStructure(structure);
    return [];
  }, [project, structure]);

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
              startedAt: patch.status === "in_progress" && !s.startedAt ? new Date().toISOString() : s.startedAt,
            }
          : s,
      );
      return { ...p, workflow: next };
    });
  };

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
                Etapas auto-generadas desde la Presentation Structure. Cada etapa mantiene
                estado, responsable y bitácora.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Progreso global
              </div>
              <div className="text-3xl font-bold">{progress.pct}%</div>
              <div className="text-[11px] text-muted-foreground">
                {progress.done} de {progress.total} etapas
              </div>
            </div>
          </div>

          {!structure && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 text-sm">
              Este proyecto no tiene una <strong>Presentation Structure</strong> asignada. Ve al paso{" "}
              <Link
                to="/projects/$id/$step"
                params={{ id: project.id, step: "context" }}
                className="underline font-semibold"
              >
                Contexto
              </Link>{" "}
              y selecciona una estructura para generar el pipeline.
            </div>
          )}

          {stages.length > 0 && (
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Sección</th>
                    <th className="text-left px-4 py-3 font-semibold">Área</th>
                    <th className="text-left px-4 py-3 font-semibold">Fuente</th>
                    <th className="text-left px-4 py-3 font-semibold">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold">Responsable</th>
                    <th className="text-left px-4 py-3 font-semibold">Fecha límite</th>
                    <th className="text-left px-4 py-3 font-semibold">Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s, i) => {
                    const meta = statusMeta(s.status);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{s.name}</div>
                          {s.parentName && (
                            <div className="text-[10px] text-muted-foreground">↳ {s.parentName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.responsibleArea ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                            {s.dataSource ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.status}
                            onChange={(e) => setStage(s.id, { status: e.target.value as WorkflowStatus })}
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
                          <input
                            value={s.owner ?? ""}
                            onChange={(e) => setStage(s.id, { owner: e.target.value })}
                            placeholder="—"
                            className="w-28 bg-transparent text-xs outline-none border-b border-transparent focus:border-primary/40"
                          />
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
                          <input
                            value={s.comment ?? ""}
                            onChange={(e) => setStage(s.id, { comment: e.target.value })}
                            placeholder="Notas…"
                            className="w-48 bg-transparent text-xs outline-none border-b border-transparent focus:border-primary/40"
                          />
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
