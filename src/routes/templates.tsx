import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Template Library · InsightDeck Pro" }] }),
  component: Templates,
});

const TYPES = [
  "Funnel", "Ranking", "Benchmark", "Comparativo", "Heatmap", "Timeline",
  "Distribución", "Mapa", "KPI", "Cards", "Matriz", "Mix Visual",
];

function Templates() {
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center px-8 shrink-0">
        <span className="text-sm font-medium">Template Library</span>
      </header>
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-6xl mx-auto p-10 animate-in-slide">
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca inteligente de slides</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-8 max-w-2xl">
            InsightDeck selecciona automáticamente la plantilla adecuada según el tipo de slide
            propuesto por Claude. La consistencia visual siempre depende de InsightDeck.
          </p>
          <div className="grid grid-cols-4 gap-4">
            {TYPES.map((t) => (
              <div key={t} className="bg-white border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
                <div className="aspect-video bg-surface border border-border rounded-md mb-4 flex items-center justify-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {t}
                </div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">3 variantes</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
