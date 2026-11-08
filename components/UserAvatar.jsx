'use client'

/**
 * Круглая аватарка пользователя: фото, если ученик его поставил, иначе первая буква имени.
 * Размер и цвет фона задаются className, как раньше у кружков с буквой.
 */
export default function UserAvatar({ src, name, className = '', style }) {
  return (
    <div className={`overflow-hidden flex items-center justify-center shrink-0 ${className}`} style={style}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        : (name || '?').charAt(0).toUpperCase()}
    </div>
  )
}
