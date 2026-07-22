import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Projects", match: (p: string) => p === "/" || p.startsWith("/projects") },
  {
    to: "/knowledge-library",
    label: "Knowledge Library",
    match: (p: string) => p.startsWith("/knowledge-library") || p.startsWith("/benchmarks"),
  },
  { to: "/templates", label: "Template Library", match: (p: string) => p.startsWith("/templates") },
  { to: "/settings", label: "Configuración", match: (p: string) => p.startsWith("/settings") },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-screen bg-background font-sans text-foreground selection:bg-primary/10">
      <aside className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center relative">
            <div className="absolute w-4 h-1 bg-white rounded-full rotate-45 translate-y-0.5" />
            <div className="absolute w-4 h-1 bg-white rounded-full -rotate-45 -translate-y-0.5" />
          </div>
          <span className="font-bold tracking-tight text-lg italic">
            InsightDeck
            <span className="not-italic font-medium text-muted-foreground">Pro</span>
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-3 mt-6">
            Workspace
          </div>
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  active ? "bg-surface text-primary" : "text-muted-foreground hover:bg-surface"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    active ? "bg-primary" : "bg-transparent border border-muted-foreground"
                  }`}
                />
                {n.label}
              </Link>
            );
          })}

          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-3 mt-8">
            Recientes
          </div>
          <div className="space-y-1 px-2">
            <RecentLink to="/projects/prj-01/review" label="Q4 Beverage Deep Dive" />
            <RecentLink to="/projects/prj-02/upload" label="Segmentación Gen Z Perú" />
            <RecentLink to="/projects/prj-04/context" label="Skincare Coreano" />
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-600">
              AM
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium truncate">Ana Martínez</div>
              <div className="text-[10px] text-muted-foreground truncate">Senior Analyst</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}

function RecentLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block truncate text-xs text-muted-foreground hover:text-foreground py-1 px-1"
    >
      {label}
    </Link>
  );
}
