import { toast } from "sonner";
import { api } from "@/lib/ipc";

/**
 * Render HTML → PDF (system Chrome/Edge) and save it to the user's Downloads folder,
 * then open it. One place so the resume, tailored resume, and cover letter all behave
 * identically. Shows a toast on success/failure; returns the saved path (or null).
 */
export async function downloadPdf(html: string, filename: string): Promise<string | null> {
  const rendered = await api.pdf.render(html);
  if (!rendered.ok) {
    toast.error(rendered.error);
    return null;
  }
  const saved = await api.artifact.saveAndOpenPdf(rendered.data.base64, filename);
  if (!saved.ok) {
    toast.error(saved.error);
    return null;
  }
  toast.success("Saved to Downloads");
  return saved.data.path;
}
