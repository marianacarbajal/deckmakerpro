import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MOCK_PROJECTS } from "./mock-data";
import type { Account } from "./account-taxonomy";
import type { WorkflowStage } from "./pipeline";


export interface UploadedFile {
  name: string;
  size: number;
  kind: string;
}

export interface StudyContext {
  objective: string;
  specificObjectives: string[];
  clientQuestions: string;
  hypotheses: string;
  notes: string;
  considerations: string;
}

export interface GeneralInformation {
  name: string;
  client: string;
  brand: string;
  category: string; // legacy — kept for backwards compat
  account: Account | "";
  channels: string[];
  subcategories: string[];
  researchType: string;
  owner: string;
  dueDate: string;
  presentationStructureId?: string;
  clientProfileId?: string;
  visualIdentityId?: string;
  selectedTemplateIds?: string[];
}

export interface SlideRevision {
  at: string;
  by: "user" | "ai";
  summary: string;
  before?: Partial<SlideData>;
  after?: Partial<SlideData>;
}

export interface SlideData {
  slide_type: string;
  title: string;
  subtitle?: string;
  main_insight?: string;
  business_implication?: string;
  metrics?: Array<{ label: string; value: string | number; delta?: string }>;
  supporting_insights?: string[];
  recommended_visuals?: string[];
  recommended_layout?: string;
  notes?: string;
  status?: "approved" | "pending" | "rejected";
  data_source?: string;
  visual_direction?: string;
  revision_history?: SlideRevision[];
}

export type ProjectStatus = "draft" | "in_analysis" | "review" | "completed";

export interface ExcelAnalysisState {
  ranAt?: string;
  completedStages: string[];
  sheetsGenerated: string[];
}

export interface Project {
  id: string;
  general_information: GeneralInformation;
  study_context: StudyContext;
  uploaded_files: UploadedFile[];
  claude_json: string;
  generated_slides: SlideData[];
  current_status: ProjectStatus;
  current_step: number;
  workflow?: WorkflowStage[];
  excel_analysis?: ExcelAnalysisState;
  created_at: string;
  updated_at: string;
}


const STORAGE_KEY = "insightdeck.projects.v2";
const LEGACY_KEY = "insightdeck.projects.v1";

// Best-effort mapping of legacy free-text categories to accounts.
function inferAccount(client: string, brand: string, category: string): Account | "" {
  const hay = `${client} ${brand} ${category}`.toLowerCase();
  if (hay.includes("samsung")) return "SAMSUNG";
  if (hay.includes("rintisa") || hay.includes("rinti")) return "RINTISA";
  if (hay.includes("laive")) return "LAIVE";
  if (hay.includes("alicorp") || hay.includes("vitapro")) return "ALICORP";
  return "";
}

function emptyProject(id?: string): Project {
  const now = new Date().toISOString();
  return {
    id: id ?? `prj-${Date.now().toString(36)}`,
    general_information: {
      name: "",
      client: "",
      brand: "",
      category: "",
      account: "",
      channels: [],
      subcategories: [],
      researchType: "",
      owner: "",
      dueDate: "",
      presentationStructureId: undefined,
      clientProfileId: undefined,
    },
    study_context: {
      objective: "",
      specificObjectives: [],
      clientQuestions: "",
      hypotheses: "",
      notes: "",
      considerations: "",
    },
    uploaded_files: [],
    claude_json: "",
    generated_slides: [],
    current_status: "draft",
    current_step: 1,
    created_at: now,
    updated_at: now,
  };
}

function seed(): Project[] {
  return MOCK_PROJECTS.map((p) => {
    const base = emptyProject(p.id);
    const account = inferAccount(p.client, p.brand, p.category);
    return {
      ...base,
      general_information: {
        ...base.general_information,
        name: p.name,
        client: p.client,
        brand: p.brand,
        category: p.category,
        account,
        channels: [],
        subcategories: [],
        researchType: p.researchType,
        owner: p.owner,
        dueDate: "",
      },
      study_context: {
        objective:
          "Entender la evolución trimestral de la marca en su categoría frente a competidores directos.",
        specificObjectives: [
          "Medir evolución de awareness y consideración vs. periodo anterior.",
          "Identificar drivers de elección por segmento demográfico.",
          "Detectar oportunidades de portafolio.",
        ],
        clientQuestions:
          "¿Perdimos share of voice tras la última campaña de la competencia?\n¿Cuál es el gap entre awareness y preferencia declarada?",
        hypotheses: "",
        notes: "",
        considerations: "",
      },
      current_status: p.status as ProjectStatus,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  });
}

function migrateLegacy(raw: unknown): Project[] | null {
  if (!Array.isArray(raw)) return null;
  try {
    return raw.map((r: Record<string, unknown>) => {
      const base = emptyProject(String(r.id ?? `prj-${Date.now().toString(36)}`));
      const gi = (r.general_information as Record<string, unknown>) ?? {};
      const ctx = (r.study_context as Record<string, unknown>) ?? {};
      const client = String(gi.client ?? "");
      const brand = String(gi.brand ?? "");
      const category = String(gi.category ?? "");
      return {
        ...base,
        general_information: {
          ...base.general_information,
          name: String(gi.name ?? ""),
          client,
          brand,
          category,
          account: (gi.account as Account) || inferAccount(client, brand, category),
          channels: Array.isArray(gi.channels) ? (gi.channels as string[]) : [],
          subcategories: Array.isArray(gi.subcategories) ? (gi.subcategories as string[]) : [],
          researchType: String(gi.researchType ?? ""),
          owner: String(gi.owner ?? ""),
          dueDate: String(gi.dueDate ?? ""),
          presentationStructureId: gi.presentationStructureId as string | undefined,
          clientProfileId: gi.clientProfileId as string | undefined,
          visualIdentityId: gi.visualIdentityId as string | undefined,
          selectedTemplateIds: Array.isArray(gi.selectedTemplateIds) ? (gi.selectedTemplateIds as string[]) : undefined,
        },
        study_context: {
          ...base.study_context,
          objective: String(ctx.objective ?? ""),
          specificObjectives: Array.isArray(ctx.specificObjectives) ? (ctx.specificObjectives as string[]) : [],
          clientQuestions: String(ctx.clientQuestions ?? ""),
          hypotheses: String(ctx.hypotheses ?? ""),
          notes: String(ctx.notes ?? ""),
          considerations: String(ctx.considerations ?? ""),
        },
        uploaded_files: Array.isArray(r.uploaded_files) ? (r.uploaded_files as UploadedFile[]) : [],
        claude_json: String(r.claude_json ?? ""),
        generated_slides: Array.isArray(r.generated_slides) ? (r.generated_slides as SlideData[]) : [],
        current_status: (r.current_status as ProjectStatus) ?? "draft",
        current_step: Number(r.current_step ?? 1),
        created_at: String(r.created_at ?? new Date().toISOString()),
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      };
    });
  } catch {
    return null;
  }
}

function load(): Project[] {
  if (typeof window === "undefined") return seed();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) return JSON.parse(rawV2) as Project[];
    const rawV1 = window.localStorage.getItem(LEGACY_KEY);
    if (rawV1) {
      const migrated = migrateLegacy(JSON.parse(rawV1));
      if (migrated) return migrated;
    }
    return seed();
  } catch {
    return seed();
  }
}

function save(projects: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

interface Ctx {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (partial?: Partial<GeneralInformation>) => Project;
  updateProject: (id: string, updater: (p: Project) => Project) => void;
  deleteProject: (id: string) => void;
}

const ProjectsContext = createContext<Ctx | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProjects(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(projects);
  }, [projects, hydrated]);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const createProject = useCallback((partial?: Partial<GeneralInformation>) => {
    const p = emptyProject();
    if (partial) p.general_information = { ...p.general_information, ...partial };
    if (!p.general_information.name) p.general_information.name = "Investigación sin título";
    setProjects((prev) => [p, ...prev]);
    return p;
  }, []);

  const updateProject = useCallback((id: string, updater: (p: Project) => Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...updater(p), updated_at: new Date().toISOString() } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({ projects, getProject, createProject, updateProject, deleteProject }),
    [projects, getProject, createProject, updateProject, deleteProject]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}

export function useProject(id: string) {
  const { getProject } = useProjects();
  return getProject(id);
}
