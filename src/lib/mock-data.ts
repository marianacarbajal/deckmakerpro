export type ProjectStatus = "draft" | "in_analysis" | "review" | "completed";

export interface Project {
  id: string;
  name: string;
  client: string;
  brand: string;
  category: string;
  researchType: string;
  owner: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  currentStep: number; // 1..9
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "prj-01",
    name: "Q4 Beverage Market Deep Dive",
    client: "Andina Bebidas",
    brand: "Andina Cola",
    category: "Bebidas carbonatadas",
    researchType: "Brand Tracking",
    owner: "Ana Martínez",
    status: "review",
    createdAt: "2026-05-14",
    updatedAt: "2026-07-04",
    currentStep: 8,
  },
  {
    id: "prj-02",
    name: "Segmentación Gen Z Perú",
    client: "Nestlé LATAM",
    brand: "KitKat",
    category: "Snacks",
    researchType: "U&A",
    owner: "Ana Martínez",
    status: "in_analysis",
    createdAt: "2026-06-02",
    updatedAt: "2026-07-01",
    currentStep: 5,
  },
  {
    id: "prj-03",
    name: "NPS Retail Banking Q2",
    client: "BBVA",
    brand: "BBVA Digital",
    category: "Servicios financieros",
    researchType: "Satisfacción",
    owner: "Carlos Ruiz",
    status: "completed",
    createdAt: "2026-04-10",
    updatedAt: "2026-06-15",
    currentStep: 9,
  },
  {
    id: "prj-04",
    name: "Lanzamiento Skincare Coreano",
    client: "L'Oréal",
    brand: "Innisfree",
    category: "Belleza",
    researchType: "Concept Test",
    owner: "María López",
    status: "draft",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-05",
    currentStep: 2,
  },
  {
    id: "prj-05",
    name: "Perfil consumidor plant-based",
    client: "Alicorp",
    brand: "Vitapro",
    category: "Alimentos",
    researchType: "Segmentación",
    owner: "Ana Martínez",
    status: "in_analysis",
    createdAt: "2026-06-20",
    updatedAt: "2026-07-03",
    currentStep: 4,
  },
];

export const WORKFLOW_STEPS = [
  { id: 2, slug: "context", label: "Contexto" },
  { id: 3, slug: "context", label: "Contexto" },
  { id: 4, slug: "upload", label: "Carga" },
  { id: 5, slug: "validation", label: "Validación" },
  { id: 6, slug: "prompt", label: "Prompt" },
  { id: 7, slug: "import", label: "Importar JSON" },
  { id: 8, slug: "review", label: "Revisión editorial" },
  { id: 9, slug: "export", label: "Exportar" },
] as const;

export const STEPS = [
  { slug: "context", label: "Contexto" },
  { slug: "upload", label: "Carga" },
  { slug: "validation", label: "Validación" },
  { slug: "prompt", label: "Prompt" },
  { slug: "import", label: "Importar JSON" },
  { slug: "review", label: "Revisión" },
  { slug: "export", label: "Exportar" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function statusLabel(s: ProjectStatus) {
  return {
    draft: "Borrador",
    in_analysis: "En análisis",
    review: "En revisión",
    completed: "Completado",
  }[s];
}

export function statusTone(s: ProjectStatus) {
  return {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    in_analysis: "bg-blue-50 text-blue-700 border-blue-100",
    review: "bg-amber-50 text-amber-700 border-amber-100",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[s];
}

export interface Slide {
  id: string;
  index: number;
  type: string;
  title: string;
  insight: string;
  indicators: string[];
  status: "approved" | "pending" | "rejected" | "draft";
  template: string;
  dataSource: string;
  comments: { author: string; ago: string; text: string }[];
}

export const MOCK_SLIDES: Slide[] = [
  {
    id: "s1",
    index: 1,
    type: "Funnel",
    title: "Gen Z consumption shows a 42% drop-off at the consideration stage.",
    insight:
      "Price sensitivity remains the primary barrier to entry for the premium segment, with Gen Z audiences prioritizing value-over-status in the current economic cycle.",
    indicators: ["Awareness", "Consideración", "Compra"],
    status: "approved",
    template: "Funnel Cascade",
    dataSource: "table_3_pen.csv",
    comments: [
      { author: "Sarah Chen", ago: "hace 2h", text: "¿Podemos separar el segmento Gen Z en un slide propio?" },
    ],
  },
  {
    id: "s2",
    index: 2,
    type: "Benchmark",
    title: "Andina lidera awareness pero pierde en preferencia declarada.",
    insight:
      "Con 68% de recordación espontánea Andina Cola supera al promedio de la categoría, pero cae al 4° lugar en preferencia declarada frente a competidores premium.",
    indicators: ["Top of Mind", "Preferencia", "Share"],
    status: "pending",
    template: "Benchmark Grid",
    dataSource: "brand_metrics.xlsx",
    comments: [],
  },
  {
    id: "s3",
    index: 3,
    type: "Heatmap",
    title: "Densidad de consumo regional muestra concentración en Lima Norte.",
    insight:
      "El 34% del consumo semanal se concentra en 3 zonas urbanas; oportunidades de expansión en el sur del país aún subatendidas.",
    indicators: ["Frecuencia", "Volumen"],
    status: "draft",
    template: "Heatmap Denso",
    dataSource: "geo_consumption.csv",
    comments: [],
  },
  {
    id: "s4",
    index: 4,
    type: "Ranking",
    title: "Sabor y precio dominan los drivers de elección.",
    insight:
      "En un análisis de 12 atributos, sabor (0.42) y precio (0.31) explican el 73% de la varianza de la decisión de compra.",
    indicators: ["Drivers", "Correlación"],
    status: "pending",
    template: "Ranking Horizontal",
    dataSource: "drivers_conjoint.csv",
    comments: [],
  },
  {
    id: "s5",
    index: 5,
    type: "Matriz",
    title: "Cuadrante de oportunidades: quick wins en formato familiar.",
    insight:
      "Formato familiar 2L tiene alta demanda declarada y bajo esfuerzo operativo; recomendado como priorización Q4.",
    indicators: ["Impacto", "Esfuerzo"],
    status: "approved",
    template: "Matriz 2x2",
    dataSource: "opportunity_map.csv",
    comments: [],
  },
  {
    id: "s6",
    index: 6,
    type: "Timeline",
    title: "Evolución de share of voice enero–junio 2026.",
    insight:
      "El share of voice cayó 8 puntos tras la campaña de la competencia en abril; recuperación parcial en junio.",
    indicators: ["SOV", "Inversión"],
    status: "pending",
    template: "Timeline Lineal",
    dataSource: "sov_monthly.csv",
    comments: [],
  },
];
