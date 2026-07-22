Voy a implementar los 7 puntos del Documento Maestro en **3 fases**, empezando por lo fundacional (Puntos 1, 4, 7) que desbloquea todo lo demás, luego Pipeline + Template Library, y finalmente Revisión IA + Excel Engine.

---

## Fase 1 — Fundacionales (Puntos 1, 4, 7 parcial)

**Objetivo:** que la configuración del proyecto refleje la lógica real de cuentas/canales, y que Knowledge Library sustituya al módulo Benchmarks actual y alimente el Prompt Builder.

### 1.1 Modelo de datos extendido (`src/lib/store.tsx`)

- Añadir a `GeneralInformation`: `account` (ALICORP | RINTISA | LAIVE | SAMSUNG), `channels: string[]`, `subcategories: string[]`.
- Añadir a `Project`: `considerations: string`, `presentationStructureId?`, `clientProfileId?`, `selectedTemplateIds?: string[]`.
- Nuevos stores persistidos en localStorage: `presentationStructures`, `clientProfiles`, `knowledgeBenchmarks` (metadatos), y `templateAssets` (Fase 2). Provider unificado `LibraryProvider` con seeds iniciales.
- Migración suave: seeds convertidos, campo `category` marcado deprecated pero conservado para compat.

### 1.2 Reglas dinámicas Cuenta → Canal → Subcategoría

- Nuevo `src/lib/account-taxonomy.ts` con los mapeos exactos del doc (Alicorp/Rintisa/Laive: Moderno/Minorista/Mayorista; Samsung: Moderno/Tradicional; subcategorías por canal).
- Componente `MultiChipSelect` reusable (chips seleccionables) en `src/components/multi-chip-select.tsx`.

### 1.3 UI de Project Setup

- Reescribir `projects.new.tsx` y el step "context" en `projects.$id.$step.tsx` para incluir en orden: Nombre, Cliente, **Cuenta** (reemplaza Categoría), Marca, Tipo de investigación, Responsable, Fecha, **Canal** (multi), **Subcategoría** (multi, dependiente), **Presentation Structure** (select con preview), **Client Profile** (select), Observaciones, **Consideraciones**.
- Validar: canal solo visible con cuenta elegida; subcategoría solo con al menos un canal.

### 1.4 Knowledge Library (`/knowledge-library`)

- Renombrar ruta `/benchmarks` → `/knowledge-library` con 3 tabs: **Presentation Structures**, **Benchmarks**, **Client Profiles**.
- Redirect `/benchmarks` → `/knowledge-library`.
- Sidebar y navegación actualizados.
- **Presentation Structures**: CRUD básico (nombre, tipo estudio, descripción, secciones jerárquicas con `responsibleArea`, `dataSource`, `estimatedSlides`, `canBeGeneratedByAI`). Seeds: "Auditoría de Canal", "Samsung Business Review", "Brand Report" con el árbol completo del doc.
- **Benchmarks**: lista mock con upload placeholder (funcional pero sin parser en Fase 1).
- **Client Profiles**: CRUD con colores (color picker chips), tipografía, tono, notas.

### 1.5 Prompt Builder integrado (Punto 7 parcial)

- Ampliar `prompt-builder.ts` para consumir: cuenta, canales, subcategorías, consideraciones, estructura de presentación seleccionada (renderiza árbol de secciones), perfil de cliente (colores/tono).
- Nuevo `src/lib/pipeline-generator.ts` (stub para Fase 2) que expone `generatePipelineFromStructure(structure)`.

### 1.6 QA

- Todos los checks del "Checklist QA · Project Setup" y "Knowledge Library" del doc.
- Verificar que la creación de un proyecto Rintisa con canal Moderno + Cash & Carry aparece en el JSON exportable y en el prompt.

---

## Fase 2 — Pipeline y Template Library (Puntos 3, 5)

### 2.1 Project Pipeline (`/projects/$id/pipeline`)

- Nuevo step "pipeline" en el stepper del `ProjectHeader`.
- Al crear proyecto (o cambiar la Presentation Structure), auto-generar `workflow: WorkflowStage[]` desde las secciones. Cada etapa: responsable, área, estado (No iniciado/En progreso/En revisión/Completado/Bloqueado), fechas, comentarios.
- Vista tipo tabla + kanban simple; cambio de estado inline.
- Cálculo de avance `completed / total`, badge en Dashboard.
- Widget en Dashboard: selector de proyecto + KPIs (avance, etapa actual, responsable pendiente, última actualización). Detección simple de bloqueos (>N días sin cambios).

### 2.2 Template Library (`/templates`)

- Rediseño: dos tabs — **Presentaciones por cuenta** y **Slides por tipo** (Funnel, Ranking, Benchmark, Comparativo, Heatmap, Timeline, Distribución, Mapa, KPI Cards, Matriz, Mix Visual, Dashboard, Photo Board, Executive Summary).
- CRUD de `TemplateAsset` con Lovable Assets para archivos subidos, tags, cuenta.
- En Project Setup (paso previo a "Prompt"), nuevo sub-step: "Referencias visuales" — checkboxes de cuenta de referencia y tipos de slide priorizados. Persistido en `selectedTemplateIds` + `selectedSlideTypes`.
- Prompt Builder incluye esas referencias con la nota "usar como inspiración, no copiar literalmente".

---

## Fase 3 — Revisión IA y Excel Engine (Puntos 2, 6)

### 3.1 Revisión Inteligente con IA por slide (Punto 2)

- **Activar Lovable Cloud + AI Gateway** (te avisaré antes de tirar el switch, requiere tu confirmación implícita al pasar a esta fase).
- Nuevo `src/lib/ai/rewrite-slide.functions.ts` con `createServerFn` que llama `openai/gpt-5.5` vía AI SDK Gateway (usando el patrón `createLovableAiGatewayProvider`).
- Contrato: recibe `{ slide, considerations, projectContext }`, devuelve `{ updated_insight, updated_visual_direction }` con `Output.object` y guardas `NoObjectGeneratedError`.
- En la vista de revisión: bloque "Consideraciones con IA" bajo insights de apoyo, botones "Aplicar cambio con IA" y "Guardar sin aplicar".
- Actualización quirúrgica: solo el slide afectado, con `revision_history[]` acumulado. Toast de éxito/error con manejo de 429/402.

### 3.2 Motor de Excel Inteligente (Mock funcional trazable, Punto 6)

- Nuevo step "Análisis" entre "Files" y "Prompt".
- Al subir Excel: UI simula el pipeline (Detección hojas → Base limpia → Diccionario → Homologaciones → Tablas resumen → KPIs → Dashboard interno → Insights) con estados de progreso reales por etapa.
- Genera un "Excel Analítico" derivado con `pptxgenjs`-style export usando `xlsx` (SheetJS) — hojas: `01_Base_Original` (echo), `02_Base_Limpia`, `03_Diccionario_Variables`, `04_Homologaciones`, `05_Tablas_Resumen`, `06_KPIs`, `07_Dashboard_Interno`, `08_Insights_Base`. Datos mockeados/derivados pero descargables como .xlsx real.
- **Export Center** (`/projects/$id/export`): tres botones — Descargar PowerPoint, Descargar Excel Analítico, Descargar JSON del proyecto.
- Trazabilidad: cada slide del JSON referencia `data_source: "06_KPIs"` etc. El PPT muestra la fuente en el footer.

### 3.3 QA final

- Recorrer los 7 checklists del doc (§16) sección por sección.
- Smoke test end-to-end: crear Rintisa Canal Moderno → estructura Auditoría de Canal → subir Excel mock → generar prompt → validar JSON → revisar slide con IA → exportar los 3 outputs.

---

## Detalles técnicos transversales

- **Stack:** todo se mantiene en TanStack Start + local state (localStorage), sin Supabase persistente hasta Fase 3 (solo AI Gateway como server function).
- **Routing nuevo:** `/knowledge-library`, `/projects/$id/pipeline` (opcional como step o ruta), `/projects/$id/export` ya existe.
- **Sidebar:** actualizar orden — Dashboard, Proyectos, Knowledge Library, Templates.
- **Sin rediseño visual:** se reusa `AppShell`, `ProjectHeader`, tokens actuales.
- **Compatibilidad:** proyectos existentes en localStorage se migran leyendo `category` → `account` (best-effort).

Empezaré ejecutando **Fase 1** completa en este mismo turno de trabajo (varios archivos en paralelo). Cuando la Fase 1 esté lista te aviso y me confirmas para arrancar Fase 2, y lo mismo antes de la Fase 3 (allí necesito habilitar Lovable Cloud).
