/**
 * Призы: картинки и проверка данных.
 * У встроенных призов (bookmark, highlighter, pen, notebook, mug, wishbook) фото лежат
 * в /public/prizes/photo и показываются галереей. Если библиотекарь загрузил своё фото,
 * оно хранится в prizes.image как data:URL и отдаётся по /api/prizes/[id]/image.
 */
export function customImage(id, image, updatedAt) {
  if (!image || !String(image).startsWith('data:')) return null
  const v = updatedAt ? new Date(updatedAt).getTime() : 0
  return `/api/prizes/${id}/image?v=${v}`
}

export function publicPrize(p) {
  const { image, updated_at, ...rest } = p
  return { ...rest, custom_image: customImage(p.id, image, updated_at) }
}

const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

/** Проверка полей приза. image: undefined — не менять, null — убрать своё фото. */
export function validatePrize(b, { partial = false } = {}) {
  const out = {}
  if (!partial || 'title' in b) {
    const t = String(b.title || '').trim().slice(0, 80)
    if (!t) return { error: 'Назови приз' }
    out.title = t
  }
  if ('description' in b) out.description = String(b.description || '').trim().slice(0, 200) || null
  if (!partial || 'price' in b) {
    const p = parseInt(b.price)
    if (!(p >= 1 && p <= 100000)) return { error: 'Цена — от 1 монеты' }
    out.price = p
  }
  if ('stock' in b) {
    if (b.stock === null || b.stock === '') out.stock = null
    else {
      const s = parseInt(b.stock)
      if (!(s >= 0 && s <= 100000)) return { error: 'Остаток — число от 0' }
      out.stock = s
    }
  }
  if ('active' in b) out.active = !!b.active
  if ('needs_note' in b) out.needs_note = !!b.needs_note
  if ('image' in b) {
    if (b.image === null) out.image = null
    else if (typeof b.image === 'string' && IMG.test(b.image) && b.image.length < 700000) out.image = b.image
    else return { error: 'Фото должно быть JPG, PNG или WebP до 500 КБ' }
  }
  return { value: out }
}
