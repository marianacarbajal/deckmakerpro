import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useProjects } from "@/lib/store";
import { useLibrary } from "@/lib/library-store";
import { ACCOUNTS, CHANNELS_BY_ACCOUNT, allSubcategoriesFor, type Account } from "@/lib/account-taxonomy";
import { MultiChipSelect } from "@/components/multi-chip-select";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/projects/new")({
  head: () => ({ meta: [{ title: "Nueva investigación · InsightDeck Pro" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const { structures, profiles } = useLibrary();

  const [form, setForm] = useState({
    name: "",
    client: "",
    brand: "",
    account: "" as Account | "",
    channels: [] as string[],
    subcategories: [] as string[],
    researchType: "Brand Tracking",
    owner: "Ana Martínez",
    dueDate: "",
    presentationStructureId: "",
    clientProfileId: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const availableChannels = form.account ? CHANNELS_BY_ACCOUNT[form.account] : [];
  const availableSubs = useMemo(
    () => allSubcategoriesFor(form.account, form.channels),
    [form.account, form.channels],
  );
  const filteredProfiles = form.account ? profiles.filter((p) => p.account === form.account) : profiles;

  const onAccount = (v: Account | "") => {
    // reset dependent selections
    setForm((f) => ({ ...f, account: v, channels: [], subcategories: [], clientProfileId: "" }));
  };
  const onChannels = (next: string[]) => {
    const subs = allSubcategoriesFor(form.account, next);
    setForm((f) => ({ ...f, channels: next, subcategories: f.subcategories.filter((s) => subs.includes(s)) }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const project = createProject({
      name: form.name,
      client: form.client,
      brand: form.brand,
      account: form.account,
      channels: form.channels,
      subcategories: form.subcategories,
      researchType: form.researchType,
      owner: form.owner,
      dueDate: form.dueDate,
      presentationStructureId: form.presentationStructureId || undefined,
      clientProfileId: form.clientProfileId || undefined,
    });
    navigate({ to: "/projects/$id/$step", params: { id: project.id, step: "context" } });
  };

  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Projects
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="font-medium">Nueva investigación</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-3xl mx-auto p-10 animate-in-slide">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Registrar investigación</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configura cuenta, canal y estructura desde el inicio. Estos datos alimentan el prompt de análisis
              y la generación del pipeline.
            </p>
          </div>

          <form onSubmit={submit} className="bg-white border border-border rounded-xl p-8 space-y-6">
            <Field
              label="Nombre del proyecto"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="Ej. Rintisa Auditoría Canal Moderno Q3"
              required
            />

            <div className="grid grid-cols-2 gap-6">
              <Field label="Cliente" value={form.client} onChange={(v) => set("client", v)} placeholder="Ej. Rintisa" />
              <Field label="Marca" value={form.brand} onChange={(v) => set("brand", v)} placeholder="Ej. Rinti" />
            </div>

            <div>
              <Label>Cuenta *</Label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNTS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => onAccount(a)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      form.account === a
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Reemplaza al campo Categoría. Determina qué canales y subcategorías estarán disponibles.
              </p>
            </div>

            <div>
              <Label>Canal (multi-selección)</Label>
              <MultiChipSelect
                options={availableChannels}
                value={form.channels}
                onChange={onChannels}
                disabled={!form.account}
                emptyLabel="Selecciona una cuenta primero."
              />
            </div>

            <div>
              <Label>Subcategoría (multi-selección)</Label>
              <MultiChipSelect
                options={availableSubs}
                value={form.subcategories}
                onChange={(v) => set("subcategories", v)}
                disabled={form.channels.length === 0}
                emptyLabel={form.account ? "Selecciona al menos un canal." : "Selecciona una cuenta primero."}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <SelectField
                label="Tipo de investigación"
                value={form.researchType}
                onChange={(v) => set("researchType", v)}
                options={[
                  "Brand Tracking",
                  "Trade Marketing",
                  "U&A",
                  "Segmentación",
                  "NPS",
                  "Concept Test",
                  "Pricing",
                  "Business Review",
                ]}
              />
              <SelectField
                label="Responsable"
                value={form.owner}
                onChange={(v) => set("owner", v)}
                options={["Ana Martínez", "Carlos Ruiz", "María López", "Diego Salas"]}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Field label="Fecha de inicio" type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
              <div />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Presentation Structure</Label>
                <select
                  value={form.presentationStructureId}
                  onChange={(e) => set("presentationStructureId", e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">(sin estructura)</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.studyType}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Define la arquitectura narrativa. Se administra en Knowledge Library.
                </p>
              </div>

              <div>
                <Label>Client Profile</Label>
                <select
                  value={form.clientProfileId}
                  onChange={(e) => set("clientProfileId", e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">(sin perfil)</option>
                  {filteredProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.account})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Aporta paleta, tipografía y tono al prompt.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link to="/" className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={!form.name || !form.account}
                className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
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
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-2">
      {children}
    </label>
  );
}
