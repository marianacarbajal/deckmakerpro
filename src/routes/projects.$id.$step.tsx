import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProjectHeader } from "@/components/project-header";
import { MOCK_PROJECTS, MOCK_SLIDES, STEPS, type StepSlug } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/projects/$id/$step")({
  loader: ({ params }) => {
    const project = MOCK_PROJECTS.find((p) => p.id === params.id);
    if (!project) throw notFound();
    if (!STEPS.some((s) => s.slug === params.step)) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Proyecto · InsightDeck Pro" }] };
    return { meta: [{ title: `${loaderData.project.name} · InsightDeck Pro` }] };
  },
  component: StepPage,
});

function StepPage() {
  const { project } = Route.useLoaderData();
  const { step } = Route.useParams();
  const slug = step as StepSlug;

  return (
    <AppShell>
      <ProjectHeader projectId={project.id} projectName={project.name} currentStep={slug} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {slug === "context" && <ContextStep />}
        {slug === "upload" && <UploadStep />}
        {slug === "validation" && <ValidationStep projectId={project.id} />}
        {slug === "prompt" && <PromptStep />}
        {slug === "import" && <ImportStep projectId={project.id} />}
        {slug === "review" && <ReviewStep />}
        {slug === "export" && <ExportStep />}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────── shared bits ───────────────────

function StepFrame({
  title,
  subtitle,
  children,
  primary,
  secondary,
  wide,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-surface animate-in-slide">
      <div className={`${wide ? "max-w-6xl" : "max-w-4xl"} mx-auto p-10`}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {secondary}
            {primary}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-2">
      {children}
    </label>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-border rounded-xl ${className}`}>{children}</div>
  );
}

// ─────────────────────────────────────────── 3. Contexto ───────────────────

function ContextStep() {
  return (
    <StepFrame
      title="Contexto del estudio"
      subtitle="Define el propósito, las preguntas del cliente y las hipótesis. InsightDeck usa este contexto para construir el prompt."
      primary={
        <Link
          to="/projects/$id/$step"
          params={{ id: "prj-01", step: "upload" }}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          Guardar y continuar →
        </Link>
      }
    >
      <Card className="p-8 space-y-6">
        <div>
          <Label>Objetivo general</Label>
          <textarea
            rows={3}
            defaultValue="Entender la evolución trimestral de la marca Andina Cola en el mercado peruano de bebidas carbonatadas frente a competidores directos e indirectos."
            className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>

        <div>
          <Label>Objetivos específicos</Label>
          <div className="space-y-2">
            {[
              "Medir la evolución de awareness y consideración vs. Q3.",
              "Identificar drivers de elección por segmento demográfico.",
              "Detectar oportunidades de portafolio en formato familiar.",
            ].map((o, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-surface border border-border rounded-lg px-3 py-2"
              >
                <span className="text-[10px] font-mono text-muted-foreground mt-1">{i + 1}.</span>
                <input
                  defaultValue={o}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button className="text-muted-foreground hover:text-destructive text-xs">✕</button>
              </div>
            ))}
            <button className="text-xs font-semibold text-primary hover:underline mt-1">
              + Agregar objetivo
            </button>
          </div>
        </div>

        <div>
          <Label>Preguntas del cliente</Label>
          <textarea
            rows={4}
            defaultValue={"¿Perdimos share of voice tras la campaña de la competencia en abril?\n¿Los formatos individuales siguen creciendo entre Gen Z?\n¿Cuál es el gap real entre awareness y preferencia declarada?"}
            className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none font-mono text-[13px] leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label>Hipótesis (opcional)</Label>
            <textarea
              rows={4}
              placeholder="Ej. La caída en preferencia declarada se explica por el precio percibido, no por el sabor."
              className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
          <div>
            <Label>Observaciones</Label>
            <textarea
              rows={4}
              placeholder="Notas para el equipo de análisis."
              className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
        </div>
      </Card>
    </StepFrame>
  );
}

// ─────────────────────────────────────────── 4. Carga ──────────────────────

function UploadStep() {
  const files = [
    { name: "brand_tracking_q4.xlsx", size: "4.2 MB", kind: "Excel", status: "ready", sheets: 6 },
    { name: "brief_cliente.pdf", size: "820 KB", kind: "Brief", status: "ready", sheets: null },
    { name: "diccionario_variables.xlsx", size: "116 KB", kind: "Diccionario", status: "processing", sheets: 2 },
  ];
  return (
    <StepFrame
      title="Carga de información"
      subtitle="Adjunta los archivos de la investigación. InsightDeck detecta hojas y variables automáticamente."
      primary={
        <Link
          to="/projects/$id/$step"
          params={{ id: "prj-01", step: "validation" }}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          Continuar →
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6">
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/40 transition-colors">
            <div className="mx-auto size-12 rounded-full bg-primary/5 text-primary flex items-center justify-center text-xl mb-3">
              ↑
            </div>
            <p className="font-semibold text-sm">Arrastra archivos aquí o haz click para seleccionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceptados: .xlsx, .csv, .pdf, .docx · Máx 50 MB por archivo
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-4 bg-surface border border-border rounded-lg p-3"
              >
                <div className="size-10 rounded bg-white border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {f.kind === "Excel" ? "XLSX" : f.kind === "Brief" ? "PDF" : "DIC"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {f.size} · {f.sheets ? `${f.sheets} hojas detectadas` : f.kind}
                  </div>
                </div>
                {f.status === "processing" ? (
                  <div className="w-40">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-primary rounded-full" />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Procesando… 66%</div>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600">✓ Listo</span>
                )}
                <button className="text-muted-foreground hover:text-destructive text-xs">✕</button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 h-fit">
          <h3 className="text-sm font-semibold mb-3">Buenas prácticas</h3>
          <ul className="space-y-3 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              La primera hoja del Excel debería contener metadata del estudio.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              Adjunta el diccionario de variables para mejor interpretación por Claude.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              Elimina filas de totales al final de cada hoja.
            </li>
          </ul>
        </Card>
      </div>
    </StepFrame>
  );
}

// ─────────────────────────────────────────── 5. Validación ─────────────────

function ValidationStep({ projectId }: { projectId: string }) {
  return (
    <StepFrame
      title="Resumen ejecutivo"
      subtitle="Verifica que la información cargada sea correcta antes de generar el prompt."
      wide
      primary={
        <Link
          to="/projects/$id/$step"
          params={{ id: projectId, step: "prompt" }}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          Generar prompt →
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <SectionHead title="Archivos cargados" edit="upload" projectId={projectId} />
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Archivos" value="3" />
              <MiniStat label="Hojas" value="8" />
              <MiniStat label="Variables" value="142" />
            </div>
          </Card>

          <Card className="p-6">
            <SectionHead title="Hojas detectadas" edit="upload" projectId={projectId} />
            <div className="space-y-2">
              {[
                { name: "Awareness_Espontaneo", rows: 480, cols: 18 },
                { name: "Consideracion_Preferencia", rows: 480, cols: 22 },
                { name: "Drivers_Compra", rows: 480, cols: 34 },
                { name: "Segmentacion_Demografica", rows: 480, cols: 12 },
              ].map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between bg-surface rounded-md px-3 py-2 border border-border"
                >
                  <div>
                    <div className="text-sm font-medium font-mono">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.rows} filas · {s.cols} columnas
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">OK</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <SectionHead title="Objetivos registrados" edit="context" projectId={projectId} />
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-5">
              <li>Medir evolución de awareness y consideración vs. Q3.</li>
              <li>Identificar drivers de elección por segmento demográfico.</li>
              <li>Detectar oportunidades de portafolio en formato familiar.</li>
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Estado
            </div>
            <div className="space-y-3">
              <Check ok label="Objetivos registrados" />
              <Check ok label="Preguntas registradas" />
              <Check ok label="Archivos procesados" />
              <Check ok label="Variables identificadas" />
              <Check label="Hipótesis registradas (opcional)" />
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">
              Todo listo
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La investigación está preparada para generar el prompt de análisis para Claude.
            </p>
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}

function SectionHead({ title, edit, projectId }: { title: string; edit: StepSlug; projectId: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Link
        to="/projects/$id/$step"
        params={{ id: projectId, step: edit }}
        className="text-[11px] font-medium text-primary hover:underline"
      >
        Editar
      </Link>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tracking-tight mt-1">{value}</div>
    </div>
  );
}
function Check({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span
        className={`size-4 rounded-full flex items-center justify-center text-[10px] ${
          ok ? "bg-emerald-500 text-white" : "border border-border text-muted-foreground"
        }`}
      >
        {ok ? "✓" : "·"}
      </span>
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────── 6. Prompt ─────────────────────

const PROMPT_TEXT = `# InsightDeck Pro · Prompt de análisis

Actúa como un especialista senior en investigación de mercados y business intelligence.

## Cliente
Andina Bebidas · Marca: Andina Cola · Categoría: Bebidas carbonatadas
Tipo de estudio: Brand Tracking (Q4 2026)

## Objetivos
1. Medir evolución de awareness y consideración vs. Q3.
2. Identificar drivers de elección por segmento demográfico.
3. Detectar oportunidades de portafolio en formato familiar.

## Preguntas del cliente
- ¿Perdimos share of voice tras la campaña de la competencia en abril?
- ¿Los formatos individuales siguen creciendo entre Gen Z?
- ¿Cuál es el gap real entre awareness y preferencia declarada?

## Datos disponibles
Archivo: brand_tracking_q4.xlsx (6 hojas, 480 respondentes)
Hojas: Awareness_Espontaneo, Consideracion_Preferencia, Drivers_Compra,
Segmentacion_Demografica, Frecuencia_Consumo, SOV_Mensual

## Instrucciones
Analiza cruces relevantes y devuelve la respuesta en JSON con la siguiente estructura:

{
  "slides": [
    {
      "index": 1,
      "type": "funnel" | "ranking" | "benchmark" | "heatmap" | "timeline"
             | "matrix" | "distribution" | "kpi" | "cards" | "map" | "mix",
      "title": "Titular ejecutivo (máx 90 caracteres)",
      "insight": "Insight de 2-3 líneas",
      "indicators": ["nombre_variable_1", "nombre_variable_2"],
      "data": { ... según el tipo ... }
    }
  ]
}

No diseñes diapositivas. InsightDeck se encarga de la visualización.`;

function PromptStep() {
  return (
    <StepFrame
      title="Prompt generado para Claude"
      subtitle="Copia este prompt en Claude Web, ejecútalo y trae la respuesta JSON al siguiente paso."
      wide
      primary={
        <Link
          to="/projects/$id/$step"
          params={{ id: "prj-01", step: "import" }}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          Ya tengo el JSON →
        </Link>
      }
      secondary={
        <>
          <button className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface">
            Descargar .txt
          </button>
          <button className="px-3 py-2 text-xs font-semibold bg-foreground text-white rounded-md hover:bg-foreground/90">
            Copiar prompt
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-mono">insightdeck_prompt.md</span>
              <div className="flex gap-1">
                <span className="size-2.5 rounded-full bg-rose-400/60" />
                <span className="size-2.5 rounded-full bg-amber-400/60" />
                <span className="size-2.5 rounded-full bg-emerald-400/60" />
              </div>
            </div>
            <pre className="bg-slate-950 text-slate-200 text-[12px] leading-relaxed font-mono p-6 overflow-x-auto whitespace-pre-wrap">
              {PROMPT_TEXT}
            </pre>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-4">
              Cómo continuar
            </div>
            <ol className="space-y-4 text-xs">
              <StepGuide n={1} title="Copia el prompt" text="Botón superior derecho." />
              <StepGuide n={2} title="Ábrelo en Claude" text="Recomendado: Claude Sonnet 4 o superior." />
              <StepGuide n={3} title="Adjunta tus Excel" text="Los mismos archivos cargados aquí." />
              <StepGuide n={4} title="Pega la respuesta" text="En el paso siguiente, Importar JSON." />
            </ol>
          </Card>

          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2">
              Importante
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Claude solo debe devolver JSON. InsightDeck no acepta texto libre en el paso de importación.
            </p>
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}

function StepGuide({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="size-6 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
        {n}
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground mt-0.5">{text}</div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────── 7. Importar JSON ──────────────

function ImportStep({ projectId }: { projectId: string }) {
  return (
    <StepFrame
      title="Importar respuesta de Claude"
      subtitle="Pega el JSON estructurado o carga el archivo. Validamos formato, estructura y campos requeridos."
      wide
      primary={
        <Link
          to="/projects/$id/$step"
          params={{ id: projectId, step: "review" }}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
        >
          Continuar a revisión →
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-mono">respuesta_claude.json</span>
              <span className="text-emerald-400 text-[10px] font-bold">✓ VÁLIDO · 6 SLIDES</span>
            </div>
            <div className="bg-slate-950 text-slate-200 text-[12px] font-mono p-6 space-y-0.5 overflow-x-auto">
              <Line n={1} text={"{"} />
              <Line n={2} text={'  "project": "Q4 Beverage Deep Dive",'} />
              <Line n={3} text={'  "slides": ['} />
              <Line n={4} text={"    {"} />
              <Line n={5} text={'      "index": 1,'} />
              <Line n={6} text={'      "type": "funnel",'} highlight />
              <Line n={7} text={'      "title": "Gen Z consumption shows a 42%…",'} />
              <Line n={8} text={'      "insight": "Price sensitivity remains…",'} />
              <Line n={9} text={'      "indicators": ["awareness","consideration","purchase"]'} />
              <Line n={10} text={"    },"} />
              <Line n={11} text={"    { ... 5 slides más ... }"} muted />
              <Line n={12} text={"  ]"} />
              <Line n={13} text={"}"} />
            </div>
          </Card>

          <div className="mt-4 flex items-center gap-3">
            <button className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface bg-white">
              📎 Cargar archivo .json
            </button>
            <button className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface bg-white">
              📋 Pegar desde portapapeles
            </button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              Validación en tiempo real
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-4">
              Diagnóstico
            </div>
            <div className="space-y-3">
              <Check ok label="Sintaxis JSON válida" />
              <Check ok label="Estructura de slides correcta" />
              <Check ok label="Todos los tipos reconocidos" />
              <Check ok label="Campos obligatorios completos" />
            </div>
            <hr className="my-4 border-border" />
            <div className="text-[11px] text-muted-foreground">
              6 slides listas para revisión editorial. Tipos detectados:{" "}
              <span className="text-foreground font-medium">funnel, benchmark, heatmap, ranking, matriz, timeline</span>.
            </div>
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}
function Line({ n, text, highlight, muted }: { n: number; text: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div
      className={`flex gap-4 -mx-6 px-6 ${highlight ? "bg-primary/10" : ""} ${
        muted ? "text-slate-500 italic" : ""
      }`}
    >
      <span className="text-slate-600 w-6 text-right shrink-0">{n}</span>
      <span className={highlight ? "text-white" : ""}>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────── 8. Revisión editorial ─────────

function ReviewStep() {
  const [activeId, setActiveId] = useState(MOCK_SLIDES[0].id);
  const [approved, setApproved] = useState<Record<string, "approved" | "rejected" | undefined>>({
    s1: "approved",
    s5: "approved",
  });
  const slide = MOCK_SLIDES.find((s) => s.id === activeId)!;

  const approvedCount = Object.values(approved).filter((v) => v === "approved").length;
  const progress = Math.round((approvedCount / MOCK_SLIDES.length) * 100);

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      {/* Thumbnails column */}
      <div className="w-80 border-r border-border bg-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Slide Deck ({MOCK_SLIDES.length})
            </h2>
            <button className="text-[11px] text-primary font-medium hover:underline">Reordenar</button>
          </div>
          <div className="text-[10px] text-muted-foreground mb-2">
            Aprobadas · {approvedCount}/{MOCK_SLIDES.length}
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {MOCK_SLIDES.map((s) => {
            const isActive = s.id === activeId;
            const state = approved[s.id] ?? "pending";
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left cursor-pointer rounded-lg p-2 transition-all ${
                  isActive
                    ? "ring-2 ring-primary bg-white"
                    : "hover:bg-surface ring-1 ring-transparent"
                }`}
              >
                <SlideMini slide={s} />
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-600 rounded uppercase">
                      {s.type}
                    </span>
                    <StateBadge state={state} />
                  </div>
                  <p className={`text-xs font-medium truncate ${isActive ? "" : "text-muted-foreground"}`}>
                    {s.index.toString().padStart(2, "0")} · {s.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex flex-col overflow-hidden animate-in-slide" key={slide.id}>
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <SlidePreview slide={slide} />

            <div className="grid grid-cols-3 gap-8 pt-4">
              <div className="col-span-2 space-y-6">
                <div>
                  <Label>Titular del slide</Label>
                  <input
                    key={slide.id + "-title"}
                    defaultValue={slide.title}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <Label>Insight principal</Label>
                  <textarea
                    key={slide.id + "-ins"}
                    defaultValue={slide.insight}
                    rows={4}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
                <div>
                  <Label>Indicadores</Label>
                  <div className="flex flex-wrap gap-2">
                    {slide.indicators.map((i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-primary/5 text-primary text-[11px] font-medium rounded-full border border-primary/10"
                      >
                        {i}
                      </span>
                    ))}
                    <button className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-dashed border-border rounded-full hover:border-primary/40 hover:text-primary">
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="p-5 space-y-4">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">
                    Validación
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        setApproved((a) => ({ ...a, [slide.id]: "approved" }))
                      }
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      ✓ Aprobar slide
                    </button>
                    <button
                      onClick={() =>
                        setApproved((a) => ({ ...a, [slide.id]: "rejected" }))
                      }
                      className="w-full py-2 border border-border text-foreground hover:bg-surface rounded-lg text-xs font-semibold"
                    >
                      Rechazar y regenerar
                    </button>
                  </div>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    <ConfigRow label="Familia de plantilla" value={slide.template} />
                    <ConfigRow label="Fuente de datos" value={slide.dataSource} mono />
                    <ConfigRow label="Tipo" value={slide.type} />
                  </div>
                  <button className="w-full text-[11px] font-semibold text-primary hover:underline text-left">
                    Cambiar plantilla dentro de {slide.type}
                  </button>
                </Card>

                <Card className="p-5">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-3">
                    Comentarios
                  </div>
                  <div className="space-y-3">
                    {slide.comments.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Sin comentarios.</p>
                    )}
                    {slide.comments.map((c, i) => (
                      <div key={i} className="text-xs bg-surface p-3 rounded-lg border border-border">
                        <p className="text-muted-foreground mb-1 text-[10px]">
                          {c.author} · {c.ago}
                        </p>
                        <p className="leading-normal">{c.text}</p>
                      </div>
                    ))}
                    <input
                      placeholder="Agregar comentario…"
                      className="w-full text-xs bg-transparent border-b border-border py-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${mono ? "font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function StateBadge({ state }: { state: "approved" | "rejected" | "pending" | "draft" }) {
  const map = {
    approved: { label: "✓ Aprobado", cls: "text-emerald-600" },
    rejected: { label: "✕ Rechazado", cls: "text-rose-600" },
    pending: { label: "Pendiente", cls: "text-amber-600" },
    draft: { label: "Borrador", cls: "text-muted-foreground" },
  } as const;
  const m = map[state];
  return <span className={`text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function SlideMini({ slide }: { slide: (typeof MOCK_SLIDES)[number] }) {
  return (
    <div className="w-full aspect-video bg-slate-50 rounded border border-border relative overflow-hidden">
      <SlideThumbGraphic type={slide.type} />
      <span className="absolute top-1.5 left-2 text-[8px] font-mono text-slate-400">
        {slide.index.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

function SlidePreview({ slide }: { slide: (typeof MOCK_SLIDES)[number] }) {
  return (
    <div className="bg-white shadow-2xl shadow-slate-200 border border-border aspect-video rounded-xl relative overflow-hidden">
      <div className="absolute top-6 left-8 flex items-center gap-3">
        <div className="size-6 bg-primary rounded" />
        <div className="text-[10px] font-bold tracking-tighter">DEEP DIVE REPORT · Q4 2026</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-20">
        <div className="text-center space-y-4 max-w-3xl">
          <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
            {slide.type} · Slide {slide.index.toString().padStart(2, "0")}
          </div>
          <h3 className="text-[26px] font-bold tracking-tight leading-[1.15] text-balance">
            {slide.title}
          </h3>
          <p className="text-muted-foreground text-sm text-pretty">{slide.insight}</p>
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div className="opacity-70 max-w-md">
          <SlideThumbGraphic type={slide.type} large />
        </div>
        <div className="text-[10px] text-slate-400">InsightDeck Pro · Draft interno</div>
      </div>
    </div>
  );
}

function SlideThumbGraphic({ type, large }: { type: string; large?: boolean }) {
  const bars = [0.9, 0.7, 0.55, 0.4, 0.28];
  const h = large ? "h-24" : "h-full";
  if (type === "Funnel") {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 ${h} p-3`}>
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-primary/70 rounded-sm"
            style={{ width: `${w * 100}%`, height: large ? 12 : 5 }}
          />
        ))}
      </div>
    );
  }
  if (type === "Heatmap") {
    return (
      <div className={`grid grid-cols-6 gap-0.5 ${h} p-3`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ backgroundColor: `rgba(37,99,235,${0.15 + (i % 6) * 0.13})` }}
          />
        ))}
      </div>
    );
  }
  if (type === "Matriz") {
    return (
      <div className={`relative ${h} p-3`}>
        <div className="absolute inset-3 grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="bg-primary/10" />
          <div className="bg-primary/30" />
          <div className="bg-primary/5" />
          <div className="bg-primary/15" />
        </div>
        <div className="absolute top-4 right-4 size-2 bg-emerald-500 rounded-full" />
      </div>
    );
  }
  if (type === "Timeline") {
    return (
      <div className={`flex items-end gap-1 ${h} p-3`}>
        {[0.4, 0.55, 0.6, 0.45, 0.7, 0.5].map((v, i) => (
          <div key={i} className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: `${v * 80}%` }} />
        ))}
      </div>
    );
  }
  // Ranking / Benchmark → horizontal bars
  return (
    <div className={`flex flex-col gap-1 justify-center ${h} p-3`}>
      {[0.9, 0.75, 0.6, 0.45, 0.3].map((w, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-4 h-1 bg-slate-300 rounded-full" />
          <div
            className="bg-primary/70 rounded-sm"
            style={{ width: `${w * 100}%`, height: large ? 8 : 4 }}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────── 9. Exportar ───────────────────

function ExportStep() {
  return (
    <StepFrame
      title="Exportar entregable"
      subtitle="Revisión editorial completa. Genera el PowerPoint final o descarga el JSON aprobado."
      wide
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold">Resumen del proyecto</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Q4 Beverage Market Deep Dive · Andina Bebidas
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                Listo para exportar
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Slides" value="6" />
              <MiniStat label="Aprobadas" value="6" />
              <MiniStat label="Tipos" value="6" />
              <MiniStat label="Variables" value="142" />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Índice de la presentación</h3>
            <ol className="space-y-2">
              {MOCK_SLIDES.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-4 text-sm border-b border-border/60 last:border-0 py-2"
                >
                  <span className="text-[10px] font-mono text-muted-foreground w-6">
                    {s.index.toString().padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-20">
                    {s.type}
                  </span>
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">✓</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary to-primary-hover text-white">
            <div className="text-[11px] font-bold uppercase tracking-wide text-white/80 mb-2">
              Entregable final
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">.pptx</div>
            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Presentación completamente editable en Microsoft PowerPoint.
            </p>
            <button className="w-full py-2.5 bg-white text-primary rounded-lg text-xs font-semibold hover:bg-white/95">
              ⬇ Generar PowerPoint
            </button>
          </Card>

          <Card className="p-6 space-y-3">
            <button className="w-full py-2.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface">
              ⬇ Descargar JSON aprobado
            </button>
            <button className="w-full py-2.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface">
              📎 Copiar link compartible
            </button>
            <Link
              to="/"
              className="block text-center py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Volver al dashboard
            </Link>
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}
