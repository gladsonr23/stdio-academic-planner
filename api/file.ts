import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { neon } from '@neondatabase/serverless'

export async function GET(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    const bucket = process.env.NEON_STORAGE_BUCKET
    const endpoint = process.env.AWS_ENDPOINT_URL_S3
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION ?? 'us-east-2'

    if (!databaseUrl || !bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'Neon Storage is not fully configured' }, { status: 500 })
    }

    const documentId = new URL(request.url).searchParams.get('id')
    if (!documentId) return Response.json({ error: 'Document id is required' }, { status: 400 })

    const sql = neon(databaseUrl)
    const documents = await sql`
      SELECT storage_key, file_name
      FROM documents
      WHERE id = ${documentId} AND status = 'published'
      LIMIT 1
    `
    const document = documents[0]
    if (!document) return Response.json({ error: 'Document not found' }, { status: 404 })

    const storage = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })
    const signedUrl = await getSignedUrl(storage, new GetObjectCommand({
      Bucket: bucket,
      Key: String(document.storage_key),
      ResponseContentDisposition: `inline; filename="${String(document.file_name).replaceAll('"', '')}"`,
      ResponseContentType: 'application/pdf',
    }), { expiresIn: 300 })

    return Response.redirect(signedUrl, 302)
  } catch (error) {
    console.error('Failed to open Neon Storage document', error)
    return Response.json({ error: 'Unable to open document' }, { status: 500 })
  }
}
