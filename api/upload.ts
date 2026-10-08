import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { isAdminRequest } from './lib/admin-auth.js'
import { env } from './lib/runtime.js'

const maxFileSize = 4 * 1024 * 1024
const validTypes = new Set(['question_paper', 'question_bank', 'study_note'])
const folderByType = {
  question_paper: 'question-papers',
  question_bank: 'question-banks',
  study_note: 'study-notes',
} as const

function getStorage() {
  const bucket = env.NEON_STORAGE_BUCKET
  const endpoint = env.AWS_ENDPOINT_URL_S3
  const accessKeyId = env.AWS_ACCESS_KEY_ID
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY
  const region = env.AWS_REGION ?? 'us-east-2'
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error('Neon Storage is not fully configured')
  return {
    bucket,
    client: new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }),
  }
}

function safeFileName(name: string) {
  const clean = name.normalize('NFKC').replace(/[\\/]/g, '-').replace(/[^\p{L}\p{N}._() -]/gu, '').trim()
  return clean.slice(-140) || 'academic-document.pdf'
}

export async function POST(request: Request) {
  if (!await isAdminRequest(request)) return Response.json({ error: 'Admin sign-in required' }, { status: 401 })
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL is not configured' }, { status: 500 })

  let storage: ReturnType<typeof getStorage>
  try { storage = getStorage() } catch (error) {
    console.error('Upload storage is not configured', error)
    return Response.json({ error: 'Neon Storage is not fully configured' }, { status: 500 })
  }

  let objectKey: string | undefined
  let uploaded = false
  try {
    const form = await request.formData()
    const semester = Number(form.get('semester'))
    const subjectCode = String(form.get('subjectCode') ?? '').trim()
    const type = String(form.get('type') ?? '')
    const title = String(form.get('title') ?? '').trim()
    const academicYear = String(form.get('academicYear') ?? '').trim()
    const examTypeInput = String(form.get('examType') ?? '').trim()
    const unitInput = String(form.get('unitNumber') ?? '').trim()
    const file = form.get('file')

    if (!Number.isInteger(semester) || semester < 1 || semester > 8) return Response.json({ error: 'Choose a valid semester' }, { status: 400 })
    if (!subjectCode) return Response.json({ error: 'Choose a subject' }, { status: 400 })
    if (!validTypes.has(type)) return Response.json({ error: 'Choose a valid material type' }, { status: 400 })
    if (!title || title.length > 180) return Response.json({ error: 'Title is required and must be under 180 characters' }, { status: 400 })
    if (!(file instanceof File)) return Response.json({ error: 'Choose a PDF file' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') return Response.json({ error: 'Only PDF files are supported for now' }, { status: 400 })
    if (file.size === 0 || file.size > maxFileSize) return Response.json({ error: 'PDF must be smaller than 4 MB' }, { status: 413 })
    const fileHeader = new Uint8Array(await file.slice(0, 5).arrayBuffer())
    if (new TextDecoder().decode(fileHeader) !== '%PDF-') return Response.json({ error: 'The selected file does not look like a valid PDF' }, { status: 400 })

    const examType = examTypeInput || null
    if (type === 'question_paper' && !['CT1', 'CT2', 'SEMESTER'].includes(examType ?? '')) {
      return Response.json({ error: 'Choose CT1, CT2, or Semester Exam for a question paper' }, { status: 400 })
    }
    const year = academicYear ? Number(academicYear) : null
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) return Response.json({ error: 'Enter a valid academic year' }, { status: 400 })
    const unitNumber = unitInput ? Number(unitInput) : null
    if (unitNumber !== null && (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20)) return Response.json({ error: 'Unit must be a number from 1 to 20' }, { status: 400 })

    const sql = neon(databaseUrl)
    const subjects = await sql`SELECT id, semester FROM subjects WHERE subject_code = ${subjectCode} AND is_active = TRUE LIMIT 1`
    const subject = subjects[0]
    if (!subject || Number(subject.semester) !== semester) return Response.json({ error: 'That subject does not belong to the selected semester' }, { status: 400 })

    const fileName = safeFileName(file.name)
    objectKey = `semester-${semester}/${subjectCode}/${folderByType[type as keyof typeof folderByType]}/${crypto.randomUUID()}-${fileName}`
    await storage.client.send(new PutObjectCommand({
      Bucket: storage.bucket,
      Key: objectKey,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: 'application/pdf',
    }))
    uploaded = true

    const rows = await sql`
      INSERT INTO documents (subject_id, title, document_type, exam_type, unit_number, academic_year, storage_key, file_name, mime_type, status)
      VALUES (${String(subject.id)}, ${title}, ${type}, ${examType}, ${unitNumber}, ${year === null ? null : String(year)}, ${objectKey}, ${fileName}, 'application/pdf', 'published')
      RETURNING id, title, file_name, document_type
    `
    return Response.json({ document: rows[0] }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (uploaded && objectKey) {
      try { await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: objectKey })) }
      catch (cleanupError) { console.error('Could not clean up object after failed registration', cleanupError) }
    }
    console.error('Academic material upload failed', error)
    return Response.json({ error: 'Upload could not be completed. Check the server logs and try again.' }, { status: 500 })
  }
}
