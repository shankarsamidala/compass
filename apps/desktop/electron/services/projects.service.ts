import { authedFetch } from "../core/http";
import { ok, err, type Result, type ProjectItem, type ProjectInput } from "@compass/ipc-contract";

export const projectsService = {
  async list(): Promise<Result<{ data: ProjectItem[] }>> {
    const res = await authedFetch("/projects", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load projects", json?.code);
    return ok({ data: json?.data ?? [] });
  },

  async add(input: ProjectInput): Promise<Result<ProjectItem>> {
    const res = await authedFetch("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add project", json?.code);
    return ok(json as ProjectItem);
  },

  async update(id: string, patch: Partial<ProjectInput>): Promise<Result<ProjectItem>> {
    const res = await authedFetch(`/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Project not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update project", json?.code);
    return ok(json as ProjectItem);
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove project", json?.code);
    }
    return ok(undefined);
  },
};
