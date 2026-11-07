import StudentShell from '../../components/game/StudentShell'

/**
 * Общий макет ученического раздела: каталог, профиль, книги, магазин,
 * лидеры и правила. Меню не перерисовывается при переходах между ними.
 */
export default function StudentLayout({ children }) {
  return <StudentShell>{children}</StudentShell>
}
