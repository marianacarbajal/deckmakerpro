import type { SlideData } from "./store";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  slides: SlideData[];
  projectName?: string;
}

const KNOWN_TYPES = new Set([
  "funnel",
  "kpi",
  "benchmark",
  "ranking",
  "timeline",
  "heatmap",
  "matrix",
  "map",
  "cards",
  "mix",
  "distribution",
]);

const TYPE_TO_LAYOUT: Record<string, string> = {
  funnel: "FUNNEL_01",
  kpi: "KPI_01",
  benchmark: "BENCHMARK_01",
  ranking: "RANKING_01",
  timeline: "TIMELINE_01",
  heatmap: "HEATMAP_01",
  matrix: "MATRIX_01",
  map: "MAP_01",
  cards: "CARDS_01",
  mix: "MIX_VISUAL_01",
  distribution: "KPI_01",
};

export function validateJson(raw: string): ValidationResult {
  const errors: string[] = [];
  if (!raw.trim()) {
    return { ok: false, errors: ["El JSON está vacío."], slides: [] };
  }

  // strip ```json fences if present
  let clean = raw.trim();
  const fenceMatch = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) clean = fenceMatch[1];

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON inválido: ${(e as Error).message}`],
      slides: [],
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["La raíz debe ser un objeto."], slides: [] };
  }

  const obj = parsed as Record<string, unknown>;
  const projectName = typeof obj.project === "string" ? obj.project : undefined;
  const slidesRaw = obj.slides;

  if (!Array.isArray(slidesRaw)) {
    return {
      ok: false,
      errors: ["Falta el arreglo 'slides' en la raíz."],
      slides: [],
    };
  }

  const slides: SlideData[] = [];
  slidesRaw.forEach((s, i) => {
    const label = `slide[${i}]`;
    if (typeof s !== "object" || s === null) {
      errors.push(`${label}: debe ser un objeto.`);
      return;
    }
    const row = s as Record<string, unknown>;

    const slide_type = typeof row.slide_type === "string"
      ? row.slide_type
      : typeof row.type === "string"
        ? (row.type as string)
        : "";
    const title = typeof row.title === "string" ? row.title : "";
    const main_insight =
      typeof row.main_insight === "string"
        ? row.main_insight
        : typeof row.insight === "string"
          ? (row.insight as string)
          : "";

    if (!slide_type) errors.push(`${label}: falta 'slide_type'.`);
    else if (!KNOWN_TYPES.has(slide_type.toLowerCase()))
      errors.push(`${label}: tipo '${slide_type}' no reconocido.`);

    if (!title) errors.push(`${label}: falta 'title'.`);
    if (!main_insight) errors.push(`${label}: falta 'main_insight'.`);

    const layout =
      typeof row.recommended_layout === "string"
        ? row.recommended_layout
        : TYPE_TO_LAYOUT[slide_type.toLowerCase()] ?? "KPI_01";

    const metricsRaw = Array.isArray(row.metrics) ? row.metrics : [];
    const metrics = metricsRaw
      .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
      .map((m) => ({
        label: String(m.label ?? ""),
        value: (m.value as string | number) ?? "",
        delta: m.delta ? String(m.delta) : undefined,
      }));

    slides.push({
      slide_type: slide_type.toLowerCase(),
      title,
      subtitle: typeof row.subtitle === "string" ? row.subtitle : undefined,
      main_insight,
      business_implication:
        typeof row.business_implication === "string" ? row.business_implication : undefined,
      metrics,
      supporting_insights: Array.isArray(row.supporting_insights)
        ? (row.supporting_insights as unknown[]).map(String)
        : [],
      recommended_visuals: Array.isArray(row.recommended_visuals)
        ? (row.recommended_visuals as unknown[]).map(String)
        : [],
      recommended_layout: layout,
      notes: typeof row.notes === "string" ? row.notes : undefined,
      status: "pending",
    });
  });

  if (slides.length === 0) errors.push("No se encontraron slides.");

  return { ok: errors.length === 0, errors, slides, projectName };
}

export { TYPE_TO_LAYOUT };
