import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface OrgItem {
  id: string;
  name: string;
}

interface OrgState {
  areas: OrgItem[];
  owners: OrgItem[];
}

const STORAGE_KEY = "insightdeck.org.v1";

const SEED: OrgState = {
  areas: [
    "Investigación",
    "Estrategia",
    "Propuesta",
    "Branding",
    "Marketing",
    "Ventas",
    "Comercial",
    "QA",
    "Dirección",
  ].map((name, i) => ({ id: `area-${i}-${name.toLowerCase()}`, name })),
  owners: ["Ana Martínez", "Carlos Ruiz", "María López", "Diego Salas"].map((name, i) => ({
    id: `own-${i}-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
  })),
};

function load(): OrgState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<OrgState>;
    return {
      areas: Array.isArray(parsed.areas) && parsed.areas.length ? parsed.areas : SEED.areas,
      owners: Array.isArray(parsed.owners) && parsed.owners.length ? parsed.owners : SEED.owners,
    };
  } catch {
    return SEED;
  }
}

function save(state: OrgState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type Kind = "areas" | "owners";

interface Ctx {
  areas: OrgItem[];
  owners: OrgItem[];
  areaNames: string[];
  ownerNames: string[];
  add: (kind: Kind, name: string) => void;
  rename: (kind: Kind, id: string, name: string) => void;
  remove: (kind: Kind, id: string) => void;
}

const OrgContext = createContext<Ctx | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrgState>(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const add = useCallback((kind: Kind, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((s) => {
      if (s[kind].some((x) => x.name.toLowerCase() === clean.toLowerCase())) return s;
      const item: OrgItem = {
        id: `${kind === "areas" ? "area" : "own"}-${Date.now().toString(36)}`,
        name: clean,
      };
      return { ...s, [kind]: [...s[kind], item] };
    });
  }, []);

  const rename = useCallback((kind: Kind, id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((s) => ({
      ...s,
      [kind]: s[kind].map((x) => (x.id === id ? { ...x, name: clean } : x)),
    }));
  }, []);

  const remove = useCallback((kind: Kind, id: string) => {
    setState((s) => ({ ...s, [kind]: s[kind].filter((x) => x.id !== id) }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      areas: state.areas,
      owners: state.owners,
      areaNames: state.areas.map((a) => a.name),
      ownerNames: state.owners.map((o) => o.name),
      add,
      rename,
      remove,
    }),
    [state, add, rename, remove],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
