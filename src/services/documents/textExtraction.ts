// Reads text from an offer letter entirely in the browser.
// PDF → pdf.js, Word (.docx) → mammoth, plain text as-is. Libraries load on demand.

export type DocumentKind = 'pdf' | 'docx' | 'txt'

export class DocumentReadError extends Error {}

export const ACCEPTED_FILE_TYPES =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
export const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PDF_PAGES = 30

export function detectKind(file: File): DocumentKind | 'doc' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (name.endsWith('.docx') || file.type.includes('wordprocessingml')) return 'docx'
  if (name.endsWith('.doc') || file.type === 'application/msword') return 'doc'
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt'
  return null
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException')
      throw new DocumentReadError('This PDF is password-protected. Remove the password (or print it to a new PDF) and try again.')
    throw new DocumentReadError('We couldn’t open this PDF. It may be damaged — try exporting it again, or upload a Word file.')
  }
  const lines: string[] = []
  for (let i = 1; i <= Math.min(doc.numPages, MAX_PDF_PAGES); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let line = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      } else if (item.str && !item.str.endsWith(' ')) line += ' '
    }
    if (line) lines.push(line)
    lines.push('')
  }
  await doc.destroy()
  return lines.join('\n')
}

async function readDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth/mammoth.browser.js')
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  } catch {
    throw new DocumentReadError('We couldn’t read this Word file. Try saving it again as .docx, or export it as a PDF.')
  }
}

export async function extractDocumentText(file: File): Promise<{ text: string; kind: DocumentKind }> {
  const kind = detectKind(file)
  if (kind === 'doc') throw new DocumentReadError('Older Word files (.doc) aren’t supported. In Word, choose File → Save As → Word Document (.docx), or export a PDF.')
  if (!kind) throw new DocumentReadError('Please upload a PDF or Word (.docx) file.')
  if (file.size > MAX_FILE_BYTES) throw new DocumentReadError('This file is larger than 10 MB. Try a smaller PDF or Word file.')
  if (file.size === 0) throw new DocumentReadError('This file is empty.')

  const raw = kind === 'pdf' ? await readPdf(file) : kind === 'docx' ? await readDocx(file) : await file.text()
  const text = raw.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

  if (text.replace(/\s/g, '').length < 40)
    throw new DocumentReadError(
      kind === 'pdf'
        ? 'We couldn’t find any text in this PDF — it may be a scanned image. Try the original digital PDF or a Word file, or enter the details manually.'
        : 'We couldn’t find enough text in this file to read an offer.',
    )
  return { text, kind }
}
