import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Account } from "./account-taxonomy";

export type TemplateKind = "presentation" | "slide";

export const SLIDE_TYPES = [
  "Funnel",
  "Ranking",
  "Benchmark",
  "Comparativo",
  "Heatmap",
  "Timeline",
  "Distribución",
  "Mapa",
  "KPI Cards",
  "Matriz",
  "Mix Visual",
  "Dashboard",
  "Photo Board",
  "Executive Summary",
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

// ─── Visual Identity ─────────────────────────────────────────────────────

export interface VisualIdentity {
  id: string;
  account: Account;
  name: string;
  /** HEX colors (with leading #) compatible with PowerPoint. */
  colors: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function seedVisualIdentities(): VisualIdentity[] {
  const now = new Date().toISOString();
  const base = (account: Account, name: string, colors: string[]): VisualIdentity => ({
    id: `vi-${account}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
    account,
    name,
    colors,
    createdAt: now,
    updatedAt: now,
  });
  return [
    base("ALICORP", "Alicorp Core", ["#003366", "#00A3E0", "#FFC72C", "#F5F5F5", "#0F172A"]),
    base("RINTISA", "Rintisa Trade", ["#0F172A", "#DC2626", "#F59E0B", "#FFFFFF"]),
    base("LAIVE", "Laive Master", ["#E30613", "#FFFFFF", "#111827", "#F3F4F6"]),
    base("SAMSUNG", "Samsung Premium", ["#1428A0", "#000000", "#F4F4F4", "#767676"]),
  ];
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
const KEY_VI = "insightdeck.visualidentity.v1";

function load<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

interface Ctx {
  templates: TemplateAsset[];
  add: (t: Omit<TemplateAsset, "id" | "createdAt">) => TemplateAsset;
  remove: (id: string) => void;
  getMany: (ids: string[]) => TemplateAsset[];
  // Visual Identity API
  visualIdentities: VisualIdentity[];
  getVisualIdentity: (id?: string) => VisualIdentity | undefined;
  visualIdentitiesForAccount: (account?: Account | "") => VisualIdentity[];
  addVisualIdentity: (v: Omit<VisualIdentity, "id" | "createdAt" | "updatedAt">) => VisualIdentity;
  updateVisualIdentity: (id: string, updater: (v: VisualIdentity) => VisualIdentity) => void;
  deleteVisualIdentity: (id: string) => void;
}

const TemplateContext = createContext<Ctx | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<TemplateAsset[]>([]);
  const [visualIdentities, setVisualIdentities] = useState<VisualIdentity[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTemplates(load(KEY, seed));
    setVisualIdentities(load(KEY_VI, seedVisualIdentities));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(templates));
    }
  }, [templates, hydrated]);
  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      window.localStorage.setItem(KEY_VI, JSON.stringify(visualIdentities));
    }
  }, [visualIdentities, hydrated]);

  const add = useCallback((t: Omit<TemplateAsset, "id" | "createdAt">) => {
    const next: TemplateAsset = {
      ...t,
      id: `tpl-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    setTemplates((prev) => [next, ...prev]);
    return next;
  }, []);
  const remove = useCallback(
    (id: string) => setTemplates((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const getMany = useCallback(
    (ids: string[]) => templates.filter((t) => ids.includes(t.id)),
    [templates],
  );

  const getVisualIdentity = useCallback(
    (id?: string) => visualIdentities.find((v) => v.id === id),
    [visualIdentities],
  );
  const visualIdentitiesForAccount = useCallback(
    (account?: Account | "") =>
      account ? visualIdentities.filter((v) => v.account === account) : visualIdentities,
    [visualIdentities],
  );
  const addVisualIdentity = useCallback(
    (v: Omit<VisualIdentity, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const next: VisualIdentity = {
        ...v,
        id: `vi-${Date.now().toString(36)}`,
        createdAt: now,
        updatedAt: now,
      };
      setVisualIdentities((prev) => [next, ...prev]);
      return next;
    },
    [],
  );
  const updateVisualIdentity = useCallback(
    (id: string, updater: (v: VisualIdentity) => VisualIdentity) => {
      setVisualIdentities((prev) =>
        prev.map((v) => (v.id === id ? { ...updater(v), updatedAt: new Date().toISOString() } : v)),
      );
    },
    [],
  );
  const deleteVisualIdentity = useCallback((id: string) => {
    setVisualIdentities((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      templates,
      add,
      remove,
      getMany,
      visualIdentities,
      getVisualIdentity,
      visualIdentitiesForAccount,
      addVisualIdentity,
      updateVisualIdentity,
      deleteVisualIdentity,
    }),
    [
      templates,
      add,
      remove,
      getMany,
      visualIdentities,
      getVisualIdentity,
      visualIdentitiesForAccount,
      addVisualIdentity,
      updateVisualIdentity,
      deleteVisualIdentity,
    ],
  );
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplates() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplates must be used within TemplateProvider");
  return ctx;
}
