/**
 * Ссылки на видео учеников: определяем площадку, превью и адрес для встроенного плеера.
 * Используется и на сервере (проверка ссылки), и в интерфейсе.
 */
export const PLATFORMS = {
  youtube: { label: 'YouTube', color: '#ff0033' },
  instagram: { label: 'Instagram', color: '#e1306c' },
  tiktok: { label: 'TikTok', color: '#111111' },
  drive: { label: 'Google Диск', color: '#1a73e8' },
  link: { label: 'Видео', color: '#1a56db' }
}

export function parseVideo(raw) {
  const s = String(raw || '').trim()
  let u
  try { u = new URL(s) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^www\.|^m\./, '')
  const parts = u.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be' && parts[0]) return yt(parts[0], s)
  if (host.endsWith('youtube.com')) {
    if (u.searchParams.get('v')) return yt(u.searchParams.get('v'), s)
    if (['shorts', 'embed', 'live'].includes(parts[0]) && parts[1]) return yt(parts[1], s, parts[0] === 'shorts')
  }
  if (host.endsWith('instagram.com') && ['reel', 'reels', 'p', 'tv'].includes(parts[0]) && parts[1]) {
    return { platform: 'instagram', url: s, embed: `https://www.instagram.com/${parts[0] === 'reels' ? 'reel' : parts[0]}/${parts[1]}/embed`, vertical: true }
  }
  if (host.endsWith('tiktok.com')) {
    const i = parts.indexOf('video')
    if (i >= 0 && /^\d+$/.test(parts[i + 1] || '')) return { platform: 'tiktok', url: s, embed: `https://www.tiktok.com/embed/v2/${parts[i + 1]}`, vertical: true }
    return { platform: 'tiktok', url: s, embed: null, vertical: true }
  }
  if (host === 'drive.google.com') {
    const i = parts.indexOf('d')
    const id = i >= 0 ? parts[i + 1] : u.searchParams.get('id')
    if (id) return { platform: 'drive', url: s, embed: `https://drive.google.com/file/d/${id}/preview`, thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w640` }
  }
  return { platform: 'link', url: s, embed: null }
}

function yt(id, url, vertical = false) {
  const clean = String(id).replace(/[^\w-]/g, '').slice(0, 20)
  return {
    platform: 'youtube',
    url,
    embed: `https://www.youtube-nocookie.com/embed/${clean}?autoplay=1&rel=0`,
    thumb: `https://i.ytimg.com/vi/${clean}/hqdefault.jpg`,
    vertical
  }
}
