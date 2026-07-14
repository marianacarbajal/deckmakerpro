import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useOrg, type OrgItem } from "@/lib/org-store";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configuración · InsightDeck Pro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <header className="h-14 border-b border-border bg-white flex items-center px-8 shrink-0">
        <div className="text-sm font-medium">Configuración</div>
      </header>
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-5xl mx-auto p-10 animate-in-slide">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Organización</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Administra los responsables y áreas de tu organización. Estos valores alimentan todos los
              selectores del sistema (Pipeline, creación de proyectos, etc.).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <ManageList kind="owners" title="Responsables" hint="Personas que ejecutan las etapas del proyecto." />
            <ManageList kind="areas" title="Áreas" hint="Equipos o áreas responsables (Investigación, Marketing…)." />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ManageList({ kind, title, hint }: { kind: "owners" | "areas"; title: string; hint: string }) {
  const org = useOrg();
  const items: OrgItem[] = kind === "owners" ? org.owners : org.areas;
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const submit = () => {
    if (!draft.trim()) return;
    org.add(kind, draft);
    setDraft("");
  };

  const saveEdit = () => {
    if (!editing) return;
    org.rename(kind, editing.id, editing.name);
    setEditing(null);
  };

  const remove = (item: OrgItem) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?\n\nLos registros existentes conservarán el valor, pero ya no aparecerá en las listas.`)) return;
    org.remove(kind, item.id);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={kind === "owners" ? "Ej. Laura Pérez" : "Ej. Data Science"}
          className="flex-1 bg-white border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-40"
        >
          + Agregar
        </button>
      </div>

      <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground">Sin registros aún.</li>
        )}
        {items.map((item) => {
          const isEditing = editing?.id === item.id;
          return (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white">
              {isEditing ? (
                <>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ id: item.id, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    autoFocus
                    className="flex-1 bg-white border border-primary/40 rounded-md px-2 py-1 text-sm outline-none"
                  />
                  <button
                    onClick={saveEdit}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{item.name}</span>
                  <button
                    onClick={() => setEditing({ id: item.id, name: item.name })}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    aria-label={`Editar ${item.name}`}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar ${item.name}`}
                  >
                    🗑
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
