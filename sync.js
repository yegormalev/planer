'use strict';
/* Облачная синхронизация через Supabase: вход по почте и паролю, одна строка с данными на пользователя.
   Изменения объединяются по трём версиям: что было при прошлой синхронизации, что на устройстве и что в облаке. */

const SYNC_KEY = 'planer.sync';
const syCfg = window.SYNC || {};
const syncOn = !!(syCfg.url && syCfg.key);
let sy = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (_) { return {}; } })();
let syBusy = false, syTimer = 0, syErr = '', syRow = null;
const sySave = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(sy)); return true; } catch (_) { return false; } };
const syTyping = () => { const a = document.activeElement; return !!a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox'; };

/* ---------- Сеть ---------- */
async function syApi(path, opt, auth) {
  opt = opt || {};
  const h = Object.assign({ apikey: syCfg.key, 'Content-Type': 'application/json' }, opt.headers || {});
  if (auth !== false) h.Authorization = 'Bearer ' + (typeof auth === 'string' ? auth : await syToken());
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(syCfg.url.replace(/\/+$/, '') + path, Object.assign({}, opt, { headers: h, signal: ctl.signal }));
    const txt = await r.text(); let j = null;
    try { j = txt ? JSON.parse(txt) : null; } catch (_) { j = null; }
    return { ok: r.ok, status: r.status, j };
  } finally { clearTimeout(tm); }
}
function sySetSes(j) {
  sy.ses = { at: j.access_token, rt: j.refresh_token, exp: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), uid: j.user.id, email: j.user.email };
  sy.email = j.user.email; sySave();
}
async function syToken() {
  const s = sy.ses; if (!s) throw new Error('auth');
  if (s.exp - 60 > Date.now() / 1000) return s.at;
  const r = await syApi('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.rt }) }, false);
  if (!r.ok || !r.j || !r.j.access_token) {
    if (r.status >= 400 && r.status < 500) { sy.ses = null; sySave(); throw new Error('auth'); }
    throw new Error('net');
  }
  sySetSes(r.j); return sy.ses.at;
}
function syAuthMsg(r) {
  const j = r.j || {}, m = String(j.msg || j.error_description || j.message || j.error || ''), c = String(j.error_code || j.code || '');
  if (/invalid login|invalid_credentials/i.test(m + c)) return 'Неверная почта или пароль';
  if (/not confirmed/i.test(m + c)) return 'Почта не подтверждена. Откройте письмо от Supabase, нажмите ссылку в нём и войдите снова.';
  if (/already registered|user_already_exists/i.test(m + c)) return 'Такой аккаунт уже есть. Нажмите «Войти».';
  if (/weak_password|at least|should be/i.test(m + c)) return 'Слишком простой пароль: нужно не меньше 6 символов';
  if (r.status === 429 || /rate limit/i.test(m + c)) return 'Слишком много попыток. Подождите минуту и повторите.';
  if (/invalid.*email|validation_failed/i.test(m + c)) return 'Проверьте адрес почты';
  if (/signups? (not allowed|disabled)/i.test(m + c)) return 'Регистрация новых аккаунтов выключена в настройках Supabase';
  return m ? 'Сервер ответил: ' + m : 'Не удалось связаться с сервером';
}

/* ---------- Объединение изменений ---------- */
const syObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const syIds = x => Array.isArray(x) && x.every(e => syObj(e) && e.id != null);
function syEq(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => syEq(x, b[i]));
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
  return ka.length === kb.length && ka.every(k => syEq(a[k], b[k]));
}
function syMerge(base, loc, rem) {
  if (syEq(loc, rem)) return loc;
  if (base !== undefined) { if (syEq(loc, base)) return rem; if (syEq(rem, base)) return loc; }
  if (loc === undefined) return rem;                         // здесь удалили, там изменили: оставляем изменённое, чтобы ничего не потерять
  if (rem === undefined) return loc;
  if (syObj(loc) && syObj(rem)) {
    const out = {}, b = syObj(base) ? base : {};
    for (const k of new Set([...Object.keys(loc), ...Object.keys(rem)])) { const v = syMerge(b[k], loc[k], rem[k]); if (v !== undefined) out[k] = v; }
    return out;
  }
  if (syIds(loc) && syIds(rem) && loc.length + rem.length) {   // списки записей с id: задачи, заметки, карточки, свои ссылки
    const map = a => new Map((syIds(a) ? a : []).map(x => [x.id, x])), bm = map(base), lm = map(loc), rm = map(rem), out = [];
    for (const x of loc) { const v = syMerge(bm.get(x.id), x, rm.get(x.id)); if (v !== undefined) out.push(v); }
    for (const y of rem) if (!lm.has(y.id)) { const v = syMerge(bm.get(y.id), undefined, y); if (v !== undefined) out.push(v); }
    return out;
  }
  return loc;                                                // одно и то же поле изменили в двух местах: берём это устройство
}
function syDedup(d) {                                        // тренировки, которые планер сам создал на каждом устройстве
  if (!d || !Array.isArray(d.items)) return;
  const seen = new Set();
  d.items = d.items.filter(i => { if (!i.seed) return true; const k = [i.seed, i.date, i.title, i.time].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------- Синхронизация ---------- */
function syncSoon(ms) {
  if (!syncOn || !sy.ses) return;
  clearTimeout(syTimer); syTimer = setTimeout(() => syncNow(), ms || 2500);
}
window.syncSoon = syncSoon;
async function syncNow(manual, choice) {
  if (!syncOn || !sy.ses || syBusy) return;
  if (!manual && !choice && (sheet.open || syTyping())) { syncSoon(5000); return; }
  if (!navigator.onLine) { syErr = 'Нет интернета. Изменения сохранены на устройстве и уйдут в облако, когда появится связь.'; syPaint(); return; }
  syBusy = true; syErr = ''; syPaint();
  let again = false;
  try {
    const uidq = 'user_id=eq.' + sy.ses.uid, snap = JSON.parse(JSON.stringify(state)), linked = sy.base != null;
    const head = await syApi('/rest/v1/planer?select=rev&' + uidq);
    if (!head.ok) throw new Error(head.status === 404 || /PGRST205|42P01/.test((head.j && head.j.code) || '') ? 'table' : head.status === 401 || head.status === 403 ? 'denied' : 'http');
    const hrow = head.j && head.j[0];
    let merged = snap, rev;
    if (!hrow) {
      const ins = await syApi('/rest/v1/planer', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: sy.ses.uid, data: snap, rev: 1 }) });
      if (!ins.ok) { if (ins.status === 409) again = true; throw new Error(ins.status === 409 ? 'again' : 'http'); }
      rev = 1;
    } else if (linked && hrow.rev === sy.rev && syEq(snap, sy.base)) {
      rev = hrow.rev;                                        // ничего не менялось ни здесь, ни в облаке
    } else {
      let remote = sy.base;
      if (!linked || hrow.rev !== sy.rev) {
        const full = await syApi('/rest/v1/planer?select=data,rev&' + uidq);
        if (!full.ok || !full.j || !full.j[0]) throw new Error('http');
        remote = full.j[0].data; hrow.rev = full.j[0].rev;
        if (!linked && !choice) { syRow = full.j[0]; syBusy = false; syChoiceSheet(); return; }   // первое подключение устройства, а в облаке уже есть данные
      }
      merged = choice === 'cloud' ? remote : choice === 'local' ? snap : syMerge(linked ? sy.base : undefined, snap, remote);
      if (!linked) syDedup(merged);
      rev = hrow.rev;
      if (!syEq(merged, remote)) {
        const up = await syApi(`/rest/v1/planer?${uidq}&rev=eq.${hrow.rev}`, { method: 'PATCH', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ data: merged, rev: hrow.rev + 1, updated_at: new Date().toISOString() }) });
        if (!up.ok) throw new Error('http');
        if (!up.j || !up.j.length) { again = true; throw new Error('again'); }   // другое устройство успело раньше, повторим
        rev = hrow.rev + 1;
      }
    }
    if (!syEq(snap, state)) { again = true; return; }       // пока шёл обмен, на устройстве что-то изменили: повторим
    sy.base = merged; sy.rev = rev; sy.last = Date.now();
    if (!sySave()) { syErr = 'Не хватает памяти браузера для синхронизации'; return; }
    if (!syEq(merged, snap)) {
      localStorage.setItem(KEY, JSON.stringify(merged)); state = load();
      if (typeof applyTheme === 'function') applyTheme();
      if (!sheet.open && !syTyping()) render();
    }
  } catch (e) {
    const m = e && e.message;
    syErr = m === 'again' ? '' : m === 'auth' ? 'Сессия закончилась. Войдите снова.' : m === 'table' ? 'В Supabase не создана таблица planer. Выполните шаг с SQL из инструкции.'
      : m === 'denied' ? 'Сервер отказал в доступе. Проверьте ключ и правила доступа к таблице.' : 'Нет связи с облаком. Изменения сохранены на устройстве, повторю позже.';
  } finally {
    syBusy = false; syPaint();
    if (again) syncSoon(1200);
  }
}

/* ---------- Интерфейс ---------- */
function syncCard() {
  const time = sy.last ? new Date(sy.last).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  if (!syncOn) return `<p class="muted small" style="margin:0">Облачная синхронизация ещё не подключена. Пока данные можно переносить файлом: «Сохранить резервную копию» на одном устройстве и «Восстановить из копии» на другом.</p>`;
  if (!sy.ses) return `<p style="margin:0 0 10px">${sy.email ? `Сессия для ${esc(sy.email)} закончилась, войдите снова.` : 'Войдите на телефоне и на компьютере под одной почтой, и записи станут общими.'}</p>
    ${syErr ? `<p class="clash-t" style="margin:0 0 10px">${esc(syErr)}</p>` : ''}
    <button class="btn block" data-act="syncLogin">Войти или создать аккаунт</button>`;
  return `<div class="row spread"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(sy.ses.email || '')}</span><span class="badge ${syErr ? 'warn' : 'ok'}">${syBusy ? 'обмен…' : syErr ? 'ошибка' : time ? 'обновлено ' + time : 'включена'}</span></div>
    ${syErr ? `<p class="clash-t" style="margin:8px 0 0">${esc(syErr)}</p>` : '<p class="muted small" style="margin:8px 0 0">Изменения уходят в облако через пару секунд и подтягиваются на другом устройстве, когда вы его открываете.</p>'}
    <div class="actions"><button class="btn ghost" data-act="syncGo">Синхронизировать</button><button class="btn plain" data-act="syncOut">Выйти</button></div>`;
}
function syPaint() { const el = $('#syncCard'); if (el) el.innerHTML = syncCard(); }
function syLoginSheet(note) {
  ui.form = { kind: 'sync' };
  openSheet(`<div class="row sheet-top"><h3>Синхронизация</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
  ${note ? `<div class="hint">${note}</div>` : ''}
  <label class="f">Почта<input id="sy-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" value="${esc(sy.email || '')}" placeholder="you@example.com"></label>
  <label class="f">Пароль<input id="sy-pass" type="password" autocomplete="current-password" placeholder="не меньше 6 символов"></label>
  <button class="btn block" data-act="syncIn">Войти</button>
  <button class="btn ghost block" style="margin-top:8px" data-act="syncUp">Создать аккаунт</button>
  <button class="btn plain block" style="margin-top:8px" data-act="syncForgot">Забыли пароль</button>
  <p class="muted small" style="margin:12px 0 0">Первый раз нажмите «Создать аккаунт», на втором устройстве просто «Войти» с теми же почтой и паролем.</p>`);
}
function syChoiceSheet() {
  ui.form = { kind: 'syncChoice' };
  const n = syRow && syRow.data && Array.isArray(syRow.data.items) ? syRow.data.items.length : 0;
  openSheet(`<div class="row sheet-top"><h3>В облаке уже есть данные</h3><button class="btn sm plain" data-act="close">Позже</button></div>
  <p class="muted" style="margin:0 0 12px">В облаке задач: ${n}, на этом устройстве: ${state.items.length}. Что сделать при первом подключении этого устройства?</p>
  <button class="btn block" data-act="syncPick" data-v="cloud">Взять данные из облака</button>
  <p class="muted small" style="margin:6px 0 12px">Записи на этом устройстве заменятся облачными. Подходит для второго устройства.</p>
  <button class="btn ghost block" data-act="syncPick" data-v="merge">Объединить</button>
  <p class="muted small" style="margin:6px 0 12px">Останется всё с обоих устройств. Если один день заполнен и там и там, возьмётся это устройство.</p>
  <button class="btn plain block" data-act="syncPick" data-v="local">Заменить облако этим устройством</button>
  <p class="muted small" style="margin:6px 0 0">Данные в облаке будут перезаписаны.</p>`);
}
function syCreds() {
  const email = $('#sy-email').value.trim().toLowerCase(), password = $('#sy-pass').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Введите почту'); return null; }
  if (password.length < 6) { toast('Пароль: не меньше 6 символов'); return null; }
  return { email, password };
}
async function syAuth(path, body, okNote) {
  toast('Соединяюсь…');
  try {
    const r = await syApi(path, { method: 'POST', body: JSON.stringify(body) }, false);
    if (!r.ok) { toast(syAuthMsg(r)); return; }
    if (r.j && r.j.access_token) {
      if (sy.ses == null && sy.uid && sy.uid !== r.j.user.id) { delete sy.base; delete sy.rev; }   // вошли под другим аккаунтом
      sySetSes(r.j); sy.uid = r.j.user.id; sySave(); closeSheet(); render(); toast('Вход выполнен'); syncNow(true);
    } else { sy.email = body.email; sySave(); syLoginSheet(okNote); }
  } catch (_) { toast('Не удалось связаться с сервером. Проверьте интернет.'); }
}
Object.assign(actions, {
  syncLogin: () => { syLoginSheet(); return false; },
  syncIn: () => { const c = syCreds(); if (c) syAuth('/auth/v1/token?grant_type=password', c); return false; },
  syncUp: () => { const c = syCreds(); if (c) syAuth('/auth/v1/signup', c, 'Аккаунт создан. Откройте письмо от Supabase, нажмите ссылку подтверждения, затем вернитесь сюда и нажмите «Войти».'); return false; },
  syncForgot: () => {
    const email = $('#sy-email').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Сначала введите почту'); return false; }
    syApi('/auth/v1/recover', { method: 'POST', body: JSON.stringify({ email }) }, false)
      .then(r => toast(r.ok ? 'Письмо со ссылкой для нового пароля отправлено' : syAuthMsg(r))).catch(() => toast('Не удалось связаться с сервером'));
    return false;
  },
  syncGo: () => { syncNow(true); return false; },
  syncPick: el => { closeSheet(); syncNow(true, el.dataset.v); return false; },
  syncOut: () => {
    if (!confirm('Выйти из синхронизации? Записи останутся на этом устройстве.')) return false;
    const s = sy.ses; if (s) syApi('/auth/v1/logout', { method: 'POST' }, s.at).catch(() => {});
    sy = {}; sySave(); syErr = '';
  },
  syncNewPass: () => {
    const p = $('#sy-new').value; if (p.length < 6) { toast('Пароль: не меньше 6 символов'); return false; }
    syApi('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: p }) }).then(r => { if (r.ok) { closeSheet(); toast('Пароль изменён'); } else toast(syAuthMsg(r)); }).catch(() => toast('Не удалось связаться с сервером'));
    return false;
  }
});

/* ---------- Запуск ---------- */
// Ссылка из письма (подтверждение почты или новый пароль) возвращает на сайт с ключами входа в адресе.
(async () => {
  if (!syncOn) return;
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.get('access_token') && h.get('refresh_token')) {
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const at = h.get('access_token'), u = await syApi('/auth/v1/user', {}, at);
      if (u.ok && u.j && u.j.id) {
        if (sy.uid && sy.uid !== u.j.id) { delete sy.base; delete sy.rev; }
        sySetSes({ access_token: at, refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) || 3600, user: u.j }); sy.uid = u.j.id; sySave();
        if (h.get('type') === 'recovery') {
          ui.form = { kind: 'sync' };
          openSheet(`<div class="row sheet-top"><h3>Новый пароль</h3><button class="btn sm plain" data-act="close">Закрыть</button></div>
          <label class="f">Новый пароль<input id="sy-new" type="password" autocomplete="new-password" placeholder="не меньше 6 символов"></label>
          <button class="btn block" data-act="syncNewPass">Сохранить пароль</button>`);
        } else toast('Почта подтверждена, синхронизация включена');
      }
    } catch (_) { /* войдут вручную */ }
  } else if (h.get('error_description')) { history.replaceState(null, '', location.pathname + location.search); toast('Ссылка из письма устарела. Запросите новую.'); }
  if (sy.ses) syncNow(true);
})();
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSoon(300); });
window.addEventListener('online', () => syncSoon(300));
setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
