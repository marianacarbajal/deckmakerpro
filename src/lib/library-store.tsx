import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account } from "./account-taxonomy";

// ─────── Types ───────

export type DataSource = "excel" | "internet" | "user" | "ai" | "other_area";

export interface PresentationSection {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  responsibleArea?: string;
  dataSource?: DataSource;
  estimatedSlides?: number;
  canBeGeneratedByAI?: boolean;
  isPlaceholder?: boolean;
  notes?: string;
}


export interface PresentationStructure {
  id: string;
  name: string;
  studyType: string;
  description: string;
  sections: PresentationSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile {
  id: string;
  account: Account;
  name: string;
  colors: string[];
  typography?: string;
  toneOfVoice?: string;
  visualStyle?: string;
  iconographyNotes?: string;
  photographyNotes?: string;
  createdAt: string;
}

export interface KnowledgeBenchmark {
  id: string;
  name: string;
  account?: Account | "";
  studyType?: string;
  fileName?: string;
  fileSize?: number;
  notes?: string;
  createdAt: string;
}

// ─────── Seeds ───────

let sid = 1;
const s = (
  name: string,
  parentId: string | undefined,
  order: number,
  extras: Partial<PresentationSection> = {},
): PresentationSection => ({
  id: `sec-${sid++}`,
  name,
  parentId,
  order,
  ...extras,
});

function seedStructures(): PresentationStructure[] {
  const now = new Date().toISOString();

  // 1. Auditoría de Canal
  const s1: PresentationSection[] = [];
  s1.push(s("Briefing", undefined, 1, { responsibleArea: "Investigación", dataSource: "user", estimatedSlides: 2, canBeGeneratedByAI: false }));
  const inv = s("Investigación", undefined, 2, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s1.push(inv);
  ["Contexto Macro", "Categoría", "Competencia"].forEach((n, i) =>
    s1.push(s(n, inv.id, i + 1, { responsibleArea: "Investigación", dataSource: "internet", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  const bench = s("Benchmark", inv.id, 4, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s1.push(bench);
  ["Portafolio", "Precios", "Promociones", "Comunicación", "KPIs"].forEach((n, i) =>
    s1.push(s(n, bench.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 1, canBeGeneratedByAI: true })),
  );
  ["Brand Visibility", "Stocking", "Sell In", "Sell Out", "Share"].forEach((n, i) =>
    s1.push(s(n, inv.id, 5 + i, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  s1.push(s("Estrategia", undefined, 3, { responsibleArea: "Estrategia", dataSource: "other_area", isPlaceholder: true, canBeGeneratedByAI: false }));
  s1.push(s("Propuesta", undefined, 4, { responsibleArea: "Propuesta", dataSource: "other_area", isPlaceholder: true, canBeGeneratedByAI: false }));

  // 2. Samsung Business Review
  sid = 100;
  const s2: PresentationSection[] = [];
  const gc = s("Gestión en cifras", undefined, 1, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s2.push(gc);
  ["Macro", "Social", "Consumer Behaviour"].forEach((n, i) =>
    s2.push(s(n, gc.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  const bs = s("Benchmark", undefined, 2, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s2.push(bs);
  ["Modelos", "Portafolio", "Promociones", "Exhibición", "Comunicación", "KPIs"].forEach((n, i) =>
    s2.push(s(n, bs.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 1, canBeGeneratedByAI: true })),
  );
  const act = s("Actores", undefined, 3, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s2.push(act);
  ["Shopper", "Seller"].forEach((n, i) =>
    s2.push(s(n, act.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  s2.push(s("Conclusiones", undefined, 4, { responsibleArea: "Investigación", dataSource: "ai", canBeGeneratedByAI: true }));
  s2.push(s("Estrategia", undefined, 5, { responsibleArea: "Estrategia", dataSource: "other_area", canBeGeneratedByAI: false }));
  s2.push(s("Propuesta", undefined, 6, { responsibleArea: "Propuesta", dataSource: "other_area", canBeGeneratedByAI: false }));

  // 3. Brand Report
  sid = 200;
  const s3: PresentationSection[] = [];
  const mk = s("Mercado", undefined, 1, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s3.push(mk);
  ["Macro", "Categoría"].forEach((n, i) =>
    s3.push(s(n, mk.id, i + 1, { responsibleArea: "Investigación", dataSource: "internet", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  const vt = s("Ventas", undefined, 2, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s3.push(vt);
  ["Sell In", "Sell Out"].forEach((n, i) =>
    s3.push(s(n, vt.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  const st = s("Stakeholders", undefined, 3, { responsibleArea: "Investigación", dataSource: "excel", canBeGeneratedByAI: true });
  s3.push(st);
  ["Shopper", "Tendero"].forEach((n, i) =>
    s3.push(s(n, st.id, i + 1, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true })),
  );
  s3.push(s("Double Funnel", undefined, 4, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true }));
  s3.push(s("Canje", undefined, 5, { responsibleArea: "Investigación", dataSource: "excel", estimatedSlides: 2, canBeGeneratedByAI: true }));
  s3.push(s("Conclusiones", undefined, 6, { responsibleArea: "Investigación", dataSource: "ai", canBeGeneratedByAI: true }));
  s3.push(s("Estrategia", undefined, 7, { responsibleArea: "Estrategia", dataSource: "other_area", canBeGeneratedByAI: false }));
  s3.push(s("Propuesta", undefined, 8, { responsibleArea: "Propuesta", dataSource: "other_area", canBeGeneratedByAI: false }));

  return [
    {
      id: "ps-auditoria-canal",
      name: "Auditoría de Canal",
      studyType: "Trade Marketing",
      description: "Auditoría de ejecución comercial en punto de venta.",
      sections: s1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ps-samsung-business-review",
      name: "Samsung Business Review",
      studyType: "Business Review / Benchmark",
      description: "Revisión trimestral de gestión de negocio para cuenta Samsung.",
      sections: s2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ps-brand-report",
      name: "Brand Report",
      studyType: "Brand / Canal Tradicional",
      description: "Reporte de marca enfocado en performance de canal tradicional.",
      sections: s3,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedProfiles(): ClientProfile[] {
  const now = new Date().toISOString();
  return [
    {
      id: "cp-rintisa",
      account: "RINTISA",
      name: "Rintisa",
      colors: ["#0F172A", "#DC2626", "#F59E0B", "#FFFFFF"],
      typography: "Inter / Roboto",
      toneOfVoice: "Directo, comercial, orientado a resultados de canal.",
      visualStyle: "Fotografía de PDV, gráficos limpios, KPIs grandes.",
      iconographyNotes: "Iconografía plana, líneas gruesas.",
      photographyNotes: "Reales de mercado peruano, luz natural.",
      createdAt: now,
    },
    {
      id: "cp-alicorp",
      account: "ALICORP",
      name: "Alicorp",
      colors: ["#003366", "#00A3E0", "#FFC72C", "#F5F5F5"],
      typography: "Roboto",
      toneOfVoice: "Corporativo, cauteloso, con foco en portafolio.",
      visualStyle: "Dashboards ejecutivos, gráficos comparativos.",
      createdAt: now,
    },
    {
      id: "cp-samsung",
      account: "SAMSUNG",
      name: "Samsung",
      colors: ["#1428A0", "#000000", "#F4F4F4", "#767676"],
      typography: "SamsungOne / Inter",
      toneOfVoice: "Premium, tecnológico, orientado a innovación.",
      visualStyle: "Fondos oscuros, mucho espacio negativo, gráficos minimalistas.",
      createdAt: now,
    },
    {
      id: "cp-laive",
      account: "LAIVE",
      name: "Laive",
      colors: ["#E30613", "#FFFFFF", "#111827"],
      typography: "Inter",
      toneOfVoice: "Cercano, familiar, foco en tradición.",
      visualStyle: "Fotografía de producto en canal, tipografía redondeada.",
      createdAt: now,
    },
  ];
}

function seedBenchmarks(): KnowledgeBenchmark[] {
  return [];
}

// ─────── Persistence ───────

const KEY_STRUCT = "insightdeck.library.structures.v1";
const KEY_PROF = "insightdeck.library.profiles.v1";
const KEY_BENCH = "insightdeck.library.benchmarks.v1";

function load<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ─────── Context ───────

interface LibraryCtx {
  structures: PresentationStructure[];
  profiles: ClientProfile[];
  benchmarks: KnowledgeBenchmark[];
  getStructure: (id?: string) => PresentationStructure | undefined;
  getProfile: (id?: string) => ClientProfile | undefined;
  addStructure: (s: Omit<PresentationStructure, "id" | "createdAt" | "updatedAt">) => PresentationStructure;
  updateStructure: (id: string, updater: (s: PresentationStructure) => PresentationStructure) => void;
  deleteStructure: (id: string) => void;
  addProfile: (p: Omit<ClientProfile, "id" | "createdAt">) => ClientProfile;
  updateProfile: (id: string, updater: (p: ClientProfile) => ClientProfile) => void;
  deleteProfile: (id: string) => void;
  addBenchmark: (b: Omit<KnowledgeBenchmark, "id" | "createdAt">) => KnowledgeBenchmark;
  deleteBenchmark: (id: string) => void;
}

const LibraryContext = createContext<LibraryCtx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [structures, setStructures] = useState<PresentationStructure[]>([]);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [benchmarks, setBenchmarks] = useState<KnowledgeBenchmark[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStructures(load(KEY_STRUCT, seedStructures));
    setProfiles(load(KEY_PROF, seedProfiles));
    setBenchmarks(load(KEY_BENCH, seedBenchmarks));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(KEY_STRUCT, structures);
  }, [structures, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEY_PROF, profiles);
  }, [profiles, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEY_BENCH, benchmarks);
  }, [benchmarks, hydrated]);

  const getStructure = useCallback((id?: string) => structures.find((s) => s.id === id), [structures]);
  const getProfile = useCallback((id?: string) => profiles.find((p) => p.id === id), [profiles]);

  const addStructure = useCallback((s: Omit<PresentationStructure, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const next: PresentationStructure = { ...s, id: `ps-${Date.now().toString(36)}`, createdAt: now, updatedAt: now };
    setStructures((prev) => [next, ...prev]);
    return next;
  }, []);
  const updateStructure = useCallback((id: string, updater: (s: PresentationStructure) => PresentationStructure) => {
    setStructures((prev) => prev.map((s) => (s.id === id ? { ...updater(s), updatedAt: new Date().toISOString() } : s)));
  }, []);
  const deleteStructure = useCallback((id: string) => {
    setStructures((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addProfile = useCallback((p: Omit<ClientProfile, "id" | "createdAt">) => {
    const next: ClientProfile = { ...p, id: `cp-${Date.now().toString(36)}`, createdAt: new Date().toISOString() };
    setProfiles((prev) => [next, ...prev]);
    return next;
  }, []);
  const updateProfile = useCallback((id: string, updater: (p: ClientProfile) => ClientProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  }, []);
  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addBenchmark = useCallback((b: Omit<KnowledgeBenchmark, "id" | "createdAt">) => {
    const next: KnowledgeBenchmark = { ...b, id: `bm-${Date.now().toString(36)}`, createdAt: new Date().toISOString() };
    setBenchmarks((prev) => [next, ...prev]);
    return next;
  }, []);
  const deleteBenchmark = useCallback((id: string) => {
    setBenchmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const value = useMemo<LibraryCtx>(
    () => ({
      structures,
      profiles,
      benchmarks,
      getStructure,
      getProfile,
      addStructure,
      updateStructure,
      deleteStructure,
      addProfile,
      updateProfile,
      deleteProfile,
      addBenchmark,
      deleteBenchmark,
    }),
    [structures, profiles, benchmarks, getStructure, getProfile, addStructure, updateStructure, deleteStructure, addProfile, updateProfile, deleteProfile, addBenchmark, deleteBenchmark],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
