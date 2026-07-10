import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProjectHeader } from "@/components/project-header";
import { STEPS, type StepSlug } from "@/lib/mock-data";
import { useProjects, type Project, type SlideData, type GeneralInformation, type SlideRevision } from "@/lib/store";
import { useLibrary } from "@/lib/library-store";
import { useTemplates } from "@/lib/template-store";
import {
  ACCOUNTS,
  CHANNELS_BY_ACCOUNT,
  allSubcategoriesFor,
  type Account,
} from "@/lib/account-taxonomy";
import { MultiChipSelect } from "@/components/multi-chip-select";
import { buildPrompt } from "@/lib/prompt-builder";
import { validateJson } from "@/lib/json-validator";
import { generatePptx } from "@/lib/pptx";
import { EXCEL_STAGES, downloadExcelAnalitico, downloadWorkbook, firstExcelBytes, runExcelEngine, type ExcelStageState } from "@/lib/excel-engine";
import { putFileBytes, hasFileBytes } from "@/lib/file-cache";
import { rewriteSlideWithAI } from "@/lib/rewrite-slide.functions";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ChangeEvent } from "react";



export const Route = createFileRoute("/projects/$id/$step")({
  head: () => ({ meta: [{ title: "Proyecto · InsightDeck Pro" }] }),
  component: StepPage,
});

function StepPage() {
  const { id, step } = Route.useParams();
  const { getProject } = useProjects();
  const project = getProject(id);
  const slug = step as StepSlug;

  if (!STEPS.some((s) => s.slug === slug)) {
    return <Navigate to="/projects/$id/$step" params={{ id, step: "context" }} replace />;
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center bg-surface">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Proyecto no encontrado.</p>
            <Link to="/" className="inline-block mt-3 text-sm text-primary font-semibold hover:underline">
              ← Volver al dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ProjectHeader
        projectId={project.id}
        projectName={project.general_information.name || "Sin nombre"}
        currentStep={slug}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        {slug === "context" && <ContextStep project={project} />}
        {slug === "upload" && <UploadStep project={project} />}
        {slug === "validation" && <ValidationStep project={project} />}
        {slug === "prompt" && <PromptStep project={project} />}
        {slug === "import" && <ImportStep project={project} />}
        {slug === "review" && <ReviewStep project={project} />}
        {slug === "export" && <ExportStep project={project} />}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────── shared bits ───────────────────

function StepFrame({
  title, subtitle, children, primary, secondary, wide,
}: {
  title: string; subtitle: string; children: React.ReactNode;
  primary?: React.ReactNode; secondary?: React.ReactNode; wide?: boolean;
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
  return <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-2">{children}</label>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-border rounded-xl ${className}`}>{children}</div>;
}

function NextBtn({ projectId, next, children }: { projectId: string; next: StepSlug; children: React.ReactNode }) {
  return (
    <Link
      to="/projects/$id/$step"
      params={{ id: projectId, step: next }}
      className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover"
    >
      {children}
    </Link>
  );
}

// ─────────────────────────────────────────── Contexto ───────────────────

function ContextStep({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const { structures, profiles } = useLibrary();
  const ctx = project.study_context;
  const gi = project.general_information;

  const update = (patch: Partial<typeof ctx>) => {
    updateProject(project.id, (p) => ({ ...p, study_context: { ...p.study_context, ...patch } }));
  };
  const updateGi = (patch: Partial<GeneralInformation>) => {
    updateProject(project.id, (p) => ({ ...p, general_information: { ...p.general_information, ...patch } }));
  };

  const availableChannels = gi.account ? CHANNELS_BY_ACCOUNT[gi.account as Account] : [];
  const availableSubs = allSubcategoriesFor(gi.account || undefined, gi.channels);
  const filteredProfiles = gi.account ? profiles.filter((p) => p.account === gi.account) : profiles;

  return (
    <StepFrame
      title="Contexto del estudio"
      subtitle="Cuenta, canal, estructura, perfil de cliente y consideraciones estratégicas. Todo esto alimenta el Prompt Builder."
      primary={<NextBtn projectId={project.id} next="upload">Guardar y continuar →</NextBtn>}
    >
      <Card className="p-8 space-y-6 mb-6">
        <div>
          <Label>Cuenta</Label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNTS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => updateGi({ account: a, channels: [], subcategories: [], clientProfileId: undefined })}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  gi.account === a
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Canal (multi-selección)</Label>
          <MultiChipSelect
            options={availableChannels}
            value={gi.channels}
            onChange={(next) => {
              const subs = allSubcategoriesFor(gi.account || undefined, next);
              updateGi({ channels: next, subcategories: gi.subcategories.filter((s) => subs.includes(s)) });
            }}
            disabled={!gi.account}
            emptyLabel="Selecciona una cuenta primero."
          />
        </div>

        <div>
          <Label>Subcategoría (multi-selección)</Label>
          <MultiChipSelect
            options={availableSubs}
            value={gi.subcategories}
            onChange={(v) => updateGi({ subcategories: v })}
            disabled={gi.channels.length === 0}
            emptyLabel={gi.account ? "Selecciona al menos un canal." : "Selecciona una cuenta primero."}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label>Presentation Structure</Label>
            <select
              value={gi.presentationStructureId ?? ""}
              onChange={(e) => updateGi({ presentationStructureId: e.target.value || undefined })}
              className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm outline-none"
            >
              <option value="">(sin estructura)</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.studyType}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Client Profile</Label>
            <select
              value={gi.clientProfileId ?? ""}
              onChange={(e) => updateGi({ clientProfileId: e.target.value || undefined })}
              className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm outline-none"
            >
              <option value="">(sin perfil)</option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.account})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div>
          <Label>Objetivo general</Label>
          <textarea
            rows={3}
            value={ctx.objective}
            onChange={(e) => update({ objective: e.target.value })}
            placeholder="Ej. Entender la evolución trimestral de la marca…"
            className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm outline-none resize-none"
          />
        </div>

        <div>
          <Label>Objetivos específicos</Label>
          <div className="space-y-2">
            {ctx.specificObjectives.map((o, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface border border-border rounded-lg px-3 py-2">
                <span className="text-[10px] font-mono text-muted-foreground mt-1">{i + 1}.</span>
                <input
                  value={o}
                  onChange={(e) => {
                    const next = [...ctx.specificObjectives];
                    next[i] = e.target.value;
                    update({ specificObjectives: next });
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => update({ specificObjectives: ctx.specificObjectives.filter((_, j) => j !== i) })}
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update({ specificObjectives: [...ctx.specificObjectives, ""] })}
              className="text-xs font-semibold text-primary hover:underline mt-1"
            >
              + Agregar objetivo
            </button>
          </div>
        </div>

        <div>
          <Label>Preguntas del cliente</Label>
          <textarea
            rows={4}
            value={ctx.clientQuestions}
            onChange={(e) => update({ clientQuestions: e.target.value })}
            placeholder="¿Perdimos share of voice…?"
            className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm outline-none resize-none font-mono text-[13px] leading-relaxed"
          />
        </div>

        <div>
          <Label>Consideraciones estratégicas</Label>
          <textarea
            rows={4}
            value={ctx.considerations}
            onChange={(e) => update({ considerations: e.target.value })}
            placeholder='Ej. "Usar tono más directo, resaltar oportunidades comerciales, profundizar en canal moderno."'
            className="w-full bg-white border border-primary/30 bg-primary/5 rounded-lg px-4 py-3 text-sm outline-none resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Instrucciones que modifican tono, foco y profundidad. Se inyectan en el prompt de análisis.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label>Hipótesis (opcional)</Label>
            <textarea
              rows={4}
              value={ctx.hypotheses}
              onChange={(e) => update({ hypotheses: e.target.value })}
              placeholder="Ej. La caída en preferencia se explica por precio percibido."
              className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm outline-none resize-none"
            />
          </div>
          <div>
            <Label>Observaciones</Label>
            <textarea
              rows={4}
              value={ctx.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Notas para el equipo de análisis."
              className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm outline-none resize-none"
            />
          </div>
        </div>
      </Card>

      <TemplateReferences project={project} />
    </StepFrame>
  );
}

function TemplateReferences({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const { templates } = useTemplates();
  const gi = project.general_information;
  const selected = gi.selectedTemplateIds ?? [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    updateProject(project.id, (p) => ({
      ...p,
      general_information: { ...p.general_information, selectedTemplateIds: next },
    }));
  };
  const forAccount = templates.filter((t) => t.kind === "presentation" && (!gi.account || t.account === gi.account));
  const slideTypes = templates.filter((t) => t.kind === "slide");

  return (
    <Card className="p-8 space-y-6 mt-6">
      <div>
        <Label>Referencias visuales · presentaciones</Label>
        <p className="text-[11px] text-muted-foreground mb-3">
          Selecciona decks de la <Link to="/templates" className="underline">Template Library</Link> como
          inspiración. No se copian literalmente; el prompt indica "usar como referencia".
        </p>
        <div className="flex flex-wrap gap-2">
          {forAccount.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selected.includes(t.id)
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {selected.includes(t.id) && "✓ "}
              {t.name}
            </button>
          ))}
          {forAccount.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Sin presentaciones para esta cuenta.</div>
          )}
        </div>
      </div>
      <div>
        <Label>Referencias visuales · tipos de slide priorizados</Label>
        <div className="flex flex-wrap gap-2">
          {slideTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selected.includes(t.id)
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {selected.includes(t.id) && "✓ "}
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}




// ─────────────────────────────────────────── Carga ──────────────────────

function UploadStep({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const files = project.uploaded_files;

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const added = Array.from(list).map((f) => ({
      name: f.name,
      size: f.size,
      kind: inferKind(f.name),
    }));
    // Cache bytes in-memory for the real Excel engine.
    Array.from(list).forEach((f) => {
      if (/xlsx?|csv/i.test(f.name)) {
        f.arrayBuffer().then((buf) => putFileBytes(project.id, f.name, buf)).catch(() => {});
      }
    });
    updateProject(project.id, (p) => ({ ...p, uploaded_files: [...p.uploaded_files, ...added] }));
  };

  return (
    <StepFrame
      title="Carga de información"
      subtitle="Adjunta los archivos de la investigación (referencia local — no se sube a ningún servidor)."
      primary={<NextBtn projectId={project.id} next="validation">Continuar →</NextBtn>}
    >
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6">
          <label className="block border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/40 transition-colors cursor-pointer">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <div className="mx-auto size-12 rounded-full bg-primary/5 text-primary flex items-center justify-center text-xl mb-3">↑</div>
            <p className="font-semibold text-sm">Arrastra archivos aquí o haz click para seleccionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceptados: .xlsx, .csv, .pdf, .docx · solo referencia local
            </p>
          </label>

          <div className="mt-6 space-y-3">
            {files.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aún no cargaste archivos.</p>
            )}
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-surface border border-border rounded-lg p-3">
                <div className="size-10 rounded bg-white border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {f.kind}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {(f.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">✓ Registrado</span>
                <button
                  type="button"
                  onClick={() =>
                    updateProject(project.id, (p) => ({
                      ...p,
                      uploaded_files: p.uploaded_files.filter((_, j) => j !== i),
                    }))
                  }
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 h-fit">
          <h3 className="text-sm font-semibold mb-3">Buenas prácticas</h3>
          <ul className="space-y-3 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold">·</span> Adjunta el diccionario de variables para mejor interpretación por Claude.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">·</span> Los nombres se incluirán en el prompt para dar contexto al modelo.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">·</span> No es necesario subir realmente los archivos: solo se registra el nombre.</li>
          </ul>
        </Card>
      </div>

      <ExcelEngineCard project={project} />
    </StepFrame>
  );
}

function ExcelEngineCard({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const hasExcel = project.uploaded_files.some((f) => /xls|csv/i.test(f.kind));
  const initial: ExcelStageState[] = EXCEL_STAGES.map((s) => ({
    ...s,
    status: project.excel_analysis?.completedStages.includes(s.id) ? "done" : "pending",
  }));
  const [stages, setStages] = useState<ExcelStageState[]>(initial);
  const [running, setRunning] = useState(false);
  const allDone = stages.every((s) => s.status === "done");

  const run = async () => {
    setRunning(true);
    const bytes = firstExcelBytes(project);
    let next: ExcelStageState[] = stages.map((s) => ({ ...s, status: "pending" }));
    setStages(next);
    for (let i = 0; i < next.length; i++) {
      next = next.map((s, j): ExcelStageState => (j === i ? { ...s, status: "running" } : s));
      setStages(next);
      await new Promise((r) => setTimeout(r, 350));
      next = next.map((s, j): ExcelStageState => (j === i ? { ...s, status: "done" } : s));
      setStages(next);
    }
    if (bytes) {
      try {
        const result = runExcelEngine(bytes, project);
        downloadWorkbook(result.wb, project.general_information.name || "insightdeck");
        updateProject(project.id, (p) => ({
          ...p,
          excel_analysis: {
            ranAt: new Date().toISOString(),
            completedStages: result.stagesDone,
            sheetsGenerated: result.sheetsGenerated,
          },
        }));
      } catch (e) {
        console.error("Excel engine error", e);
      }
    } else {
      updateProject(project.id, (p) => ({
        ...p,
        excel_analysis: {
          ranAt: new Date().toISOString(),
          completedStages: EXCEL_STAGES.map((s) => s.id),
          sheetsGenerated: EXCEL_STAGES.map((s) => s.sheetName!).filter(Boolean),
        },
      }));
    }
    setRunning(false);
  };

  const bytesCached = project.uploaded_files.some((f) => /xls|csv/i.test(f.kind) && hasFileBytes(project.id, f.name));

  return (
    <Card className="p-8 mt-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Motor de Excel Inteligente</h3>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
            Lee el Excel cargado, detecta hojas y variables, y genera un <strong>Excel Analítico</strong>{" "}
            derivado con fórmulas SUMIF/AVERAGEIF/COUNTIF referenciando la base limpia, KPIs, dashboard e insights.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={running || !hasExcel}
            className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-md disabled:opacity-40"
          >
            {running ? "Analizando…" : allDone ? "Volver a ejecutar y descargar" : "Ejecutar y descargar analítico"}
          </button>
          <button
            onClick={() => downloadExcelAnalitico(project)}
            disabled={!allDone}
            className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface disabled:opacity-40"
          >
            ⬇ Volver a descargar
          </button>
        </div>
      </div>
      {hasExcel && !bytesCached && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
          Los bytes del archivo se perdieron al recargar la página. Vuelve a cargar el .xlsx para regenerar el analítico real.
        </p>
      )}
      {!hasExcel && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Carga un archivo .xlsx o .csv para habilitar el motor.
        </p>
      )}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {stages.map((s) => (
          <div
            key={s.id}
            className={`rounded-lg border p-3 text-xs transition-colors ${
              s.status === "done"
                ? "bg-emerald-50 border-emerald-200"
                : s.status === "running"
                  ? "bg-blue-50 border-blue-200 animate-pulse"
                  : "bg-surface border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{s.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {s.status === "done" ? "✓" : s.status === "running" ? "…" : "·"}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">{s.description}</div>
            {s.sheetName && (
              <div className="text-[9px] font-mono text-muted-foreground mt-1.5 truncate">
                → {s.sheetName}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}



function inferKind(name: string) {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["xlsx", "xls", "csv"].includes(ext)) return "XLSX";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOC";
  return "FILE";
}

// ─────────────────────────────────────────── Validación ─────────────────

function ValidationStep({ project }: { project: Project }) {
  const gi = project.general_information;
  const ctx = project.study_context;
  return (
    <StepFrame
      title="Resumen ejecutivo"
      subtitle="Verifica que la información cargada sea correcta antes de generar el prompt."
      wide
      primary={<NextBtn projectId={project.id} next="prompt">Generar prompt →</NextBtn>}
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <SectionHead title="Información general" edit="context" projectId={project.id} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Proyecto" value={gi.name} />
              <Info label="Cliente" value={gi.client} />
              <Info label="Marca" value={gi.brand} />
              <Info label="Categoría" value={gi.category} />
              <Info label="Tipo" value={gi.researchType} />
              <Info label="Responsable" value={gi.owner} />
            </div>
          </Card>

          <Card className="p-6">
            <SectionHead title={`Archivos cargados (${project.uploaded_files.length})`} edit="upload" projectId={project.id} />
            {project.uploaded_files.length === 0 ? (
              <p className="text-xs text-muted-foreground">No se cargaron archivos.</p>
            ) : (
              <div className="space-y-2">
                {project.uploaded_files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface rounded-md px-3 py-2 border border-border">
                    <div className="text-sm font-medium font-mono">{f.name}</div>
                    <span className="text-[10px] font-semibold text-emerald-600">OK</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <SectionHead title="Objetivos" edit="context" projectId={project.id} />
            {ctx.specificObjectives.length === 0 ? (
              <p className="text-xs text-muted-foreground">No se registraron objetivos específicos.</p>
            ) : (
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-5">
                {ctx.specificObjectives.map((o, i) => <li key={i}>{o}</li>)}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Estado</div>
            <div className="space-y-3">
              <Check ok={!!ctx.objective} label="Objetivo general" />
              <Check ok={ctx.specificObjectives.length > 0} label="Objetivos específicos" />
              <Check ok={!!ctx.clientQuestions} label="Preguntas del cliente" />
              <Check ok={project.uploaded_files.length > 0} label="Archivos registrados" />
              <Check ok={!!ctx.hypotheses} label="Hipótesis (opcional)" />
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">Listo</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              InsightDeck ya puede generar el prompt de análisis para Claude.
            </p>
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value || "—"}</div>
    </div>
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

function Check({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`size-4 rounded-full flex items-center justify-center text-[10px] ${ok ? "bg-emerald-500 text-white" : "border border-border text-muted-foreground"}`}>
        {ok ? "✓" : "·"}
      </span>
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────── Prompt ─────────────────────

function PromptStep({ project }: { project: Project }) {
  const { getStructure, getProfile } = useLibrary();
  const prompt = useMemo(
    () =>
      buildPrompt(project, {
        structure: getStructure(project.general_information.presentationStructureId),
        profile: getProfile(project.general_information.clientProfileId),
      }),
    [project, getStructure, getProfile],
  );

  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.general_information.name || "prompt"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StepFrame
      title="Prompt generado para Claude"
      subtitle="Se reconstruye automáticamente con los datos actuales del proyecto. Copia, pégalo en Claude y trae la respuesta JSON."
      wide
      primary={<NextBtn projectId={project.id} next="import">Ya tengo el JSON →</NextBtn>}
      secondary={
        <>
          <button onClick={download} className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface">
            Descargar .md
          </button>
          <button onClick={copy} className="px-3 py-2 text-xs font-semibold bg-foreground text-white rounded-md hover:bg-foreground/90">
            {copied ? "✓ Copiado" : "Copiar prompt"}
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
            <pre className="bg-slate-950 text-slate-200 text-[12px] leading-relaxed font-mono p-6 overflow-x-auto whitespace-pre-wrap max-h-[600px]">
              {prompt}
            </pre>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-4">Cómo continuar</div>
            <ol className="space-y-4 text-xs">
              <StepGuide n={1} title="Copia el prompt" text="Botón superior derecho." />
              <StepGuide n={2} title="Ábrelo en Claude" text="Recomendado: Sonnet 4 o superior." />
              <StepGuide n={3} title="Adjunta tus Excel" text="Los mismos archivos cargados aquí." />
              <StepGuide n={4} title="Pega la respuesta" text="En el paso siguiente, Importar JSON." />
            </ol>
          </Card>

          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2">Importante</div>
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
      <span className="size-6 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{n}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground mt-0.5">{text}</div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────── Importar JSON ──────────────

function ImportStep({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const navigate = useNavigate();
  const [raw, setRaw] = useState(project.claude_json);
  const validation = useMemo(() => (raw.trim() ? validateJson(raw) : null), [raw]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(setRaw);
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setRaw(t);
    } catch {
      /* ignore */
    }
  };

  const confirmImport = () => {
    if (!validation?.ok) return;
    updateProject(project.id, (p) => ({
      ...p,
      claude_json: raw,
      generated_slides: validation.slides,
      current_status: "review",
    }));
    navigate({ to: "/projects/$id/$step", params: { id: project.id, step: "review" } });
  };

  return (
    <StepFrame
      title="Importar respuesta de Claude"
      subtitle="Pega el JSON estructurado o carga el archivo. Validamos formato, estructura y campos requeridos."
      wide
      primary={
        <button
          onClick={confirmImport}
          disabled={!validation?.ok}
          className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Importar y continuar →
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-mono">respuesta_claude.json</span>
              {validation && (
                <span className={`text-[10px] font-bold ${validation.ok ? "text-emerald-400" : "text-rose-400"}`}>
                  {validation.ok ? `✓ VÁLIDO · ${validation.slides.length} SLIDES` : `✕ ${validation.errors.length} ERROR(ES)`}
                </span>
              )}
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='Pega aquí el JSON devuelto por Claude…\n\n{\n  "project": "…",\n  "slides": [ … ]\n}'
              className="w-full h-[420px] bg-slate-950 text-slate-100 text-[12px] font-mono p-6 outline-none resize-none"
            />
          </Card>

          <div className="flex items-center gap-3">
            <label className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface bg-white cursor-pointer">
              📎 Cargar archivo .json
              <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </label>
            <button
              onClick={pasteFromClipboard}
              className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface bg-white"
            >
              📋 Pegar desde portapapeles
            </button>
            <button
              onClick={() => setRaw("")}
              className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
            <span className="text-[11px] text-muted-foreground ml-auto">Validación en tiempo real</span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-4">Diagnóstico</div>
            {!validation ? (
              <p className="text-xs text-muted-foreground">Pega o carga un JSON para validar.</p>
            ) : validation.ok ? (
              <>
                <div className="space-y-3">
                  <Check ok label="Sintaxis JSON válida" />
                  <Check ok label="Estructura de slides correcta" />
                  <Check ok label="Todos los tipos reconocidos" />
                  <Check ok label="Campos obligatorios completos" />
                </div>
                <hr className="my-4 border-border" />
                <div className="text-[11px] text-muted-foreground">
                  {validation.slides.length} slides listas.
                  <br />
                  Tipos:{" "}
                  <span className="text-foreground font-medium">
                    {Array.from(new Set(validation.slides.map((s) => s.slide_type))).join(", ")}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {validation.errors.map((e, i) => (
                  <div key={i} className="text-[11px] bg-rose-50 border border-rose-100 text-rose-700 rounded px-3 py-2 font-mono">
                    {e}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </StepFrame>
  );
}

// ─────────────────────────────────────────── Revisión editorial ─────────

function ReviewStep({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const slides = project.generated_slides;
  const [activeIdx, setActiveIdx] = useState(0);
  const slide = slides[activeIdx];

  const approvedCount = slides.filter((s) => s.status === "approved").length;
  const progress = slides.length ? Math.round((approvedCount / slides.length) * 100) : 0;

  const updateSlide = (idx: number, patch: Partial<SlideData>) => {
    updateProject(project.id, (p) => {
      const next = [...p.generated_slides];
      next[idx] = { ...next[idx], ...patch };
      return { ...p, generated_slides: next };
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= slides.length) return;
    updateProject(project.id, (p) => {
      const next = [...p.generated_slides];
      const [item] = next.splice(idx, 1);
      next.splice(to, 0, item);
      return { ...p, generated_slides: next };
    });
    setActiveIdx(to);
  };

  const removeSlide = (idx: number) => {
    if (!confirm("¿Eliminar este slide?")) return;
    updateProject(project.id, (p) => ({
      ...p,
      generated_slides: p.generated_slides.filter((_, i) => i !== idx),
    }));
    setActiveIdx((i) => Math.max(0, Math.min(i, slides.length - 2)));
  };

  if (slides.length === 0) {
    return (
      <StepFrame
        title="Revisión editorial"
        subtitle="Aún no importaste una respuesta de Claude."
        primary={<NextBtn projectId={project.id} next="import">Ir a importar JSON →</NextBtn>}
      >
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No hay slides para revisar.</p>
        </Card>
      </StepFrame>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      {/* Thumbnails column */}
      <div className="w-80 border-r border-border bg-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Slide Deck ({slides.length})
            </h2>
            <NextBtn projectId={project.id} next="export">Exportar →</NextBtn>
          </div>
          <div className="text-[10px] text-muted-foreground mb-2">
            Aprobadas · {approvedCount}/{slides.length}
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`w-full text-left cursor-pointer rounded-lg p-2 transition-all ${
                i === activeIdx ? "ring-2 ring-primary bg-white" : "hover:bg-surface ring-1 ring-transparent"
              }`}
            >
              <SlideMini slide={s} />
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-600 rounded uppercase">
                    {s.slide_type}
                  </span>
                  <StateBadge state={s.status ?? "pending"} />
                </div>
                <p className={`text-xs font-medium truncate ${i === activeIdx ? "" : "text-muted-foreground"}`}>
                  {String(i + 1).padStart(2, "0")} · {s.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex flex-col overflow-hidden animate-in-slide" key={activeIdx}>
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <SlidePreview slide={slide} index={activeIdx + 1} />

            <div className="flex items-center gap-2">
              <button onClick={() => move(activeIdx, -1)} disabled={activeIdx === 0} className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-white disabled:opacity-40">← Mover arriba</button>
              <button onClick={() => move(activeIdx, 1)} disabled={activeIdx === slides.length - 1} className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-white disabled:opacity-40">Mover abajo →</button>
              <button onClick={() => removeSlide(activeIdx)} className="ml-auto px-3 py-1.5 text-xs border border-border text-destructive rounded-md hover:bg-rose-50">
                Eliminar slide
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-4">
              <div className="col-span-2 space-y-6">
                <div>
                  <Label>Titular del slide</Label>
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlide(activeIdx, { title: e.target.value })}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                {slide.subtitle !== undefined && (
                  <div>
                    <Label>Subtítulo</Label>
                    <input
                      value={slide.subtitle ?? ""}
                      onChange={(e) => updateSlide(activeIdx, { subtitle: e.target.value })}
                      className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                )}
                <div>
                  <Label>Insight principal</Label>
                  <textarea
                    value={slide.main_insight ?? ""}
                    onChange={(e) => updateSlide(activeIdx, { main_insight: e.target.value })}
                    rows={4}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
                <div>
                  <Label>Implicancia de negocio</Label>
                  <textarea
                    value={slide.business_implication ?? ""}
                    onChange={(e) => updateSlide(activeIdx, { business_implication: e.target.value })}
                    rows={3}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
                {slide.metrics && slide.metrics.length > 0 && (
                  <div>
                    <Label>Métricas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {slide.metrics.map((m, i) => (
                        <div key={i} className="bg-white border border-border rounded-lg p-3 text-xs">
                          <div className="font-semibold text-muted-foreground uppercase text-[10px]">{m.label}</div>
                          <div className="text-lg font-bold text-primary">{m.value}</div>
                          {m.delta && <div className="text-[11px] text-emerald-600">{m.delta}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Card className="p-5 space-y-4">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">Validación</div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => updateSlide(activeIdx, { status: "approved" })}
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      ✓ Aprobar slide
                    </button>
                    <button
                      onClick={() => updateSlide(activeIdx, { status: "rejected" })}
                      className="w-full py-2 border border-border text-foreground hover:bg-surface rounded-lg text-xs font-semibold"
                    >
                      Rechazar
                    </button>
                  </div>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    <ConfigRow label="Layout" value={slide.recommended_layout ?? "—"} mono />
                    <ConfigRow label="Tipo" value={slide.slide_type} />
                    <ConfigRow label="Métricas" value={String(slide.metrics?.length ?? 0)} />
                  </div>
                </Card>

                {slide.supporting_insights && slide.supporting_insights.length > 0 && (
                  <Card className="p-5">
                    <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-3">
                      Insights de apoyo
                    </div>
                    <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                      {slide.supporting_insights.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </Card>
                )}

                <AiConsiderationsCard project={project} slide={slide} activeIdx={activeIdx} updateSlide={updateSlide} />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiConsiderationsCard({
  project,
  slide,
  activeIdx,
  updateSlide,
}: {
  project: Project;
  slide: SlideData;
  activeIdx: number;
  updateSlide: (idx: number, patch: Partial<SlideData>) => void;
}) {
  const rewrite = useServerFn(rewriteSlideWithAI);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof rewrite>> | null>(null);
  const considerations = project.study_context.considerations ?? "";
  const gi = project.general_information;

  const generate = async () => {
    if (!considerations.trim()) {
      setError("Agrega consideraciones estratégicas en el paso Contexto.");
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);
    try {
      const result = await rewrite({
        data: {
          considerations,
          slide: {
            slide_type: slide.slide_type,
            title: slide.title,
            subtitle: slide.subtitle,
            main_insight: slide.main_insight,
            business_implication: slide.business_implication,
            supporting_insights: slide.supporting_insights,
          },
          projectContext: {
            account: gi.account || undefined,
            channels: gi.channels,
            subcategories: gi.subcategories,
            objective: project.study_context.objective,
          },
        },
      });
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    const revision: SlideRevision = {
      at: new Date().toISOString(),
      by: "ai",
      summary: preview.change_summary,
      before: {
        title: slide.title,
        main_insight: slide.main_insight,
        business_implication: slide.business_implication,
      },
      after: {
        title: preview.updated_title,
        main_insight: preview.updated_insight,
        business_implication: preview.updated_business_implication,
      },
    };
    updateSlide(activeIdx, {
      title: preview.updated_title,
      main_insight: preview.updated_insight,
      business_implication: preview.updated_business_implication,
      visual_direction: preview.updated_visual_direction,
      revision_history: [...(slide.revision_history ?? []), revision],
    });
    setPreview(null);
  };

  const saveWithoutApply = () => {
    if (!preview) return;
    const revision: SlideRevision = {
      at: new Date().toISOString(),
      by: "ai",
      summary: `[Sugerencia no aplicada] ${preview.change_summary}`,
    };
    updateSlide(activeIdx, {
      revision_history: [...(slide.revision_history ?? []), revision],
    });
    setPreview(null);
  };

  return (
    <Card className="p-5 bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold uppercase text-primary tracking-wide">
          ✨ Consideraciones con IA
        </div>
        {slide.revision_history && slide.revision_history.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {slide.revision_history.length} revisión{slide.revision_history.length === 1 ? "" : "es"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
        {considerations.trim()
          ? "Reescribir el slide aplicando las consideraciones estratégicas del proyecto."
          : "No hay consideraciones definidas. Agrega instrucciones en el paso Contexto."}
      </p>
      <button
        onClick={generate}
        disabled={loading || !considerations.trim()}
        className="w-full py-2 text-xs font-semibold bg-primary text-white rounded-lg disabled:opacity-40 mb-2"
      >
        {loading ? "Generando…" : "Generar propuesta con IA"}
      </button>
      {error && (
        <div className="text-[11px] bg-rose-50 border border-rose-200 text-rose-700 rounded px-2 py-1.5 mt-2">
          {error}
        </div>
      )}
      {preview && (
        <div className="mt-3 space-y-3 bg-white border border-border rounded-lg p-3">
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">Nuevo título</div>
            <div className="text-xs font-medium">{preview.updated_title}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">Nuevo insight</div>
            <div className="text-xs text-muted-foreground">{preview.updated_insight}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">Implicancia</div>
            <div className="text-xs text-muted-foreground">{preview.updated_business_implication}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">Dirección visual</div>
            <div className="text-xs text-muted-foreground italic">{preview.updated_visual_direction}</div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={apply} className="flex-1 py-1.5 text-[11px] font-semibold bg-emerald-600 text-white rounded">
              Aplicar cambio
            </button>
            <button onClick={saveWithoutApply} className="flex-1 py-1.5 text-[11px] font-semibold border border-border rounded">
              Guardar sin aplicar
            </button>
          </div>
        </div>
      )}
      {slide.revision_history && slide.revision_history.length > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] font-semibold text-muted-foreground cursor-pointer">
            Historial de revisiones
          </summary>
          <ul className="mt-2 space-y-1.5">
            {slide.revision_history.slice().reverse().map((r, i) => (
              <li key={i} className="text-[10px] text-muted-foreground bg-white border border-border rounded p-2">
                <div className="flex justify-between mb-0.5">
                  <span className="font-semibold">{r.by === "ai" ? "🤖 IA" : "👤 Usuario"}</span>
                  <span>{new Date(r.at).toLocaleString()}</span>
                </div>
                {r.summary}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
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

function StateBadge({ state }: { state: "approved" | "rejected" | "pending" }) {
  const map = {
    approved: { label: "✓ Aprobado", cls: "text-emerald-600" },
    rejected: { label: "✕ Rechazado", cls: "text-rose-600" },
    pending: { label: "Pendiente", cls: "text-amber-600" },
  } as const;
  const m = map[state];
  return <span className={`text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function SlideMini({ slide }: { slide: SlideData }) {
  return (
    <div className="w-full aspect-video bg-slate-50 rounded border border-border relative overflow-hidden">
      <SlideThumbGraphic type={slide.slide_type} />
    </div>
  );
}

function SlidePreview({ slide, index }: { slide: SlideData; index: number }) {
  return (
    <div className="bg-white shadow-2xl shadow-slate-200 border border-border aspect-video rounded-xl relative overflow-hidden">
      <div className="absolute top-6 left-8 flex items-center gap-3">
        <div className="size-6 bg-primary rounded" />
        <div className="text-[10px] font-bold tracking-tighter">
          {(slide.recommended_layout ?? slide.slide_type).toUpperCase()} · SLIDE {String(index).padStart(2, "0")}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-20">
        <div className="text-center space-y-4 max-w-3xl">
          <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
            {slide.slide_type}
          </div>
          <h3 className="text-[26px] font-bold tracking-tight leading-[1.15] text-balance">{slide.title}</h3>
          {slide.subtitle && <p className="text-sm text-muted-foreground">{slide.subtitle}</p>}
          <p className="text-muted-foreground text-sm text-pretty">{slide.main_insight}</p>
          {slide.metrics && slide.metrics.length > 0 && (
            <div className="flex justify-center gap-6 pt-2">
              {slide.metrics.slice(0, 4).map((m, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-primary">{m.value}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div className="opacity-70 max-w-md">
          <SlideThumbGraphic type={slide.slide_type} large />
        </div>
        <div className="text-[10px] text-slate-400">InsightDeck Pro · Draft interno</div>
      </div>
    </div>
  );
}

function SlideThumbGraphic({ type, large }: { type: string; large?: boolean }) {
  const bars = [0.9, 0.7, 0.55, 0.4, 0.28];
  const h = large ? "h-24" : "h-full";
  const t = (type || "").toLowerCase();
  if (t === "funnel") {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 ${h} p-3`}>
        {bars.map((w, i) => (
          <div key={i} className="bg-primary/70 rounded-sm" style={{ width: `${w * 100}%`, height: large ? 12 : 5 }} />
        ))}
      </div>
    );
  }
  if (t === "heatmap") {
    return (
      <div className={`grid grid-cols-6 gap-0.5 ${h} p-3`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-sm" style={{ backgroundColor: `rgba(37,99,235,${0.15 + (i % 6) * 0.13})` }} />
        ))}
      </div>
    );
  }
  if (t === "matrix") {
    return (
      <div className={`relative ${h} p-3`}>
        <div className="absolute inset-3 grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="bg-primary/10" />
          <div className="bg-primary/30" />
          <div className="bg-primary/5" />
          <div className="bg-primary/15" />
        </div>
      </div>
    );
  }
  if (t === "timeline") {
    return (
      <div className={`flex items-end gap-1 ${h} p-3`}>
        {[0.4, 0.55, 0.6, 0.45, 0.7, 0.5].map((v, i) => (
          <div key={i} className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: `${v * 80}%` }} />
        ))}
      </div>
    );
  }
  if (t === "kpi") {
    return (
      <div className={`grid grid-cols-3 gap-1 ${h} p-3`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-primary/10 rounded flex items-center justify-center">
            <div className="w-6 h-2 bg-primary/50 rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 justify-center ${h} p-3`}>
      {[0.9, 0.75, 0.6, 0.45, 0.3].map((w, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-4 h-1 bg-slate-300 rounded-full" />
          <div className="bg-primary/70 rounded-sm" style={{ width: `${w * 100}%`, height: large ? 8 : 4 }} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────── Exportar ───────────────────

function ExportStep({ project }: { project: Project }) {
  const { updateProject } = useProjects();
  const [generating, setGenerating] = useState(false);
  const slides = project.generated_slides;
  const approved = slides.filter((s) => s.status === "approved").length;

  const downloadPptx = async () => {
    if (slides.length === 0) return;
    setGenerating(true);
    try {
      await generatePptx(project);
      updateProject(project.id, (p) => ({ ...p, current_status: "completed" }));
    } finally {
      setGenerating(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ project: project.general_information.name, slides }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.general_information.name || "insightdeck"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StepFrame
      title="Exportar entregable"
      subtitle="Genera el PowerPoint editable o descarga el JSON aprobado."
      wide
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold">Resumen del proyecto</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {project.general_information.name} · {project.general_information.client}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                {slides.length > 0 ? "Listo para exportar" : "Sin slides"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Slides" value={String(slides.length)} />
              <MiniStat label="Aprobadas" value={String(approved)} />
              <MiniStat label="Tipos" value={String(new Set(slides.map((s) => s.slide_type)).size)} />
              <MiniStat label="Archivos" value={String(project.uploaded_files.length)} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Índice de la presentación</h3>
            {slides.length === 0 ? (
              <p className="text-xs text-muted-foreground">Importa primero un JSON de Claude.</p>
            ) : (
              <ol className="space-y-2">
                {slides.map((s, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm border-b border-border/60 last:border-0 py-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground w-20">{s.slide_type}</span>
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className={`text-[10px] font-medium ${s.status === "approved" ? "text-emerald-600" : "text-amber-600"}`}>
                      {s.status === "approved" ? "✓" : "•"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary to-primary-hover text-white">
            <div className="text-[11px] font-bold uppercase tracking-wide text-white/80 mb-2">Entregable final</div>
            <div className="text-3xl font-bold tracking-tight mb-1">.pptx</div>
            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Presentación completamente editable en Microsoft PowerPoint.
            </p>
            <button
              onClick={downloadPptx}
              disabled={slides.length === 0 || generating}
              className="w-full py-2.5 bg-white text-primary rounded-lg text-xs font-semibold hover:bg-white/95 disabled:opacity-50"
            >
              {generating ? "Generando…" : "⬇ Generar y descargar PowerPoint"}
            </button>
          </Card>

          <Card className="p-6 space-y-3">
            <button
              onClick={() => downloadExcelAnalitico(project)}
              disabled={!project.excel_analysis}
              className="w-full py-2.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-50"
            >
              ⬇ Descargar Excel Analítico
            </button>
            <button
              onClick={downloadJson}
              disabled={slides.length === 0}
              className="w-full py-2.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-50"
            >
              ⬇ Descargar JSON del proyecto
            </button>
            <Link to="/" className="block text-center py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Volver al dashboard
            </Link>
          </Card>

        </div>
      </div>
    </StepFrame>
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
