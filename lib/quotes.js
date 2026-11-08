/**
 * Общее для API цитат: проверка входных данных и адрес картинки.
 */

const MAX_IMAGE_BYTES = 450 * 1024 // ~450 КБ после сжатия в браузере
const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

export function validateQuote(body) {
  const text = String(body?.text || '').trim().slice(0, 600)
  const author_name = String(body?.author_name || '').trim().slice(0, 120)
  const author_info = String(body?.author_info || '').trim().slice(0, 160) || null
  const book_title = String(body?.book_title || '').trim().slice(0, 200) || null
  const book_id = parseInt(body?.book_id) || null
  let image = body?.image === null ? null : String(body?.image || '').trim() || null

  if (text.length < 5) return { error: 'Впиши цитату' }
  if (!author_name) return { error: 'Укажи, кто это сказал' }

  if (image) {
    if (image.startsWith('data:')) {
      if (!DATA_URL_RE.test(image)) return { error: 'Фото должно быть JPG, PNG или WebP' }
      const bytes = Math.floor((image.length - image.indexOf(',') - 1) * 0.75)
      if (bytes > MAX_IMAGE_BYTES) return { error: 'Фото слишком большое' }
    } else if (!/^https:\/\/\S+$/i.test(image)) {
      return { error: 'Ссылка на фото должна начинаться с https://' }
    }
  }

  return { value: { text, author_name, author_info, book_title, book_id, image } }
}

/** Публичный вид цитаты: вместо тяжёлого data:URL — короткий адрес картинки. */
export function publicQuote(q) {
  let image_url = null
  if (q.image?.startsWith('data:')) {
    image_url = `/api/quotes/${q.id}/image?v=${new Date(q.updated_at).getTime()}`
  } else if (q.image) {
    image_url = q.image
  }
  const { image, ...rest } = q
  return { ...rest, image_url }
}
