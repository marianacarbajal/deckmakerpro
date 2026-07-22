import { Link } from "@tanstack/react-router";
import { STEPS, type StepSlug } from "@/lib/mock-data";

interface Props {
  projectId: string;
  projectName: string;
  currentStep: StepSlug;
  action?: React.ReactNode;
}

export function ProjectHeader({ projectId, projectName, currentStep, action }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.slug === currentStep);

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm z-10 shrink-0">
      <div className="h-14 flex items-center justify-between px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Projects
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-sm font-medium truncate">{projectName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/projects/$id/pipeline"
            params={{ id: projectId }}
            className="px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-surface"
          >
            📋 Pipeline
          </Link>
          {action ?? (
            <Link
              to="/projects/$id/$step"
              params={{ id: projectId, step: "export" }}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover transition-all"
            >
              Exportar PowerPoint
            </Link>
          )}
        </div>
      </div>

      <div className="px-8 pb-3 flex items-center gap-1.5 overflow-x-auto">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.slug} className="flex items-center gap-1.5 shrink-0">
              <Link
                to="/projects/$id/$step"
                params={{ id: projectId, step: step.slug }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                  active
                    ? "bg-primary text-white border-primary shadow-sm"
                    : done
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                      : "bg-transparent text-muted-foreground border-transparent hover:bg-surface"
                }`}
              >
                <span
                  className={`size-4 rounded-full flex items-center justify-center text-[9px] ${
                    active
                      ? "bg-white/20 text-white"
                      : done
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {step.label}
              </Link>
              {i < STEPS.length - 1 && <div className="w-3 h-px bg-border" />}
            </div>
          );
        })}
      </div>
    </header>
  );
}
