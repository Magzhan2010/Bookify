/** Проверка, что пользователь — подтверждённый учитель. */
export async function approvedTeacher(db, userId) {
  const r = await db.query(`SELECT id, name, class_name, teacher_pending FROM users WHERE id = $1 AND role = 'teacher'`, [userId])
  const t = r.rows[0]
  if (!t) return { error: 'Только для учителей', status: 403 }
  if (t.teacher_pending) return { error: 'Аккаунт учителя ждёт подтверждения библиотекаря', status: 403 }
  return { teacher: t }
}
