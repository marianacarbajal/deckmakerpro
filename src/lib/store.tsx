import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MOCK_PROJECTS } from "./mock-data";

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
}

export interface GeneralInformation {
  name: string;
  client: string;
  brand: string;
  category: string;
  researchType: string;
  owner: string;
  dueDate: string;
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
}

export type ProjectStatus = "draft" | "in_analysis" | "review" | "completed";

export interface Project {
  id: string;
  general_information: GeneralInformation;
  study_context: StudyContext;
  uploaded_files: UploadedFile[];
  claude_json: string;
  generated_slides: SlideData[];
  current_status: ProjectStatus;
  current_step: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "insightdeck.projects.v1";

function emptyProject(id?: string): Project {
  const now = new Date().toISOString();
  return {
    id: id ?? `prj-${Date.now().toString(36)}`,
    general_information: {
      name: "",
      client: "",
      brand: "",
      category: "",
      researchType: "",
      owner: "",
      dueDate: "",
    },
    study_context: {
      objective: "",
      specificObjectives: [],
      clientQuestions: "",
      hypotheses: "",
      notes: "",
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
  return MOCK_PROJECTS.map((p) => ({
    ...emptyProject(p.id),
    general_information: {
      name: p.name,
      client: p.client,
      brand: p.brand,
      category: p.category,
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
    },
    current_status: p.status as ProjectStatus,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));
}

function load(): Project[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as Project[];
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
