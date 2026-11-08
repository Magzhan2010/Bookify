import pool from '../../../../../lib/db'

/**
 * GET /api/users/[id]/avatar — аватарка как обычная картинка.
 * В адресе есть ?v=<время>, поэтому кешируем «навсегда».
 */
export async function GET(req, { params }) {
  const id = parseInt((await params).id)
  if (!id) return new Response('Not found', { status: 404 })
  try {
    const res = await pool.query('SELECT avatar FROM users WHERE id = $1', [id])
    const image = res.rows[0]?.avatar
    if (!image || !image.startsWith('data:')) return new Response('Not found', { status: 404 })
    const mime = image.slice(5, image.indexOf(';'))
    const buf = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64')
    return new Response(buf, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buf.length),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    console.error('[avatar GET]', err)
    return new Response('Error', { status: 500 })
  }
}
