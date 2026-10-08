import { neon } from '@neondatabase/serverless'

const allowedTypes = new Set(['question_bank', 'study_note'])

export async function GET(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return Response.json({ error: 'DATABASE_URL is not configured' }, { status: 500 })
    const params = new URL(request.url).searchParams
    const subjectCode = params.get('subjectCode')?.trim()
    const documentType = params.get('type')?.trim() ?? 'question_bank'
    if (!subjectCode) return Response.json({ error: 'subjectCode is required' }, { status: 400 })
    if (!allowedTypes.has(documentType)) return Response.json({ error: 'Invalid document type' }, { status: 400 })
    const sql = neon(databaseUrl)
    const documents = await sql`
      SELECT d.id, d.title, d.document_type, d.exam_type, d.unit_number, d.academic_year,
             d.file_name, d.storage_key, s.subject_code, s.subject_name
      FROM documents d JOIN subjects s ON s.id = d.subject_id
      WHERE s.subject_code = ${subjectCode}
        AND (d.document_type = ${documentType} OR (${documentType} = 'question_bank' AND d.document_type = 'question_paper'))
        AND d.status = 'published'
      ORDER BY d.academic_year DESC NULLS LAST, d.created_at DESC
    `
    // Admin uploads and archives change this list at runtime; stale cached IDs can
    // point to archived rows that the file endpoint correctly refuses to open.
    return Response.json({ documents }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load Neon documents', error)
    return Response.json({ error: 'Unable to load documents' }, { status: 500 })
  }
}
