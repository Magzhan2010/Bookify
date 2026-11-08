import pool from '../../../../../lib/db'

/**
 * GET /api/quotes/[id]/image — фото автора цитаты как обычная картинка.
 * Адрес содержит ?v=<время изменения>, поэтому кешируем «навсегда».
 */
export async function GET(req, { params }) {
  const { id } = await params
  try {
    const res = await pool.query('SELECT image FROM quotes WHERE id = $1', [id])
    const image = res.rows[0]?.image
    if (!image) return new Response('Not found', { status: 404 })

    if (!image.startsWith('data:')) {
      return Response.redirect(image, 302)
    }
    const comma = image.indexOf(',')
    const mime = image.slice(5, image.indexOf(';'))
    const buf = Buffer.from(image.slice(comma + 1), 'base64')
    return new Response(buf, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buf.length),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    console.error('Quote image error:', err)
    return new Response('Error', { status: 500 })
  }
}
