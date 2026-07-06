import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MOCK_PROJECTS, statusLabel, statusTone } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Proyectos</span>
          <span className="text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
            {MOCK_PROJECTS.length} activos
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
                placeholder="Buscar por cliente, marca o proyecto…"
                className="w-72 bg-white border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <select className="bg-white border border-border rounded-md px-3 py-2 text-xs font-medium text-muted-foreground">
                <option>Todos los estados</option>
                <option>Borrador</option>
                <option>En análisis</option>
                <option>En revisión</option>
                <option>Completado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <Stat label="En análisis" value="3" tone="text-blue-600" />
            <Stat label="En revisión" value="1" tone="text-amber-600" />
            <Stat label="Completados este mes" value="4" tone="text-emerald-600" />
            <Stat label="Slides generadas" value="128" tone="text-foreground" />
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden animate-in-slide">
            <table className="w-full text-sm">
              <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Proyecto</th>
                  <th className="text-left px-6 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-6 py-3 font-semibold">Tipo</th>
                  <th className="text-left px-6 py-3 font-semibold">Responsable</th>
                  <th className="text-left px-6 py-3 font-semibold">Estado</th>
                  <th className="text-left px-6 py-3 font-semibold">Última modificación</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {MOCK_PROJECTS.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface/60 group">
                    <td className="px-6 py-4">
                      <Link
                        to="/projects/$id/$step"
                        params={{ id: p.id, step: "context" }}
                        className="font-semibold text-foreground group-hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{p.brand} · {p.category}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{p.client}</td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-medium bg-surface border border-border px-2 py-0.5 rounded">
                        {p.researchType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{p.owner}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusTone(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{p.updatedAt}</td>
                    <td className="px-2 text-muted-foreground">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
