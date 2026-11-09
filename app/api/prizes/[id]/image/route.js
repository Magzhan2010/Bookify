import pool from '../../../../../lib/db'

/** GET /api/prizes/[id]/image — своё фото приза (data:URL → картинка), кеш навсегда (адрес с ?v=). */
export async function GET(req, { params }) {
  const id = parseInt((await params).id)
  try {
    const r = await pool.query('SELECT image FROM prizes WHERE id = $1', [id])
    const image = r.rows[0]?.image
    if (!image || !image.startsWith('data:')) return new Response('Not found', { status: 404 })
    const mime = image.slice(5, image.indexOf(';'))
    const buf = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64')
    return new Response(buf, { headers: { 'Content-Type': mime, 'Content-Length': String(buf.length), 'Cache-Control': 'public, max-age=31536000, immutable' } })
  } catch (err) {
    console.error('[prize image]', err)
    return new Response('Error', { status: 500 })
  }
}
