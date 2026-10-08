import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { plainAnswerText } from '../../shared/plain-answer.js'

export type NotesSourceDocument = {
  id: string
  title: string
  file_name: string
  storage_key: string
  exam_type: string | null
  academic_year: string | null
  semester: number
  subject_code: string
  short_name: string
  subject_name: string
}

function pdfSafeText(value: string) {
  const replacements: Record<string, string> = {
    '–': '-', '—': '-', '−': '-', '…': '...', '“': '"', '”': '"', '‘': "'", '’': "'",
    '•': '-', '·': '-', '×': 'x', '÷': '/', '≤': '<=', '≥': '>=', '≠': '!=', '→': '->', '←': '<-',
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'θ': 'theta', 'λ': 'lambda', 'μ': 'mu', 'π': 'pi', 'σ': 'sigma', 'τ': 'tau', 'φ': 'phi', 'ω': 'omega',
    'Α': 'Alpha', 'Β': 'Beta', 'Γ': 'Gamma', 'Δ': 'Delta', 'Θ': 'Theta', 'Λ': 'Lambda', 'Π': 'Pi', 'Σ': 'Sigma', 'Φ': 'Phi', 'Ω': 'Omega',
    '∞': 'infinity', '√': 'sqrt', '∑': 'sum', '∏': 'product', '≈': '~=', '∂': 'd', '∇': 'grad', '°': ' degrees',
  }
  return value.replace(/[–—−…“”‘’•·×÷≤≥≠→←αβγδεθλμπστφωΑΒΓΔΘΛΠΣΦΩ∞√∑∏≈∂∇°]/g, character => replacements[character] ?? character)
    .normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/[^\x20-\x7E]/g, '')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfSafeText(text).trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) {
      line = next
      continue
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

export async function createStudyNotesPdf(source: NotesSourceDocument, notes: string) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${source.title} - Solved Study Notes`)
  pdf.setAuthor('STDiO Academic Planner')
  pdf.setSubject(`${source.subject_code} · ${source.subject_name}`)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const pages: PDFPage[] = []
  const pageSize: [number, number] = [612, 792]
  const margin = 52
  const contentWidth = pageSize[0] - margin * 2
  let page!: PDFPage
  let y = 0

  function addPage() {
    page = pdf.addPage(pageSize)
    pages.push(page)
    page.drawText('STDiO  /  STUDY NOTES', { x: margin, y: 746, size: 8, font: boldFont, color: rgb(0.72, 0.33, 0.16) })
    page.drawText(pdfSafeText(source.subject_code), { x: 430, y: 746, size: 8, font: boldFont, color: rgb(0.08, 0.24, 0.17) })
    page.drawLine({ start: { x: margin, y: 733 }, end: { x: 612 - margin, y: 733 }, thickness: 0.7, color: rgb(0.84, 0.82, 0.77) })
    y = 714
  }

  addPage()
  for (const line of wrapText(source.title, titleFont, 22, contentWidth)) {
    page.drawText(line, { x: margin, y, size: 22, font: titleFont, color: rgb(0.1, 0.13, 0.11) })
    y -= 27
  }
  for (const line of wrapText(`${source.subject_code} · ${source.subject_name} · Semester ${source.semester}`, bodyFont, 9, contentWidth)) {
    page.drawText(line, { x: margin, y, size: 9, font: bodyFont, color: rgb(0.36, 0.4, 0.37) })
    y -= 13
  }
  const sourceLine = `Solved study notes${source.exam_type ? ` · ${source.exam_type}` : ''}${source.academic_year ? ` · ${source.academic_year}` : ''}`
  page.drawText(pdfSafeText(sourceLine), { x: margin, y, size: 9, font: bodyFont, color: rgb(0.36, 0.4, 0.37) })
  y -= 23
  page.drawText('AI-generated answers. Review against course materials.', { x: margin, y, size: 8, font: bodyFont, color: rgb(0.57, 0.35, 0.19) })
  y -= 28

  const ensureSpace = (height: number) => {
    if (y - height < 58) {
      addPage()
      y -= 4
    }
  }

  for (const rawLine of plainAnswerText(notes).replace(/```[\w-]*\n?/g, '').split(/\r?\n/)) {
    let line = rawLine.trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
    if (!line) { y -= 5; continue }
    if (/^\|?\s*:?-{3,}/.test(line)) continue
    line = line.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, '  /  ')
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    const isMajorHeading = Boolean(heading && heading[1].length <= 2)
    const isSubheading = Boolean(heading && heading[1].length === 3)
    if (heading) line = heading[2]
    const bullet = line.match(/^[-*+]\s+(.+)$/)
    if (bullet) line = `- ${bullet[1]}`
    const font = isMajorHeading || isSubheading ? boldFont : bodyFont
    const size = isMajorHeading ? 14 : isSubheading ? 11.5 : 10
    const leading = isMajorHeading ? 19 : isSubheading ? 16 : 14
    const indent = bullet ? 12 : 0
    if (isMajorHeading) y -= 7
    ensureSpace(leading)
    const wrapped = wrapText(line, font, size, contentWidth - indent)
    for (const wrappedLine of wrapped) {
      ensureSpace(leading)
      page.drawText(wrappedLine, {
        x: margin + indent,
        y,
        size,
        font,
        color: isMajorHeading || isSubheading ? rgb(0.08, 0.24, 0.17) : rgb(0.13, 0.15, 0.14),
      })
      y -= leading
    }
  }

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: margin, y: 43 }, end: { x: 612 - margin, y: 43 }, thickness: 0.6, color: rgb(0.84, 0.82, 0.77) })
    currentPage.drawText('Check answers against your course materials.', { x: margin, y: 29, size: 8, font: bodyFont, color: rgb(0.42, 0.45, 0.42) })
    currentPage.drawText(`${index + 1} / ${pages.length}`, { x: 520, y: 29, size: 8, font: bodyFont, color: rgb(0.42, 0.45, 0.42) })
  })
  return pdf.save()
}
