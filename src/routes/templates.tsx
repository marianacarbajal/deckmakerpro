import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  useTemplates,
  SLIDE_TYPES,
  type TemplateAsset,
  type VisualIdentity,
} from "@/lib/template-store";
import { ACCOUNTS, type Account } from "@/lib/account-taxonomy";
import { useState } from "react";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Template Library · InsightDeck Pro" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (["presentations", "slides", "visual"] as const).includes(s.tab as "presentations")
      ? (s.tab as "presentations" | "slides" | "visual")
      : "presentations",
  }),
  component: Templates,
});

const TABS = [
  { id: "presentations", label: "Presentaciones por cuenta" },
  { id: "slides", label: "Slides por tipo" },
  { id: "visual", label: "Visual Identity" },
] as const;

function Templates() {
  const { tab } = Route.useSearch();
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <span className="text-sm font-medium">Template Library</span>
        <span className="text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
          Referencias visuales · un template no reemplaza al analista
        </span>
      </header>
      <div className="border-b border-border bg-white px-8">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              to="/templates"
              search={{ tab: t.id }}
              className={`px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-6xl mx-auto p-8 animate-in-slide">
          {tab === "presentations" && <PresentationsTab />}
          {tab === "slides" && <SlidesTab />}
          {tab === "visual" && <VisualIdentityTab />}
        </div>
      </div>
    </AppShell>
  );
}

function PresentationsTab() {
  const { templates, add, remove } = useTemplates();
  const [openNew, setOpenNew] = useState(false);
  const items = templates.filter((t) => t.kind === "presentation");
  const [filter, setFilter] = useState<Account | "ALL">("ALL");
  const shown = filter === "ALL" ? items : items.filter((t) => t.account === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <FilterChip label="Todas" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
          {ACCOUNTS.map((a) => (
            <FilterChip key={a} label={a} active={filter === a} onClick={() => setFilter(a)} />
          ))}
        </div>
        <button
          onClick={() => setOpenNew((v) => !v)}
          className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-md"
        >
          {openNew ? "Cancelar" : "+ Nuevo template"}
        </button>
      </div>

      {openNew && (
        <NewTemplateForm
          kind="presentation"
          onSave={(t) => {
            add(t);
            setOpenNew(false);
          }}
        />
      )}

      <div className="grid grid-cols-3 gap-4">
        {shown.map((t) => (
          <TemplateCard key={t.id} template={t} onDelete={() => remove(t.id)} />
        ))}
        {shown.length === 0 && (
          <div className="col-span-3 p-10 text-center text-sm text-muted-foreground bg-white border border-border rounded-xl">
            No hay templates en esta cuenta.
          </div>
        )}
      </div>
    </div>
  );
}

function SlidesTab() {
  const { templates, add, remove } = useTemplates();
  const [openNew, setOpenNew] = useState(false);
  const items = templates.filter((t) => t.kind === "slide");
  const [filter, setFilter] = useState<string | "ALL">("ALL");
  const shown = filter === "ALL" ? items : items.filter((t) => t.slideType === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          <FilterChip label="Todos" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
          {SLIDE_TYPES.map((t) => (
            <FilterChip key={t} label={t} active={filter === t} onClick={() => setFilter(t)} />
          ))}
        </div>
        <button
          onClick={() => setOpenNew((v) => !v)}
          className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-md"
        >
          {openNew ? "Cancelar" : "+ Nueva variante"}
        </button>
      </div>

      {openNew && (
        <NewTemplateForm
          kind="slide"
          onSave={(t) => {
            add(t);
            setOpenNew(false);
          }}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        {shown.map((t) => (
          <TemplateCard key={t.id} template={t} onDelete={() => remove(t.id)} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
        active
          ? "bg-primary text-white border-primary"
          : "bg-white text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

function TemplateCard({ template, onDelete }: { template: TemplateAsset; onDelete: () => void }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group">
      <div className="aspect-video bg-surface border border-border rounded-md mb-4 flex items-center justify-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider overflow-hidden">
        {template.fileDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.fileDataUrl}
            alt={template.name}
            className="object-cover w-full h-full"
          />
        ) : (
          (template.slideType ?? template.account ?? "Template")
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{template.name}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {template.notes ?? "Sin descripción"}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[9px] font-semibold uppercase bg-primary/5 text-primary px-1.5 py-0.5 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function NewTemplateForm({
  kind,
  onSave,
}: {
  kind: "presentation" | "slide";
  onSave: (t: Parameters<ReturnType<typeof useTemplates>["add"]>[0]) => void;
}) {
  const [name, setName] = useState("");
  const [account, setAccount] = useState<Account | "">("");
  const [slideType, setSlideType] = useState<string>(SLIDE_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();

  const onFile = (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(String(reader.result));
    reader.readAsDataURL(f);
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({
      kind,
      name: name.trim(),
      account: kind === "presentation" ? account : undefined,
      slideType: kind === "slide" ? slideType : undefined,
      notes: notes.trim() || undefined,
      tags: [kind === "presentation" ? account || "General" : slideType].filter(Boolean),
      fileName,
      fileDataUrl,
    });
    setName("");
    setNotes("");
    setFileDataUrl(undefined);
    setFileName(undefined);
  };

  return (
    <div className="bg-white border border-primary/20 rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <label className="text-xs">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
            Nombre
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none"
          />
        </label>
        {kind === "presentation" ? (
          <label className="text-xs">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
              Cuenta
            </span>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value as Account | "")}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none"
            >
              <option value="">—</option>
              {ACCOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-xs">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
              Tipo
            </span>
            <select
              value={slideType}
              onChange={(e) => setSlideType(e.target.value)}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none"
            >
              {SLIDE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
            Imagen (opcional)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="text-xs"
          />
        </label>
      </div>
      <label className="text-xs block">
        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
          Notas
        </span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none"
        />
      </label>
      <div className="flex justify-end">
        <button
          onClick={save}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md"
        >
          Guardar template
        </button>
      </div>
    </div>
  );
}

// ─── Visual Identity ──────────────────────────────────────────────────────

function VisualIdentityTab() {
  const { visualIdentities, addVisualIdentity, updateVisualIdentity, deleteVisualIdentity } =
    useTemplates();
  const [form, setForm] = useState<{ name: string; account: Account }>({
    name: "",
    account: "ALICORP",
  });

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addVisualIdentity({
      account: form.account,
      name: form.name.trim(),
      colors: ["#0F172A", "#3B82F6", "#F59E0B", "#FFFFFF"],
    });
    setForm({ name: "", account: "ALICORP" });
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visual Identity</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Paletas oficiales por cuenta en HEX compatible con PowerPoint. Se aplican
            automáticamente al generar la presentación cuando se selecciona en el proyecto.
          </p>
        </div>
      </div>

      <form
        onSubmit={create}
        className="bg-white border border-border rounded-xl p-5 flex items-end gap-3 mb-6"
      >
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Nombre de la identidad
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Rintisa Premium"
            className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Cuenta
          </label>
          <select
            value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value as Account })}
            className="mt-1 bg-white border border-border rounded-md px-3 py-2 text-sm"
          >
            {ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover">
          + Crear identidad
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {visualIdentities.map((vi) => (
          <VisualIdentityCard
            key={vi.id}
            vi={vi}
            onChange={(patch) => updateVisualIdentity(vi.id, (prev) => ({ ...prev, ...patch }))}
            onDelete={() => deleteVisualIdentity(vi.id)}
          />
        ))}
        {visualIdentities.length === 0 && (
          <div className="col-span-2 bg-white border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
            Aún no hay identidades visuales. Crea la primera desde el formulario superior.
          </div>
        )}
      </div>
    </>
  );
}

function VisualIdentityCard({
  vi,
  onChange,
  onDelete,
}: {
  vi: VisualIdentity;
  onChange: (patch: Partial<VisualIdentity>) => void;
  onDelete: () => void;
}) {
  const setColor = (i: number, hex: string) => {
    const next = [...vi.colors];
    next[i] = hex.toUpperCase();
    onChange({ colors: next });
  };
  const removeColor = (i: number) => onChange({ colors: vi.colors.filter((_, j) => j !== i) });
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <input
            value={vi.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="font-semibold text-sm bg-transparent border-b border-transparent focus:border-border outline-none"
          />
          <div className="text-[11px] text-muted-foreground mt-1">{vi.account}</div>
        </div>
        <button
          onClick={() => {
            if (window.confirm(`¿Eliminar la identidad "${vi.name}"?`)) onDelete();
          }}
          className="text-[11px] text-muted-foreground hover:text-destructive"
        >
          Eliminar
        </button>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Paleta ({vi.colors.length})
        </label>
        <div className="flex items-center flex-wrap gap-2 mt-2">
          {vi.colors.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1 border border-border rounded-md p-1 bg-surface/40"
            >
              <label className="relative">
                <span className="block size-8 rounded" style={{ background: c }} />
                <input
                  type="color"
                  value={c}
                  onChange={(e) => setColor(i, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <input
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="w-20 bg-transparent text-[11px] font-mono outline-none"
              />
              <button
                onClick={() => removeColor(i)}
                className="text-[10px] text-muted-foreground hover:text-destructive px-1"
                title="Eliminar color"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ colors: [...vi.colors, "#888888"] })}
            className="px-3 h-10 border border-dashed border-border rounded-md text-[11px] font-semibold text-primary hover:border-primary/60"
          >
            + Agregar color
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Notas
        </label>
        <textarea
          value={vi.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Reglas de uso, contexto de marca…"
          className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-xs resize-none"
        />
      </div>
    </div>
  );
}
