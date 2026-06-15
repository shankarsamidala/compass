/**
 * Local document text extraction (ported from natively's modes:upload-reference-file).
 * Pure-JS, runs in the MAIN process: PDF → pdf-parse, DOCX/DOC → mammoth, plus
 * plain-text decoding. Nothing leaves the machine. ~2-3s for a typical resume.
 */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PARSE_TIMEOUT_MS = 15_000;

const TEXT_EXTS = new Set(["txt", "md", "json", "csv", "tsv", "xml", "html", "log"]);

export class DocumentError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

function ext(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : "";
}

/** Decode a plain-text buffer with BOM detection; reject if it looks binary. */
function decodeText(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) return buf.swap16().toString("utf16le");
  // A null byte in the first chunk almost always means a misnamed binary.
  if (buf.subarray(0, 8000).includes(0)) {
    throw new DocumentError("That file doesn't look like text.", "NOT_TEXT");
  }
  return buf.toString("utf8");
}

/**
 * Extract text from a document. `bytes` is the raw file content (renderer reads it
 * via File.arrayBuffer() and ships a Uint8Array over IPC).
 */
export async function extractDocumentText(fileName: string, bytes: Uint8Array): Promise<string> {
  if (!bytes?.length) throw new DocumentError("Empty file", "EMPTY");
  if (bytes.length > MAX_BYTES) throw new DocumentError("File is larger than 10 MB.", "TOO_LARGE");

  const buffer = Buffer.from(bytes);
  const kind = ext(fileName);

  try {
    if (kind === "pdf") {
      const mod: any = await import("pdf-parse");
      const PDFParse = mod.PDFParse ?? mod.default?.PDFParse;
      const parser = new PDFParse({ data: buffer });
      const data = await withTimeout<{ text?: string }>(parser.getText(), PARSE_TIMEOUT_MS, "PDF parse");
      return (data?.text ?? "").trim();
    }
    if (kind === "docx" || kind === "doc") {
      const mod: any = await import("mammoth");
      const mammoth = mod.default ?? mod;
      const result = await withTimeout<{ value?: string }>(
        mammoth.extractRawText({ buffer }),
        PARSE_TIMEOUT_MS,
        "DOCX parse",
      );
      return (result?.value ?? "").trim();
    }
    if (TEXT_EXTS.has(kind)) {
      return decodeText(buffer).trim();
    }
  } catch (e) {
    if (e instanceof DocumentError) throw e;
    throw new DocumentError(
      "Couldn't read that file — it may be corrupt or password-protected.",
      "PARSE_FAILED",
    );
  }

  throw new DocumentError(`Unsupported file type: .${kind || "?"}`, "UNSUPPORTED");
}
