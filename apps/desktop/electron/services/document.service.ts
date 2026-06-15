import { extractDocumentText, DocumentError } from "../core/document";
import { ok, err, type Result } from "@compass/ipc-contract";

/** Document service — local file → text extraction (resume import, etc.). */
export const documentService = {
  async extractText(fileName: string, bytes: Uint8Array): Promise<Result<{ text: string }>> {
    try {
      const text = await extractDocumentText(fileName, bytes);
      if (!text) return err("No text found in that file.", "EMPTY_RESULT");
      return ok({ text });
    } catch (e) {
      if (e instanceof DocumentError) return err(e.message, e.code);
      return err(e instanceof Error ? e.message : "Could not read the file", "PARSE_FAILED");
    }
  },
};
