'use strict';
/* Мой планер. Все данные лежат в localStorage этого устройства. */

const KEY = 'planer.v1';
const CATS = [
  { id: 'work', name: 'Работа', color: '#3b6fd4' },
  { id: 'study', name: 'Учёба', color: '#8a56c9' },
  { id: 'meet', name: 'Встречи', color: '#d4803b' },
  { id: 'self', name: 'Саморазвитие', color: '#c9a227' },
  { id: 'sport', name: 'Спорт', color: '#d24b5a' },
  { id: 'food', name: 'Питание', color: '#2e9e6b' },
  { id: 'other', name: 'Другое', color: '#7a8594' }
];
const REMIND = [['', 'Не напоминать'], ['0', 'В момент начала'], ['5', 'За 5 минут'], ['15', 'За 15 минут'],
  ['30', 'За 30 минут'], ['60', 'За час'], ['1440', 'За день']];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/* ---------- Вспомогательное ---------- */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const wdi = s => (parse(s).getDay() + 6) % 7;            // Пн = 0
const monday = s => addDays(s, -wdi(s));
const today = () => fmt(new Date());
const human = s => { const d = parse(s); return `${WD_FULL[wdi(s)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const short = s => { const d = parse(s); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const lines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);

/* ---------- Данные ---------- */
function sampleMenu() {
  // Пример структуры. Продукты, порции и калории подставятся после расчёта плана сушки.
  const day = () => [
    { name: 'Завтрак', time: '08:00', items: ['Каша (пример)', 'Яйца', 'Фрукт'] },
    { name: 'Перекус', time: '11:00', items: ['Творог или йогурт', 'Орехи'] },
    { name: 'Обед', time: '14:00', items: ['Мясо или птица', 'Крупа', 'Овощи'] },
    { name: 'Полдник', time: '17:00', items: ['Белковый перекус', 'Фрукт'] },
    { name: 'Ужин', time: '20:00', items: ['Рыба', 'Овощи'] }
  ];
  return { title: 'План сушки', goal: '', days: [0, 1, 2, 3, 4, 5, 6].map(day) };
}
function load() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { s = {}; }
  return {
    items: s.items || [], notes: s.notes || [], menu: s.menu || sampleMenu(),
    food: s.food || {}, settings: s.settings || {}
  };
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (_) { toast('Не удалось сохранить: память браузера заполнена'); }
}

const ui = { tab: 'cal', date: today(), month: today().slice(0, 7) + '-01', cat: 'work', noteCat: 'all', foodEdit: false, swap: new Set(), form: null };

/* ---------- Питание: данные дня ---------- */
function templateMeals(date) {
  return (state.menu.days[wdi(date)] || []).map(m => ({
    name: m.name, time: m.time, note: '', items: m.items.map(t => ({ text: t, eaten: false, repl: '' }))
  }));
}
const dayMeals = date => (state.food[date] && state.food[date].meals) || templateMeals(date);
function ensureDay(date) {                       // фиксируем меню дня, чтобы история не менялась при правке меню
  const d = state.food[date] || (state.food[date] = {});
  if (!d.meals) d.meals = templateMeals(date);
  return d;
}
function mealStatus(m) {
  const n = m.items.length, repl = m.items.filter(i => i.repl).length, eaten = m.items.filter(i => i.eaten && !i.repl).length;
  if (!n) return { k: 'none', t: 'Пусто' };
  if (eaten === n) return { k: 'ok', t: 'По плану' };
  if (eaten + repl === n) return { k: 'warn', t: 'С заменой' };
  if (eaten + repl === 0) return { k: 'none', t: 'Не отмечено' };
  return { k: 'warn', t: `${eaten + repl} из ${n}` };
}
function foodStat(dates) {
  let total = 0, eaten = 0, repl = 0, touched = 0;
  for (const d of dates) for (const m of dayMeals(d)) for (const i of m.items) {
    total++; if (i.repl) repl++; else if (i.eaten) eaten++;
  }
  touched = eaten + repl;
  return { total, eaten, repl, touched, pct: total ? Math.round(eaten / total * 100) : 0 };
}

/* ---------- Отрисовка ---------- */
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const v = { cal: viewCal, sec: viewSec, food: viewFood, notes: viewNotes, more: viewMore }[ui.tab];
  $('#view').innerHTML = v();
}

function itemHtml(it, showDate) {
  const c = cat(it.cat);
  const subs = (it.subs || []).map((s, i) =>
    `<label class="${s.done ? 'done' : ''}"><input type="checkbox" class="sm" data-ch="sub" data-id="${it.id}" data-i="${i}" ${s.done ? 'checked' : ''}><span>${esc(s.text)}</span></label>`).join('');
  const subDone = (it.subs || []).filter(s => s.done).length;
  return `<div class="item ${it.done ? 'done' : ''}">
    <input type="checkbox" data-ch="done" data-id="${it.id}" ${it.done ? 'checked' : ''} aria-label="Сделано">
    <div class="body">
      <button class="body" data-act="edit" data-id="${it.id}">
        <div class="title">${esc(it.title)}</div>
        <div class="meta">
          ${showDate ? `<span>${short(it.date)}</span>` : ''}
          ${it.time ? `<span>${esc(it.time)}</span>` : ''}
          <span><i class="dot" style="background:${c.color}"></i>${c.name}</span>
          ${it.type === 'meeting' ? '<span>Встреча</span>' : ''}
          ${it.place ? `<span>${esc(it.place)}</span>` : ''}
          ${it.remind !== '' && it.remind != null && it.time ? '<span>🔔</span>' : ''}
          ${it.subs && it.subs.length ? `<span>${subDone}/${it.subs.length}</span>` : ''}
        </div>
      </button>
      ${subs ? `<div class="subs">${subs}</div>` : ''}
    </div>
  </div>`;
}
const byTime = (a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'));

function viewCal() {
  const m = parse(ui.month), first = monday(ui.month), t = today();
  const marks = {};
  for (const it of state.items) { const x = marks[it.date] || (marks[it.date] = { n: 0, d: 0 }); x.n++; if (it.done) x.d++; }
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(first, i), mk = marks[d];
    if (i === 35 && parse(d).getMonth() !== m.getMonth()) break;
    cells += `<button class="day ${parse(d).getMonth() !== m.getMonth() ? 'out' : ''} ${d === t ? 'today' : ''} ${d === ui.date ? 'sel' : ''}" data-act="day" data-date="${d}">
      ${parse(d).getDate()}<i class="${mk ? (mk.d === mk.n ? 'done' : '') : 'none'}"></i></button>`;
  }
  const items = state.items.filter(i => i.date === ui.date).sort(byTime);
  const done = items.filter(i => i.done).length;
  const fs = foodStat([ui.date]);
  return `
  <div class="row cal-head">
    <h1>${MONTHS[m.getMonth()]} ${m.getFullYear()}</h1>
    <button class="icon-btn" data-act="month" data-d="-1" aria-label="Предыдущий месяц">‹</button>
    <button class="btn sm ghost" data-act="today">Сегодня</button>
    <button class="icon-btn" data-act="month" data-d="1" aria-label="Следующий месяц">›</button>
  </div>
  <div class="card"><div class="grid">${WD.map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div></div>

  <div class="row spread" style="margin:18px 4px 8px">
    <div><b>${human(ui.date)}</b>
      <div class="muted small">${items.length ? `Сделано ${done} из ${items.length}, запланировано ${items.length - done}` : 'Планов пока нет'}</div></div>
    <button class="btn sm ghost" data-act="shareDay">Поделиться</button>
  </div>
  ${items.length ? `<div class="progress" style="margin:0 4px 12px"><b style="width:${Math.round(done / items.length * 100)}%"></b></div>` : ''}
  <div class="card">${items.length ? items.map(i => itemHtml(i)).join('') : '<div class="empty">Нажмите «+», чтобы добавить задачу или встречу</div>'}</div>
  <button class="card list-btn" data-act="foodDay"><i class="dot" style="background:${cat('food').color}"></i>
    <span><b>Питание</b><div class="muted small">${fs.total ? `Отмечено ${fs.touched} из ${fs.total} позиций${fs.repl ? `, замен: ${fs.repl}` : ''}` : 'Меню на этот день не задано'}</div></span><span class="muted" style="flex:none">›</span></button>
  <button class="fab" data-act="add" aria-label="Добавить">+</button>`;
}

function viewSec() {
  const cs = CATS.filter(c => c.id !== 'other').concat(cat('other'));
  const all = state.items.filter(i => i.cat === ui.cat).sort(byTime);
  const plan = all.filter(i => !i.done), done = all.filter(i => i.done).reverse().slice(0, 30);
  const notes = state.notes.filter(n => n.cat === ui.cat);
  return `<h1>Разделы</h1>
  <div class="chips">${cs.map(c => `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-act="cat" data-cat="${c.id}"><i class="dot" style="background:${c.color}"></i>${c.name}</button>`).join('')}</div>
  ${ui.cat === 'food' ? `<button class="card list-btn" data-act="tab" data-tab="food"><span><b>${esc(state.menu.title)}</b><div class="muted small">Меню на неделю и отметки по приёмам пищи</div></span><span class="muted" style="flex:none">›</span></button>` : ''}
  <h2>Запланировано · ${plan.length}</h2>
  <div class="card">${plan.length ? plan.map(i => itemHtml(i, true)).join('') : '<div class="empty">Ничего не запланировано</div>'}</div>
  <h2>Сделано · ${all.length - plan.length}</h2>
  <div class="card">${done.length ? done.map(i => itemHtml(i, true)).join('') : '<div class="empty">Пока пусто</div>'}</div>
  <div class="row spread"><h2>Заметки · ${notes.length}</h2><button class="btn sm ghost" data-act="noteAdd" data-cat="${ui.cat}">Новая заметка</button></div>
  ${notes.length ? notes.map(noteHtml).join('') : '<div class="card"><div class="empty">Заметок в этом разделе нет</div></div>'}
  <button class="fab" data-act="add" data-cat="${ui.cat}" aria-label="Добавить">+</button>`;
}

function viewFood() {
  const mon = monday(ui.date), week = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i));
  const ws = foodStat(week);
  const head = `<div class="row spread"><h1 style="margin-bottom:6px">${esc(state.menu.title)}</h1>
    <button class="btn sm ${ui.foodEdit ? '' : 'ghost'}" data-act="foodEdit">${ui.foodEdit ? 'Готово' : 'Меню'}</button></div>`;
  const weekRow = `<div class="row spread" style="margin-bottom:8px">
      <button class="icon-btn" data-act="week" data-d="-7" aria-label="Предыдущая неделя">‹</button>
      <div class="muted small">${short(week[0])} – ${short(week[6])}</div>
      <button class="icon-btn" data-act="week" data-d="7" aria-label="Следующая неделя">›</button></div>
    <div class="week">${week.map((d, i) => { const s = foodStat([d]); return `<button class="wday ${d === ui.date ? 'on' : ''}" data-act="day" data-date="${d}">${WD[i]}<b>${parse(d).getDate()}</b><em>${s.touched ? s.pct + '%' : ''}</em></button>`; }).join('')}</div>`;

  if (ui.foodEdit) {
    const w = wdi(ui.date), meals = state.menu.days[w] || [];
    return head + weekRow + `
    <div class="hint">Вы редактируете шаблон меню на день недели: <b>${WD_FULL[w].toLowerCase()}</b>. Каждое блюдо или продукт пишите с новой строки. Уже отмеченные дни не изменятся.</div>
    <div class="card">
      <label class="f">Название плана<input data-ch="menuTitle" value="${esc(state.menu.title)}"></label>
      <label class="f" style="margin-bottom:0">Цель и заметки по плану<textarea data-ch="menuGoal" placeholder="Например: цель по весу, калории, БЖУ. Заполним после расчёта.">${esc(state.menu.goal)}</textarea></label>
    </div>
    ${meals.map((m, i) => `<div class="card">
      <div class="two"><label class="f">Приём пищи<input data-ch="mName" data-i="${i}" value="${esc(m.name)}"></label>
      <label class="f">Время<input type="time" data-ch="mTime" data-i="${i}" value="${esc(m.time)}"></label></div>
      <label class="f">Что едим (по строке на позицию)<textarea data-ch="mItems" data-i="${i}">${esc(m.items.join('\n'))}</textarea></label>
      <button class="btn sm danger" data-act="mealDel" data-i="${i}">Удалить приём пищи</button></div>`).join('')}
    <div class="actions"><button class="btn ghost" data-act="mealAdd">Добавить приём пищи</button>
    <button class="btn plain" style="background:var(--card)" data-act="copyDay">Скопировать этот день на всю неделю</button></div>`;
  }

  const meals = dayMeals(ui.date), rec = state.food[ui.date] || {}, ds = foodStat([ui.date]);
  const mealsHtml = meals.map((m, mi) => {
    const st = mealStatus(m), allE = m.items.length && m.items.every(i => i.eaten);
    return `<div class="card">
      <div class="meal-head"><input type="checkbox" data-ch="mealAll" data-m="${mi}" ${allE ? 'checked' : ''} aria-label="Съел всё">
        <div class="t">${esc(m.name)} <span class="muted small" style="font-weight:400">${esc(m.time || '')}</span></div>
        <span class="badge ${st.k}">${st.t}</span></div>
      ${m.items.map((it, ii) => {
        const k = `${ui.date}|${mi}|${ii}`, open = it.repl || ui.swap.has(k);
        return `<div class="fitem ${it.repl ? 'replaced' : ''}"><div class="line">
          <input type="checkbox" class="sm" data-ch="fItem" data-m="${mi}" data-i="${ii}" ${it.eaten ? 'checked' : ''}>
          <span>${esc(it.text)}</span>
          ${open ? '' : `<button class="swap" data-act="swap" data-k="${k}">Заменил</button>`}</div>
          ${open ? `<input class="inp inline" data-ch="fRepl" data-m="${mi}" data-i="${ii}" value="${esc(it.repl)}" placeholder="На что заменил">` : ''}</div>`;
      }).join('')}
      <input class="inp inline" data-ch="mNote" data-m="${mi}" value="${esc(m.note)}" placeholder="Комментарий: что не съел и почему">
    </div>`;
  }).join('');

  return head + weekRow + `
  <div class="card"><div class="row spread"><b>${human(ui.date)}</b><span class="badge ${ds.total && ds.eaten === ds.total ? 'ok' : ''}">${ds.pct}% по плану</span></div>
    <div class="progress"><b style="width:${ds.pct}%"></b></div>
    <div class="muted small" style="margin-top:8px">За неделю по плану ${ws.eaten} из ${ws.total} позиций (${ws.pct}%), замен: ${ws.repl}</div>
    ${state.menu.goal ? `<div class="small" style="margin-top:8px;white-space:pre-wrap">${esc(state.menu.goal)}</div>` : ''}
  </div>
  ${mealsHtml || '<div class="card"><div class="empty">На этот день меню не задано. Нажмите «Меню», чтобы составить.</div></div>'}
  <div class="card">
    <div class="two"><label class="f">Вес утром, кг<input inputmode="decimal" data-ch="weight" value="${esc(rec.weight || '')}" placeholder="—"></label>
    <label class="f">Тренировка<select data-ch="train">${['', 'Была', 'Не было', 'День отдыха'].map(o => `<option ${rec.train === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label></div>
    <label class="f" style="margin-bottom:0">Итог дня<textarea data-ch="comment" placeholder="Самочувствие, срывы, что получилось">${esc(rec.comment || '')}</textarea></label>
  </div>
  <div class="actions"><button class="btn ghost" data-act="shareFood">Поделиться отчётом за день</button>
  ${rec.meals ? '<button class="btn danger" data-act="foodReset">Сбросить отметки дня</button>' : ''}</div>`;
}

function noteHtml(n) {
  const c = cat(n.cat);
  return `<button class="card note" data-act="noteEdit" data-id="${n.id}">
    <div class="title">${esc(n.title || 'Без названия')}</div>
    ${n.text ? `<p>${esc(n.text)}</p>` : ''}
    <div class="meta"><span><i class="dot" style="background:${c.color}"></i>${c.name}</span><span>${short(n.updated.slice(0, 10))}</span></div></button>`;
}
function viewNotes() {
  const list = state.notes.filter(n => ui.noteCat === 'all' || n.cat === ui.noteCat).sort((a, b) => b.updated.localeCompare(a.updated));
  return `<h1>Заметки</h1>
  <div class="chips"><button class="chip ${ui.noteCat === 'all' ? 'on' : ''}" data-act="noteCat" data-cat="all">Все</button>
  ${CATS.map(c => `<button class="chip ${ui.noteCat === c.id ? 'on' : ''}" data-act="noteCat" data-cat="${c.id}"><i class="dot" style="background:${c.color}"></i>${c.name}</button>`).join('')}</div>
  ${list.length ? list.map(noteHtml).join('') : '<div class="card"><div class="empty">Нажмите «+», чтобы написать заметку</div></div>'}
  <button class="fab" data-act="noteAdd" data-cat="${ui.noteCat === 'all' ? 'work' : ui.noteCat}" aria-label="Новая заметка">+</button>`;
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
function viewMore() {
  const sup = 'Notification' in window, perm = sup ? Notification.permission : 'unsupported';
  const permText = { granted: 'Включены', denied: 'Запрещены в настройках', default: 'Не включены', unsupported: 'Недоступны в этом браузере' }[perm];
  return `<h1>Ещё</h1>
  ${isStandalone() ? '' : `<div class="hint"><b>Как поставить на айфон</b><ol class="steps"><li>Откройте этот сайт в Safari.</li><li>Нажмите «Поделиться» (квадрат со стрелкой).</li><li>Выберите «На экран «Домой»».</li></ol></div>`}
  <h2>Уведомления</h2>
  <div class="card">
    <div class="row spread"><span>Статус: <b>${permText}</b></span>
    ${perm === 'default' ? '<button class="btn sm" data-act="notifOn">Включить</button>' : perm === 'granted' ? '<button class="btn sm ghost" data-act="notifTest">Проверить</button>' : ''}</div>
    <p class="muted small" style="margin:10px 0 0">${isIOS && !isStandalone() ? 'На айфоне уведомления работают только после установки на экран «Домой» (iOS 16.4 и новее). ' : ''}Сейчас напоминание приходит, пока приложение открыто или недавно свёрнуто. Чтобы напоминание точно сработало при закрытом приложении, откройте задачу и нажмите «В Календарь iPhone».</p>
  </div>
  <h2>Данные</h2>
  <div class="card">
    <button class="list-btn" data-act="export"><span>Сохранить резервную копию</span><span class="muted">›</span></button>
    <button class="list-btn" data-act="import"><span>Восстановить из копии</span><span class="muted">›</span></button>
    <button class="list-btn" data-act="shareApp"><span>Поделиться ссылкой на планер</span><span class="muted">›</span></button>
  </div>
  <p class="muted small" style="margin:0 4px">Все записи хранятся только на этом устройстве. Задач: ${state.items.length}, заметок: ${state.notes.length}.</p>`;
}

/* ---------- Шторка с формой ---------- */
const sheet = $('#sheet');
function openSheet(html) { sheet.innerHTML = `<div class="sheet-in">${html}</div>`; if (!sheet.open) sheet.showModal(); sheet.scrollTop = 0; }
function closeSheet() { if (sheet.open) sheet.close(); ui.form = null; }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
sheet.addEventListener('close', () => { ui.form = null; });

function itemForm(it) {
  ui.form = { kind: 'item', id: it.id || null, type: it.type || 'task' };
  const isNew = !it.id;
  openSheet(`<div class="row sheet-top"><h3>${isNew ? 'Новая запись' : 'Запись'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <div class="seg"><button data-act="type" data-type="task" class="${ui.form.type === 'task' ? 'on' : ''}">Задача</button><button data-act="type" data-type="meeting" class="${ui.form.type === 'meeting' ? 'on' : ''}">Встреча</button></div>
  <label class="f">Название<input id="f-title" value="${esc(it.title || '')}" placeholder="Что нужно сделать" autocomplete="off"></label>
  <div class="two"><label class="f">Дата<input type="date" id="f-date" value="${it.date || ui.date}"></label>
  <label class="f">Время<input type="time" id="f-time" value="${esc(it.time || '')}"></label></div>
  <div class="two"><label class="f">Раздел<select id="f-cat">${CATS.map(c => `<option value="${c.id}" ${c.id === (it.cat || 'work') ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
  <label class="f">Напоминание<select id="f-remind">${REMIND.map(([v, t]) => `<option value="${v}" ${String(it.remind ?? '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
  <label class="f">Место или ссылка<input id="f-place" value="${esc(it.place || '')}" placeholder="Необязательно" autocomplete="off"></label>
  <label class="f">Чек-лист (каждый пункт с новой строки)<textarea id="f-subs" placeholder="Пункт 1&#10;Пункт 2">${esc((it.subs || []).map(s => s.text).join('\n'))}</textarea></label>
  <label class="f">Заметка<textarea id="f-note">${esc(it.note || '')}</textarea></label>
  <button class="btn block" data-act="saveItem">Сохранить</button>
  ${isNew ? '' : `<div class="actions"><button class="btn ghost" data-act="ics">В Календарь iPhone</button><button class="btn ghost" data-act="shareItem">Поделиться</button><button class="btn danger" data-act="delItem">Удалить</button></div>`}`);
  if (isNew) setTimeout(() => $('#f-title') && $('#f-title').focus(), 50);
}
function readItemForm() {
  const f = ui.form, old = state.items.find(i => i.id === f.id) || {};
  const title = $('#f-title').value.trim();
  if (!title) { toast('Введите название'); $('#f-title').focus(); return null; }
  const oldSubs = old.subs || [];
  return {
    id: f.id || uid(), title, type: f.type, date: $('#f-date').value || ui.date, time: $('#f-time').value,
    cat: $('#f-cat').value, remind: $('#f-remind').value, place: $('#f-place').value.trim(), note: $('#f-note').value.trim(),
    subs: lines($('#f-subs').value).map(t => ({ text: t, done: !!(oldSubs.find(s => s.text === t) || {}).done })),
    done: !!old.done, notified: false
  };
}
function saveItemForm() {
  const it = readItemForm(); if (!it) return null;
  const i = state.items.findIndex(x => x.id === it.id);
  if (i >= 0) state.items[i] = it; else state.items.push(it);
  save(); return it;
}

function noteForm(n) {
  ui.form = { kind: 'note', id: n.id || null };
  openSheet(`<div class="row sheet-top"><h3>${n.id ? 'Заметка' : 'Новая заметка'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <label class="f">Заголовок<input id="n-title" value="${esc(n.title || '')}" autocomplete="off"></label>
  <label class="f">Раздел<select id="n-cat">${CATS.map(c => `<option value="${c.id}" ${c.id === (n.cat || 'work') ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
  <label class="f">Текст<textarea id="n-text" style="min-height:220px">${esc(n.text || '')}</textarea></label>
  <button class="btn block" data-act="saveNote">Сохранить</button>
  ${n.id ? '<div class="actions"><button class="btn ghost" data-act="shareNote">Поделиться</button><button class="btn danger" data-act="delNote">Удалить</button></div>' : ''}`);
}
function saveNoteForm() {
  const title = $('#n-title').value.trim(), text = $('#n-text').value.trim();
  if (!title && !text) { toast('Заметка пустая'); return null; }
  const n = { id: ui.form.id || uid(), title, text, cat: $('#n-cat').value, updated: new Date().toISOString() };
  const i = state.notes.findIndex(x => x.id === n.id);
  if (i >= 0) state.notes[i] = n; else state.notes.push(n);
  save(); return n;
}

/* ---------- Поделиться, экспорт ---------- */
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }
async function share(title, text, file) {
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
    if (!file && navigator.share) { await navigator.share({ title, text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  if (file) { download(file); return; }
  try { await navigator.clipboard.writeText(text); toast('Скопировано, можно вставить в сообщение'); }
  catch (_) { toast('Не получилось поделиться в этом браузере'); }
}
function download(file) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function itemText(it) {
  let t = `${it.done ? '☑' : '☐'} ${it.time ? it.time + ' ' : ''}${it.title}${it.type === 'meeting' ? ' (встреча)' : ''}${it.place ? ', ' + it.place : ''}`;
  for (const s of it.subs || []) t += `\n    ${s.done ? '☑' : '☐'} ${s.text}`;
  return t;
}
function dayText(date) {
  const items = state.items.filter(i => i.date === date).sort(byTime);
  return `План на ${human(date).toLowerCase()}\n\n` + (items.length ? items.map(itemText).join('\n') : 'Планов нет');
}
function foodText(date) {
  const rec = state.food[date] || {}, s = foodStat([date]);
  let t = `Питание, ${human(date).toLowerCase()}: ${s.pct}% по плану\n`;
  for (const m of dayMeals(date)) {
    t += `\n${m.name}${m.time ? ' ' + m.time : ''}\n` + m.items.map(i => i.repl ? `  ⇄ ${i.text} → ${i.repl}` : `  ${i.eaten ? '☑' : '☐'} ${i.text}`).join('\n');
    if (m.note) t += `\n  Комментарий: ${m.note}`;
  }
  if (rec.weight) t += `\n\nВес: ${rec.weight} кг`;
  if (rec.train) t += `\nТренировка: ${rec.train}`;
  if (rec.comment) t += `\nИтог дня: ${rec.comment}`;
  return t;
}
function icsFile(it) {
  const e = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const d = it.date.replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  let when;
  if (it.time) {
    const st = new Date(`${it.date}T${it.time}`), en = new Date(st.getTime() + 3600000);
    const f = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    when = `DTSTART:${f(st)}\r\nDTEND:${f(en)}`;
  } else when = `DTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${addDays(it.date, 1).replace(/-/g, '')}`;
  const mins = it.remind === '' || it.remind == null ? 15 : Number(it.remind);
  const desc = [it.note, ...(it.subs || []).map(s => '- ' + s.text)].filter(Boolean).join('\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Planer//RU', 'BEGIN:VEVENT', `UID:${it.id}@planer`, `DTSTAMP:${stamp}`, when,
    `SUMMARY:${e(it.title)}`, desc ? `DESCRIPTION:${e(desc)}` : '', it.place ? `LOCATION:${e(it.place)}` : '',
    'BEGIN:VALARM', `TRIGGER:-PT${mins}M`, 'ACTION:DISPLAY', `DESCRIPTION:${e(it.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']
    .filter(Boolean).join('\r\n');
  return new File([ics], 'plan.ics', { type: 'text/calendar' });
}

/* ---------- Уведомления ---------- */
async function notify(title, body, tag) {
  toast(`${title}${body ? ': ' + body : ''}`);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png' });
    else new Notification(title, { body, tag });
  } catch (_) { /* уведомление не показалось, подсказка на экране уже есть */ }
}
function checkReminders() {
  const now = Date.now(); let changed = false;
  for (const it of state.items) {
    if (it.done || it.notified || !it.time || it.remind === '' || it.remind == null) continue;
    const start = new Date(`${it.date}T${it.time}`).getTime(), at = start - Number(it.remind) * 60000;
    if (now >= at && now - start < 3600000) {
      it.notified = true; changed = true;
      notify(it.title, `${it.type === 'meeting' ? 'Встреча' : 'Задача'} в ${it.time}${it.place ? ', ' + it.place : ''}`, it.id);
    } else if (now - start >= 3600000) { it.notified = true; changed = true; }
  }
  if (changed) save();
}

/* ---------- События ---------- */
const actions = {
  tab: el => { ui.tab = el.dataset.tab; ui.foodEdit = false; window.scrollTo(0, 0); },
  day: el => { ui.date = el.dataset.date; ui.month = ui.date.slice(0, 7) + '-01'; },
  month: el => { const d = parse(ui.month); d.setMonth(d.getMonth() + Number(el.dataset.d)); ui.month = fmt(d); },
  week: el => { ui.date = addDays(ui.date, Number(el.dataset.d)); ui.month = ui.date.slice(0, 7) + '-01'; },
  today: () => { ui.date = today(); ui.month = ui.date.slice(0, 7) + '-01'; },
  cat: el => { ui.cat = el.dataset.cat; },
  noteCat: el => { ui.noteCat = el.dataset.cat; },
  foodDay: () => { ui.tab = 'food'; window.scrollTo(0, 0); },
  add: el => { const c = el.dataset.cat; itemForm({ cat: c || 'work', type: c === 'meet' ? 'meeting' : 'task', date: ui.tab === 'sec' ? today() : ui.date }); return false; },
  edit: el => { const it = state.items.find(i => i.id === el.dataset.id); if (it) itemForm(it); return false; },
  type: el => {
    ui.form.type = el.dataset.type;
    sheet.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b === el));
    if (el.dataset.type === 'meeting' && !ui.form.id) $('#f-cat').value = 'meet';
    return false;
  },
  close: () => { closeSheet(); return false; },
  saveItem: () => { if (!saveItemForm()) return false; closeSheet(); toast('Сохранено'); },
  delItem: () => { if (!confirm('Удалить эту запись?')) return false; state.items = state.items.filter(i => i.id !== ui.form.id); save(); closeSheet(); },
  ics: () => { const it = saveItemForm(); if (it) share(it.title, '', icsFile(it)); return false; },
  shareItem: () => { const it = saveItemForm(); if (it) share(it.title, `${human(it.date)}\n${itemText(it)}${it.note ? '\n\n' + it.note : ''}`); return false; },
  shareDay: () => { share('План на день', dayText(ui.date)); return false; },
  shareFood: () => { share('Питание', foodText(ui.date)); return false; },
  shareApp: () => { share('Мой планер', location.href.split('#')[0]); return false; },
  noteAdd: el => { noteForm({ cat: el.dataset.cat }); return false; },
  noteEdit: el => { const n = state.notes.find(x => x.id === el.dataset.id); if (n) noteForm(n); return false; },
  saveNote: () => { if (!saveNoteForm()) return false; closeSheet(); toast('Сохранено'); },
  delNote: () => { if (!confirm('Удалить заметку?')) return false; state.notes = state.notes.filter(n => n.id !== ui.form.id); save(); closeSheet(); },
  shareNote: () => { const n = saveNoteForm(); if (n) share(n.title || 'Заметка', `${n.title ? n.title + '\n\n' : ''}${n.text}`); return false; },
  foodEdit: () => { ui.foodEdit = !ui.foodEdit; },
  swap: el => { ui.swap.add(el.dataset.k); render(); const [, m, i] = el.dataset.k.split('|'); const inp = document.querySelector(`[data-ch="fRepl"][data-m="${m}"][data-i="${i}"]`); if (inp) inp.focus(); return false; },
  mealAdd: () => { (state.menu.days[wdi(ui.date)] ||= []).push({ name: 'Приём пищи', time: '', items: [] }); save(); },
  mealDel: el => { if (!confirm('Удалить приём пищи из меню?')) return false; state.menu.days[wdi(ui.date)].splice(Number(el.dataset.i), 1); save(); },
  copyDay: () => {
    if (!confirm('Заменить меню всех дней недели на меню этого дня?')) return false;
    const src = JSON.stringify(state.menu.days[wdi(ui.date)] || []);
    state.menu.days = [0, 1, 2, 3, 4, 5, 6].map(() => JSON.parse(src)); save(); toast('Меню скопировано на всю неделю');
  },
  foodReset: () => { if (!confirm('Сбросить отметки питания за этот день?')) return false; if (state.food[ui.date]) delete state.food[ui.date].meals; save(); },
  notifOn: async () => {
    if (isIOS && !isStandalone()) { toast('Сначала добавьте планер на экран «Домой»'); return false; }
    const p = await Notification.requestPermission(); render();
    if (p === 'granted') notify('Уведомления включены', 'Напоминания будут приходить сюда', 'test');
    return false;
  },
  notifTest: () => { notify('Проверка', 'Так выглядит напоминание планера', 'test'); return false; },
  export: () => { download(new File([JSON.stringify(state, null, 1)], `planer-${today()}.json`, { type: 'application/json' })); return false; },
  import: () => { $('#importFile').click(); return false; }
};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  const r = await fn(el);
  if (r !== false) render();
});

const changes = {
  done: el => { const it = state.items.find(i => i.id === el.dataset.id); if (!it) return; it.done = el.checked; if (it.done) (it.subs || []).forEach(s => s.done = true); },
  sub: el => {
    const it = state.items.find(i => i.id === el.dataset.id); if (!it) return;
    it.subs[Number(el.dataset.i)].done = el.checked;
    if (it.subs.every(s => s.done)) it.done = true; else if (!el.checked) it.done = false;
  },
  mealAll: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items.forEach(i => i.eaten = el.checked); },
  fItem: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items[Number(el.dataset.i)].eaten = el.checked; },
  // Текстовые поля сохраняем без перерисовки, чтобы не сбивать фокус на телефоне
  fRepl: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items[Number(el.dataset.i)].repl = el.value.trim(); return false; },
  mNote: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].note = el.value.trim(); return false; },
  weight: el => { (state.food[ui.date] ||= {}).weight = el.value.trim().replace(',', '.'); return false; },
  train: el => { (state.food[ui.date] ||= {}).train = el.value; return false; },
  comment: el => { (state.food[ui.date] ||= {}).comment = el.value.trim(); return false; },
  menuTitle: el => { state.menu.title = el.value.trim() || 'План питания'; return false; },
  menuGoal: el => { state.menu.goal = el.value.trim(); return false; },
  mName: el => { state.menu.days[wdi(ui.date)][Number(el.dataset.i)].name = el.value.trim() || 'Приём пищи'; return false; },
  mTime: el => { state.menu.days[wdi(ui.date)][Number(el.dataset.i)].time = el.value; return false; },
  mItems: el => { state.menu.days[wdi(ui.date)][Number(el.dataset.i)].items = lines(el.value); return false; }
};
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]'); if (!el) return;
  const fn = changes[el.dataset.ch]; if (!fn) return;
  const r = fn(el); save();
  if (r !== false) render();
});

$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || !Array.isArray(d.items)) throw new Error('format');
    if (!confirm('Заменить все текущие данные данными из копии?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); state = load(); render(); toast('Данные восстановлены');
  } catch (_) { toast('Это не файл резервной копии планера'); }
});

/* ---------- Запуск ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
render();
checkReminders();
setInterval(checkReminders, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); } });
