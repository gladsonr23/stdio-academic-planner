import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { isAdminRequest } from './lib/admin-auth.js'
import { env } from './lib/runtime.js'

function storageClient() {
  const bucket = env.NEON_STORAGE_BUCKET
  const endpoint = env.AWS_ENDPOINT_URL_S3
  const accessKeyId = env.AWS_ACCESS_KEY_ID
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY
  const region = env.AWS_REGION ?? 'us-east-2'
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error('Neon Storage is not fully configured')
  return { bucket, client: new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }) }
}

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) return Response.json({ error: 'Admin sign-in required' }, { status: 401 })
  if (!env.DATABASE_URL) return Response.json({ error: 'DATABASE_URL is not configured' }, { status: 500 })
  try {
    const sql = neon(env.DATABASE_URL)
    const documents = await sql`
      SELECT d.id, d.title, d.document_type, d.exam_type, d.academic_year, d.file_name,
             d.created_at, s.semester, s.subject_code, s.short_name, s.subject_name
      FROM documents d
      JOIN subjects s ON s.id = d.subject_id
      WHERE d.status = 'published'
      ORDER BY d.created_at DESC
      LIMIT 100
    `
    return Response.json({ documents }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load admin document list', error)
    return Response.json({ error: 'Unable to load uploaded files' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!await isAdminRequest(request)) return Response.json({ error: 'Admin sign-in required' }, { status: 401 })
  if (!env.DATABASE_URL) return Response.json({ error: 'DATABASE_URL is not configured' }, { status: 500 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: 'A valid document id is required' }, { status: 400 })
  }

  let storage: ReturnType<typeof storageClient>
  try { storage = storageClient() } catch (error) {
    console.error('Delete storage is not configured', error)
    return Response.json({ error: 'Neon Storage is not fully configured' }, { status: 500 })
  }

  try {
    const sql = neon(env.DATABASE_URL)
    const documents = await sql`SELECT id, storage_key, status FROM documents WHERE id = ${id} LIMIT 1`
    const document = documents[0]
    if (!document || document.status !== 'published') return Response.json({ error: 'Published file not found' }, { status: 404 })

    await sql`UPDATE documents SET status = 'archived' WHERE id = ${id} AND status = 'published'`
    try {
      await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: String(document.storage_key) }))
    } catch (storageError) {
      console.error('Could not delete academic file from Neon Storage', storageError)
      try {
        await sql`UPDATE documents SET status = 'published' WHERE id = ${id} AND status = 'archived'`
      } catch (restoreError) {
        console.error('Could not restore document after Storage delete failure', restoreError)
      }
      return Response.json({ error: 'The PDF could not be removed from Storage. The planner entry was restored when possible; refresh and retry.' }, { status: 502 })
    }

    return Response.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to remove academic document', error)
    return Response.json({ error: 'Unable to remove this file. Refresh the list and try again.' }, { status: 500 })
  }
}
