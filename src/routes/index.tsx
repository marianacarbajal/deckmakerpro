import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useProjects } from "@/lib/store";
import { statusLabel, statusTone } from "@/lib/mock-data";
import { workflowProgress, currentStage } from "@/lib/pipeline";
import { useMemo, useState } from "react";


export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { projects, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const gi = p.general_information;
      const matchQ =
        !q ||
        [gi.name, gi.client, gi.brand, gi.category, gi.researchType]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchS = statusFilter === "all" || p.current_status === statusFilter;
      return matchQ && matchS;
    });
  }, [projects, q, statusFilter]);

  const counts = useMemo(() => {
    return {
      in_analysis: projects.filter((p) => p.current_status === "in_analysis").length,
      review: projects.filter((p) => p.current_status === "review").length,
      completed: projects.filter((p) => p.current_status === "completed").length,
      slides: projects.reduce((acc, p) => acc + p.generated_slides.length, 0),
    };
  }, [projects]);

  const handleDelete = (id: string, name: string) => {
    if (typeof window !== "undefined" && window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      deleteProject(id);
    }
  };

  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Proyectos</span>
          <span className="text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
            {projects.length} en workspace
          </span>
        </div>
        <Link
          to="/projects/new"
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover transition-all"
        >
          + Nueva investigación
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Investigaciones</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Todas las investigaciones en curso y su estado dentro del flujo de análisis.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por cliente, marca o proyecto…"
                className="w-72 bg-white border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-border rounded-md px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="in_analysis">En análisis</option>
                <option value="review">En revisión</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <Stat label="En análisis" value={String(counts.in_analysis)} tone="text-blue-600" />
            <Stat label="En revisión" value={String(counts.review)} tone="text-amber-600" />
            <Stat label="Completados" value={String(counts.completed)} tone="text-emerald-600" />
            <Stat label="Slides generadas" value={String(counts.slides)} tone="text-foreground" />
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden animate-in-slide">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">No hay proyectos que coincidan.</p>
                <Link
                  to="/projects/new"
                  className="inline-block mt-4 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md"
                >
                  Crear el primero
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Proyecto</th>
                    <th className="text-left px-6 py-3 font-semibold">Cliente</th>
                    <th className="text-left px-6 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-6 py-3 font-semibold">Responsable</th>
                    <th className="text-left px-6 py-3 font-semibold">Estado</th>
                    <th className="text-left px-6 py-3 font-semibold">Actualizado</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const gi = p.general_information;
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-surface/60 group">
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              navigate({
                                to: "/projects/$id/$step",
                                params: { id: p.id, step: "context" },
                              })
                            }
                            className="text-left font-semibold text-foreground group-hover:text-primary"
                          >
                            {gi.name || "(sin nombre)"}
                          </button>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {gi.brand || "—"} · {gi.category || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{gi.client || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-medium bg-surface border border-border px-2 py-0.5 rounded">
                            {gi.researchType || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{gi.owner || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusTone(p.current_status)}`}>
                            {statusLabel(p.current_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {(() => {
                            const prog = workflowProgress(p.workflow ?? []);
                            const stage = currentStage(p.workflow ?? []);
                            if (!p.workflow?.length) return new Date(p.updated_at).toLocaleDateString();
                            return (
                              <div>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${prog.pct}%` }} />
                                </div>
                                <div className="text-[10px] mt-1 truncate">{stage?.name ?? "—"} · {prog.pct}%</div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleDelete(p.id, gi.name)}
                            className="text-[11px] text-muted-foreground hover:text-destructive"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold tracking-tight mt-2 ${tone}`}>{value}</div>
    </div>
  );
}
