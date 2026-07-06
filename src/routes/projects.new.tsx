import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/projects/new")({
  head: () => ({ meta: [{ title: "Nueva investigación · InsightDeck Pro" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Projects</Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="font-medium">Nueva investigación</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-3xl mx-auto p-10 animate-in-slide">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Registrar investigación</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estos datos alimentan el prompt de análisis y el encabezado de la presentación final.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/projects/$id/$step", params: { id: "prj-04", step: "context" } });
            }}
            className="bg-white border border-border rounded-xl p-8 space-y-6"
          >
            <Field label="Nombre del proyecto" placeholder="Ej. Q4 Beverage Market Deep Dive" />
            <div className="grid grid-cols-2 gap-6">
              <Field label="Cliente" placeholder="Ej. Andina Bebidas" />
              <Field label="Marca" placeholder="Ej. Andina Cola" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <SelectField
                label="Categoría"
                options={["Bebidas", "Snacks", "Belleza", "Financiero", "Retail", "Otro"]}
              />
              <SelectField
                label="Tipo de investigación"
                options={["Brand Tracking", "U&A", "Segmentación", "NPS", "Concept Test", "Pricing"]}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <SelectField
                label="Responsable"
                options={["Ana Martínez", "Carlos Ruiz", "María López", "Diego Salas"]}
              />
              <Field label="Fecha de entrega" type="date" />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link
                to="/"
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
              >
                Crear y continuar →
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
