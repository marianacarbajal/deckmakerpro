import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/benchmarks")({
  head: () => ({ meta: [{ title: "Benchmarks · InsightDeck Pro" }] }),
  component: Benchmarks,
});

function Benchmarks() {
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center px-8 shrink-0">
        <span className="text-sm font-medium">Benchmarks</span>
      </header>
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-4xl mx-auto p-10 animate-in-slide">
          <h1 className="text-2xl font-bold tracking-tight">Benchmarks internos</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-8 max-w-2xl">
            Referencias históricas de estudios previos para comparar métricas por categoría, marca y trimestre.
          </p>
          <div className="bg-white border border-border rounded-xl p-16 text-center text-sm text-muted-foreground">
            Próximamente · disponible en la siguiente iteración del MVP.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
