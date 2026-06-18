import { authedFetch } from "../core/http";
import { ok, err, type Result, type CvUpload } from "@compass/ipc-contract";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const cvService = {
  async uploadFile(fileName: string, bytes: Uint8Array): Promise<Result<CvUpload>> {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const base64 = Buffer.from(bytes).toString("base64");

    const res = await authedFetch("/cv/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, bytes: base64, contentType }),
    }).catch(() => undefined);

    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.ok) return ok(json as CvUpload);
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 503) return err("S3 not configured on the server", "S3_NOT_CONFIGURED");
    return err(json?.error || "Upload failed", json?.code);
  },

  async listUploads(): Promise<Result<CvUpload[]>> {
    const res = await authedFetch("/cv/uploads", { method: "GET" }).catch(() => undefined);
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => []);
    if (res.ok) return ok(json as CvUpload[]);
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    return err((json as { error?: string })?.error || "Failed to load uploads", undefined);
  },

  async deleteUpload(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/cv/uploads/${id}`, { method: "DELETE" }).catch(() => undefined);
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.ok || res.status === 204) return ok(undefined);
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    const json = await res.json().catch(() => ({}));
    return err(json?.error || "Delete failed", json?.code);
  },
};
