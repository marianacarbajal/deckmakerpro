import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/benchmarks")({
  component: () => <Navigate to="/knowledge-library" search={{ tab: "benchmarks" }} replace />,
});
