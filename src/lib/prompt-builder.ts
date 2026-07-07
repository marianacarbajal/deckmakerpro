import type { Project } from "./store";

export function buildPrompt(project: Project): string {
  const gi = project.general_information;
  const ctx = project.study_context;
  const files = project.uploaded_files;

  const sections: string[] = [];

  sections.push(`# InsightDeck Pro · Prompt de análisis
Generado automáticamente el ${new Date().toLocaleString()}`);

  sections.push(`## 1. Rol
Actúa como un equipo senior de investigación de mercados, business intelligence, storytelling ejecutivo y visualización de datos. Tu tarea es transformar los datos entregados en una presentación ejecutiva accionable para el cliente.`);

  sections.push(`## 2. Contexto
- Cliente: ${gi.client || "(sin definir)"}
- Marca: ${gi.brand || "(sin definir)"}
- Categoría: ${gi.category || "(sin definir)"}
- Tipo de estudio: ${gi.researchType || "(sin definir)"}
- Proyecto: ${gi.name || "(sin definir)"}
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

  sections.push(`## 5. Información disponible
${
  files.length
    ? files.map((f) => `- ${f.name} (${f.kind}, ${(f.size / 1024).toFixed(0)} KB)`).join("\n")
    : "(no se cargaron archivos; asume información entregada por el cliente en el chat)"
}
${ctx.hypotheses ? `\nHipótesis previas:\n${ctx.hypotheses}` : ""}
${ctx.notes ? `\nNotas:\n${ctx.notes}` : ""}`);

  sections.push(`## 6. Instrucciones de análisis
- Cruza objetivos con preguntas del cliente y datos disponibles.
- Prioriza hallazgos accionables sobre descripciones.
- Cuantifica siempre que sea posible (magnitud, delta, comparativo).
- Evita conclusiones sin evidencia numérica.`);

  sections.push(`## 7. Storytelling ejecutivo
- Cada slide debe tener un titular ejecutivo (máx. 90 caracteres) que exprese el insight, no la métrica.
- Estructura recomendada: contexto → hallazgo → implicancia de negocio.
- No repitas insights; consolida.`);

  sections.push(`## 8. Biblioteca inteligente de slides
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

  sections.push(`## 9. Contrato JSON
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura:

{
  "project": "${gi.name || "(nombre)"}",
  "slides": [
    {
      "slide_type": "funnel | kpi | benchmark | ranking | timeline | heatmap | matrix | map | cards | mix",
      "recommended_layout": "FUNNEL_01 | KPI_01 | BENCHMARK_01 | RANKING_01 | TIMELINE_01 | HEATMAP_01 | MATRIX_01 | MAP_01 | CARDS_01 | MIX_VISUAL_01",
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

  sections.push(`## 10. Validaciones
- El JSON debe ser válido (parseable).
- Cada slide debe incluir slide_type, title y main_insight.
- No incluyas texto fuera del JSON. No uses \`\`\`json fences si es posible; devuelve JSON puro.
- Genera entre 6 y 12 slides.`);

  return sections.join("\n\n");
}
