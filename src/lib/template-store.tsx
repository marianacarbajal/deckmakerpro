import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account } from "./account-taxonomy";

export type TemplateKind = "presentation" | "slide";

export const SLIDE_TYPES = [
  "Funnel", "Ranking", "Benchmark", "Comparativo", "Heatmap", "Timeline",
  "Distribución", "Mapa", "KPI Cards", "Matriz", "Mix Visual", "Dashboard",
  "Photo Board", "Executive Summary",
] as const;

export interface TemplateAsset {
  id: string;
  kind: TemplateKind;
  name: string;
  account?: Account | "";
  slideType?: string;
  tags: string[];
  notes?: string;
  fileName?: string;
  fileDataUrl?: string;
  createdAt: string;
}

function seed(): TemplateAsset[] {
  const now = new Date().toISOString();
  const rows: TemplateAsset[] = [];
  const accounts: Account[] = ["ALICORP", "RINTISA", "LAIVE", "SAMSUNG"];
  accounts.forEach((a) => {
    ["Auditoría de Canal", "Business Review", "Brand Report"].forEach((n) => {
      rows.push({
        id: `tpl-p-${a}-${n}`.toLowerCase().replace(/\s+/g, "-"),
        kind: "presentation",
        name: `${a} · ${n}`,
        account: a,
        tags: [a, n],
        notes: `Master deck de ${a} para ${n}.`,
        createdAt: now,
      });
    });
  });
  SLIDE_TYPES.forEach((t, i) => {
    rows.push({
      id: `tpl-s-${t}-${i}`.toLowerCase().replace(/\s+/g, "-"),
      kind: "slide",
      name: `${t} · Layout 01`,
      slideType: t,
      tags: [t],
      notes: `Variante base para slides tipo ${t}.`,
      createdAt: now,
    });
  });
  return rows;
}

const KEY = "insightdeck.templates.v1";

function load(): TemplateAsset[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TemplateAsset[]) : seed();
  } catch {
    return seed();
  }
}

interface Ctx {
  templates: TemplateAsset[];
  add: (t: Omit<TemplateAsset, "id" | "createdAt">) => TemplateAsset;
  remove: (id: string) => void;
  getMany: (ids: string[]) => TemplateAsset[];
}

const TemplateContext = createContext<Ctx | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<TemplateAsset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTemplates(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(templates));
    }
  }, [templates, hydrated]);

  const add = useCallback((t: Omit<TemplateAsset, "id" | "createdAt">) => {
    const next: TemplateAsset = { ...t, id: `tpl-${Date.now().toString(36)}`, createdAt: new Date().toISOString() };
    setTemplates((prev) => [next, ...prev]);
    return next;
  }, []);
  const remove = useCallback((id: string) => setTemplates((prev) => prev.filter((t) => t.id !== id)), []);
  const getMany = useCallback((ids: string[]) => templates.filter((t) => ids.includes(t.id)), [templates]);

  const value = useMemo<Ctx>(() => ({ templates, add, remove, getMany }), [templates, add, remove, getMany]);
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplates() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplates must be used within TemplateProvider");
  return ctx;
}
