// Keep the complete multipart request below the 3 MiB Preview cap. Reserve
// space for the boundary and the small, explicitly allowed form fields.
export const MAX_CV_REQUEST_BYTES = 3 * 1024 * 1024;
export const MAX_CV_FILE_BYTES = MAX_CV_REQUEST_BYTES - 16 * 1024;
export const MAX_TXT_CHARS = 50_000;

export type CvFileIssue = 'unsupported' | 'empty' | 'too_large' | 'invalid_content';
export type CvFileKind = 'txt' | 'pdf' | 'docx';

export function cvFileKind(name: string): CvFileKind | null {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  const extension = match?.[1]?.toLowerCase();
  return extension === 'txt' || extension === 'pdf' || extension === 'docx' ? extension : null;
}

export async function validateSyntheticCvFile(file: File): Promise<CvFileIssue | null> {
  const kind = cvFileKind(file.name);
  if (!kind) return 'unsupported';
  if (!file.size) return 'empty';
  if (file.size > MAX_CV_FILE_BYTES) return 'too_large';
  const allowedTypes: Record<CvFileKind, string[]> = {
    txt: ['text/plain', 'application/octet-stream', ''],
    pdf: ['application/pdf', 'application/octet-stream', ''],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream', ''],
  };
  if (!allowedTypes[kind].includes(file.type.toLowerCase())) return 'invalid_content';
  if (kind === 'txt') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      return !text.trim() || text.length > MAX_TXT_CHARS || text.includes('\0') ? 'invalid_content' : null;
    } catch { return 'invalid_content'; }
  }
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const pdf = [37, 80, 68, 70, 45]; // %PDF-
  const docx = [80, 75, 3, 4]; // ZIP local-file header; backend validates OOXML parts.
  const expected = kind === 'pdf' ? pdf : docx;
  return expected.every((byte, index) => signature[index] === byte) ? null : 'invalid_content';
}
