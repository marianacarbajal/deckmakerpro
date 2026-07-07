import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useProjects } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/projects/new")({
  head: () => ({ meta: [{ title: "Nueva investigación · InsightDeck Pro" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const [form, setForm] = useState({
    name: "",
    client: "",
    brand: "",
    category: "Bebidas",
    researchType: "Brand Tracking",
    owner: "Ana Martínez",
    dueDate: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const project = createProject(form);
    navigate({ to: "/projects/$id/$step", params: { id: project.id, step: "context" } });
  };

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

          <form onSubmit={submit} className="bg-white border border-border rounded-xl p-8 space-y-6">
            <Field label="Nombre del proyecto" value={form.name} onChange={(v) => set("name", v)} placeholder="Ej. Q4 Beverage Market Deep Dive" required />
            <div className="grid grid-cols-2 gap-6">
              <Field label="Cliente" value={form.client} onChange={(v) => set("client", v)} placeholder="Ej. Andina Bebidas" />
              <Field label="Marca" value={form.brand} onChange={(v) => set("brand", v)} placeholder="Ej. Andina Cola" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <SelectField label="Categoría" value={form.category} onChange={(v) => set("category", v)} options={["Bebidas", "Snacks", "Belleza", "Financiero", "Retail", "Alimentos", "Otro"]} />
              <SelectField label="Tipo de investigación" value={form.researchType} onChange={(v) => set("researchType", v)} options={["Brand Tracking", "U&A", "Segmentación", "NPS", "Concept Test", "Pricing"]} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <SelectField label="Responsable" value={form.owner} onChange={(v) => set("owner", v)} options={["Ana Martínez", "Carlos Ruiz", "María López", "Diego Salas"]} />
              <Field label="Fecha de entrega" type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link to="/" className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                Cancelar
              </Link>
              <button type="submit" className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover">
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
  label, placeholder, type = "text", value, onChange, required,
}: {
  label: string; placeholder?: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
    </div>
  );
}

function SelectField({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
