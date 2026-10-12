/**
 * Очистка тестовых данных до указанной даты.
 *
 *   node scripts/cleanup-before-date.js                    # просмотр (ничего не удаляет)
 *   node scripts/cleanup-before-date.js --apply            # удалить
 *   node scripts/cleanup-before-date.js --before=2026-10-08
 *   node scripts/cleanup-before-date.js --apply --include-active
 *   node scripts/cleanup-before-date.js --apply --comments
 *
 * ⚠️  Без --apply скрипт НИЧЕГО НЕ УДАЛЯЕТ, только показывает, что удалит.
 *
 * Почему важно пересчитывать available_copies:
 * счётчик экземпляров в books хранится отдельно от займов. Если просто
 * удалить строки из borrows, книги останутся с заниженным available_copies
 * (как будто их кто-то держит, хотя никто не держит). Поэтому после удаления
 * скрипт пересчитывает: available = total - (число активных займов).
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
const readline = require('readline')
const { Client } = require('pg')

const args = process.argv.slice(2)
const getArg = (name, def) => {
  const hit = args.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : def
}
const hasFlag = name => args.includes(`--${name}`)

const BEFORE = getArg('before', '2026-10-08')
const APPLY = hasFlag('apply')
const INCLUDE_ACTIVE = hasFlag('include-active')
const WITH_COMMENTS = hasFlag('comments')

;(async () => {
  const date = new Date(BEFORE + 'T00:00:00')
  if (isNaN(date.getTime())) {
    console.error(`❌ Не понял дату «${BEFORE}». Ожидается ГГГГ-ММ-ДД`)
    process.exit(1)
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false
  })
  await client.connect()
  console.log('✅ Подключено к БД\n')

  const mode = APPLY ? '🔴 УДАЛЕНИЕ' : '👁 ПРОСМОТР (ничего не изменится)'
  console.log(`Режим: ${mode}`)
  console.log(`Дата отсечения: всё, что произошло ДО ${BEFORE} (${date.toISOString()})\n`)

  // ───── Сколько чего удалится ─────
  const borrowsAll = await client.query(
    `SELECT COUNT(*)::int AS c FROM borrows WHERE borrowed_at < $1`,
    [date]
  )
  const borrowsReturned = await client.query(
    `SELECT COUNT(*)::int AS c FROM borrows WHERE borrowed_at < $1 AND status = 'returned'`,
    [date]
  )
  const borrowsActive = await client.query(
    `SELECT COUNT(*)::int AS c FROM borrows WHERE borrowed_at < $1 AND status = 'active'`,
    [date]
  )
  const requests = await client.query(
    `SELECT COUNT(*)::int AS c FROM book_requests WHERE requested_at < $1`,
    [date]
  )
  const comments = await client.query(
    `SELECT COUNT(*)::int AS c FROM book_comments WHERE created_at < $1`,
    [date]
  )

  console.log('📋 Будет обработано:')
  console.log(`   Займов всего:              ${borrowsAll.rows[0].c}`)
  console.log(`     из них возвращённых:     ${borrowsReturned.rows[0].c}`)
  console.log(`     из них активных:         ${borrowsActive.rows[0].c}  ${INCLUDE_ACTIVE ? '(будут удалены)' : '(НЕ трогаю)'}`)
  console.log(`   Заявок:                    ${requests.rows[0].c}`)
  console.log(`   Комментариев:              ${WITH_COMMENTS ? comments.rows[0].c : `${comments.rows[0].c}  (флажок --comments не указан, пропускаю)`}`)

  if (borrowsActive.rows[0].c > 0 && !INCLUDE_ACTIVE) {
    console.log(`\n⚠️  Активные займы до ${BEFORE} останутся на месте.`)
    console.log(`   Это значит: эти книги числятся выданными и сейчас у кого-то на руках.`)
    console.log(`   Если это тоже тесты — добавь флажок --include-active.`)
  }

  if (borrowsAll.rows[0].c === 0 && requests.rows[0].c === 0) {
    console.log('\n✅ Нечего удалять — до этой даты записей нет.')
    await client.end()
    return
  }

  // Показать, что именно попадёт под удаление (первые 15)
  const preview = await client.query(
    `SELECT b.borrowed_at::date AS date, u.name AS student, bk.title AS book, b.status
     FROM borrows b
     JOIN users u ON u.id = b.user_id
     JOIN books bk ON bk.id = b.book_id
     WHERE b.borrowed_at < $1
     ORDER BY b.borrowed_at ASC
     LIMIT 15`,
    [date]
  )
  if (preview.rows.length > 0) {
    console.log('\n📖 Примеры записей (первые 15 из ' + borrowsAll.rows[0].c + '):')
    preview.rows.forEach(r => {
      console.log(`   ${String(r.date).padEnd(12)} ${String(r.student).slice(0, 24).padEnd(24)} ${String(r.book).slice(0, 34).slice(0, 34)} [${r.status}]`)
    })
    if (borrowsAll.rows[0].c > 15) {
      console.log(`   ... и ещё ${borrowsAll.rows[0].c - 15}`)
    }
  }

  if (!APPLY) {
    console.log('\n───────────────')
    console.log('Это был просмотр. Ничего не удалено.')
    console.log('Если всё верно, повтори с флажком --apply:')
    console.log(`   node scripts/cleanup-before-date.js --before=${BEFORE} --apply${WITH_COMMENTS ? ' --comments' : ''}${INCLUDE_ACTIVE ? ' --include-active' : ''}`)
    await client.end()
    return
  }

  // ───── Подтверждение ─────
  if (!hasFlag('yes')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise(res => rl.question('\nУдалить эти записи? (напиши DELETE): ', res))
    rl.close()
    if (answer.trim().toUpperCase() !== 'DELETE') {
      console.log('❌ Отменено. Ничего не удалено.')
      await client.end()
      return
    }
  }

  // ───── Удаление в одной транзакции ─────
  console.log('\n⏳ Удаляю...')
  await client.query('BEGIN')

  try {
    let delBorrows = 0
    if (INCLUDE_ACTIVE) {
      const r = await client.query('DELETE FROM borrows WHERE borrowed_at < $1', [date])
      delBorrows = r.rowCount
    } else {
      const r = await client.query(
        `DELETE FROM borrows WHERE borrowed_at < $1 AND status = 'returned'`,
        [date]
      )
      delBorrows = r.rowCount
    }

    const delRequests = await client.query(
      'DELETE FROM book_requests WHERE requested_at < $1',
      [date]
    ).then(r => r.rowCount)

    let delComments = 0
    if (WITH_COMMENTS) {
      const r = await client.query('DELETE FROM book_comments WHERE created_at < $1', [date])
      delComments = r.rowCount
    }

    // ───── Ключевой шаг: пересчёт доступных экземпляров ─────
    const fixed = await client.query(`
      UPDATE books bk
      SET available_copies = GREATEST(0, bk.total_copies - COALESCE(active.cnt, 0)::int),
          updated_at = NOW()
      FROM (
        SELECT book_id, COUNT(*) AS cnt
        FROM borrows WHERE status = 'active'
        GROUP BY book_id
      ) active
      WHERE bk.id = active.book_id
    `)

    // книги без активных займов тоже надо привести в порядок
    const fixedNoLoans = await client.query(`
      UPDATE books bk
      SET available_copies = bk.total_copies
      WHERE bk.id NOT IN (SELECT book_id FROM borrows WHERE status = 'active')
        AND bk.available_copies <> bk.total_copies
    `)

    await client.query('COMMIT')

    console.log('\n✅ Готово. Удалено:')
    console.log(`   Займов:        ${delBorrows}`)
    console.log(`   Заявок:        ${delRequests}`)
    if (WITH_COMMENTS) console.log(`   Комментариев:  ${delComments}`)
    console.log(`   Счётчики экземпляров пересчитаны для ${fixed.rowCount + fixedNoLoans.rowCount} книг`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Ошибка — откатил все изменения:', err.message)
    await client.end()
    process.exit(1)
  }

  // Итоговая проверка
  const after = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM borrows) AS borrows_left,
      (SELECT COUNT(*) FROM borrows WHERE status = 'active') AS active_left,
      (SELECT COUNT(*) FROM book_requests) AS requests_left,
      (SELECT COUNT(*) FROM books WHERE available_copies > total_copies) AS broken_counters
  `)

  console.log('\n📊 Осталось в базе:')
  console.log(`   Займов:     ${after.rows[0].borrows_left} (из них активных: ${after.rows[0].active_left})`)
  console.log(`   Заявок:     ${after.rows[0].requests_left}`)
  if (after.rows[0].broken_counters > 0) {
    console.log(`   ⚠️  Книг со сломанным счётчиком: ${after.rows[0].broken_counters}`)
  } else {
    console.log('   ✅ Счётчики экземпляров в порядке')
  }

  await client.end()
})().catch(e => {
  console.error('❌ Ошибка:', e.message)
  process.exit(1)
})