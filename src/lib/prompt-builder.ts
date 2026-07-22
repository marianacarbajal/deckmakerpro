import type { Project } from "./store";
import type { PresentationStructure, ClientProfile } from "./library-store";
import type { TemplateAsset, VisualIdentity } from "./template-store";
import type { AnalysisSummary } from "./excel-engine";

export interface PromptBuilderOptions {
  structure?: PresentationStructure;
  profile?: ClientProfile;
  visualIdentity?: VisualIdentity;
  templates?: TemplateAsset[];
  /** Real computed distributions + cross-tabs from the Excel engine (see excel-engine.ts).
   *  When present, this is embedded directly in the prompt so the model reasons over
   *  actual data instead of just a filename. */
  excelSummary?: AnalysisSummary;
}

export function buildPrompt(project: Project, options: PromptBuilderOptions = {}): string {
  const gi = project.general_information;
  const ctx = project.study_context;
  const files = project.uploaded_files;
  const { structure, profile, visualIdentity, templates, excelSummary } = options;

  const sections: string[] = [];

  sections.push(`# InsightDeck Pro · Prompt de análisis
Generado automáticamente el ${new Date().toLocaleString()}`);

  sections.push(`## 1. Rol
Actúa como un equipo senior de investigación de mercados, business intelligence, storytelling ejecutivo y visualización de datos. Tu tarea es transformar los datos entregados en una presentación ejecutiva accionable para el cliente.`);

  sections.push(`## 2. Contexto comercial
- Proyecto: ${gi.name || "(sin definir)"}
- Cliente: ${gi.client || "(sin definir)"}
- Marca: ${gi.brand || "(sin definir)"}
- Cuenta: ${gi.account || "(sin definir)"}
- Canales: ${gi.channels.length ? gi.channels.join(", ") : "(sin definir)"}
- Subcategorías: ${gi.subcategories.length ? gi.subcategories.join(", ") : "(sin definir)"}
- Tipo de estudio: ${gi.researchType || "(sin definir)"}
- Responsable: ${gi.owner || "(sin definir)"}`);

  sections.push(`## 3. Objetivos
Objetivo general:
${ctx.objective || "(pendiente)"}

Objetivos específicos:
${
  ctx.specificObjectives.length
    ? ctx.specificObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "(pendientes)"
}`);

  sections.push(`## 4. Preguntas del cliente
${ctx.clientQuestions || "(pendientes)"}`);

  if (ctx.considerations?.trim()) {
    sections.push(`## 5. Consideraciones estratégicas del usuario
Estas instrucciones deben impactar el tono, la profundidad y la selección de insights:

${ctx.considerations}`);
  }

  sections.push(`## 6. Archivos registrados
${
  files.length
    ? files.map((f) => `- ${f.name} (${f.kind}, ${(f.size / 1024).toFixed(0)} KB)`).join("\n")
    : "(no se registraron archivos)"
}
${ctx.hypotheses ? `\nHipótesis previas:\n${ctx.hypotheses}` : ""}
${ctx.notes ? `\nNotas:\n${ctx.notes}` : ""}`);

  if (excelSummary) {
    const varsBlock = excelSummary.variables
      .map((v) => {
        if (v.type === "numeric" && v.numeric_stats) {
          return `- ${v.name} (numérica): min ${v.numeric_stats.min}, max ${v.numeric_stats.max}, promedio ${v.numeric_stats.avg}`;
        }
        if (v.top_values?.length) {
          const top = v.top_values.map((t) => `${t.value} (${t.pct}%, n=${t.count})`).join("; ");
          return `- ${v.name} (categórica, ${v.unique} valores únicos): ${top}`;
        }
        return `- ${v.name} (${v.type})`;
      })
      .join("\n");

    const crossBlock = excelSummary.cross_tabs
      .map((ct) => {
        const rows = ct.categories_a
          .map(
            (a) =>
              `  · ${a}: ` + ct.categories_b.map((b) => `${b}=${ct.row_pct[a][b]}%`).join(", "),
          )
          .join("\n");
        return `### ${ct.variable_a} × ${ct.variable_b}  (skew_score: ${ct.skew_score} — más alto = más discrepancia frente al promedio general, mejor candidato a insight real)\n${rows}`;
      })
      .join("\n\n");

    sections.push(`## 6b. DATOS REALES de la base (extraídos y calculados directamente del Excel — no inventes cifras distintas a estas)
Base analizada: hoja "${excelSummary.sheet_name}" — ${excelSummary.row_count} respuestas, ${excelSummary.col_count} variables.

### Variables y distribuciones
${varsBlock}

### Cruces de variables (categoría × categoría, ya calculados)
Los porcentajes son "row_pct": de cada fila (variable A), qué % cae en cada categoría de variable B.
${crossBlock || "(no se detectaron suficientes variables categóricas para cruzar automáticamente; cruza manualmente lo que sea relevante para los objetivos)"}

Usa estos cruces como base principal de tus hallazgos: prioriza los de mayor skew_score, ya que indican una diferencia real entre segmentos y no ruido estadístico.`);
  }

  if (structure) {
    const roots = structure.sections.filter((s) => !s.parentId).sort((a, b) => a.order - b.order);
    const tree = roots
      .map((r, i) => {
        const children = structure.sections
          .filter((c) => c.parentId === r.id)
          .sort((a, b) => a.order - b.order);
        const head = `${i + 1}. ${r.name}${r.isPlaceholder ? " [placeholder - otra área]" : ""}${r.responsibleArea ? ` · resp: ${r.responsibleArea}` : ""}${r.estimatedSlides ? ` · ~${r.estimatedSlides} slides` : ""}`;
        const body = children
          .map(
            (c, j) =>
              `   ${i + 1}.${j + 1} ${c.name}${c.responsibleArea ? ` · ${c.responsibleArea}` : ""}`,
          )
          .join("\n");
        return body ? `${head}\n${body}` : head;
      })
      .join("\n");
    sections.push(`## 7. Estructura de presentación seleccionada
Nombre: ${structure.name}
Tipo: ${structure.studyType}
Descripción: ${structure.description}

Índice esperado:
${tree}

Genera slides solo para las secciones que NO sean placeholder de otra área.`);
  }

  if (profile) {
    sections.push(`## 8. Perfil de cliente
- Cliente: ${profile.name} (${profile.account})
- Colores base: ${profile.colors.join(", ")}
${profile.typography ? `- Tipografía: ${profile.typography}` : ""}
${profile.toneOfVoice ? `- Tono: ${profile.toneOfVoice}` : ""}
${profile.visualStyle ? `- Estilo visual: ${profile.visualStyle}` : ""}`);
  }

  if (visualIdentity) {
    sections.push(`## 8b. Visual Identity seleccionada
- Nombre: ${visualIdentity.name} (${visualIdentity.account})
- Paleta oficial HEX (usar exactamente estos colores en gráficos, títulos y highlights):
${visualIdentity.colors.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}
${visualIdentity.notes ? `- Notas: ${visualIdentity.notes}` : ""}

Reglas: usa el color #1 para acentos principales, el #2 para secundarios, el #3 para KPIs positivos, el #4 como fondo/soporte. Respeta la paleta en TODA la presentación.`);
  }

  if (templates && templates.length > 0) {
    const pres = templates.filter((t) => t.kind === "presentation");
    const slides = templates.filter((t) => t.kind === "slide");
    sections.push(`## 8c. Referencias visuales (usar como inspiración, NO copiar literalmente)
${pres.length ? `- Decks de referencia: ${pres.map((t) => t.name).join(", ")}` : ""}
${slides.length ? `- Tipos de slide priorizados: ${slides.map((t) => `${t.slideType ?? t.name}`).join(", ")}` : ""}

Alinéate con la lógica estructural y visual de estas referencias, pero adapta el contenido a los datos de este proyecto.`);
  }

  sections.push(`## 9. Instrucciones de análisis
- Si la sección §6b (DATOS REALES) está presente, básate en esos números — no inventes ni redondees distinto a lo calculado.
- Si §6b NO está presente pero se adjuntó el Excel en esta misma conversación, léelo tú mismo antes de generar cualquier slide.
- Si no hay §6b ni Excel adjunto, dilo explícitamente en tu respuesta antes del JSON y trabaja solo con lo que el usuario haya escrito en objetivos/consideraciones — no simules cifras.
- Cruza objetivos y preguntas del cliente contra los cruces de §6b: cada slide de hallazgo debe poder señalar a un cruce o dato concreto como evidencia.
- Prioriza hallazgos accionables sobre descripciones; evita repetir una variable ya cubierta en otro slide.
- Cuantifica siempre que sea posible (magnitud, delta, comparativo entre segmentos).
- Evita conclusiones sin evidencia numérica.
- Respeta las consideraciones estratégicas del usuario (§5) para tono y foco.
- Objetivo: producir el deck completo en esta única respuesta, sin necesitar rondas adicionales. Si algo es ambiguo, toma la decisión más razonable y sigue adelante — no te detengas a preguntar.`);

  sections.push(`## 10. Storytelling ejecutivo
- Cada slide debe tener un titular ejecutivo (máx. 90 caracteres) que exprese el insight, no la métrica.
- Estructura recomendada: contexto → hallazgo → implicancia de negocio.
- No repitas insights; consolida.`);

  sections.push(`## 11. Biblioteca inteligente de slides
Selecciona el layout más adecuado por tipo de dato:
- FUNNEL_01 (funnel de conversión)
- KPI_01 (indicadores clave)
- BENCHMARK_01 (comparativo vs competencia)
- RANKING_01 (ranking horizontal)
- TIMELINE_01 (evolución temporal)
- HEATMAP_01 (densidad / matriz)
- MATRIX_01 (2x2 impacto vs esfuerzo)
- MAP_01 (distribución geográfica)
- CARDS_01 (tarjetas de segmento)
- MIX_VISUAL_01 (composición mixta)`);

  sections.push(`## 12. Contrato JSON
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura:

{
  "project": "${gi.name || "(nombre)"}",
  "project_context": {
    "account": "${gi.account || ""}",
    "channels": ${JSON.stringify(gi.channels)},
    "subcategories": ${JSON.stringify(gi.subcategories)},
    "considerations": "${(ctx.considerations || "").replace(/"/g, '\\"').slice(0, 200)}"
  },
  "slides": [
    {
      "slide_type": "funnel | kpi | benchmark | ranking | timeline | heatmap | matrix | map | cards | mix",
      "recommended_layout": "FUNNEL_01 | KPI_01 | BENCHMARK_01 | RANKING_01 | TIMELINE_01 | HEATMAP_01 | MATRIX_01 | MAP_01 | CARDS_01 | MIX_VISUAL_01",
      "section": "Nombre de la sección de la estructura",
      "title": "Titular ejecutivo (máx 90 caracteres)",
      "subtitle": "Subtítulo aclaratorio (opcional)",
      "main_insight": "Insight principal en 2-3 líneas",
      "business_implication": "Implicancia accionable de negocio",
      "metrics": [
        { "label": "Awareness", "value": "68%", "delta": "+4 vs Q3" }
      ],
      "matrix": {
        "rows": ["categoría A1", "categoría A2"],
        "cols": ["categoría B1", "categoría B2"],
        "values": [[30, 70], [55, 45]],
        "value_label": "% fila"
      },
      "supporting_insights": ["punto 1", "punto 2"],
      "recommended_visuals": ["bar", "line"],
      "notes": "Notas para el analista (opcional)"
    }
  ]
}`);

  sections.push(`## 13. Validaciones
- El JSON debe ser válido (parseable).
- Cada slide debe incluir slide_type, title y main_insight.
- El campo "matrix" es OPCIONAL y solo debe incluirse en slides tipo heatmap o matrix cuando exista un cruce real y relevante en §6b (DATOS REALES). Sus valores deben ser exactamente los del cruce (usa row_pct), nunca inventados. Si no hay un cruce adecuado para esa slide, omite "matrix" por completo — no rellenes con números al azar.
- No incluyas texto fuera del JSON. Devuelve JSON puro.
- Genera entre 6 y 12 slides.`);

  return sections.join("\n\n");
}
