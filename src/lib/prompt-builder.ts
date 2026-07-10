import type { Project } from "./store";
import type { PresentationStructure, ClientProfile } from "./library-store";
import type { TemplateAsset, VisualIdentity } from "./template-store";

export interface PromptBuilderOptions {
  structure?: PresentationStructure;
  profile?: ClientProfile;
  visualIdentity?: VisualIdentity;
  templates?: TemplateAsset[];
}

export function buildPrompt(project: Project, options: PromptBuilderOptions = {}): string {
  const gi = project.general_information;
  const ctx = project.study_context;
  const files = project.uploaded_files;
  const { structure, profile, visualIdentity, templates } = options;

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

  sections.push(`## 6. Información disponible
${
  files.length
    ? files.map((f) => `- ${f.name} (${f.kind}, ${(f.size / 1024).toFixed(0)} KB)`).join("\n")
    : "(no se cargaron archivos; asume información entregada por el cliente en el chat)"
}
${ctx.hypotheses ? `\nHipótesis previas:\n${ctx.hypotheses}` : ""}
${ctx.notes ? `\nNotas:\n${ctx.notes}` : ""}`);

  if (structure) {
    const roots = structure.sections.filter((s) => !s.parentId).sort((a, b) => a.order - b.order);
    const tree = roots
      .map((r, i) => {
        const children = structure.sections.filter((c) => c.parentId === r.id).sort((a, b) => a.order - b.order);
        const head = `${i + 1}. ${r.name}${r.isPlaceholder ? " [placeholder - otra área]" : ""}${r.responsibleArea ? ` · resp: ${r.responsibleArea}` : ""}${r.estimatedSlides ? ` · ~${r.estimatedSlides} slides` : ""}`;
        const body = children
          .map((c, j) => `   ${i + 1}.${j + 1} ${c.name}${c.responsibleArea ? ` · ${c.responsibleArea}` : ""}`)
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
- Cruza objetivos con preguntas del cliente y datos disponibles.
- Prioriza hallazgos accionables sobre descripciones.
- Cuantifica siempre que sea posible (magnitud, delta, comparativo).
- Evita conclusiones sin evidencia numérica.
- Respeta las consideraciones estratégicas del usuario (§5) para tono y foco.`);

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
      "supporting_insights": ["punto 1", "punto 2"],
      "recommended_visuals": ["bar", "line"],
      "notes": "Notas para el analista (opcional)"
    }
  ]
}`);

  sections.push(`## 13. Validaciones
- El JSON debe ser válido (parseable).
- Cada slide debe incluir slide_type, title y main_insight.
- No incluyas texto fuera del JSON. Devuelve JSON puro.
- Genera entre 6 y 12 slides.`);

  return sections.join("\n\n");
}
