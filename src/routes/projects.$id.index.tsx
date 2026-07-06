import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id/")({
  component: () => {
    const { id } = Route.useParams();
    return <Navigate to="/projects/$id/$step" params={{ id, step: "context" }} replace />;
  },
});
