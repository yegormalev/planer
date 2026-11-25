'use strict';
/* Мой планер. Все данные лежат в localStorage этого устройства. */

const KEY = 'planer.v1';
const APP_VERSION = 16;                                   // менять вместе с version.json и кэшем в sw.js
const CATS = [
  { id: 'work', name: 'Работа', color: '#4f6ef7' },
  { id: 'study', name: 'Учёба', color: '#9b5de5' },
  { id: 'meet', name: 'Встречи', color: '#f08a3c' },
  { id: 'self', name: 'Саморазвитие', color: '#0ea5a4' },
  { id: 'sport', name: 'Спорт', color: '#ef476f' },
  { id: 'food', name: 'Питание', color: '#2fb574' },
  { id: 'other', name: 'Другое', color: '#8792a2' }
];
const COLS = [['backlog', 'Бэклог'], ['doing', 'В процессе'], ['done', 'Сделал'], ['wait', 'Ожидание'], ['closed', 'Закрыта']];
const REMIND = [0, 5, 15, 30, 60, 120, 1440, 2880, 4320, 10080, 20160, 43200];   // минут до начала
const REM_UNITS = [['1', 'минут'], ['60', 'часов'], ['1440', 'дней'], ['10080', 'недель']];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
let PLAN = [];                                            // готовый план обучения есть только в заполненном варианте планера
const TRACKS = window.LEARN_TRACKS || {};
const LEARN_GOAL = 3600;                                  // час в день
const TYPE = { v: 'Видео', a: 'Статья', c: 'Курс', t: 'Инструмент', l: 'Ссылка' };

/* План сушки: исходные данные и расчёт */
const P_FULL = { w: 82, h: 186, age: 24, rate: 0.5 };
P_FULL.bmr = Math.round(10 * P_FULL.w + 6.25 * P_FULL.h - 5 * P_FULL.age + 5);   // Миффлин-Сан Жеор, мужчина
P_FULL.tdee = Math.round(P_FULL.bmr * 1.6 / 10) * 10;                            // 5 тренировок по 1,5 часа в неделю
let P = P_FULL;
const ACT = [['1.2', 'Сидячая работа, без спорта'], ['1.375', 'Лёгкая: 1–3 тренировки в неделю'], ['1.55', 'Средняя: 3–5 тренировок'], ['1.725', 'Высокая: 6–7 тренировок']];
const GOALS = [['0.85', 'Снижение веса'], ['1', 'Поддержание'], ['1.1', 'Набор массы']];
const blank = () => state.settings.preset === 'blank';

/* ---------- Вспомогательное ---------- */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const wdi = s => (parse(s).getDay() + 6) % 7;            // Пн = 0
const monday = s => addDays(s, -wdi(s));
const today = () => fmt(new Date());
const human = s => { const d = parse(s); return `${WD_FULL[wdi(s)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const short = s => { const d = parse(s); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const lines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 1440) + 1440) % 1440 % 60)}`;
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const ru = n => String(Math.round(n * 10) / 10).replace('.', ',');
const dur = m => m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ' ' + m % 60 + ' мин' : ''}`;
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };

/* ---------- Данные ---------- */
function buildMenu() {
  const week = window.MENU_WEEK || [];
  return { ver: 3, title: 'План сушки', goal: '', days: week.map(d => d.meals.map(m => ({ ...m, items: m.items.slice(), im: m.im ? m.im.map(x => x.slice()) : null }))), labels: week.map(d => d.label) };
}
const emptyMenu = () => ({ ver: 3, title: 'Питание', goal: '', labels: [],
  days: [0, 1, 2, 3, 4, 5, 6].map(() => [['Завтрак', '08:00'], ['Обед', '13:00'], ['Ужин', '19:00'], ['Перекус', '']].map(([name, time]) => ({ name, time, items: [] }))) });
function migrateMenu(m) {
  if (!m || !m.ver || m.ver < 2) return buildMenu();
  if (m.ver === 2) {                                       // добавляем КБЖУ по каждой позиции там, где меню не меняли
    const g = buildMenu();
    m.days.forEach((d, di) => d.forEach((x, mi) => { const gm = (g.days[di] || [])[mi]; if (gm && JSON.stringify(gm.items) === JSON.stringify(x.items)) x.im = gm.im; }));
    m.ver = 3;
  }
  return m;
}
function load() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { s = {}; }
  const fresh = !Array.isArray(s.items);                   // первое открытие: пустой планер без готового меню, тренировок и плана обучения
  const preset = (s.settings && s.settings.preset) || (fresh ? 'blank' : 'full');
  const st = {
    items: s.items || [], notes: s.notes || [], cards: s.cards || [], food: s.food || {}, body: s.body || {},
    menu: preset === 'blank' && !s.menu ? emptyMenu() : migrateMenu(s.menu), products: s.products || {},
    learn: Object.assign({ start: today(), done: {}, doneAt: {}, custom: {}, secs: {}, timer: null }, s.learn || {}),
    seeds: s.seeds || {}, settings: s.settings || {}, day: s.day || {}, shop: s.shop || {}, shopOwn: s.shopOwn || []
  };
  st.settings.preset = preset;
  PLAN = preset === 'full' ? (window.LEARN_PLAN || []) : [];
  P = preset === 'full' ? P_FULL : { h: (st.settings.profile || {}).h || null, rate: 0 };
  if (preset === 'blank') st.seeds.train = true;
  for (const d in st.food) if (st.food[d].weight && !st.body[d]) { st.body[d] = { w: st.food[d].weight }; delete st.food[d].weight; }
  if (!st.seeds.train) {                                   // тренировки на 8 недель вперёд
    const t0 = today();
    for (let i = 0; i < 56; i++) {
      const d = addDays(t0, i), w = wdi(d);
      const base = { date: d, type: 'task', cat: 'sport', remind: '', place: '', note: '', who: '', subs: [], done: false, seed: 'train' };
      if (w === 0 || w === 2 || w === 4) st.items.push({ ...base, id: uid(), title: 'Бокс', time: '08:00', end: '09:30' });
      if (w === 1 || w === 3) st.items.push({ ...base, id: uid(), title: 'Силовой кроссфит', time: '18:45', end: '20:15' });
    }
    st.seeds.train = true;
  }
  return st;
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (_) { toast('Не удалось сохранить: память браузера заполнена'); }
  if (window.syncSoon) window.syncSoon();
}
save();

const ui = { tab: 'today', sub: null, date: today(), month: today().slice(0, 7) + '-01', cat: 'work', noteCat: 'all', notesView: 'notes',
  foodView: 'menu', foodEdit: false, td: { late: false, done: false, hab: false }, q: '', swap: new Set(), form: null, learnDay: null, learnTrack: 'all' };

/* ---------- Время задач ---------- */
function endOf(it) { return it.end || (it.time && it.dur ? hhmm(mins(it.time) + Math.round(it.dur * 60)) : ''); }
function timeText(it) {
  const e = endOf(it), span = it.dateTo ? `${short(it.date)} – ${short(it.dateTo)}` : '';
  const t = it.time ? (e ? `${it.time}–${e}` : it.time) : it.busy ? (span ? '' : 'весь день') : it.dur ? `≈ ${ru(it.dur)} ч` : '';
  return [span, t].filter(Boolean).join(', ');
}
// Дело может идти несколько дней подряд (dateTo) и занимать дни целиком (busy), например отпуск.
const lastDay = i => i.dateTo || i.date;
const onDay = (i, d) => i.date <= d && d <= lastDay(i);
const overlap = (x, y) => x.date <= lastDay(y) && y.date <= lastDay(x);
// Пересечения по времени: несделанные дела одного дня, у которых интервалы накладываются (без конца считаем 30 минут).
function clashes(date) {
  const all = state.items.filter(i => onDay(i, date) && !i.done), m = {};
  const add = (x, y) => { const l = m[x.id] || (m[x.id] = []); if (!l.includes(y)) l.push(y); };
  for (const b of all) if (b.busy) for (const x of all) if (x !== b) { add(b, x); add(x, b); }      // занятый целиком день пересекается со всем остальным
  const a = all.filter(i => i.time && !i.busy && !i.dateTo).map(i => { const s = mins(i.time); let e = endOf(i) ? mins(endOf(i)) : s + 30; if (e <= s) e = 1440; return { i, s, e }; });
  for (const x of a) for (const y of a) if (x !== y && x.s < y.e && y.s < x.e) add(x.i, y.i);
  return m;
}
const clashText = list => 'Пересекается: ' + list.slice(0, 3).map(o => `«${esc(o.title)}» ${timeText(o)}`).join(', ') + (list.length > 3 ? ` и ещё ${list.length - 3}` : '');
const when = d => d === today() ? 'сегодня' : d === addDays(today(), -1) ? 'вчера' : short(d);
/* Напоминания: у дела их может быть несколько, срок в минутах до начала. Дело без времени считается от 9:00. */
const rems = it => Array.isArray(it.reminds) ? it.reminds : it.remind !== '' && it.remind != null ? [Number(it.remind)] : [];
const remBase = it => new Date(`${it.date}T${it.time || '09:00'}`).getTime();
function remLabel(m) {
  if (m === 0) return 'В момент начала';
  if (m % 10080 === 0) return m === 10080 ? 'За неделю' : `За ${m / 10080} ${plural(m / 10080, 'неделю', 'недели', 'недель')}`;
  if (m % 1440 === 0) return m === 1440 ? 'За день' : `За ${m / 1440} ${plural(m / 1440, 'день', 'дня', 'дней')}`;
  if (m % 60 === 0) return m === 60 ? 'За час' : `За ${m / 60} ${plural(m / 60, 'час', 'часа', 'часов')}`;
  return `За ${m} ${plural(m, 'минуту', 'минуты', 'минут')}`;
}
function leftText(ms) {
  const m = Math.round(ms / 60000);
  if (m <= 0) return 'сейчас';
  if (m < 90) return `через ${m} ${plural(m, 'минуту', 'минуты', 'минут')}`;
  if (m < 36 * 60) { const h = Math.round(m / 60); return `через ${h} ${plural(h, 'час', 'часа', 'часов')}`; }
  const d = Math.round(m / 1440); return `через ${d} ${plural(d, 'день', 'дня', 'дней')}`;
}
const byTime = (a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'));

/* ---------- Питание ---------- */
function templateMeals(date) {
  return (state.menu.days[wdi(date)] || []).map(m => ({
    name: m.name, time: m.time, note: '', kcal: m.kcal, p: m.p, f: m.f, c: m.c, items: m.items.map((t, i) => ({ text: t, eaten: false, repl: '', k: m.im ? m.im[i] : null }))
  }));
}
const dayMeals = date => (state.food[date] && state.food[date].meals) || templateMeals(date);
function ensureDay(date) {
  const d = state.food[date] || (state.food[date] = {});
  if (!d.meals) d.meals = templateMeals(date);
  return d;
}
function mealStatus(m) {
  const pl = m.items;                                      // все блюда приёма пищи, включая добавленные
  const n = pl.length, repl = pl.filter(i => i.repl).length, eaten = pl.filter(i => i.eaten && !i.repl).length;
  if (!n) return { k: 'none', t: 'Пусто' };
  if (eaten === n) return { k: 'ok', t: 'По плану' };
  if (eaten + repl === n) return { k: 'warn', t: 'С заменой' };
  if (eaten + repl === 0) return { k: 'none', t: 'Не отмечено' };
  return { k: 'warn', t: `${eaten + repl} из ${n}` };
}
function foodStat(dates) {
  let total = 0, eaten = 0, repl = 0;
  for (const d of dates) for (const m of dayMeals(d)) { const own = m.items.some(i => !i.extra); for (const i of m.items) { if (i.extra && own) continue; total++; if (i.repl) repl++; else if (i.eaten) eaten++; } }
  return { total, eaten, repl, touched: eaten + repl, pct: total ? Math.round(eaten / total * 100) : 0 };
}
function eatenTotals(meals) {
  const t = { kcal: 0, p: 0, f: 0, c: 0 }; let repl = 0;
  for (const m of meals) {
    const planned = m.items.filter(i => !i.extra).length;
    for (const i of m.items) {
      if (i.repl) { repl++; continue; }
      if (!i.eaten) continue;
      const k = i.k || (!i.extra && m.kcal && planned ? [m.kcal / planned, m.p / planned, m.f / planned, m.c / planned] : null);
      if (k) { t.kcal += k[0]; t.p += k[1]; t.f += k[2]; t.c += k[3]; }
    }
  }
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c), repl };
}
function mealTot(m) {                                      // план приёма пищи: по позициям, если у всех есть КБЖУ
  const pl = m.items.filter(i => !i.extra);
  if (m.edited || (pl.length && pl.every(i => i.k))) { const t = pl.reduce((a, i) => i.k ? a.map((x, j) => x + i.k[j]) : a, [0, 0, 0, 0]); return { kcal: Math.round(t[0] / 10) * 10, p: Math.round(t[1]), f: Math.round(t[2]), c: Math.round(t[3]) }; }
  return { kcal: m.kcal || 0, p: m.p || 0, f: m.f || 0, c: m.c || 0 };
}
const dayTotals = meals => meals.reduce((s, m) => { const t = mealTot(m); return { kcal: s.kcal + t.kcal, p: s.p + t.p, f: s.f + t.f, c: s.c + t.c }; }, { kcal: 0, p: 0, f: 0, c: 0 });

/* ---------- Развитие ---------- */
const learnIdx = date => { const i = diffDays(state.learn.start, date); return i >= 0 && i < PLAN.length ? i : null; };
const learnDate = i => addDays(state.learn.start, i);
function learnProgress(i) {
  const d = PLAN[i], done = state.learn.done[i] || {}, cust = state.learn.custom[i] || [];
  const total = d[3].length + 1 + cust.length;
  const n = d[3].filter((_, k) => done['m' + k]).length + (done.task ? 1 : 0) + cust.filter(c => c.done).length;
  return { n, total, full: n === total };
}
function learnState() {                                   // что пройдено на сегодня и что осталось долгом
  const t = today(), ti = learnIdx(t), missed = [];
  PLAN.forEach((_, k) => { if (learnDate(k) < t && !learnProgress(k).full) missed.push(k); });
  return { ti, cur: ti != null ? learnProgress(ti) : null, missed: missed.reverse() };
}
function learnMark(k) {                                    // запоминаем день, когда тема закрыта целиком
  if (!PLAN[k]) return;
  const at = state.learn.doneAt || (state.learn.doneAt = {});
  if (learnProgress(k).full) { if (!at[k]) at[k] = today(); } else delete at[k];
}
function learnSecs(date) {
  const t = state.learn.timer, base = state.learn.secs[date] || 0;
  return base + (t && t.date === date ? Math.floor((Date.now() - t.t0) / 1000) : 0);
}
function stopTimer() {
  const t = state.learn.timer; if (!t) return;
  state.learn.secs[t.date] = (state.learn.secs[t.date] || 0) + Math.max(0, Math.floor((Date.now() - t.t0) / 1000));
  state.learn.timer = null; save();
}
if (state.learn.timer && state.learn.timer.date !== today()) {           // таймер остался с прошлого дня
  const t = state.learn.timer;
  state.learn.secs[t.date] = Math.min(LEARN_GOAL * 2, (state.learn.secs[t.date] || 0) + Math.floor((parse(addDays(t.date, 1)) - t.t0) / 1000));
  state.learn.timer = null; save();
}
const clock = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

/* ---------- Мелкие компоненты ---------- */
function ring(pct, size, sw, color, inner) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="${sw}"/>
    <circle class="ring-v" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><div class="ring-in">${inner || ''}</div></div>`;
}
function itemHtml(it, showDate, cl) {
  const c = cat(it.cat), tt = timeText(it);
  const subs = (it.subs || []).map((s, i) =>
    `<label class="${s.done ? 'done' : ''}"><input type="checkbox" class="sm" data-ch="sub" data-id="${it.id}" data-i="${i}" ${s.done ? 'checked' : ''}><span>${esc(s.text)}</span></label>`).join('');
  const subDone = (it.subs || []).filter(s => s.done).length;
  return `<div class="item ${it.done ? 'done' : ''} ${cl ? 'clash' : ''}" style="--c:${c.color}">
    <input type="checkbox" data-ch="done" data-id="${it.id}" ${it.done ? 'checked' : ''} aria-label="Сделано">
    <div class="body">
      <button class="open" data-act="edit" data-id="${it.id}">
        <div class="title">${esc(it.title)}</div>
        <div class="meta">
          ${showDate && !it.dateTo ? `<span>${short(it.date)}</span>` : ''}
          ${tt ? `<span class="time">${tt}</span>` : ''}
          ${it.busy ? '<span class="busyb">день занят</span>' : ''}
          <span><i class="dot" style="background:${c.color}"></i>${c.name}</span>
          ${it.who ? `<span>👥 ${esc(it.who)}</span>` : ''}
          ${it.place ? `<span>${esc(it.place)}</span>` : ''}
          ${rems(it).length ? `<span>🔔${rems(it).length > 1 ? ' ' + rems(it).length : ''}</span>` : ''}
          ${it.subs && it.subs.length ? `<span>${subDone}/${it.subs.length}</span>` : ''}
        </div>
        ${cl ? `<div class="clash-t">${clashText(cl)}</div>` : ''}
      </button>
      ${subs ? `<div class="subs">${subs}</div>` : ''}
    </div>
  </div>`;
}
const head = (title, right) => `<header class="top"><h1>${title}</h1>${right || ''}</header>`;
const seg = (act, cur, opts) => `<div class="seg" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map(([v, t]) => `<button data-act="${act}" data-v="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;

/* ---------- Сегодня ---------- */
function viewToday() {
  const t = today(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const items = state.items.filter(i => onDay(i, t)).sort(byTime);
  const done = items.filter(i => i.done).length, pct = items.length ? Math.round(done / items.length * 100) : 0;
  const fs = foodStat([t]);
  const timed = items.filter(i => i.time), free = items.filter(i => !i.time);
  const cur = timed.find(i => !i.done && mins(i.time) <= nowM && nowM < (endOf(i) ? mins(endOf(i)) : mins(i.time) + 30));
  const next = timed.find(i => !i.done && mins(i.time) > nowM);
  const hello = now.getHours() < 5 ? 'Доброй ночи' : now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const nextMeal = dayMeals(t).find(m => m.items.some(i => !i.eaten && !i.repl));
  const late = lateItems(), hb = state.day[t] || {}, wtr = hb.water || 0;

  const cl = clashes(t), ncl = Object.keys(cl).length, lst = learnState();
  let nowCard = '';
  if (cur) {
    const e = endOf(cur);
    nowCard = `<button class="now" data-act="edit" data-id="${cur.id}"><span class="lbl">Сейчас</span><b>${esc(cur.title)}</b>
      <span>${e ? `до ${e}, осталось ${dur(mins(e) - nowM)}` : `началось в ${cur.time}`}${cur.who ? ` · 👥 ${esc(cur.who)}` : ''}${next ? ` · далее в ${next.time} ${esc(next.title)}` : ''}</span></button>`;
  } else if (next) nowCard = `<button class="now next" data-act="edit" data-id="${next.id}"><span class="lbl">Далее</span><b>${esc(next.title)}</b>
      <span>${timeText(next)} · через ${dur(mins(next.time) - nowM)}${next.who ? ` · 👥 ${esc(next.who)}` : ''}</span></button>`;

  const row = i => {
    const c = cat(i.cat), e = endOf(i), x = cl[i.id];
    return `<div class="tl ${i.done ? 'done' : ''} ${cur && cur.id === i.id ? 'cur' : ''} ${x ? 'clash' : ''}" style="--c:${c.color}">
      <div class="tl-t">${i.time ? `<b>${i.time}</b>${e ? `<span>${e}</span>` : ''}` : i.busy ? '<span>весь день</span>' : i.dur ? `<span>≈ ${ru(i.dur)} ч</span>` : '<span>в течение дня</span>'}</div>
      <button class="tl-b" data-act="edit" data-id="${i.id}"><div class="title">${esc(i.title)}</div>
        <div class="meta">${i.dateTo ? `<span>${short(i.date)} – ${short(i.dateTo)}</span>` : ''}<span>${c.name}</span>${i.who ? `<span>👥 ${esc(i.who)}</span>` : ''}${i.subs && i.subs.length ? `<span>${i.subs.filter(s => s.done).length}/${i.subs.length}</span>` : ''}</div>
        ${x ? `<div class="clash-t">${clashText(x)}</div>` : ''}</button>
      <input type="checkbox" data-ch="done" data-id="${i.id}" ${i.done ? 'checked' : ''} aria-label="Сделано"></div>`;
  };
  const all = [...timed, ...free], todo = all.filter(i => !i.done), closed = all.filter(i => i.done), td = ui.td;
  const lb = lst.cur ? (lst.cur.full ? '✓' : `${lst.cur.n}<small> из ${lst.cur.total}</small>`) : '—';

  return `<section class="hero">
    <div><div class="hero-d">${human(t)}</div><div class="hero-h">${hello}</div>
      <div class="hero-s">${items.length ? `${done} из ${items.length} ${plural(items.length, 'дела', 'дел', 'дел')} сделано` : 'На сегодня планов нет'}</div></div>
    ${ring(pct, 76, 8, '#fff', `<b>${pct}%</b>`)}
  </section>
  ${nowCard ? `<div class="nows">${nowCard}</div>` : ''}
  ${blank() && !state.items.length ? `<div class="hint"><b>Планер пока пустой, заполните его под себя</b><ol class="steps"><li>Добавьте первое дело кнопкой «+» или строкой «Быстро» ниже.</li><li>Во вкладке «Питание» составьте своё меню и укажите рост и вес.</li><li>Во вкладке «Развитие» добавьте свои курсы и ссылки.</li></ol>Уже пользовались планером на другом устройстве? Войдите во вкладке «Ещё», блок «Синхронизация».</div>` : ''}
  <div class="row spread"><h2>Расписание${todo.length ? ` · ${todo.length}` : ''}</h2><button class="btn sm ghost" data-act="weekSum" data-o="0">Итоги недели</button></div>
  ${items.some(i => i.busy && !i.done) ? `<div class="hint busyh">Сегодня день занят целиком: ${items.filter(i => i.busy && !i.done).map(i => `<b>${esc(i.title)}</b>${i.dateTo ? ` (${short(i.date)} – ${short(i.dateTo)})` : ''}`).join(', ')}.</div>` : ''}
  ${ncl ? `<div class="alert">Накладка по времени: ${ncl} ${plural(ncl, 'дело пересекается', 'дела пересекаются', 'дел пересекаются')}. Они отмечены красным.</div>` : ''}
  <div class="card tlc">${todo.length ? todo.map(row).join('') : `<div class="empty">${closed.length ? 'Всё на сегодня сделано' : 'Дел пока нет. Добавьте первое ниже.'}</div>`}
    ${closed.length ? `<button class="fold" data-act="tdToggle" data-k="done"><span>Сделано · ${closed.length}</span><em>${td.done ? 'скрыть' : 'показать'}</em></button>${td.done ? closed.map(row).join('') : ''}` : ''}</div>
  <div class="quick"><input id="quick" class="inp" placeholder="Быстро: 14:00 Созвон с командой" enterkeyhint="done" autocomplete="off"><button class="btn" data-act="quick" aria-label="Добавить">+</button></div>
  ${late.length ? `<button class="fold card" data-act="tdToggle" data-k="late"><span><i class="dot" style="background:var(--danger)"></i>Не сделано раньше · ${late.length}</span><em>${td.late ? 'скрыть' : 'разобрать'}</em></button>
  ${td.late ? `<div class="card"><div class="row spread" style="margin-bottom:4px"><span class="muted small">Перенесите или отметьте</span><button class="btn sm ghost" data-act="lateAll">Все на сегодня</button></div>${late.slice(0, 8).map(i => `<div class="item"><input type="checkbox" data-ch="done" data-id="${i.id}" aria-label="Сделано">
    <div class="body"><button class="open" data-act="edit" data-id="${i.id}"><div class="title">${esc(i.title)}</div><div class="meta"><span>${short(i.date)}</span><span>${cat(i.cat).name}</span></div></button></div>
    <button class="swap" data-act="toToday" data-id="${i.id}">На сегодня</button></div>`).join('')}${late.length > 8 ? `<div class="muted small" style="padding-top:8px">и ещё ${late.length - 8}</div>` : ''}</div>` : ''}` : ''}
  <h2>Коротко о дне</h2>
  <div class="stats">
    <button data-act="tab" data-tab="food"><b>${fs.total ? `${fs.touched}<small> из ${fs.total}</small>` : `${eatenTotals(dayMeals(t)).kcal}<small> ккал</small>`}</b><span>${!fs.total ? 'питание сегодня' : nextMeal ? `далее ${esc(nextMeal.name.toLowerCase())}${nextMeal.time ? ' ' + nextMeal.time : ''}` : 'питание отмечено'}</span></button>
    <button data-act="learnGo" class="${lst.missed.length ? 'bad' : lst.cur && lst.cur.full ? 'good' : ''}"><b>${PLAN.length ? lb : `${Math.floor(learnSecs(t) / 60)}<small> мин</small>`}</b><span>${lst.missed.length ? `развитие · долг ${lst.missed.length} ${plural(lst.missed.length, 'день', 'дня', 'дней')}` : lst.cur && lst.cur.full ? 'развитие пройдено' : 'развитие сегодня'}</span></button>
    <button data-act="goBody"><b>${state.body[t] && state.body[t].w ? ru(state.body[t].w) : '—'}<small> кг</small></b><span>вес сегодня</span></button>
  </div>
  <div class="card">
    <div class="hab"><button data-act="tdToggle" data-k="hab" style="flex:1;min-width:0"><b>Привычки</b><small>Вода ${ru(wtr * 0.25)} из 2,5 л · шаги ${hb.steps || '—'} · сон ${hb.sleep ? ru(hb.sleep) : '—'}</small></button>
      <div class="cnt"><button data-act="water" data-d="-1" aria-label="Минус стакан воды">−</button><b>${wtr}</b><button data-act="water" data-d="1" aria-label="Плюс стакан воды">+</button></div></div>
    ${td.hab ? `<div class="drops">${Array.from({ length: 10 }, (_, k) => `<i class="${k < wtr ? 'on' : ''}"></i>`).join('')}</div>
    <div class="two"><label class="f" style="margin:0">Шаги<input inputmode="numeric" data-ch="steps" value="${hb.steps || ''}" placeholder="цель 8–10 тысяч"></label>
    <label class="f" style="margin:0">Сон, часов<input inputmode="decimal" data-ch="sleep" value="${hb.sleep ? ru(hb.sleep) : ''}" placeholder="от 7"></label></div>` : ''}
  </div>
  <button class="fab" data-act="add" aria-label="Добавить">+</button>`;
}

const lateItems = () => { const t = today(); return state.items.filter(i => lastDay(i) < t && !i.done && !i.seed && !i.series).sort(byTime); };

/* ---------- Итоги недели ---------- */
function weekStats(mon) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i)), t = today(), past = days.filter(d => d <= t);
  const items = state.items.filter(i => lastDay(i) >= days[0] && i.date <= days[6]), sport = items.filter(i => i.cat === 'sport');
  const fs = foodStat(past.length ? past : days), avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const w = days.filter(d => state.body[d] && state.body[d].w != null).map(d => state.body[d].w);
  const f = days.filter(d => state.body[d] && state.body[d].fat != null).map(d => state.body[d].fat);
  const hab = k => avg(days.map(d => (state.day[d] || {})[k]).filter(v => v));
  return {
    days, total: items.length, done: items.filter(i => i.done).length, sportT: sport.length, sportD: sport.filter(i => i.done).length,
    perDay: days.map(d => { const a = items.filter(i => onDay(i, d)); return { n: a.length, d: a.filter(i => i.done).length }; }),
    food: fs, learnMin: Math.floor(days.reduce((x, d) => x + learnSecs(d), 0) / 60),
    learnDays: days.filter(d => { const i = learnIdx(d); return i != null && learnProgress(i).full; }).length,
    w, f, water: hab('water'), steps: hab('steps'), sleep: hab('sleep')
  };
}
function weekText(st) {
  const dl = a => a.length > 1 ? `${a[a.length - 1] - a[0] > 0 ? '+' : ''}${ru(a[a.length - 1] - a[0])} кг` : 'мало замеров';
  return `Итоги недели ${short(st.days[0])} – ${short(st.days[6])}\n\nДела: ${st.done} из ${st.total}\nТренировки: ${st.sportD} из ${st.sportT}\nПитание по плану: ${st.food.pct}%\nРазвитие: ${dur(st.learnMin)}\nВес: ${dl(st.w)}\nЖир: ${dl(st.f)}`;
}
function weekSheet(off) {
  const mon = addDays(monday(today()), off * 7), st = weekStats(mon), mx = Math.max(1, ...st.perDay.map(p => p.n));
  const dl = (a, goodDown) => a.length > 1 ? `<em class="${a[a.length - 1] === a[0] ? '' : (a[a.length - 1] < a[0]) === goodDown ? 'good' : 'bad'}">${a[a.length - 1] - a[0] > 0 ? '+' : ''}${ru(a[a.length - 1] - a[0])} кг</em>` : '<em>мало замеров</em>';
  const line = (name, val, pct) => `<div class="wk"><div class="row spread"><span>${name}</span><b>${val}</b></div>${pct != null ? `<div class="progress"><b style="width:${Math.min(100, pct)}%"></b></div>` : ''}</div>`;
  ui.form = { kind: 'week', off };
  openSheet(`<div class="row sheet-top"><h3>Итоги недели</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <div class="row spread" style="margin-bottom:12px"><button class="icon-btn flat" data-act="weekSum" data-o="${off - 1}" aria-label="Предыдущая неделя">‹</button>
    <b>${short(st.days[0])} – ${short(st.days[6])}</b><button class="icon-btn flat" data-act="weekSum" data-o="${off + 1}" ${off >= 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Следующая неделя">›</button></div>
  <div class="bars">${st.perDay.map((p, i) => `<div><div class="bar"><i style="height:${p.n / mx * 100}%"><u style="height:${p.n ? p.d / p.n * 100 : 0}%"></u></i></div><span>${WD[i]}</span></div>`).join('')}</div>
  <p class="muted small" style="margin:6px 0 12px;text-align:center">Столбик: дела за день, закрашено: сделано</p>
  ${line('Дела сделаны', `${st.done} из ${st.total}`, st.total ? st.done / st.total * 100 : 0)}
  ${line('Тренировки', `${st.sportD} из ${st.sportT}`, st.sportT ? st.sportD / st.sportT * 100 : 0)}
  ${line('Питание по плану', `${st.food.pct}%`, st.food.pct)}
  ${line('Развитие', `${dur(st.learnMin)} из 7 ч, тем закрыто: ${st.learnDays}`, st.learnMin / 420 * 100)}
  <div class="tiles" style="margin-top:14px"><div><span>Вес</span><b>${st.w.length ? ru(st.w[st.w.length - 1]) : '—'}<small> кг</small></b>${dl(st.w, true)}</div>
    <div><span>Жир</span><b>${st.f.length ? ru(st.f[st.f.length - 1]) : '—'}<small> кг</small></b>${dl(st.f, true)}</div>
    <div><span>Вода в день</span><b>${st.water ? ru(st.water * 0.25) : '—'}<small> л</small></b><em>цель 2,5 л</em></div></div>
  <div class="tiles"><div><span>Шаги в день</span><b>${st.steps ? Math.round(st.steps / 100) / 10 : '—'}<small> тыс.</small></b><em>цель 8–10</em></div>
    <div><span>Сон</span><b>${st.sleep ? ru(st.sleep) : '—'}<small> ч</small></b><em>цель от 7</em></div><div><span>Замены в еде</span><b>${st.food.repl}</b><em>за неделю</em></div></div>
  <button class="btn ghost block" data-act="weekShare">Поделиться итогами</button>`);
}

/* ---------- Календарь ---------- */
function viewCal() {
  const m = parse(ui.month), first = monday(ui.month), t = today();
  const marks = {};
  for (const it of state.items) for (let d = it.date, k = 0; d <= lastDay(it) && k < 370; d = addDays(d, 1), k++) {
    const x = marks[d] || (marks[d] = { n: 0, d: 0, busy: false }); x.n++; if (it.done) x.d++; if (it.busy && !it.done) x.busy = true;
  }
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(first, i), mk = marks[d];
    if (i === 35 && parse(d).getMonth() !== m.getMonth()) break;
    const bad = mk && mk.n > 1 && Object.keys(clashes(d)).length;
    cells += `<button class="day ${parse(d).getMonth() !== m.getMonth() ? 'out' : ''} ${d === t ? 'today' : ''} ${d === ui.date ? 'sel' : ''} ${mk && mk.busy ? 'busy' : ''}" data-act="day" data-date="${d}">
      ${parse(d).getDate()}<i class="${mk ? (bad ? 'clash' : mk.d === mk.n ? 'done' : '') : 'none'}"></i></button>`;
  }
  const items = state.items.filter(i => onDay(i, ui.date)).sort(byTime), busyNow = items.filter(i => i.busy && !i.done);
  const done = items.filter(i => i.done).length, fs = foodStat([ui.date]), li = learnIdx(ui.date), cl = clashes(ui.date), ncl = Object.keys(cl).length;
  return head(`${MONTHS[m.getMonth()]} <span class="yr">${m.getFullYear()}</span>`, `<div class="row">
    <button class="icon-btn" data-act="month" data-d="-1" aria-label="Предыдущий месяц">‹</button>
    <button class="btn sm ghost" data-act="today">Сегодня</button>
    <button class="icon-btn" data-act="month" data-d="1" aria-label="Следующий месяц">›</button></div>`) + `
  <div class="card"><div class="grid">${WD.map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div></div>
  <div class="row spread dayhead">
    <div><b>${human(ui.date)}</b>
      <div class="muted small">${items.length ? `Сделано ${done} из ${items.length}, запланировано ${items.length - done}` : 'Планов пока нет'}</div></div>
    <button class="btn sm ghost" data-act="shareDay">Поделиться</button>
  </div>
  ${items.length ? `<div class="progress" style="margin:0 4px 12px"><b style="width:${Math.round(done / items.length * 100)}%"></b></div>` : ''}
  ${busyNow.length ? `<div class="hint busyh">День занят целиком: ${busyNow.map(i => `<b>${esc(i.title)}</b>${i.dateTo ? ` (${short(i.date)} – ${short(i.dateTo)})` : ''}`).join(', ')}. Другие дела на этот день лучше не ставить.</div>` : ''}
  ${ncl ? `<div class="alert">Накладка по времени: ${ncl} ${plural(ncl, 'дело пересекается', 'дела пересекаются', 'дел пересекаются')}. Они отмечены красным.</div>` : ''}
  <div class="card">${items.length ? items.map(i => itemHtml(i, false, cl[i.id])).join('') : '<div class="empty">Нажмите «+», чтобы добавить задачу или встречу</div>'}</div>
  ${li != null ? `<button class="card link" data-act="learnOpen" data-i="${li}"><i class="tile" style="background:${TRACKS[PLAN[li][0]].color}">${li + 1}</i>
    <span><b>${esc(PLAN[li][1])}</b><small>Развитие · час в день</small></span><em>›</em></button>` : ''}
  <button class="card link" data-act="foodDay"><i class="tile" style="background:${cat('food').color}">🍽</i>
    <span><b>Питание</b><small>${fs.total ? `Отмечено ${fs.touched} из ${fs.total} позиций${fs.repl ? `, замен: ${fs.repl}` : ''}` : 'Меню на этот день не задано'}</small></span><em>›</em></button>
  <button class="fab" data-act="add" aria-label="Добавить">+</button>`;
}

/* ---------- Питание ---------- */
function weekStrip() {
  const mon = monday(ui.date), week = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i));
  return { week, html: `<div class="row spread" style="margin-bottom:8px">
      <button class="icon-btn" data-act="week" data-d="-7" aria-label="Предыдущая неделя">‹</button>
      <div class="muted small">${short(week[0])} – ${short(week[6])}</div>
      <button class="icon-btn" data-act="week" data-d="7" aria-label="Следующая неделя">›</button></div>
    <div class="week">${week.map((d, i) => { const s = foodStat([d]); return `<button class="wday ${d === ui.date ? 'on' : ''} ${d === today() ? 'tod' : ''}" data-act="day" data-date="${d}">${WD[i]}<b>${parse(d).getDate()}</b><em>${s.touched ? s.pct + '%' : ''}</em></button>`; }).join('')}</div>` };
}
function viewFood() {
  const top = head(esc(state.menu.title), ui.foodView === 'menu' ? `<button class="btn sm ${ui.foodEdit ? '' : 'ghost'}" data-act="foodEdit">${ui.foodEdit ? 'Готово' : 'Изменить меню'}</button>` : '')
    + seg('foodView', ui.foodView, [['menu', 'Меню'], ['shop', 'Покупки'], ['body', 'Вес'], ['plan', 'План']]);
  if (ui.foodView === 'shop') return top + viewShop();
  if (ui.foodView === 'body') return top + viewBody();
  if (ui.foodView === 'plan') return top + viewPlan();
  const { week, html: weekRow } = weekStrip(), ws = foodStat(week), w = wdi(ui.date);

  if (ui.foodEdit) {
    const meals = state.menu.days[w] || [];
    return top + weekRow + `
    <div class="hint">Вы редактируете шаблон меню на день недели: <b>${WD_FULL[w].toLowerCase()}</b>. Каждое блюдо или продукт пишите с новой строки. Уже отмеченные дни не изменятся.</div>
    ${meals.map((m, i) => `<div class="card">
      <div class="two"><label class="f">Приём пищи<input data-ch="mName" data-i="${i}" value="${esc(m.name)}"></label>
      <label class="f">Время<input type="time" data-ch="mTime" data-i="${i}" value="${esc(m.time)}"></label></div>
      <label class="f">Что едим (по строке на позицию)<textarea data-ch="mItems" data-i="${i}" rows="5">${esc(m.items.join('\n'))}</textarea></label>
      <button class="btn sm danger" data-act="mealDel" data-i="${i}">Удалить приём пищи</button></div>`).join('')}
    <div class="actions"><button class="btn ghost" data-act="mealAdd">Добавить приём пищи</button>
    ${blank() ? '' : '<button class="btn plain" data-act="menuReset">Вернуть рассчитанное меню</button>'}</div>`;
  }

  const meals = dayMeals(ui.date), rec = state.food[ui.date] || {}, ds = foodStat([ui.date]), tot = dayTotals(meals), eat = eatenTotals(meals);
  const mealsHtml = meals.map((m, mi) => {
    const st = mealStatus(m), mt = mealTot(m), allE = m.items.length > 0 && m.items.every(i => i.eaten || i.repl);
    return `<div class="card meal">
      <div class="meal-head"><input type="checkbox" data-ch="mealAll" data-m="${mi}" ${allE ? 'checked' : ''} aria-label="Съел всё">
        <div class="t">${esc(m.name)}<small>${esc(m.time || '')}${mt.kcal ? ` · ${mt.kcal} ккал · Б ${mt.p} г` : ''}</small></div>
        <span class="badge ${st.k}">${st.t}</span></div>
      ${m.items.map((it, ii) => {
        const k = `${ui.date}|${mi}|${ii}`, open = it.repl || ui.swap.has(k);
        if (it.extra) return `<div class="fitem"><div class="line">
          <input type="checkbox" class="sm" data-ch="fItem" data-m="${mi}" data-i="${ii}" ${it.eaten ? 'checked' : ''}>
          <button class="ftxt" data-act="itemEdit" data-m="${mi}" data-i="${ii}">${esc(it.text)}<small class="muted" style="display:block">добавлено · ${it.k ? `${Math.round(it.k[0])} ккал · Б ${ru(it.k[1])} · Ж ${ru(it.k[2])} · У ${ru(it.k[3])}` : ''}</small></button>
          <button class="x" data-act="itemEdit" data-m="${mi}" data-i="${ii}" aria-label="Изменить">✎</button></div></div>`;
        return `<div class="fitem ${it.repl ? 'replaced' : ''}"><div class="line">
          <input type="checkbox" class="sm" data-ch="fItem" data-m="${mi}" data-i="${ii}" ${it.eaten ? 'checked' : ''}>
          <button class="ftxt" data-act="itemEdit" data-m="${mi}" data-i="${ii}">${esc(it.text)}${it.k ? `<small class="muted" style="display:block">${Math.round(it.k[0])} ккал · Б ${ru(it.k[1])}</small>` : ''}</button>
          ${open ? '' : `<button class="swap" data-act="swap" data-k="${k}">Заменил</button>`}</div>
          ${open ? `<input class="inp inline" data-ch="fRepl" data-m="${mi}" data-i="${ii}" value="${esc(it.repl)}" placeholder="На что заменил">` : ''}</div>`;
      }).join('')}
      <button class="btn sm ghost scanb" data-act="prodAdd" data-m="${mi}">＋ Продукт или штрихкод</button>
      <input class="inp inline" data-ch="mNote" data-m="${mi}" value="${esc(m.note)}" placeholder="Комментарий: что не съел и почему">
    </div>`;
  }).join('');

  return top + weekRow + `
  <div class="card sum">${ring(ds.pct, 64, 7, 'var(--ok)', `<b>${ds.pct}%</b>`)}
    <div><b>${human(ui.date)}</b>
      <div class="muted small">${esc((state.menu.labels || [])[w] || '')}</div>
      <div class="muted small">За неделю по плану ${ws.eaten} из ${ws.total} позиций, замен: ${ws.repl}</div></div>
  </div>
  ${tot.kcal || eat.kcal ? `<div class="card eat"><div class="row spread"><span class="muted">Съедено за день</span><b>${eat.kcal} <small class="muted">${tot.kcal ? `из ${tot.kcal} ` : ''}ккал</small></b></div>
    ${tot.kcal ? `<div class="progress ${eat.kcal > tot.kcal * 1.05 ? 'over' : ''}"><b style="width:${Math.min(100, eat.kcal / tot.kcal * 100)}%"></b></div>` : ''}
    <div class="mac3">${[['Белки', eat.p, tot.p], ['Жиры', eat.f, tot.f], ['Углеводы', eat.c, tot.c]].map(([n, a, b]) => `<div><span>${n}</span><b>${a}<small>${b ? ` / ${b}` : ''} г</small></b></div>`).join('')}</div>
    ${eat.repl ? `<div class="muted small" style="margin-top:8px">Замены без штрихкода не посчитаны: ${eat.repl}. Чтобы учесть, добавьте продукт кнопкой «＋ Продукт».</div>` : ''}</div>` : ''}
  ${blank() && !meals.some(m => m.items.length) ? '<div class="hint">Меню пока пустое. Нажмите «Изменить меню» вверху, чтобы вписать свои блюда на этот день недели, или добавляйте продукты по штрихкоду прямо в приём пищи.</div>' : ''}
  ${mealsHtml || '<div class="card"><div class="empty">На этот день меню не задано. Нажмите «Изменить меню», чтобы составить.</div></div>'}
  <div class="card">
    <label class="f">Тренировка<select data-ch="train">${['', 'Была', 'Не было', 'День отдыха'].map(o => `<option ${rec.train === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
    <label class="f" style="margin-bottom:0">Итог дня<textarea data-ch="comment" placeholder="Самочувствие, срывы, что получилось">${esc(rec.comment || '')}</textarea></label>
  </div>
  <div class="actions"><button class="btn ghost" data-act="shareFood">Поделиться отчётом за день</button>
  ${rec.meals ? '<button class="btn danger" data-act="foodReset">Сбросить отметки дня</button>' : ''}</div>`;
}

function shopOwnBlock() {
  const l = state.shopOwn, got = l.filter(i => i.done).length;
  return `<div class="quick" style="margin:0 0 12px"><input id="shopNew" class="inp" placeholder="Что купить, например: куриное филе 1 кг" enterkeyhint="done" autocomplete="off"><button class="btn" data-act="shopAdd" aria-label="Добавить">+</button></div>
    <div class="card">${l.length ? l.map(i => `<label class="shop ${i.done ? 'done' : ''}"><input type="checkbox" class="sm" data-ch="shopOwn" data-id="${i.id}" ${i.done ? 'checked' : ''}><span>${esc(i.name)}</span><button class="x" data-act="shopDel" data-id="${i.id}" aria-label="Удалить">×</button></label>`).join('') : '<div class="empty">Свой список пуст. Впишите позицию выше и нажмите «+».</div>'}
    ${got ? '<button class="btn sm ghost" style="margin-top:10px" data-act="shopClear">Убрать купленное</button>' : ''}</div>`;
}
function viewShop() {
  if (blank()) return shopOwnBlock() + (state.shopOwn.length ? '<div class="actions"><button class="btn ghost" data-act="shopShare">Поделиться списком</button></div>' : '');
  const wk = monday(today()), done = state.shop[wk] || {}, groups = window.MENU_SHOP || [];
  const all = groups.reduce((n, g) => n + g.items.length, 0), got = groups.reduce((n, g) => n + g.items.filter(i => done[i.id]).length, 0);
  const own = state.shopOwn, ownGot = own.filter(i => i.done).length;
  return `<div class="card sum">${ring(all + own.length ? (got + ownGot) / (all + own.length) * 100 : 0, 64, 7, 'var(--ok)', `<b>${got + ownGot}</b><small>из ${all + own.length}</small>`)}
    <div><b>Покупки на неделю</b><div class="muted small">Сверху ваш собственный список, ниже продукты, посчитанные по меню.</div></div></div>
  <h2>Мой список${own.length ? ` · ${ownGot} из ${own.length}` : ''}</h2>
  ${shopOwnBlock()}
  <div class="row spread"><h2>По меню · ${got} из ${all}</h2><button class="btn sm ghost" data-act="tdToggle" data-k="shopMenu">${ui.td.shopMenu ? 'Показать' : 'Свернуть'}</button></div>
  ${ui.td.shopMenu ? '' : `<p class="muted small" style="margin:0 4px 4px">Посчитано с понедельника по воскресенье. Мясо, рыба и крупы указаны в сыром и сухом виде. Если вы меняли меню вручную, этот список останется по рассчитанному меню.</p>
  ${groups.map(g => `<h2>${g.name}</h2><div class="card">${g.items.map(i => `<label class="shop ${done[i.id] ? 'done' : ''}"><input type="checkbox" class="sm" data-ch="shop" data-id="${i.id}" ${done[i.id] ? 'checked' : ''}><span>${esc(i.name)}</span><b>${i.amt}</b></label>`).join('')}</div>`).join('')}`}
  <div class="actions"><button class="btn ghost" data-act="shopShare">Поделиться списком</button>${got ? '<button class="btn danger" data-act="shopReset">Снять отметки по меню</button>' : ''}</div>`;
}
function shopText() {
  const own = state.shopOwn.map(i => `${i.done ? '☑' : '☐'} ${i.name}`).join('\n');
  if (blank()) return 'Покупки\n\n' + own;
  return 'Покупки на неделю\n' + (own ? `\nМой список\n${own}\n` : '') + (ui.td.shopMenu ? '' : (window.MENU_SHOP || []).map(g => `\n${g.name}\n` + g.items.map(i => `☐ ${i.name}: ${i.amt}`).join('\n')).join('\n'));
}

function chart(pts, o) {
  // pts: [{d:'YYYY-MM-DD', y}], o: {color, unit, plan: кг в неделю или null}
  if (!pts.length) return '<div class="empty">Пока нет записей</div>';
  const W = 340, H = 150, L = 34, R = 12, T = 12, B = 22, d0 = pts[0].d;
  const span = Math.max(28, diffDays(d0, pts[pts.length - 1].d) + 3);
  const planEnd = o.plan ? pts[0].y - o.plan * span / 7 : null;
  const ys = pts.map(p => p.y).concat(o.plan ? [planEnd] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys); const padY = Math.max(0.5, (hi - lo) * 0.15); lo -= padY; hi += padY;
  const X = d => L + diffDays(d0, d) / span * (W - L - R), Y = y => T + (hi - y) / (hi - lo) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  const grid = [0, 1, 2, 3].map(i => { const y = lo + (hi - lo) * i / 3; return `<line x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}" class="gl"/><text x="${L - 6}" y="${Y(y) + 4}" text-anchor="end">${ru(y)}</text>`; }).join('');
  const last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График">${grid}
    ${o.plan ? `<line x1="${X(d0)}" y1="${Y(pts[0].y)}" x2="${W - R}" y2="${Y(planEnd)}" class="pl"/>` : ''}
    <path d="${path}" fill="none" stroke="${o.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p => `<circle cx="${X(p.d)}" cy="${Y(p.y)}" r="${p === last ? 4.5 : 2.5}" fill="${o.color}"/>`).join('')}
    <text x="${L}" y="${H - 5}">${short(d0)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${short(addDays(d0, span))}</text></svg>`;
}
function bodyOut() {
  const days = Object.keys(state.body).sort();
  const w = days.filter(d => state.body[d].w != null).map(d => ({ d, y: state.body[d].w }));
  const f = days.filter(d => state.body[d].fat != null).map(d => ({ d, y: state.body[d].fat }));
  const lean = days.filter(d => state.body[d].w != null && state.body[d].fat != null).map(d => ({ d, y: Math.round((state.body[d].w - state.body[d].fat) * 10) / 10 }));
  const delta = a => a.length > 1 ? a[a.length - 1].y - a[0].y : null;
  const tile = (name, arr, unit, goodDown) => {
    const dl = delta(arr), l = arr[arr.length - 1];
    return `<div><span>${name}</span><b>${l ? ru(l.y) : '—'}<small> ${unit}</small></b>
      <em class="${dl == null || dl === 0 ? '' : (dl < 0) === goodDown ? 'good' : 'bad'}">${dl == null ? 'нет динамики' : (dl > 0 ? '+' : '') + ru(dl) + ' ' + unit}</em></div>`;
  };
  const r1 = x => Math.round(x * 10) / 10, both = days.filter(d => state.body[d].w != null && state.body[d].fat != null);
  const leanP = both.map(d => ({ d, y: r1((state.body[d].w - state.body[d].fat) / state.body[d].w * 100) }));
  const fatP = both.map(d => ({ d, y: r1(state.body[d].fat / state.body[d].w * 100) }));
  const bmi = P.h ? w.map(x => ({ d: x.d, y: r1(x.y / (P.h / 100) ** 2) })) : [], b = bmi.length ? bmi[bmi.length - 1].y : null;
  const bmiT = b == null ? '' : b < 18.5 ? 'ниже нормы' : b < 25 ? 'норма' : b < 30 ? 'выше нормы' : 'ожирение';
  return `<div class="tiles">${tile('Вес', w, 'кг', true)}${tile('Жир', f, 'кг', true)}${tile('Без жира', lean, 'кг', false)}</div>
  <div class="tiles">${tile('Сухая масса', leanP, '%', false)}${tile('Доля жира', fatP, '%', true)}
    <div><span>ИМТ</span><b>${b != null ? ru(b) : '—'}</b><em class="${b == null ? '' : b >= 18.5 && b < 25 ? 'good' : 'bad'}">${b != null ? bmiT : P.h ? 'нужен вес' : 'укажите рост'}</em></div></div>
  <p class="muted small" style="margin:0 4px 12px">Сухая масса в процентах: вес без жира, делённый на общий вес. ${P.h ? `ИМТ считается по росту ${P.h} см, норма от 18,5 до 25.` : 'Чтобы появился ИМТ, укажите рост выше.'} ИМТ не отличает мышцы от жира, поэтому на сушке важнее доля жира. ${blank() ? '' : 'Цель: жир уходит, сухая масса в килограммах почти не меняется.'}</p>
  <div class="card"><div class="row spread"><b>Вес, кг</b>${P.rate ? `<span class="muted small">пунктир: план ${ru(P.rate)} кг в неделю</span>` : ''}</div>${chart(w, { color: 'var(--accent)', plan: P.rate || null })}</div>
  <div class="card"><b>Масса жира, кг</b>${chart(f, { color: 'var(--warn)' })}</div>
  <div class="card"><b>Масса без жира, кг</b>${chart(lean, { color: 'var(--ok)' })}</div>
  ${days.length ? `<h2>Записи</h2><div class="card">${days.slice().reverse().slice(0, 30).map(d => `<button class="list-btn" data-act="day" data-date="${d}"><span>${short(d)}</span>
    <b>${state.body[d].w != null ? ru(state.body[d].w) + ' кг' : ''}</b><span class="muted small" style="flex:none;min-width:118px;text-align:right">${state.body[d].fat != null ? 'жир ' + ru(state.body[d].fat) + ' кг' : ''}${state.body[d].w != null && state.body[d].fat != null ? `<br>сухая ${ru(r1((state.body[d].w - state.body[d].fat) / state.body[d].w * 100))}%` : ''}${state.body[d].w != null && P.h ? `<br>ИМТ ${ru(r1(state.body[d].w / (P.h / 100) ** 2))}` : ''}</span></button>`).join('')}</div>` : ''}`;
}
function viewBody() {
  const r = state.body[ui.date] || {};
  return `<div class="card">
    <div class="row spread" style="margin-bottom:10px"><button class="icon-btn flat" data-act="shift" data-d="-1" aria-label="День назад">‹</button>
      <b>${ui.date === today() ? 'Сегодня, ' + short(ui.date) : human(ui.date)}</b>
      <button class="icon-btn flat" data-act="shift" data-d="1" aria-label="День вперёд">›</button></div>
    <div class="two"><label class="f" style="margin:0">Вес, кг<input inputmode="decimal" data-ch="bw" value="${r.w != null ? ru(r.w) : ''}" placeholder="82,0"></label>
    <label class="f" style="margin:0">Масса жира, кг<input inputmode="decimal" data-ch="bf" value="${r.fat != null ? ru(r.fat) : ''}" placeholder="с весов"></label></div>
    ${blank() ? `<label class="f" style="margin:10px 0 0">Рост, см (нужен для ИМТ)<input inputmode="decimal" data-ch="prof" data-k="h" value="${P.h || ''}" placeholder="например 178"></label>` : ''}
    <p class="muted small" style="margin:10px 0 0">Взвешивайтесь утром натощак, после туалета. Смотрите на тренд за неделю, а не на один день.</p>
  </div><div id="bodyOut">${bodyOut()}</div>`;
}
function viewPlanOwn() {
  const pr = state.settings.profile || {}, lastD = Object.keys(state.body).sort().reverse().find(d => state.body[d].w != null), w = lastD ? state.body[lastD].w : pr.w;
  const ok = pr.h && pr.age && w, bmr = ok ? Math.round(10 * w + 6.25 * pr.h - 5 * pr.age + (pr.sex === 'f' ? -161 : 5)) : 0;
  const tdee = Math.round(bmr * Number(pr.act || 1.375) / 10) * 10, g = Number(pr.goal || 1), target = Math.round(tdee * g / 10) * 10;
  const sel = (k, opts, cur) => `<select data-ch="prof" data-k="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(cur) === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="card">
    <div class="two"><label class="f">Пол${sel('sex', [['m', 'Мужской'], ['f', 'Женский']], pr.sex || 'm')}</label>
    <label class="f">Возраст, лет<input inputmode="numeric" data-ch="prof" data-k="age" value="${pr.age || ''}"></label></div>
    <div class="two"><label class="f">Рост, см<input inputmode="decimal" data-ch="prof" data-k="h" value="${pr.h || ''}"></label>
    <label class="f">Вес, кг<input inputmode="decimal" data-ch="prof" data-k="w" value="${w ? ru(w) : ''}" ${lastD ? 'disabled' : ''}></label></div>
    ${lastD ? '<p class="muted small" style="margin:-4px 0 10px">Вес берётся из последней записи во вкладке «Вес».</p>' : ''}
    <label class="f">Активность${sel('act', ACT, pr.act || '1.375')}</label>
    <label class="f" style="margin-bottom:0">Цель${sel('goal', GOALS, pr.goal || '1')}</label>
  </div>
  ${ok ? `<div class="card planhero"><div class="lbl">Ориентир на день</div><div class="big">${target} <small>ккал</small></div>
      <div class="macro"><span>Белки <b>${Math.round(w * (g < 1 ? 2 : 1.6))} г</b></span><span>Жиры <b>${Math.round(w * 0.9)} г</b></span><span>Углеводы <b>${Math.max(0, Math.round((target - w * (g < 1 ? 2 : 1.6) * 4 - w * 0.9 * 9) / 4))} г</b></span></div></div>
  <h2>Как посчитано</h2>
  <div class="card kv"><div><span>Базовый обмен</span><b>≈ ${bmr} ккал</b></div><div><span>Расход за день</span><b>≈ ${tdee} ккал</b></div>
    <div><span>Цель</span><b>${g < 1 ? 'дефицит 15%' : g > 1 ? 'профицит 10%' : 'без изменений'}</b></div></div>
  <p class="muted small" style="margin:0 4px 12px">Расчёт по формуле Миффлина-Сан Жеора. Это ориентир, а не медицинское назначение. При проблемах со здоровьем согласуйте рацион с врачом.</p>`
    : '<div class="hint">Заполните возраст, рост и вес, и планер посчитает ориентир по калориям и БЖУ.</div>'}
  <label class="f">Свои заметки по плану<textarea data-ch="menuGoal" placeholder="Например: что не ем, какая цель и к какому сроку">${esc(state.menu.goal)}</textarea></label>`;
}
function viewPlan() {
  if (blank()) return viewPlanOwn();
  const wk = window.MENU_WEEK || [], tr = wk.filter(d => d.label !== 'День отдыха'), rest = wk.filter(d => d.label === 'День отдыха');
  const avg = a => a.length ? Math.round(a.reduce((s, d) => s + d.kcal, 0) / a.length / 10) * 10 : 0;
  const av = (a, k) => a.length ? Math.round(a.reduce((s, d) => s + d[k], 0) / a.length) : 0;
  const all = avg(wk), def = P.tdee - all, perWeek = def * 7 / 7700;
  const first = Object.keys(state.body).sort().find(d => state.body[d].w != null), w0 = first ? state.body[first].w : P.w;
  return `<div class="card planhero"><div class="lbl">Цель на день</div>
      <div class="big">${avg(tr)} <small>ккал в дни тренировок</small></div><div class="big2">${avg(rest)} <small>ккал в дни отдыха</small></div>
      <div class="macro"><span>Белки <b>${av(wk, 'p')} г</b></span><span>Жиры <b>${av(wk, 'f')} г</b></span><span>Углеводы <b>${av(tr, 'c')} / ${av(rest, 'c')} г</b></span></div></div>
  <h2>Как посчитано</h2>
  <div class="card kv">
    <div><span>Данные</span><b>${P.w} кг, ${P.h} см, ${P.age} года</b></div>
    <div><span>Тренировки</span><b>бокс 3 раза, кроссфит 2 раза</b></div>
    <div><span>Базовый обмен</span><b>≈ ${P.bmr} ккал</b></div>
    <div><span>Расход за день</span><b>≈ ${P.tdee} ккал</b></div>
    <div><span>Среднее по меню</span><b>${all} ккал</b></div>
    <div><span>Дефицит</span><b>≈ ${def} ккал, ${Math.round(def / P.tdee * 100)}%</b></div>
  </div>
  <h2>Прогноз</h2>
  <div class="card">
    <p style="margin:0 0 10px">При таком дефиците уходит примерно <b>${ru(Math.floor(perWeek * 10) / 10 - 0.1)}–${ru(Math.ceil(perWeek * 10) / 10)} кг в неделю</b>. В первую неделю вес может упасть сильнее за счёт воды.</p>
    <div class="fc">${[2, 4, 8, 12].map(n => `<div><span>через ${n} ${plural(n, 'неделю', 'недели', 'недель')}</span><b>≈ ${ru(w0 - P.rate * n)} кг</b></div>`).join('')}</div>
    <p class="muted small" style="margin:10px 0 0">Высокий белок и силовые тренировки нужны, чтобы уходил жир, а мышцы оставались. Проверяйте это по графику «Масса без жира».</p>
  </div>
  <h2>Правила</h2>
  <div class="card rules">
    <div>Взвешивайте продукты в сыром виде, крупы в сухом. Граммовки в меню указаны так.</div>
    <div>Вода: 2,5–3 литра в день, в дни тренировок больше.</div>
    <div>Шаги: 8–10 тысяч в день, это заметная часть расхода.</div>
    <div>Сон: от 7 часов, иначе растёт голод и хуже сохраняются мышцы.</div>
    <div>Замены делайте внутри группы: мясо на рыбу или птицу, крупу на крупу, творог на йогурт или яйца.</div>
    <div>Если две недели подряд вес уходит медленнее 0,3 кг в неделю, уберите 150 ккал из углеводов. Если быстрее 0,9 кг, добавьте 150 ккал.</div>
  </div>
  <h2>Допущения</h2>
  <div class="card rules">
    <div>Бокс поставлен на понедельник, среду и пятницу. Если дни другие, поменяйте тренировки в календаре и меню в эти дни.</div>
    <div>Расчёт сделан по формуле для мужчин. Процент жира пока неизвестен, после первых замеров на весах цифры можно уточнить.</div>
    <div>Это ориентир, а не медицинское назначение. При проблемах со здоровьем согласуйте рацион с врачом.</div>
  </div>
  <label class="f">Свои заметки по плану<textarea data-ch="menuGoal" placeholder="Например: что не ем, что хочу поменять">${esc(state.menu.goal)}</textarea></label>`;
}

/* ---------- Развитие ---------- */
function viewLearnOwn() {
  const t = today(), secs = learnSecs(t), run = !!state.learn.timer, left = Math.max(0, LEARN_GOAL - secs), cust = state.learn.custom.own || [];
  const totalMin = Math.floor(Object.keys(state.learn.secs).reduce((s, k) => s + learnSecs(k), state.learn.timer && !state.learn.secs[t] ? learnSecs(t) : 0) / 60);
  const link = u => /^https?:\/\//i.test(u) ? esc(u) : '#';
  ui.learnDay = 'own';
  return head('Развитие') + `
  <div class="card timer ${run ? 'run' : ''}">
    ${ring(secs / LEARN_GOAL * 100, 132, 10, 'var(--accent)', `<b id="tm">${clock(left)}</b><small>${secs >= LEARN_GOAL ? 'час выполнен' : 'осталось'}</small>`)}
    <div class="tbtn"><button class="btn" data-act="timer">${run ? 'Пауза' : secs ? 'Продолжить' : 'Начать час'}</button>
    ${secs && !run ? '<button class="btn plain" data-act="timerReset">Сбросить</button>' : ''}</div>
  </div>
  <p class="muted small" style="margin:0 4px 6px">Таймер считает час в день на учёбу. Всего набрано: ${dur(totalMin)}.</p>
  <div class="row spread"><h2>Мои материалы · ${cust.filter(c => c.done).length} из ${cust.length}</h2><button class="btn sm ghost" data-act="lcAdd">Добавить</button></div>
  <div class="card">${cust.length ? cust.map(c => `<div class="mat"><input type="checkbox" data-ch="lc" data-id="${c.id}" ${c.done ? 'checked' : ''}>
      <div>${c.url ? `<a href="${link(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.url)}</a>` : `<span>${esc(c.title)}</span>`}
      <small>${TYPE[c.type] || 'Ссылка'}${c.min ? ` · ${c.min} мин` : ''}</small></div>
      <button class="x" data-act="lcDel" data-id="${c.id}" aria-label="Удалить">×</button></div>`).join('') : '<div class="empty">Здесь будет ваш список: курсы, видео, статьи и книги. Нажмите «Добавить».</div>'}</div>`;
}
function viewLearn() {
  if (!PLAN.length) return viewLearnOwn();
  if (ui.learnDay === 'own') ui.learnDay = null;
  const t = today(), ti = learnIdx(t);
  if (ui.learnDay == null) ui.learnDay = ti != null ? ti : 0;
  const i = ui.learnDay, d = PLAN[i], done = state.learn.done[i] || {}, cust = state.learn.custom[i] || [], tr = TRACKS[d[0]];
  const full = PLAN.filter((_, k) => learnProgress(k).full).length;
  const totalMin = Math.floor(Object.keys(state.learn.secs).reduce((s, k) => s + learnSecs(k), state.learn.timer && !state.learn.secs[t] ? learnSecs(t) : 0) / 60);
  const secs = learnSecs(t), run = !!state.learn.timer, left = Math.max(0, LEARN_GOAL - secs);
  const link = (u) => /^https?:\/\//i.test(u) ? esc(u) : '#';
  const ls = learnState(), at = state.learn.doneAt || {};
  const dayNote = (k, pr) => pr.full ? `<u class="ok">пройдено${at[k] ? ' ' + when(at[k]) : ''}</u>` : learnDate(k) < t ? `<u class="bad">не пройдено, было ${when(learnDate(k))}</u>` : k === ti ? 'сегодня' : short(learnDate(k));
  const m0 = ls.missed[0];
  const status = `${ls.missed.length ? `<div class="lstat bad"><b>${ls.missed.length === 1 ? `${learnDate(m0) === addDays(t, -1) ? 'Вчера' : short(learnDate(m0))} не пройдено` : `Не пройдено дней: ${ls.missed.length}`}</b>
      <p>Нужно догнать сегодня до конца дня. Откройте тему и отметьте материалы и практику.</p>
      ${ls.missed.slice(0, 3).map(k => { const pr = learnProgress(k); return `<button data-act="learnDay" data-i="${k}"><span>День ${k + 1}. ${esc(PLAN[k][1])}<small>было ${when(learnDate(k))} · отмечено ${pr.n} из ${pr.total}</small></span><em>›</em></button>`; }).join('')}
      ${ls.missed.length > 3 ? `<small>и ещё ${ls.missed.length - 3}, они отмечены красным в плане ниже</small>` : ''}</div>` : ''}
    ${ls.cur ? (ls.cur.full ? `<div class="lstat ok"><b>✓ Сегодня пройдено</b><p>День ${ti + 1}. ${esc(PLAN[ti][1])}</p></div>`
      : `<div class="lstat"><b>Сегодня ещё не пройдено</b><p>День ${ti + 1}. ${esc(PLAN[ti][1])}. Отмечено ${ls.cur.n} из ${ls.cur.total}.</p>${i !== ti ? `<button data-act="learnDay" data-i="${ti}"><span>Открыть сегодняшнюю тему</span><em>›</em></button>` : ''}</div>`) : ''}`;
  const prI = learnProgress(i);
  const mat = d[3].map((m, k) => `<div class="mat"><input type="checkbox" data-ch="lm" data-k="m${k}" ${done['m' + k] ? 'checked' : ''}>
      <div><a href="${link(m[2])}" target="_blank" rel="noopener">${esc(m[1])}</a>
      <small>${TYPE[m[0]]}${m[3] ? ` · ${m[3]} мин` : ''} · ${m[4] === 'RU' ? 'на русском' : 'на английском'}</small></div></div>`).join('');
  const custHtml = cust.map(c => `<div class="mat"><input type="checkbox" data-ch="lc" data-id="${c.id}" ${c.done ? 'checked' : ''}>
      <div>${c.url ? `<a href="${link(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.url)}</a>` : `<span>${esc(c.title)}</span>`}
      <small>${TYPE[c.type] || 'Ссылка'}${c.min ? ` · ${c.min} мин` : ''} · добавлено вами</small></div>
      <button class="x" data-act="lcDel" data-id="${c.id}" aria-label="Удалить">×</button></div>`).join('');
  const list = PLAN.map((p, k) => ({ p, k })).filter(x => ui.learnTrack === 'all' || x.p[0] === ui.learnTrack).map(({ p, k }) => {
    const pr = learnProgress(k), miss = !pr.full && learnDate(k) < t;
    return `<button class="lday ${k === i ? 'on' : ''} ${pr.full ? 'full' : ''} ${miss ? 'miss' : ''}" data-act="learnDay" data-i="${k}">
      <i style="background:${TRACKS[p[0]].color}">${pr.full ? '✓' : miss ? '!' : k + 1}</i>
      <span><b>${esc(p[1])}</b><small>${dayNote(k, pr)} · ${TRACKS[p[0]].name}${pr.n && !pr.full ? ` · ${pr.n}/${pr.total}` : ''}</small></span></button>`;
  }).join('');

  return head('Развитие', `<button class="btn sm ghost" data-act="learnStart">Даты</button>`) + `
  <div class="card sum">${ring(full / PLAN.length * 100, 64, 7, 'var(--accent)', `<b>${full}</b><small>из ${PLAN.length}</small>`)}
    <div><b>Час в день на профессию</b><div class="muted small">Владелец продукта и ИИ для работы. ${short(learnDate(0))} – ${short(learnDate(PLAN.length - 1))}</div>
    <div class="macro"><span>Всего <b>${dur(totalMin)}</b></span><span>Сегодня <b>${Math.floor(secs / 60)} мин</b></span></div></div></div>

  ${status}
  <div class="card timer ${run ? 'run' : ''}">
    ${ring(secs / LEARN_GOAL * 100, 132, 10, 'var(--accent)', `<b id="tm">${clock(left)}</b><small>${secs >= LEARN_GOAL ? 'час выполнен' : 'осталось'}</small>`)}
    <div class="tbtn"><button class="btn" data-act="timer">${run ? 'Пауза' : secs ? 'Продолжить' : 'Начать час'}</button>
    ${secs && !run ? '<button class="btn plain" data-act="timerReset">Сбросить</button>' : ''}</div>
  </div>

  <div class="card lcard" style="--c:${tr.color}">
    <div class="row spread"><span class="badge" style="background:color-mix(in srgb,${tr.color} 16%,transparent);color:${tr.color}">${tr.name}</span>
      <span class="muted small">День ${i + 1} · ${dayNote(i, prI)}</span></div>
    <h3>${esc(d[1])}</h3><p class="muted">${esc(d[2])}</p>
    <div class="lbl">Материалы</div>${mat}${custHtml}
    <button class="btn sm ghost" style="margin:10px 0 4px" data-act="lcAdd">Добавить свою ссылку</button>
    <div class="lbl">Практика</div>
    <label class="mat"><input type="checkbox" data-ch="lm" data-k="task" ${done.task ? 'checked' : ''}><div><span>${esc(d[4])}</span></div></label>
  </div>
  <p class="muted small" style="margin:0 4px 6px">Большинство материалов на английском. В Safari страницу можно перевести кнопкой «аА» в адресной строке, на YouTube есть субтитры с автопереводом.</p>

  <h2>План на 30 дней</h2>
  <div class="chips">${[['all', 'Все'], ['po', TRACKS.po.name], ['ai', TRACKS.ai.name]].map(([v, n]) => `<button class="chip ${ui.learnTrack === v ? 'on' : ''}" data-act="learnTrack" data-v="${v}">${v !== 'all' ? `<i class="dot" style="background:${TRACKS[v].color}"></i>` : ''}${n}</button>`).join('')}</div>
  <div class="card ldays">${list}</div>`;
}

/* ---------- Разделы, заметки, доска ---------- */
function viewSec() {
  const all = state.items.filter(i => i.cat === ui.cat).sort(byTime);
  const t = today(), plan = all.filter(i => !i.done && lastDay(i) >= t).slice(0, 40), late = all.filter(i => !i.done && lastDay(i) < t);
  const done = all.filter(i => i.done).reverse().slice(0, 30), notes = state.notes.filter(n => n.cat === ui.cat);
  return head('Разделы', '<button class="btn sm ghost" data-act="back">Назад</button>') + `
  <div class="chips">${CATS.map(c => `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-act="cat" data-cat="${c.id}"><i class="dot" style="background:${c.color}"></i>${c.name}</button>`).join('')}</div>
  ${late.length ? `<h2>Просрочено · ${late.length}</h2><div class="card">${late.map(i => itemHtml(i, true)).join('')}</div>` : ''}
  <h2>Запланировано · ${plan.length}</h2>
  <div class="card">${plan.length ? plan.map(i => itemHtml(i, true)).join('') : '<div class="empty">Ничего не запланировано</div>'}</div>
  <h2>Сделано · ${all.filter(i => i.done).length}</h2>
  <div class="card">${done.length ? done.map(i => itemHtml(i, true)).join('') : '<div class="empty">Пока пусто</div>'}</div>
  <div class="row spread"><h2>Заметки · ${notes.length}</h2><button class="btn sm ghost" data-act="noteAdd" data-cat="${ui.cat}">Новая заметка</button></div>
  ${notes.length ? notes.map(noteHtml).join('') : '<div class="card"><div class="empty">Заметок в этом разделе нет</div></div>'}
  <button class="fab" data-act="add" data-cat="${ui.cat}" aria-label="Добавить">+</button>`;
}
function noteHtml(n) {
  const c = cat(n.cat);
  return `<button class="card note" data-act="noteEdit" data-id="${n.id}">
    <div class="title">${esc(n.title || 'Без названия')}</div>
    ${n.text ? `<p>${esc(n.text)}</p>` : ''}
    <div class="meta"><span><i class="dot" style="background:${c.color}"></i>${c.name}</span><span>${short(n.updated.slice(0, 10))}</span></div></button>`;
}
function viewNotes() {
  const top = head('Заметки и доска', '<button class="btn sm ghost" data-act="back">Назад</button>') + seg('notesView', ui.notesView, [['notes', 'Заметки'], ['board', 'Доска']]);
  const chips = `<div class="chips"><button class="chip ${ui.noteCat === 'all' ? 'on' : ''}" data-act="noteCat" data-cat="all">Все</button>
  ${CATS.map(c => `<button class="chip ${ui.noteCat === c.id ? 'on' : ''}" data-act="noteCat" data-cat="${c.id}"><i class="dot" style="background:${c.color}"></i>${c.name}</button>`).join('')}</div>`;
  if (ui.notesView === 'board') {
    const cards = state.cards.filter(c => ui.noteCat === 'all' || c.cat === ui.noteCat);
    return top + chips + `<div class="board">${COLS.map(([id, name], ci) => {
      const col = cards.filter(c => c.col === id);
      return `<div class="col" data-col="${id}"><div class="col-h"><b>${name}</b><span>${col.length}</span></div>
        ${col.map(c => `<div class="kcard" draggable="true" data-card="${c.id}" style="--c:${cat(c.cat).color}">
          <button class="open" data-act="cardEdit" data-id="${c.id}"><b>${esc(c.title)}</b>${c.text ? `<p>${esc(c.text)}</p>` : ''}
            <small><i class="dot" style="background:${cat(c.cat).color}"></i>${cat(c.cat).name}${c.due ? ' · до ' + short(c.due) : ''}</small></button>
          <div class="mv"><button data-act="cardMove" data-id="${c.id}" data-d="-1" ${ci === 0 ? 'disabled' : ''} aria-label="Влево">‹ ${ci ? COLS[ci - 1][1] : ''}</button>
            <button data-act="cardMove" data-id="${c.id}" data-d="1" ${ci === COLS.length - 1 ? 'disabled' : ''} aria-label="Вправо">${ci < COLS.length - 1 ? COLS[ci + 1][1] : ''} ›</button></div></div>`).join('')}
        <button class="addc" data-act="cardAdd" data-col="${id}">+ Карточка</button></div>`;
    }).join('')}</div><p class="muted small" style="margin:8px 4px">Листайте колонки вбок. Карточку переносят кнопки под ней, на компьютере её можно перетащить мышью.</p>`;
  }
  const list = state.notes.filter(n => ui.noteCat === 'all' || n.cat === ui.noteCat).sort((a, b) => b.updated.localeCompare(a.updated));
  return top + chips + `${list.length ? list.map(noteHtml).join('') : '<div class="card"><div class="empty">Нажмите «+», чтобы написать заметку</div></div>'}
  <button class="fab" data-act="noteAdd" data-cat="${ui.noteCat === 'all' ? 'work' : ui.noteCat}" aria-label="Новая заметка">+</button>`;
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
function viewMore() {
  if (ui.sub === 'sec') return viewSec();
  if (ui.sub === 'notes') return viewNotes();
  const sup = 'Notification' in window, perm = sup ? Notification.permission : 'unsupported';
  const permText = { granted: 'Включены', denied: 'Запрещены в настройках', default: 'Не включены', unsupported: 'Недоступны в этом браузере' }[perm];
  const open = state.cards.filter(c => c.col !== 'closed').length;
  const le = state.settings.lastExport, stale = state.items.length > 10 && (!le || diffDays(le, today()) > 7) && !(typeof sy !== 'undefined' && sy.ses);
  return head('Ещё') + `
  <input class="inp search" id="q" type="search" value="${esc(ui.q)}" placeholder="Поиск по задачам, заметкам и карточкам" autocomplete="off">
  <div id="searchOut">${searchOut()}</div>
  ${stale ? `<div class="hint"><b>Сделайте резервную копию</b><br>Записи хранятся только в этом телефоне. ${le ? `Последняя копия была ${short(le)}.` : 'Копий ещё не было.'} <button class="btn sm" style="margin-top:8px;display:block" data-act="export">Сохранить копию</button></div>` : ''}
  <button class="card link" data-act="sub" data-v="notes"><i class="tile" style="background:#f59e0b">✎</i><span><b>Заметки и доска</b><small>Заметок: ${state.notes.length}, открытых карточек: ${open}</small></span><em>›</em></button>
  <button class="card link" data-act="sub" data-v="sec"><i class="tile" style="background:#6366f1">▦</i><span><b>Разделы</b><small>Работа, учёба, встречи, саморазвитие, спорт</small></span><em>›</em></button>
  <h2>Оформление</h2>
  ${seg('theme', state.settings.theme === 'light' || state.settings.theme === 'dark' ? state.settings.theme : 'auto', [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']])}
  ${isStandalone() ? '' : `<div class="hint"><b>Как поставить на айфон</b><ol class="steps"><li>Откройте этот сайт в Safari.</li><li>Нажмите «Поделиться» (квадрат со стрелкой).</li><li>Выберите «На экран «Домой»».</li></ol></div>`}
  <h2>Синхронизация</h2>
  <div class="card" id="syncCard">${typeof syncCard === 'function' ? syncCard() : ''}</div>
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
  <p class="muted small" style="margin:0 4px">${typeof sy !== 'undefined' && sy.ses ? 'Записи хранятся на этом устройстве и в вашем облаке Supabase.' : 'Все записи хранятся только на этом устройстве.'} Задач: ${state.items.length}, заметок: ${state.notes.length}.</p>
  <div class="row spread" style="margin:14px 4px 0"><span class="muted small">Версия ${APP_VERSION}</span><button class="btn sm ghost" data-act="update">Проверить обновление</button></div>`;
}

function searchOut() {
  const q = ui.q.trim().toLowerCase(); if (q.length < 2) return '';
  const has = (...a) => a.some(x => x && String(x).toLowerCase().includes(q)), r = [];
  for (const i of state.items) if (has(i.title, i.note, i.who, i.place)) r.push([i.date, `<button class="list-btn" data-act="edit" data-id="${i.id}"><span>${esc(i.title)}<small class="muted" style="display:block">${short(i.date)}${timeText(i) ? ' · ' + timeText(i) : ''} · ${cat(i.cat).name}${i.done ? ' · сделано' : ''}</small></span></button>`]);
  r.sort((a, b) => b[0].localeCompare(a[0])); const out = r.slice(0, 15).map(x => x[1]);
  for (const n of state.notes) if (has(n.title, n.text)) out.push(`<button class="list-btn" data-act="noteEdit" data-id="${n.id}"><span>${esc(n.title || 'Без названия')}<small class="muted" style="display:block">Заметка · ${cat(n.cat).name}</small></span></button>`);
  for (const c of state.cards) if (has(c.title, c.text)) out.push(`<button class="list-btn" data-act="cardEdit" data-id="${c.id}"><span>${esc(c.title)}<small class="muted" style="display:block">Карточка · ${(COLS.find(x => x[0] === c.col) || [])[1]}</small></span></button>`);
  PLAN.forEach((p, k) => { if (has(p[1], p[2], ...p[3].map(m => m[1]))) out.push(`<button class="list-btn" data-act="learnOpen" data-i="${k}"><span>${esc(p[1])}<small class="muted" style="display:block">Развитие · день ${k + 1}</small></span></button>`); });
  return `<div class="card">${out.length ? out.slice(0, 30).join('') : '<div class="empty">Ничего не найдено</div>'}</div>`;
}

function applyTheme() {
  const th = state.settings.theme === 'light' || state.settings.theme === 'dark' ? state.settings.theme : 'auto', root = document.documentElement;
  if (th === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = th;
  try { localStorage.setItem('planer.theme', th); } catch (_) { /* тема просто не запомнится до загрузки */ }
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { const dark = /dark/.test(m.dataset.m || (m.dataset.m = m.media)); m.content = (th === 'auto' ? dark : th === 'dark') ? '#0d0f14' : '#f2f3f8'; });
}
applyTheme();
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const v = { today: viewToday, cal: viewCal, food: viewFood, learn: viewLearn, more: viewMore }[ui.tab];
  const board = $('.board'), sx = board ? board.scrollLeft : 0;
  $('#view').innerHTML = v();
  const nb = $('.board'); if (nb && sx) nb.scrollLeft = sx;
}

/* ---------- Шторка с формой ---------- */
const sheet = $('#sheet');
function openSheet(html) { if (toastEl.parentNode === sheet) document.body.appendChild(toastEl); sheet.innerHTML = `<div class="grab"></div><div class="sheet-in">${html}</div>`; if (!sheet.open) sheet.showModal(); sheet.scrollTop = 0; }
function closeSheet() { if (sheet.open) sheet.close(); ui.form = null; }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
sheet.addEventListener('close', () => { ui.form = null; stopScan(); if (toastEl.parentNode !== document.body) document.body.appendChild(toastEl); });
const catSelect = (id, cur) => `<select id="${id}">${CATS.map(c => `<option value="${c.id}" ${c.id === (cur || 'work') ? 'selected' : ''}>${c.name}</option>`).join('')}</select>`;

function itemForm(it) {
  ui.form = { kind: 'item', id: it.id || null, type: it.type || 'task', rep: 'none', days: new Set([wdi(it.date || ui.date)]), rems: rems(it).slice().sort((x, y) => x - y) };
  const isNew = !it.id;
  openSheet(`<div class="row sheet-top"><h3>${isNew ? 'Новая запись' : 'Запись'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <div class="seg"><button data-act="type" data-type="task" class="${ui.form.type === 'task' ? 'on' : ''}">Задача</button><button data-act="type" data-type="meeting" class="${ui.form.type === 'meeting' ? 'on' : ''}">Встреча</button></div>
  <label class="f">Название<input id="f-title" value="${esc(it.title || '')}" placeholder="Что нужно сделать" autocomplete="off"></label>
  <div class="two"><label class="f">Дата<input type="date" id="f-date" value="${it.date || ui.date}"></label>
  <label class="f">Раздел${catSelect('f-cat', it.cat)}</label></div>
  <div class="two"><label class="f">По дату, если на несколько дней<input type="date" id="f-to" value="${it.dateTo || ''}"></label>
  <label class="f busyl"><span>Занять дни целиком</span><span class="sw"><input type="checkbox" id="f-busy" ${it.busy ? 'checked' : ''}><em>другие дела будут отмечаться красным</em></span></label></div>
  <div class="two"><label class="f">Начало<input type="time" id="f-time" value="${esc(it.time || '')}"></label>
  <label class="f">Конец<input type="time" id="f-end" value="${esc(it.end || '')}"></label></div>
  <div class="two"><label class="f">или длительность, часов<input inputmode="decimal" id="f-dur" value="${it.dur ? ru(it.dur) : ''}" placeholder="например 1,5"></label>
  <label class="f">С кем<input id="f-who" value="${esc(it.who || '')}" placeholder="Имя или команда" autocomplete="off"></label></div>
  <label class="f">Место или ссылка<input id="f-place" value="${esc(it.place || '')}" placeholder="Необязательно" autocomplete="off"></label>
  <div class="f">Напоминания<div id="remBox">${remBox()}</div></div>
  ${isNew ? `<div class="f">Повтор
    <div class="seg" id="rep" style="grid-template-columns:repeat(3,1fr);margin:5px 0 0"><button data-act="rep" data-v="none" class="on">Один раз</button><button data-act="rep" data-v="daily">Каждый день</button><button data-act="rep" data-v="days">По дням</button></div>
    <div id="repMore" hidden><div class="wdpick">${WD.map((w, i) => `<button data-act="repDay" data-i="${i}" class="${ui.form.days.has(i) ? 'on' : ''}">${w}</button>`).join('')}</div>
    <select id="f-weeks" class="inp" aria-label="На какой срок"><option value="2">На 2 недели вперёд</option><option value="4">На 4 недели вперёд</option><option value="8" selected>На 8 недель вперёд</option><option value="12">На 12 недель вперёд</option><option value="26">На полгода вперёд</option></select></div></div>` : ''}
  <label class="f">Чек-лист (каждый пункт с новой строки)<textarea id="f-subs" placeholder="Пункт 1&#10;Пункт 2">${esc((it.subs || []).map(s => s.text).join('\n'))}</textarea></label>
  <label class="f">Заметка<textarea id="f-note">${esc(it.note || '')}</textarea></label>
  <button class="btn block" data-act="saveItem">Сохранить</button>
  ${isNew ? '' : `<div class="actions"><button class="btn ghost" data-act="ics">В Календарь iPhone</button><button class="btn ghost" data-act="shareItem">Поделиться</button><button class="btn ghost" data-act="toTomorrow">На завтра</button><button class="btn danger" data-act="delItem">Удалить</button></div>
  ${it.series ? '<button class="btn danger block" data-act="delSeries">Удалить все будущие повторы</button>' : ''}`}`);
  if (isNew) setTimeout(() => $('#f-title') && $('#f-title').focus(), 50);
}
function remBox() {
  const r = ui.form.rems;
  return `<div class="remlist">${r.length ? r.map(m => `<span class="rem">${remLabel(m)}<button data-act="remDel" data-m="${m}" aria-label="Убрать напоминание">×</button></span>`).join('') : '<span class="muted small">Пока без напоминаний</span>'}</div>
  <select id="f-remadd" class="inp" data-ch="remAdd" aria-label="Добавить напоминание"><option value="">＋ Добавить напоминание</option>${REMIND.filter(m => !r.includes(m)).map(m => `<option value="${m}">${remLabel(m)}</option>`).join('')}<option value="custom">Свой срок…</option></select>
  <div id="remCustom" class="remcustom" hidden><span>За</span><input id="f-remn" class="inp" inputmode="numeric" value="10"><select id="f-remu" class="inp">${REM_UNITS.map(([v, t]) => `<option value="${v}" ${v === '1440' ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn" data-act="remCustom">Добавить</button></div>
  <p class="muted small" style="margin:6px 0 0">Можно добавить несколько. У дела без времени срок считается от 9:00.</p>`;
}
function remAdd(m) {
  const r = ui.form.rems; m = Math.round(m);
  if (!(m >= 0) || m > 525600) { toast('Срок напоминания: не больше года'); return; }
  if (r.includes(m)) {
    toast(`Напоминание «${remLabel(m)}» уже добавлено`);
    const chip = document.querySelector(`.rem button[data-m="${m}"]`); if (chip) { chip.parentNode.classList.add('flash'); setTimeout(() => chip.parentNode.classList.remove('flash'), 1600); }
    return;
  }
  if (r.length >= 8) { toast('Не больше 8 напоминаний на одно дело'); return; }
  r.push(m); r.sort((x, y) => x - y); $('#remBox').innerHTML = remBox(); toast(`Добавлено: ${remLabel(m).toLowerCase()}`);
}
function readItemForm() {
  const f = ui.form, old = state.items.find(i => i.id === f.id) || {};
  const title = $('#f-title').value.trim();
  if (!title) { toast('Введите название'); $('#f-title').focus(); return null; }
  const oldSubs = old.subs || [], time = $('#f-time').value, end = $('#f-end').value, d = num($('#f-dur').value);
  const date = $('#f-date').value || ui.date, to = $('#f-to').value, dateTo = to && to > date && f.rep === 'none' ? to : '';
  if (to && to < date) { toast('Дата окончания раньше даты начала'); return null; }
  return {
    id: f.id || uid(), title, type: f.type, date, dateTo, busy: $('#f-busy').checked, time, end: time ? end : '',
    dur: !end && d && d > 0 ? d : null, who: $('#f-who').value.trim(),
    cat: $('#f-cat').value, remind: '', reminds: f.rems.slice(), place: $('#f-place').value.trim(), note: $('#f-note').value.trim(),
    subs: lines($('#f-subs').value).map(t => ({ text: t, done: !!(oldSubs.find(s => s.text === t) || {}).done })),
    done: !!old.done, series: old.series,
    sent: old.date === date && (old.time || '') === time ? (old.sent || []).filter(m => f.rems.includes(m)) : []
  };
}
function saveItemForm() {
  const it = readItemForm(); if (!it) return null;
  const f = ui.form, i = state.items.findIndex(x => x.id === it.id);
  const others = state.items.filter(x => x.id !== it.id && !x.done && overlap(x, it)), blockers = others.filter(x => x.busy);
  const sig = it.date + '|' + it.dateTo + '|' + blockers.map(x => x.id).join();
  if (blockers.length && f.okBusy !== sig) {                // на эти даты уже стоит занятый целиком период
    if (!confirm(`${it.dateTo ? 'На эти даты' : 'На ' + short(it.date)} уже стоит ${blockers.map(x => `«${x.title}»${x.dateTo ? ` (${short(x.date)} – ${short(x.dateTo)})` : ''}`).join(', ')}: ${blockers.length > 1 ? 'дни заняты' : 'день занят'} целиком. Всё равно сохранить?`)) return null;
    f.okBusy = sig;
  }
  if (i >= 0) state.items[i] = it;
  else if (f.rep === 'none') state.items.push(it);
  else {
    const days = f.rep === 'daily' ? new Set([0, 1, 2, 3, 4, 5, 6]) : f.days;
    if (!days.size) { toast('Выберите дни недели'); return null; }
    const n = Number($('#f-weeks').value) * 7; it.series = uid(); let made = 0, firstCopy = null;
    for (let k = 0; k < n; k++) {
      const d = addDays(it.date, k); if (!days.has(wdi(d))) continue;
      const c = { ...it, id: uid(), date: d, subs: it.subs.map(s => ({ ...s })) }; state.items.push(c); made++; firstCopy = firstCopy || c;
    }
    toast(`Создано повторов: ${made}`);
    save(); return firstCopy || it;
  }
  save();
  const cl = clashes(it.date)[it.id];
  if (it.busy && others.length) toast(`В эти дни уже есть дела: ${others.length}. Они отмечены красным.`);
  else if (cl) toast('Накладка по времени: ' + cl.slice(0, 3).map(o => `«${o.title}»`).join(', '));
  return it;
}

function noteForm(n) {
  ui.form = { kind: 'note', id: n.id || null };
  openSheet(`<div class="row sheet-top"><h3>${n.id ? 'Заметка' : 'Новая заметка'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <label class="f">Заголовок<input id="n-title" value="${esc(n.title || '')}" autocomplete="off"></label>
  <label class="f">Раздел${catSelect('n-cat', n.cat)}</label>
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
function cardForm(c) {
  ui.form = { kind: 'card', id: c.id || null };
  openSheet(`<div class="row sheet-top"><h3>${c.id ? 'Карточка' : 'Новая карточка'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <label class="f">Название<input id="c-title" value="${esc(c.title || '')}" autocomplete="off"></label>
  <div class="two"><label class="f">Статус<select id="c-col">${COLS.map(([v, t]) => `<option value="${v}" ${v === (c.col || 'backlog') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  <label class="f">Раздел${catSelect('c-cat', c.cat || (ui.noteCat !== 'all' ? ui.noteCat : 'work'))}</label></div>
  <label class="f">Срок<input type="date" id="c-due" value="${c.due || ''}"></label>
  <label class="f">Описание<textarea id="c-text" style="min-height:120px">${esc(c.text || '')}</textarea></label>
  <button class="btn block" data-act="saveCard">Сохранить</button>
  ${c.id ? '<div class="actions"><button class="btn ghost" data-act="cardPlan">Поставить в календарь</button><button class="btn danger" data-act="delCard">Удалить</button></div>' : ''}`);
  if (!c.id) setTimeout(() => $('#c-title') && $('#c-title').focus(), 50);
}
function saveCardForm() {
  const title = $('#c-title').value.trim();
  if (!title) { toast('Введите название'); return null; }
  const c = { id: ui.form.id || uid(), title, text: $('#c-text').value.trim(), col: $('#c-col').value, cat: $('#c-cat').value, due: $('#c-due').value, updated: new Date().toISOString() };
  const i = state.cards.findIndex(x => x.id === c.id);
  if (i >= 0) state.cards[i] = c; else state.cards.push(c);
  save(); return c;
}

/* ---------- Продукты и сканер штрихкода ---------- */
const FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'QRCode', 'DataMatrix', 'Code128'];
const ZX_OPTS = { formats: FORMATS, tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 };
const NO_PROD = { name: '', kcal: '', p: '', f: '', c: '', g: 100 };
let scan = null, zxReady = null;
function eanOk(c) {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(c)) return false;
  const d = c.split('').map(Number), chk = d.pop(); let sum = 0;
  d.reverse().forEach((x, i) => { sum += x * (i % 2 ? 1 : 3); });
  return (10 - sum % 10) % 10 === chk;
}
function loadZX() {
  if (zxReady) return zxReady;
  zxReady = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'vendor/zxing-reader.js'; s.onload = ok; s.onerror = () => no(new Error('load')); document.head.appendChild(s);
  }).then(() => window.ZXingWASM.prepareZXingModule({ overrides: { locateFile: (p, pre) => p.endsWith('.wasm') ? 'vendor/zxing_reader.wasm' : pre + p }, fireImmediately: true }));
  zxReady.catch(() => { zxReady = null; });
  return zxReady;
}
function stopScan() {
  if (!scan) return; const s = scan; scan = null;
  clearTimeout(s.timer); clearTimeout(s.hint);
  if (s.stream) s.stream.getTracks().forEach(t => t.stop());
}
function prodSheet(mi) {
  stopScan();
  const meal = dayMeals(ui.date)[mi]; ui.form = { kind: 'prod', mi };
  const recent = Object.entries(state.products).sort((a, b) => (b[1].used || 0) - (a[1].used || 0)).slice(0, 12);
  openSheet(`<div class="row sheet-top"><h3>Добавить продукт</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <p class="muted small" style="margin:-6px 0 12px">Приём пищи: ${esc(meal ? meal.name : '')}</p>
  <button class="btn block" data-act="scanStart">Сканировать код камерой</button>
  <div class="quick" style="margin:10px 0"><input id="bc" class="inp" style="background:var(--field);box-shadow:none" inputmode="numeric" placeholder="или цифры под штрихкодом" autocomplete="off"><button class="btn plain" style="width:auto;padding:0 16px;font-size:15px;font-weight:650" data-act="bcFind">Найти</button></div>
  <button class="btn ghost block" data-act="prodManual">Ввести продукт вручную</button>
  ${recent.length ? `<div class="lbl">Недавние продукты</div>${recent.map(([code, p]) => `<button class="list-btn" data-act="prodPick" data-code="${esc(code)}"><span>${esc(p.name)}<small class="muted" style="display:block">${Math.round(p.kcal)} ккал · Б ${ru(p.p)} · Ж ${ru(p.f)} · У ${ru(p.c)} на 100 г</small></span><span class="muted">›</span></button>`).join('')}` : ''}
  <p class="muted small" style="margin:14px 0 0">Лучше всего читается полосатый штрихкод с цифрами. Данные берутся из открытой базы Open Food Facts. Если продукта там нет, введите КБЖУ с упаковки один раз, планер его запомнит.</p>`);
}
function scanStatus(id, text, cls) { const el = $('#' + id); if (el) { el.className = 'scanst ' + (cls || ''); el.querySelector('span').textContent = text; } }
const scanSteps = (a, b, c) => `<div class="scansts">${[['st-cam', 'Камера', a], ['st-code', 'Код', b], ['st-db', 'База продуктов', c]].map(([id, t, v], i) =>
  `<div id="${id}" class="scanst ${v ? v[1] : ''}"><b>${i + 1}. ${t}</b><span>${v ? esc(v[0]) : 'ждёт'}</span></div>`).join('')}</div>`;
function camError(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Нет разрешения на камеру. Откройте Настройки айфона, найдите Safari (или «Планер»), пункт «Камера» и выберите «Разрешить», затем откройте сканер снова.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Камера не найдена на этом устройстве.';
  if (n === 'NotReadableError' || n === 'AbortError') return 'Камера занята другим приложением. Закройте его и откройте сканер снова.';
  if (n === 'nosupport') return 'Этот браузер не даёт сайту камеру. Откройте планер в Safari или с иконки на экране «Домой».';
  return 'Камера не включилась' + (n ? ' (' + n + ')' : '') + '. Сфотографируйте код кнопкой ниже.';
}
async function scanSheet() {
  stopScan();
  const mi = ui.form.mi; ui.form = { kind: 'scan', mi };
  openSheet(`<div class="row sheet-top"><h3>Наведите на код</h3><button class="btn sm plain" data-act="prodAdd" data-m="${mi}">Назад</button></div>
  <div id="cam" class="cam"><video id="camv" playsinline muted autoplay></video><div class="cam-msg">Включаю камеру…</div></div>
  ${scanSteps(['включаю…', 'run'])}
  <p class="muted small" id="scan-hint" style="margin:10px 0">Держите телефон в 15–25 см от упаковки, чтобы картинка была резкой. Подходит полосатый штрихкод, QR и Data Matrix.</p>
  <label class="btn plain block">Сфотографировать код<input type="file" id="bcPhoto" accept="image/*" capture="environment" hidden></label>
  <button class="btn ghost block" style="margin-top:8px" data-act="prodManual">Ввести КБЖУ вручную</button>`);
  const me = scan = { stream: null, timer: 0, hint: 0 }, alive = () => scan === me && ui.form && ui.form.kind === 'scan';
  const fail = (id, text) => { scanStatus(id, 'ошибка', 'bad'); const m = $('.cam-msg'); if (m) m.textContent = text; else { const c = $('#cam'); if (c) c.insertAdjacentHTML('beforeend', `<div class="cam-msg">${esc(text)}</div>`); } };
  const zx = loadZX(); zx.catch(() => {});
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: 'nosupport' };
    me.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
  } catch (e) { if (alive()) fail('st-cam', camError(e)); return; }
  if (!alive()) { me.stream.getTracks().forEach(t => t.stop()); return; }
  const v = $('#camv'); v.srcObject = me.stream;
  try { await v.play(); } catch (_) { /* Safari запустит видео сам благодаря autoplay */ }
  try {                                                       // небольшое приближение: мелкий код читается с расстояния, где камера держит резкость
    const tr = me.stream.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
    if (cap.zoom && cap.zoom.max >= 2) await tr.applyConstraints({ advanced: [{ zoom: Math.max(cap.zoom.min || 1, 2) }] });
  } catch (_) { /* приближение не поддерживается */ }
  if (!alive()) return;
  const m = $('.cam-msg'); if (m) m.remove();
  scanStatus('st-cam', 'работает', 'ok'); scanStatus('st-code', 'загружаю распознавание…', 'run');
  try { await zx; } catch (_) { if (alive()) { scanStatus('st-code', 'ошибка', 'bad'); const h = $('#scan-hint'); if (h) h.textContent = 'Распознавание не загрузилось. Проверьте интернет и откройте сканер снова или введите цифры под штрихкодом.'; } return; }
  if (!alive()) return;
  scanStatus('st-code', 'ищу код в кадре…', 'run');
  me.hint = setTimeout(() => { if (!alive()) return; scanStatus('st-code', 'пока не вижу код', 'run'); const h = $('#scan-hint'); if (h) h.innerHTML = '<b>Код пока не читается.</b> Отодвиньте телефон на 20–30 см, разгладьте упаковку и уберите блики. Если не выходит, нажмите «Сфотографировать код» или введите КБЖУ вручную.'; }, 9000);
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
  let n = 0;
  const loop = async () => {
    if (!alive()) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (w && h) {
      const full = n++ % 3 === 2, k = full ? 1 : 0.6, sw = Math.round(w * k), sh = Math.round(h * k);   // чаще смотрим центр кадра, раз в три кадра весь кадр
      const sc = Math.min(1, 1280 / Math.max(sw, sh)); cv.width = Math.round(sw * sc); cv.height = Math.round(sh * sc);
      ctx.drawImage(v, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
      try {
        const res = await window.ZXingWASM.readBarcodes(ctx.getImageData(0, 0, cv.width, cv.height), ZX_OPTS);
        const r = res.find(x => x.isValid !== false && x.text);
        if (r && alive()) { stopScan(); if (navigator.vibrate) navigator.vibrate(60); handleCode(r, mi); return; }
      } catch (_) { /* кадр не разобрался, берём следующий */ }
    }
    if (alive()) me.timer = setTimeout(loop, 120);
  };
  loop();
}
async function decodePhoto(file, mi) {
  toast('Ищу код на фото…');
  try {
    await loadZX();
    const bmp = await createImageBitmap(file), sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    const ctx = cv.getContext('2d'); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const res = await window.ZXingWASM.readBarcodes(ctx.getImageData(0, 0, cv.width, cv.height), ZX_OPTS);
    const r = res.find(x => x.isValid !== false && x.text);
    if (r) { stopScan(); handleCode(r, mi); } else { scanStatus('st-code', 'на фото кода нет', 'bad'); toast('На фото код не найден. Снимите его крупнее, резко и без бликов.'); }
  } catch (_) { toast('Не получилось прочитать фото. Введите цифры под штрихкодом.'); }
}
// Разбор прочитанного: обычный штрихкод ищем сразу, из Data Matrix, QR и Code 128 достаём номер товара (GTIN), если он там есть.
function handleCode(r, mi) {
  const f = String(r.format || '').replace(/[^a-z0-9]/gi, '').toUpperCase(), t = String(r.text || '').trim();
  const kind = f.startsWith('QR') ? 'QR-код' : f === 'DATAMATRIX' ? 'Data Matrix' : f === 'CODE128' ? 'код Code 128' : 'штрихкод';
  let code = '';
  if (/^(EAN|UPC)/.test(f)) { const d = t.replace(/\D/g, ''); code = f === 'UPCE' ? '' : d; if (!eanOk(code)) code = ''; }
  if (!code) {
    const g = t.match(/^(?:\]\w\d)?[\x1d\s]*\(?01\)?(\d{14})/) || t.match(/\/01\/(\d{14})(?:\D|$)/) || t.match(/^(\d{14})$/);
    if (g) { const c13 = g[1].replace(/^0/, ''); if (c13.length === 13 && eanOk(c13)) code = /^00000/.test(c13) ? c13.slice(5) : c13; }
    else if (/^\d{8}$|^\d{12,13}$/.test(t) && eanOk(t)) code = t;
  }
  if (code) { lookup(code, mi, kind); return; }
  ui.form = { kind: 'nocode', mi };
  const link = /^https?:\/\//i.test(t);
  openSheet(`<div class="row sheet-top"><h3>Это не код товара</h3><button class="btn sm plain" data-act="prodAdd" data-m="${mi}">Назад</button></div>
  ${scanSteps(['работает', 'ok'], ['прочитан, но без номера товара', 'bad'])}
  <div class="hint">Камера прочитала ${kind}, но в нём ${link ? 'ссылка' : 'служебная запись'}, а не номер товара, поэтому найти КБЖУ по нему нельзя. Так бывает у готовой еды и собственных марок магазинов.</div>
  <div class="card" style="background:var(--field);box-shadow:none;word-break:break-all"><div class="muted small">Что в коде</div>${esc(t.slice(0, 160))}</div>
  <p class="muted small" style="margin:0 0 12px">Если на упаковке есть полосатый штрихкод с цифрами, отсканируйте его. Если нет, введите КБЖУ с этикетки, это занимает полминуты.</p>
  <button class="btn block" data-act="prodManual">Ввести КБЖУ вручную</button>
  <button class="btn ghost block" style="margin-top:8px" data-act="scanStart">Сканировать другой код</button>`);
}
async function lookup(code, mi, kind) {
  const pre = kind ? `Код прочитан: ${kind} ${code}. ` : '';
  if (state.products[code]) { productSheet(mi, code, state.products[code], kind ? pre + 'Этот продукт вы уже сохраняли.' : ''); return; }
  ui.form = { kind: 'wait', mi };
  openSheet(`<div class="row sheet-top"><h3>Ищу продукт…</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  ${scanSteps(kind ? ['работает', 'ok'] : ['не нужна', 'ok'], [code, 'ok'], ['ищу…', 'run'])}`);
  let p = null, note = '';
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_ru,brands,serving_quantity,nutriments`, { signal: ctl.signal });
    clearTimeout(tm);
    const j = await res.json().catch(() => null), pr = j && j.product, n = pr && pr.nutriments;
    if (pr) {
      const kcal = n ? (n['energy-kcal_100g'] != null ? Number(n['energy-kcal_100g']) : n.energy_100g != null ? Number(n.energy_100g) / 4.184 : null) : null;
      const name = [pr.product_name_ru || pr.product_name, pr.brands ? String(pr.brands).split(',')[0].trim() : ''].filter(Boolean).join(', ');
      p = { name, kcal, p: n ? Number(n.proteins_100g) || 0 : 0, f: n ? Number(n.fat_100g) || 0 : 0, c: n ? Number(n.carbohydrates_100g) || 0 : 0, g: Number(pr.serving_quantity) || 100 };
      if (kcal == null || !isFinite(kcal)) { p.kcal = ''; note = pre + 'Продукт в базе есть, но без КБЖУ. Введите цифры с упаковки, планер их запомнит.'; }
      else note = pre + 'Найдено в Open Food Facts. Сверьте цифры с упаковкой: базу заполняют пользователи.';
    } else note = pre + 'В открытой базе этого продукта нет: так часто бывает с готовой едой и собственными марками магазинов. Введите название и КБЖУ с этикетки, планер запомнит этот код, и в следующий раз всё подставится само.';
  } catch (_) { note = pre + 'База продуктов не ответила (нет связи или она недоступна). Введите КБЖУ с этикетки, планер запомнит этот код.'; }
  if (!ui.form || ui.form.kind !== 'wait') return;           // шторку уже закрыли
  productSheet(mi, code, p || NO_PROD, note);
}
function productSheet(mi, code, p, note, editIdx) {
  stopScan();
  const meal = dayMeals(ui.date)[mi], ed = editIdx != null; ui.form = { kind: 'prodEdit', mi, code: code || '', ii: ed ? editIdx : null };
  const v = x => x === '' || x == null ? '' : ru(x);
  openSheet(`<div class="row sheet-top"><h3>Продукт</h3>${ed ? '<button class="btn sm plain" data-act="close">Закрыть</button>' : `<button class="btn sm plain" data-act="prodAdd" data-m="${mi}">Назад</button>`}</div>
  ${note ? `<div class="hint">${note}</div>` : ''}
  <label class="f">Название<input id="p-name" value="${esc(p.name || '')}" placeholder="Например: йогурт греческий" autocomplete="off"></label>
  <div class="lbl" style="margin-top:0">На 100 г продукта${code ? ` · штрихкод ${esc(code)}` : ''}</div>
  <div class="four"><label class="f">Ккал<input id="p-kcal" inputmode="decimal" value="${v(p.kcal === '' ? '' : Math.round(p.kcal))}"></label><label class="f">Белки<input id="p-p" inputmode="decimal" value="${v(p.p)}"></label>
  <label class="f">Жиры<input id="p-f" inputmode="decimal" value="${v(p.f)}"></label><label class="f">Углев.<input id="p-c" inputmode="decimal" value="${v(p.c)}"></label></div>
  <label class="f">Сколько съел, граммов<input id="p-g" inputmode="decimal" value="${v(p.g || 100)}"></label>
  <div class="card" style="background:var(--field);box-shadow:none"><div class="muted small">В этой порции</div><div class="macro" id="p-out" style="font-size:15px;margin-bottom:0"></div></div>
  <button class="btn block" data-act="prodSave">${ed ? 'Сохранить' : `Добавить в «${esc(meal ? meal.name : 'приём пищи')}»`}</button>
  ${ed ? '<button class="btn danger block" data-act="itemDel">Удалить из этого дня</button>' : ''}`);
  prodCalc();
}
function prodRead() {
  const g = num($('#p-g').value) || 0, k = ['kcal', 'p', 'f', 'c'].map(x => num($('#p-' + x).value) || 0);
  return { name: $('#p-name').value.trim(), g, per: k, tot: k.map(x => x * g / 100) };
}
function prodCalc() {
  const o = $('#p-out'); if (!o) return; const r = prodRead();
  o.innerHTML = `<span><b>${Math.round(r.tot[0])}</b> ккал</span><span>Б <b>${ru(r.tot[1])}</b></span><span>Ж <b>${ru(r.tot[2])}</b></span><span>У <b>${ru(r.tot[3])}</b></span>`;
}

function qtyCalc() {
  if (!ui.form || !ui.form.base) return; const q = num($('#i-qty').value) || 0;
  ui.form.base.forEach((x, j) => { $('#i-' + j).value = ru(j ? x * q : Math.round(x * q)); });
}
function itemSheet(mi, ii) {
  const it = dayMeals(ui.date)[mi].items[ii]; if (!it) return;
  if (it.per) { productSheet(mi, it.code || '', { name: it.name, kcal: it.per[0], p: it.per[1], f: it.per[2], c: it.per[3], g: it.g }, '', ii); return; }
  const q = String(it.text).match(/^(.*),\s*(\d+(?:[.,]\d+)?)\s*(г|мл|шт\.)$/), qty = q ? num(q[2]) : null;
  ui.form = { kind: 'fitem', mi, ii, unit: q ? q[3] : '', base: q && it.k && qty > 0 ? it.k.map(x => x / qty) : null };
  const v = j => it.k ? ru(it.k[j]) : '';
  openSheet(`<div class="row sheet-top"><h3>${it.extra ? 'Добавленное блюдо' : 'Блюдо из меню'}</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  <label class="f">Название<input id="i-text" value="${esc(q ? q[1] : it.text)}" autocomplete="off"></label>
  ${q ? `<div class="f">Количество, ${q[3] === 'шт.' ? 'штук' : q[3] === 'мл' ? 'мл' : 'граммов'}
    <div class="step"><button data-act="qtyStep" data-d="${q[3] === 'шт.' ? -1 : -10}" aria-label="Меньше">−</button><input id="i-qty" class="inp" inputmode="decimal" value="${ru(qty)}"><button data-act="qtyStep" data-d="${q[3] === 'шт.' ? 1 : 10}" aria-label="Больше">+</button></div></div>` : ''}
  <div class="lbl" style="margin-top:0">КБЖУ этой порции${q && it.k ? ' · пересчитывается при смене количества' : ''}</div>
  <div class="four"><label class="f">Ккал<input id="i-0" inputmode="decimal" value="${v(0)}"></label><label class="f">Белки<input id="i-1" inputmode="decimal" value="${v(1)}"></label>
  <label class="f">Жиры<input id="i-2" inputmode="decimal" value="${v(2)}"></label><label class="f">Углев.<input id="i-3" inputmode="decimal" value="${v(3)}"></label></div>
  <p class="muted small" style="margin:0 0 12px">Изменится только ${ui.date === today() ? 'сегодняшний день' : short(ui.date)}. Чтобы поменять блюдо на все недели, откройте «Изменить меню».</p>
  <button class="btn block" data-act="itemSave">Сохранить</button>
  <button class="btn danger block" data-act="itemDel">Удалить из этого дня</button>`);
}

/* ---------- Поделиться, экспорт ---------- */
const toastEl = $('#toast');
function toast(t) {
  const el = toastEl, host = sheet.open ? sheet : document.body;   // открытая шторка лежит поверх страницы, поэтому подсказку показываем внутри неё
  if (el.parentNode !== host) host.appendChild(el);
  el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}
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
  const tt = timeText(it);
  let t = `${it.done ? '☑' : '☐'} ${tt ? tt + ' ' : ''}${it.title}${it.type === 'meeting' ? ' (встреча)' : ''}${it.who ? ', участники: ' + it.who : ''}${it.place ? ', ' + it.place : ''}`;
  for (const s of it.subs || []) t += `\n    ${s.done ? '☑' : '☐'} ${s.text}`;
  return t;
}
function dayText(date) {
  const items = state.items.filter(i => onDay(i, date)).sort(byTime);
  return `План на ${human(date).toLowerCase()}\n\n` + (items.length ? items.map(itemText).join('\n') : 'Планов нет');
}
function foodText(date) {
  const rec = state.food[date] || {}, s = foodStat([date]), b = state.body[date] || {};
  let t = `Питание, ${human(date).toLowerCase()}: ${s.pct}% по плану\n`;
  for (const m of dayMeals(date)) {
    t += `\n${m.name}${m.time ? ' ' + m.time : ''}\n` + m.items.map(i => i.repl ? `  ⇄ ${i.text} → ${i.repl}` : `  ${i.eaten ? '☑' : '☐'} ${i.text}`).join('\n');
    if (m.note) t += `\n  Комментарий: ${m.note}`;
  }
  if (b.w != null) t += `\n\nВес: ${ru(b.w)} кг${b.fat != null ? `, жир: ${ru(b.fat)} кг` : ''}`;
  if (rec.train) t += `\nТренировка: ${rec.train}`;
  if (rec.comment) t += `\nИтог дня: ${rec.comment}`;
  return t;
}
function icsFile(it) {
  const e = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const d = it.date.replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  let when;
  if (it.time) {
    const st = new Date(`${it.date}T${it.time}`), en = endOf(it) ? new Date(st.getTime() + ((mins(endOf(it)) - mins(it.time) + 1440) % 1440 || 60) * 60000) : new Date(st.getTime() + 3600000);
    const f = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    when = `DTSTART:${f(st)}\r\nDTEND:${f(en)}`;
  } else when = `DTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${addDays(lastDay(it), 1).replace(/-/g, '')}`;
  const al = (rems(it).length ? rems(it) : [15]).map(m => { const x = it.time ? m : m - 540; return ['BEGIN:VALARM', `TRIGGER:${x >= 0 ? '-' : ''}PT${Math.abs(x)}M`, 'ACTION:DISPLAY', `DESCRIPTION:${e(it.title)}`, 'END:VALARM']; }).flat();
  const desc = [it.who ? 'С кем: ' + it.who : '', it.note, ...(it.subs || []).map(s => '- ' + s.text)].filter(Boolean).join('\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Planer//RU', 'BEGIN:VEVENT', `UID:${it.id}@planer`, `DTSTAMP:${stamp}`, when,
    `SUMMARY:${e(it.title)}`, desc ? `DESCRIPTION:${e(desc)}` : '', it.place ? `LOCATION:${e(it.place)}` : '',
    ...al, 'END:VEVENT', 'END:VCALENDAR']
    .filter(Boolean).join('\r\n');
  return new File([ics], 'plan.ics', { type: 'text/calendar' });
}

/* ---------- Уведомления и таймер ---------- */
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
    const r = rems(it); if (it.done || !r.length) continue;
    const sent = it.sent || [], todo = r.filter(m => !sent.includes(m)); if (!todo.length) continue;
    const base = remBase(it), due = todo.filter(m => now >= base - m * 60000); if (!due.length) continue;
    it.sent = sent.concat(due); changed = true;             // если планер долго был закрыт, показываем одно, самое близкое к началу
    if (now - base < 3600000) {
      const kind = it.type === 'meeting' ? 'Встреча' : 'Задача', dayTxt = it.date === today() ? '' : ` ${short(it.date)}`;
      notify(it.title, `${kind}${dayTxt}${it.time ? ' в ' + it.time : ''}, ${leftText(base - now)}${it.who ? ', участники: ' + it.who : ''}${it.place ? ', ' + it.place : ''}`, it.id + ':' + Math.min(...due));
    }
  }
  if (changed) save();
}
function tick() {
  const t = state.learn.timer; if (!t) return;
  if (t.date !== today()) { stopTimer(); render(); return; }
  const secs = learnSecs(t.date);
  if (secs >= LEARN_GOAL && !t.rang) { t.rang = true; save(); notify('Час развития выполнен', 'Отметьте материалы и практику', 'learn'); if (ui.tab === 'learn' && !sheet.open) render(); }
  const el = $('#tm'); if (!el) return;
  el.textContent = clock(Math.max(0, LEARN_GOAL - secs));
  const rv = document.querySelector('.timer .ring-v');
  if (rv) { const c = parseFloat(rv.getAttribute('stroke-dasharray')); rv.setAttribute('stroke-dashoffset', c * (1 - Math.min(1, secs / LEARN_GOAL))); }
}

/* ---------- События ---------- */
const goDate = d => { ui.date = d; ui.month = d.slice(0, 7) + '-01'; };
const actions = {
  tab: el => { ui.tab = el.dataset.tab; ui.sub = null; ui.foodEdit = false; if (ui.tab === 'today') goDate(today()); window.scrollTo(0, 0); },
  sub: el => { ui.sub = el.dataset.v; window.scrollTo(0, 0); },
  back: () => { ui.sub = null; window.scrollTo(0, 0); },
  day: el => { goDate(el.dataset.date); },
  shift: el => { goDate(addDays(ui.date, Number(el.dataset.d))); },
  month: el => { const d = parse(ui.month); d.setMonth(d.getMonth() + Number(el.dataset.d)); ui.month = fmt(d); },
  week: el => { goDate(addDays(ui.date, Number(el.dataset.d))); },
  today: () => { goDate(today()); },
  cat: el => { ui.cat = el.dataset.cat; },
  noteCat: el => { ui.noteCat = el.dataset.cat; },
  notesView: el => { ui.notesView = el.dataset.v; },
  remDel: el => { ui.form.rems = ui.form.rems.filter(m => m !== Number(el.dataset.m)); $('#remBox').innerHTML = remBox(); return false; },
  remCustom: () => { const n = num($('#f-remn').value); if (!(n > 0)) { toast('Введите число'); return false; } remAdd(n * Number($('#f-remu').value)); return false; },
  tdToggle: el => { ui.td[el.dataset.k] = !ui.td[el.dataset.k]; },
  learnGo: () => { const s = learnState(); ui.tab = 'learn'; ui.learnDay = s.missed.length ? s.missed[0] : s.ti; window.scrollTo(0, 0); },
  theme: el => { state.settings.theme = el.dataset.v; save(); applyTheme(); },
  foodView: el => { ui.foodView = el.dataset.v; ui.foodEdit = false; },
  foodDay: () => { ui.tab = 'food'; ui.foodView = 'menu'; window.scrollTo(0, 0); },
  goBody: () => { ui.tab = 'food'; ui.foodView = 'body'; goDate(today()); window.scrollTo(0, 0); },
  add: el => { const c = el.dataset.cat; itemForm({ cat: c || 'work', type: c === 'meet' ? 'meeting' : 'task', date: ui.tab === 'cal' ? ui.date : today() }); return false; },
  edit: el => { const it = state.items.find(i => i.id === el.dataset.id); if (it) itemForm(it); return false; },
  type: el => {
    ui.form.type = el.dataset.type;
    el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    if (el.dataset.type === 'meeting' && !ui.form.id) $('#f-cat').value = 'meet';
    return false;
  },
  rep: el => { ui.form.rep = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); $('#repMore').hidden = el.dataset.v === 'none'; $('.wdpick').hidden = el.dataset.v !== 'days'; return false; },
  repDay: el => { const i = Number(el.dataset.i); if (ui.form.days.has(i)) ui.form.days.delete(i); else ui.form.days.add(i); el.classList.toggle('on'); return false; },
  close: () => { closeSheet(); return false; },
  quick: () => {
    const el = $('#quick'), v = el ? el.value.trim() : ''; if (!v) { if (el) el.focus(); return false; }
    const m = v.match(/^(\d{1,2})[:.](\d{2})(?:\s*[-–]\s*(\d{1,2})[:.](\d{2}))?\s+(.+)$/);
    const ok = m && +m[1] < 24 && +m[2] < 60 && (!m[3] || (+m[3] < 24 && +m[4] < 60));
    state.items.push({ id: uid(), title: ok ? m[5] : v, type: 'task', date: today(), time: ok ? `${pad(+m[1])}:${m[2]}` : '', end: ok && m[3] ? `${pad(+m[3])}:${m[4]}` : '',
      dur: null, who: '', cat: 'work', remind: '', reminds: [], place: '', note: '', subs: [], done: false });
    save();
    const bz = state.items.find(x => x.busy && !x.done && onDay(x, today())); if (bz) toast(`Сегодня день занят целиком: «${bz.title}»`);
  },
  toToday: el => { const it = state.items.find(i => i.id === el.dataset.id); if (it) { if (it.dateTo) it.dateTo = addDays(it.dateTo, diffDays(it.date, today())); it.date = today(); it.sent = []; save(); } },
  lateAll: () => { const t = today(); lateItems().forEach(i => { if (i.dateTo) i.dateTo = addDays(i.dateTo, diffDays(i.date, t)); i.date = t; i.sent = []; }); save(); },
  toTomorrow: () => { const it = saveItemForm(); if (!it) return false; { const nd = addDays(it.date < today() ? today() : it.date, 1); if (it.dateTo) it.dateTo = addDays(it.dateTo, diffDays(it.date, nd)); it.date = nd; } it.sent = []; save(); closeSheet(); toast(`Перенесено на ${short(it.date)}`); },
  water: el => { const d = state.day[today()] || (state.day[today()] = {}); d.water = Math.max(0, Math.min(20, (d.water || 0) + Number(el.dataset.d))); save(); },
  weekSum: el => { weekSheet(Number(el.dataset.o)); return false; },
  weekShare: () => { share('Итоги недели', weekText(weekStats(addDays(monday(today()), ui.form.off * 7)))); return false; },
  shopAdd: () => { const el = $('#shopNew'), v = el.value.trim(); if (!v) return false; state.shopOwn.push({ id: uid(), name: v, done: false }); save(); },
  shopDel: el => { state.shopOwn = state.shopOwn.filter(i => i.id !== el.dataset.id); save(); },
  shopClear: () => { state.shopOwn = state.shopOwn.filter(i => !i.done); save(); },
  shopShare: () => { share('Покупки', shopText()); return false; },
  shopReset: () => { delete state.shop[monday(today())]; save(); },
  saveItem: () => { if (!saveItemForm()) return false; closeSheet(); },
  delItem: () => { if (!confirm('Удалить эту запись?')) return false; state.items = state.items.filter(i => i.id !== ui.form.id); save(); closeSheet(); },
  delSeries: () => {
    const it = state.items.find(i => i.id === ui.form.id); if (!it || !confirm('Удалить эту запись и все её будущие повторы?')) return false;
    state.items = state.items.filter(i => !(i.series === it.series && i.date >= it.date)); save(); closeSheet();
  },
  ics: () => { const it = saveItemForm(); if (it) share(it.title, '', icsFile(it)); return false; },
  shareItem: () => { const it = saveItemForm(); if (it) share(it.title, `${human(it.date)}\n${itemText(it)}${it.note ? '\n\n' + it.note : ''}`); return false; },
  shareDay: () => { share('План на день', dayText(ui.date)); return false; },
  shareFood: () => { share('Питание', foodText(ui.date)); return false; },
  shareApp: () => { share('Мой планер', location.href.split('#')[0]); return false; },
  noteAdd: el => { noteForm({ cat: el.dataset.cat }); return false; },
  noteEdit: el => { const n = state.notes.find(x => x.id === el.dataset.id); if (n) noteForm(n); return false; },
  saveNote: () => { if (!saveNoteForm()) return false; closeSheet(); },
  delNote: () => { if (!confirm('Удалить заметку?')) return false; state.notes = state.notes.filter(n => n.id !== ui.form.id); save(); closeSheet(); },
  shareNote: () => { const n = saveNoteForm(); if (n) share(n.title || 'Заметка', `${n.title ? n.title + '\n\n' : ''}${n.text}`); return false; },
  cardAdd: el => { cardForm({ col: el.dataset.col }); return false; },
  cardEdit: el => { const c = state.cards.find(x => x.id === el.dataset.id); if (c) cardForm(c); return false; },
  saveCard: () => { if (!saveCardForm()) return false; closeSheet(); },
  delCard: () => { if (!confirm('Удалить карточку?')) return false; state.cards = state.cards.filter(c => c.id !== ui.form.id); save(); closeSheet(); },
  cardMove: el => { const c = state.cards.find(x => x.id === el.dataset.id); if (!c) return false; const i = COLS.findIndex(x => x[0] === c.col) + Number(el.dataset.d); if (COLS[i]) { c.col = COLS[i][0]; save(); } },
  cardPlan: () => { const c = saveCardForm(); if (!c) return false; closeSheet(); itemForm({ title: c.title, note: c.text, cat: c.cat, date: c.due || today() }); return false; },
  foodEdit: () => { ui.foodEdit = !ui.foodEdit; },
  prodAdd: el => { prodSheet(Number(el.dataset.m)); return false; },
  scanStart: () => { scanSheet(); return false; },
  bcFind: () => { const c = $('#bc').value.replace(/\D/g, ''); if (!eanOk(c)) { toast('Проверьте цифры: в штрихкоде их 8, 12 или 13'); return false; } lookup(c, ui.form.mi); return false; },
  prodManual: () => { productSheet(ui.form.mi, '', NO_PROD); return false; },
  prodPick: el => { const p = state.products[el.dataset.code]; if (p) productSheet(ui.form.mi, /^\d+$/.test(el.dataset.code) ? el.dataset.code : '', p); ui.form.code = el.dataset.code; return false; },
  prodSave: () => {
    const r = prodRead(), f = ui.form;
    if (!r.name) { toast('Введите название'); $('#p-name').focus(); return false; }
    if (!r.per[0] && !r.per[1] && !r.per[2] && !r.per[3]) { toast('Введите КБЖУ на 100 г'); $('#p-kcal').focus(); return false; }
    if (r.g <= 0) { toast('Введите граммы'); $('#p-g').focus(); return false; }
    state.products[f.code || 'm' + uid()] = { name: r.name, kcal: r.per[0], p: r.per[1], f: r.per[2], c: r.per[3], g: r.g, used: Date.now() };
    const items = ensureDay(ui.date).meals[f.mi].items, old = f.ii != null ? items[f.ii] : null;
    const it = { text: `${r.name}, ${ru(r.g)} г`, eaten: old ? old.eaten : true, repl: '', extra: true, k: [Math.round(r.tot[0]), ...r.tot.slice(1).map(x => Math.round(x * 10) / 10)], name: r.name, per: r.per, g: r.g, code: f.code || '' };
    if (old) items[f.ii] = it; else items.push(it);
    save(); closeSheet(); toast(old ? 'Сохранено' : 'Продукт добавлен');
  },
  qtyStep: el => { const i = $('#i-qty'), v = Math.max(0, (num(i.value) || 0) + Number(el.dataset.d)); i.value = ru(v); qtyCalc(); return false; },
  itemEdit: el => { ensureDay(ui.date); itemSheet(Number(el.dataset.m), Number(el.dataset.i)); return false; },
  itemSave: () => {
    const f = ui.form, m = ensureDay(ui.date).meals[f.mi], it = m.items[f.ii], qEl = $('#i-qty'), qty = qEl ? num(qEl.value) : null;
    let text = $('#i-text').value.trim();
    if (!text) { toast('Введите название'); return false; }
    if (qEl) { if (!(qty > 0)) { toast('Введите количество'); qEl.focus(); return false; } text = `${text}, ${ru(qty)} ${f.unit}`; }
    const raw = [0, 1, 2, 3].map(j => $('#i-' + j).value.trim()), k = raw.map(x => num(x) || 0);
    it.text = text; it.k = raw.some(x => x !== '') ? [Math.round(k[0]), ...k.slice(1).map(x => Math.round(x * 10) / 10)] : it.k;
    if (!it.extra) m.edited = true;
    save(); closeSheet(); toast('Сохранено');
  },
  itemDel: () => {
    const f = ui.form, m = ensureDay(ui.date).meals[f.mi], it = m.items[f.ii];
    if (!confirm(`Удалить «${it.text}» из этого дня?`)) return false;
    if (!it.extra) m.edited = true;
    m.items.splice(f.ii, 1); ui.swap.clear(); save(); closeSheet();
  },
  swap: el => { ui.swap.add(el.dataset.k); render(); const [, m, i] = el.dataset.k.split('|'); const inp = document.querySelector(`[data-ch="fRepl"][data-m="${m}"][data-i="${i}"]`); if (inp) inp.focus(); return false; },
  mealAdd: () => { (state.menu.days[wdi(ui.date)] ||= []).push({ name: 'Приём пищи', time: '', items: [] }); save(); },
  mealDel: el => { if (!confirm('Удалить приём пищи из меню?')) return false; state.menu.days[wdi(ui.date)].splice(Number(el.dataset.i), 1); save(); },
  menuReset: () => { if (!confirm('Вернуть рассчитанное меню на всю неделю? Ваши правки меню пропадут.')) return false; const g = state.menu.goal; state.menu = buildMenu(); state.menu.goal = g; save(); ui.foodEdit = false; },
  foodReset: () => { if (!confirm('Сбросить отметки питания за этот день?')) return false; if (state.food[ui.date]) delete state.food[ui.date].meals; save(); },
  learnDay: el => { ui.learnDay = Number(el.dataset.i); window.scrollTo(0, 0); },
  learnOpen: el => { ui.tab = 'learn'; ui.learnDay = Number(el.dataset.i); window.scrollTo(0, 0); },
  learnTrack: el => { ui.learnTrack = el.dataset.v; },
  timer: () => { if (state.learn.timer) stopTimer(); else { state.learn.timer = { date: today(), t0: Date.now(), rang: learnSecs(today()) >= LEARN_GOAL }; save(); } },
  timerReset: () => { if (!confirm('Сбросить время за сегодня?')) return false; state.learn.timer = null; delete state.learn.secs[today()]; save(); },
  learnStart: () => {
    ui.form = { kind: 'learn' };
    openSheet(`<div class="row sheet-top"><h3>Даты плана</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
      <label class="f">Первый день плана<input type="date" id="l-start" value="${state.learn.start}"></label>
      <p class="muted small">Отметки привязаны к номеру дня, поэтому при сдвиге даты они сохранятся.</p>
      <button class="btn block" data-act="learnStartSave">Сохранить</button>`); return false;
  },
  learnStartSave: () => { const v = $('#l-start').value; if (v) { state.learn.start = v; ui.learnDay = null; save(); } closeSheet(); },
  lcAdd: () => {
    ui.form = { kind: 'lc' };
    openSheet(`<div class="row sheet-top"><h3>Своя ссылка</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
      <label class="f">Название<input id="lc-title" placeholder="Например: курс по бэклогу" autocomplete="off"></label>
      <label class="f">Ссылка<input id="lc-url" inputmode="url" placeholder="https://" autocomplete="off" autocapitalize="off"></label>
      <div class="two"><label class="f">Тип<select id="lc-type"><option value="v">Видео</option><option value="a">Статья</option><option value="c">Курс</option><option value="l">Другое</option></select></label>
      <label class="f">Минут<input id="lc-min" inputmode="numeric" placeholder="30"></label></div>
      <button class="btn block" data-act="lcSave">${ui.learnDay === 'own' ? 'Добавить' : `Добавить в день ${ui.learnDay + 1}`}</button>`);
    setTimeout(() => $('#lc-title') && $('#lc-title').focus(), 50); return false;
  },
  lcSave: () => {
    let url = $('#lc-url').value.trim(); const title = $('#lc-title').value.trim();
    if (!title && !url) { toast('Введите название или ссылку'); return false; }
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    (state.learn.custom[ui.learnDay] ||= []).push({ id: uid(), title, url, type: $('#lc-type').value, min: Math.round(num($('#lc-min').value) || 0), done: false });
    save(); closeSheet();
  },
  lcDel: el => { const a = state.learn.custom[ui.learnDay] || []; state.learn.custom[ui.learnDay] = a.filter(c => c.id !== el.dataset.id); learnMark(ui.learnDay); save(); },
  notifOn: async () => {
    if (isIOS && !isStandalone()) { toast('Сначала добавьте планер на экран «Домой»'); return false; }
    const p = await Notification.requestPermission(); render();
    if (p === 'granted') notify('Уведомления включены', 'Напоминания будут приходить сюда', 'test');
    return false;
  },
  notifTest: () => { notify('Проверка', 'Так выглядит напоминание планера', 'test'); return false; },
  update: async () => { const v = await checkUpdate(true); if (v === false) toast('Нет связи, попробуйте позже'); else if (v === APP_VERSION) toast('У вас последняя версия'); return false; },
  export: () => { state.settings.lastExport = today(); save(); download(new File([JSON.stringify(state, null, 1)], `planer-${today()}.json`, { type: 'application/json' })); },
  import: () => { $('#importFile').click(); return false; }
};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  const r = await fn(el);
  if (r !== false) render();
});

const bodySet = (k, el) => {
  const v = num(el.value), r = state.body[ui.date] || (state.body[ui.date] = {});
  if (v == null || v <= 0) delete r[k]; else r[k] = Math.round(v * 10) / 10;
  if (r.w == null && r.fat == null) delete state.body[ui.date];
  const o = $('#bodyOut'); if (o) o.innerHTML = bodyOut();
  return false;
};
const changes = {
  done: el => { const it = state.items.find(i => i.id === el.dataset.id); if (!it) return; it.done = el.checked; if (it.done) (it.subs || []).forEach(s => s.done = true); },
  sub: el => {
    const it = state.items.find(i => i.id === el.dataset.id); if (!it) return;
    it.subs[Number(el.dataset.i)].done = el.checked;
    if (it.subs.every(s => s.done)) it.done = true; else if (!el.checked) it.done = false;
  },
  mealAll: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items.forEach(i => { i.eaten = el.checked; }); },
  fItem: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items[Number(el.dataset.i)].eaten = el.checked; },
  // Текстовые поля сохраняем без перерисовки, чтобы не сбивать фокус на телефоне
  fRepl: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].items[Number(el.dataset.i)].repl = el.value.trim(); return false; },
  mNote: el => { ensureDay(ui.date).meals[Number(el.dataset.m)].note = el.value.trim(); return false; },
  bw: el => bodySet('w', el),
  remAdd: el => { const v = el.value; if (v === 'custom') { $('#remCustom').hidden = false; el.value = ''; $('#f-remn').focus(); } else if (v !== '') remAdd(Number(v)); return false; },
  shopOwn: el => { const i = state.shopOwn.find(x => x.id === el.dataset.id); if (i) i.done = el.checked; },
  prof: el => {
    const pr = state.settings.profile || (state.settings.profile = {}), k = el.dataset.k;
    if (k === 'sex' || k === 'act' || k === 'goal') pr[k] = el.value; else { const v = num(el.value); if (v > 0) pr[k] = Math.round(v * 10) / 10; else delete pr[k]; }
    if (blank()) P = { h: pr.h || null, rate: 0 };
  },
  bf: el => bodySet('fat', el),
  train: el => { (state.food[ui.date] ||= {}).train = el.value; return false; },
  comment: el => { (state.food[ui.date] ||= {}).comment = el.value.trim(); return false; },
  menuGoal: el => { state.menu.goal = el.value.trim(); return false; },
  mName: el => { state.menu.days[wdi(ui.date)][Number(el.dataset.i)].name = el.value.trim() || 'Приём пищи'; return false; },
  mTime: el => { state.menu.days[wdi(ui.date)][Number(el.dataset.i)].time = el.value; return false; },
  mItems: el => { const m = state.menu.days[wdi(ui.date)][Number(el.dataset.i)]; m.items = lines(el.value); delete m.im; delete m.kcal; delete m.p; delete m.f; delete m.c; return false; },
  steps: el => { const v = num(el.value), d = state.day[today()] || (state.day[today()] = {}); if (v > 0) d.steps = Math.round(v); else delete d.steps; return false; },
  sleep: el => { const v = num(el.value), d = state.day[today()] || (state.day[today()] = {}); if (v > 0) d.sleep = Math.round(v * 10) / 10; else delete d.sleep; return false; },
  shop: el => { (state.shop[monday(today())] ||= {})[el.dataset.id] = el.checked; },
  lm: el => { (state.learn.done[ui.learnDay] ||= {})[el.dataset.k] = el.checked; learnMark(ui.learnDay); },
  lc: el => { const c = (state.learn.custom[ui.learnDay] || []).find(x => x.id === el.dataset.id); if (c) c.done = el.checked; learnMark(ui.learnDay); }
};
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]'); if (!el) return;
  const fn = changes[el.dataset.ch]; if (!fn) return;
  const r = fn(el); save();
  if (r !== false) render();
});

document.addEventListener('input', e => { if (/^p-(kcal|p|f|c|g)$/.test(e.target.id)) prodCalc();
  if (e.target.id === 'i-qty') qtyCalc(); if (e.target.id === 'q') { ui.q = e.target.value; const o = $('#searchOut'); if (o) o.innerHTML = searchOut(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'shopNew') { e.preventDefault(); actions.shopAdd(); render(); const q = $('#shopNew'); if (q) q.focus(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'quick') { e.preventDefault(); actions.quick(); render(); const q = $('#quick'); if (q) q.focus(); } });

/* Перетаскивание карточек мышью (на телефоне работают кнопки под карточкой) */
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-card]'); if (c) { dragId = c.dataset.card; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('[data-col].col'); if (col && dragId) { e.preventDefault(); col.classList.add('over'); } });
document.addEventListener('dragleave', e => { const col = e.target.closest && e.target.closest('[data-col].col'); if (col) col.classList.remove('over'); });
document.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('[data-col].col'); if (!col || !dragId) return; e.preventDefault();
  const c = state.cards.find(x => x.id === dragId); dragId = null; if (c) { c.col = col.dataset.col; save(); render(); }
});

document.addEventListener('change', e => { if (e.target.id === 'bcPhoto' && e.target.files[0]) decodePhoto(e.target.files[0], ui.form.mi); });
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || !Array.isArray(d.items)) throw new Error('format');
    if (!confirm('Заменить все текущие данные данными из копии?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); state = load(); save(); render(); toast('Данные восстановлены');
  } catch (_) { toast('Это не файл резервной копии планера'); }
});

/* ---------- Обновление приложения ---------- */
let updating = false;
async function checkUpdate(force) {
  if (updating || !location.protocol.startsWith('http')) return APP_VERSION;
  let v;
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); v = (await r.json()).v; } catch (_) { return false; }
  if (v === APP_VERSION || typeof v !== 'number' || v < APP_VERSION) return APP_VERSION;
  const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox';
  if (!force && (sheet.open || typing)) return v;                 // не мешаем вводу, обновимся при следующей проверке
  updating = true; toast('Обновляю планер…');
  try {
    const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update();
    const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k)));
  } catch (_) { /* обновимся обычной перезагрузкой */ }
  location.reload(); return v;
}

/* ---------- Запуск ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
render();
checkReminders();
checkUpdate();
setInterval(checkUpdate, 600000);
setInterval(tick, 1000);
setInterval(() => {
  checkReminders();
  const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox';
  if (ui.tab === 'today' && !sheet.open && !typing) render();
}, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return; checkReminders(); checkUpdate();
  const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox';
  if (!sheet.open && !typing) render();
});
