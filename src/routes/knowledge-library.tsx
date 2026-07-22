import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  useLibrary,
  type PresentationSection,
  type PresentationStructure,
  type ClientProfile,
} from "@/lib/library-store";
import { ACCOUNTS, type Account } from "@/lib/account-taxonomy";
import { useState } from "react";

export const Route = createFileRoute("/knowledge-library")({
  head: () => ({ meta: [{ title: "Knowledge Library · InsightDeck Pro" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (["structures", "benchmarks", "profiles"] as const).includes(s.tab as "structures")
      ? (s.tab as "structures" | "benchmarks" | "profiles")
      : "structures",
  }),
  component: KnowledgeLibrary,
});

const TABS = [
  { id: "structures", label: "Presentation Structures" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "profiles", label: "Client Profiles" },
] as const;

function KnowledgeLibrary() {
  const { tab } = Route.useSearch();

  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Knowledge Library</span>
          <span className="text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
            Reusable structures · benchmarks · client profiles
          </span>
        </div>
      </header>

      <div className="border-b border-border bg-white px-8">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              to="/knowledge-library"
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
          {tab === "structures" && <StructuresTab />}
          {tab === "benchmarks" && <BenchmarksTab />}
          {tab === "profiles" && <ProfilesTab />}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Structures ───

function StructuresTab() {
  const { structures, addStructure, deleteStructure } = useLibrary();
  const [openId, setOpenId] = useState<string | null>(null);

  const createBlank = () => {
    const s = addStructure({
      name: "Nueva estructura",
      studyType: "",
      description: "",
      sections: [
        {
          id: `sec-${Date.now()}`,
          name: "Sección 1",
          order: 1,
          responsibleArea: "Investigación",
          dataSource: "excel",
          estimatedSlides: 2,
          canBeGeneratedByAI: true,
        },
      ],
    });
    setOpenId(s.id);
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presentation Structures</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Plantillas de arquitectura narrativa reutilizables. Se seleccionan al crear un proyecto
            y alimentan el Prompt Builder y el pipeline por áreas.
          </p>
        </div>
        <button
          onClick={createBlank}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          + Nueva estructura
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {structures.map((s) => (
          <div key={s.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.studyType || "—"}</div>
                </div>
                <button
                  onClick={() => deleteStructure(s.id)}
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                >
                  Eliminar
                </button>
              </div>
              {s.description && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {s.description}
                </p>
              )}
            </div>
            <div className="p-5 bg-surface/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Secciones ({s.sections.filter((x) => !x.parentId).length})
              </div>
              <StructurePreview structure={s} />
              <button
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
                className="mt-3 text-[11px] font-semibold text-primary hover:underline"
              >
                {openId === s.id ? "Cerrar editor" : "Editar detalle →"}
              </button>
            </div>
            {openId === s.id && <StructureEditor structureId={s.id} />}
          </div>
        ))}
      </div>
    </>
  );
}

function StructurePreview({ structure }: { structure: PresentationStructure }) {
  const roots = structure.sections.filter((s) => !s.parentId).sort((a, b) => a.order - b.order);
  return (
    <ol className="space-y-1 text-xs">
      {roots.map((r, i) => {
        const children = structure.sections
          .filter((s) => s.parentId === r.id)
          .sort((a, b) => a.order - b.order);
        return (
          <li key={r.id}>
            <div className="font-medium text-foreground">
              {i + 1}. {r.name}
              {r.isPlaceholder && (
                <span className="ml-2 text-[9px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                  placeholder
                </span>
              )}
            </div>
            {children.length > 0 && (
              <ol className="pl-4 mt-1 space-y-0.5 text-muted-foreground">
                {children.map((c, j) => (
                  <li key={c.id}>
                    {i + 1}.{j + 1} {c.name}
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StructureEditor({ structureId }: { structureId: string }) {
  const { getStructure, updateStructure } = useLibrary();
  const s = getStructure(structureId);
  if (!s) return null;

  const updateField = <K extends keyof PresentationStructure>(k: K, v: PresentationStructure[K]) =>
    updateStructure(structureId, (prev) => ({ ...prev, [k]: v }));

  const updateSection = (secId: string, patch: Partial<PresentationSection>) =>
    updateStructure(structureId, (prev) => ({
      ...prev,
      sections: prev.sections.map((x) => (x.id === secId ? { ...x, ...patch } : x)),
    }));

  const addSection = (parentId?: string) => {
    const sameLevel = s.sections.filter((x) => x.parentId === parentId);
    updateStructure(structureId, (prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `sec-${Date.now()}`,
          name: parentId ? "Subsección nueva" : "Sección nueva",
          parentId,
          order: sameLevel.length + 1,
          responsibleArea: "Investigación",
          dataSource: "excel",
          estimatedSlides: 2,
          canBeGeneratedByAI: true,
        },
      ],
    }));
  };

  const removeSection = (secId: string) =>
    updateStructure(structureId, (prev) => ({
      ...prev,
      sections: prev.sections.filter((x) => x.id !== secId && x.parentId !== secId),
    }));

  return (
    <div className="p-5 border-t border-border space-y-4 bg-white">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Nombre
          </label>
          <input
            value={s.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Tipo de estudio
          </label>
          <input
            value={s.studyType}
            onChange={(e) => updateField("studyType", e.target.value)}
            className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Descripción
        </label>
        <textarea
          value={s.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={2}
          className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Secciones
        </div>
        <div className="divide-y divide-border">
          {s.sections
            .filter((x) => !x.parentId)
            .sort((a, b) => a.order - b.order)
            .map((root) => (
              <div key={root.id} className="p-3 space-y-2">
                <SectionRow
                  section={root}
                  onChange={(patch) => updateSection(root.id, patch)}
                  onRemove={() => removeSection(root.id)}
                />
                <div className="pl-6 space-y-2">
                  {s.sections
                    .filter((x) => x.parentId === root.id)
                    .sort((a, b) => a.order - b.order)
                    .map((child) => (
                      <SectionRow
                        key={child.id}
                        section={child}
                        onChange={(patch) => updateSection(child.id, patch)}
                        onRemove={() => removeSection(child.id)}
                      />
                    ))}
                  <button
                    onClick={() => addSection(root.id)}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    + Agregar subsección
                  </button>
                </div>
              </div>
            ))}
          <div className="p-3">
            <button
              onClick={() => addSection(undefined)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              + Agregar sección raíz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionRow({
  section,
  onChange,
  onRemove,
}: {
  section: PresentationSection;
  onChange: (patch: Partial<PresentationSection>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <input
        value={section.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="flex-1 min-w-[160px] bg-white border border-border rounded px-2 py-1.5 text-xs font-medium"
      />
      <select
        value={section.responsibleArea ?? ""}
        onChange={(e) => onChange({ responsibleArea: e.target.value })}
        className="bg-white border border-border rounded px-2 py-1.5 text-[11px] text-muted-foreground"
      >
        {[
          "Investigación",
          "Estrategia",
          "Propuesta",
          "Branding",
          "Marketing",
          "Ventas",
          "Comercial",
          "QA",
          "Dirección",
        ].map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={section.dataSource ?? "excel"}
        onChange={(e) =>
          onChange({ dataSource: e.target.value as PresentationSection["dataSource"] })
        }
        className="bg-white border border-border rounded px-2 py-1.5 text-[11px] text-muted-foreground"
      >
        {(["excel", "internet", "user", "ai", "other_area"] as const).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        value={section.estimatedSlides ?? 0}
        onChange={(e) => onChange({ estimatedSlides: Number(e.target.value) })}
        className="w-14 bg-white border border-border rounded px-2 py-1.5 text-[11px]"
        title="Slides estimadas"
      />
      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={!!section.canBeGeneratedByAI}
          onChange={(e) => onChange({ canBeGeneratedByAI: e.target.checked })}
        />
        IA
      </label>
      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={!!section.isPlaceholder}
          onChange={(e) => onChange({ isPlaceholder: e.target.checked })}
        />
        Placeholder
      </label>
      <button
        onClick={onRemove}
        className="text-[11px] text-muted-foreground hover:text-destructive"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Benchmarks ───

function BenchmarksTab() {
  const { benchmarks, addBenchmark, deleteBenchmark } = useLibrary();
  const [form, setForm] = useState<{
    name: string;
    account: Account | "";
    studyType: string;
    notes: string;
  }>({
    name: "",
    account: "",
    studyType: "",
    notes: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    addBenchmark({
      name: form.name,
      account: form.account,
      studyType: form.studyType,
      notes: form.notes,
    });
    setForm({ name: "", account: "", studyType: "", notes: "" });
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benchmarks</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Investigaciones y valores históricos por cuenta, disponibles como referencia
            comparativa.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="bg-white border border-border rounded-xl p-5 grid grid-cols-4 gap-3 mb-6"
      >
        <input
          placeholder="Nombre del benchmark"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="col-span-2 bg-white border border-border rounded-md px-3 py-2 text-sm"
        />
        <select
          value={form.account}
          onChange={(e) => setForm({ ...form, account: e.target.value as Account | "" })}
          className="bg-white border border-border rounded-md px-3 py-2 text-sm"
        >
          <option value="">Sin cuenta</option>
          {ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          placeholder="Tipo de estudio"
          value={form.studyType}
          onChange={(e) => setForm({ ...form, studyType: e.target.value })}
          className="bg-white border border-border rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="col-span-3 bg-white border border-border rounded-md px-3 py-2 text-sm"
        />
        <button className="bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover">
          + Registrar
        </button>
      </form>

      {benchmarks.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-sm text-muted-foreground">
          Aún no hay benchmarks. Registra el primero desde el formulario superior.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Nombre</th>
                <th className="text-left px-4 py-2 font-semibold">Cuenta</th>
                <th className="text-left px-4 py-2 font-semibold">Tipo</th>
                <th className="text-left px-4 py-2 font-semibold">Notas</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.account || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.studyType || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {b.notes || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteBenchmark(b.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Client Profiles ───

function ProfilesTab() {
  const { profiles, addProfile, updateProfile, deleteProfile } = useLibrary();
  const [form, setForm] = useState<{ name: string; account: Account }>({
    name: "",
    account: "ALICORP",
  });

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    addProfile({
      name: form.name,
      account: form.account,
      colors: ["#0F172A", "#3B82F6", "#FFFFFF"],
    });
    setForm({ name: "", account: "ALICORP" });
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Identidad visual y tono por cuenta. Alimenta el Prompt Builder y la generación de
            slides.
          </p>
        </div>
      </div>

      <form
        onSubmit={create}
        className="bg-white border border-border rounded-xl p-5 flex items-end gap-3 mb-6"
      >
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Nombre del perfil
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Rintisa Trade"
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
          + Crear perfil
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {profiles.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            onChange={(patch) => updateProfile(p.id, (prev) => ({ ...prev, ...patch }))}
            onDelete={() => deleteProfile(p.id)}
          />
        ))}
      </div>
    </>
  );
}

function ProfileCard({
  profile,
  onChange,
  onDelete,
}: {
  profile: ClientProfile;
  onChange: (patch: Partial<ClientProfile>) => void;
  onDelete: () => void;
}) {
  const updateColor = (i: number, hex: string) => {
    const next = [...profile.colors];
    next[i] = hex;
    onChange({ colors: next });
  };
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <input
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="font-semibold text-sm bg-transparent border-b border-transparent focus:border-border outline-none"
          />
          <div className="text-[11px] text-muted-foreground mt-1">{profile.account}</div>
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] text-muted-foreground hover:text-destructive"
        >
          Eliminar
        </button>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Paleta
        </label>
        <div className="flex items-center gap-2 mt-1">
          {profile.colors.map((c, i) => (
            <label key={i} className="relative">
              <span
                className="block size-8 rounded-md border border-border"
                style={{ background: c }}
              />
              <input
                type="color"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          ))}
          <button
            onClick={() => onChange({ colors: [...profile.colors, "#888888"] })}
            className="size-8 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40"
          >
            +
          </button>
          {profile.colors.length > 0 && (
            <button
              onClick={() => onChange({ colors: profile.colors.slice(0, -1) })}
              className="size-8 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-destructive/40"
            >
              −
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Tipografía
          </label>
          <input
            value={profile.typography ?? ""}
            onChange={(e) => onChange({ typography: e.target.value })}
            className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Tono
          </label>
          <input
            value={profile.toneOfVoice ?? ""}
            onChange={(e) => onChange({ toneOfVoice: e.target.value })}
            className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Estilo visual
        </label>
        <textarea
          value={profile.visualStyle ?? ""}
          onChange={(e) => onChange({ visualStyle: e.target.value })}
          rows={2}
          className="w-full mt-1 bg-white border border-border rounded-md px-3 py-2 text-xs resize-none"
        />
      </div>
    </div>
  );
}
