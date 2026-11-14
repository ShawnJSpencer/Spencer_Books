/* Spencer Library — family book tracker
   iPad-first, works on iPhone. Data lives on this device and (once signed in) syncs through Firebase. */
'use strict';
const CFG = window.BOOKS_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const dev = {
  get(k, d) { try { const v = localStorage.getItem('sb-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sb-' + k, JSON.stringify(v)); } catch {} }
};
const isWide = () => matchMedia('(min-width:1180px)').matches;
const isPhone = () => matchMedia('(max-width:759px)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmtMonth = ym => { if (!ym) return ''; const [y, m] = ym.split('-'); return m ? `${MONTHS[+m - 1]} ${y}` : y; };
const fmtDate = d => {
  if (!d) return '—'; const p = String(d).split('-');
  if (p.length === 3) return `${MONTHS[+p[1] - 1]} ${+p[2]}, ${p[0]}`;
  if (p.length === 2) return `${MONTHS[+p[1] - 1]} ${p[0]}`;
  return p[0];
};
const year = b => (b.released || '').slice(0, 4);

/* ───────── icons ───────── */
const I = {
  up: '<svg class="i" viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8c1.7 0 2.5 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.3 20H7"/></svg>',
  down: '<svg class="i" viewBox="0 0 24 24"><path d="M7 13V4H4v9zM7 13l4 8c1.7 0 2.5-1 2.5-2.5V15h5.2a2 2 0 0 0 2-2.4l-1.4-7A2 2 0 0 0 17.3 4H7"/></svg>',
  heart: '<svg class="i" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>',
  meh: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 15h8M9 9.5h.01M15 9.5h.01"/></svg>',
  star: '<svg class="i" viewBox="0 0 24 24"><path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  scan: '<svg class="i" viewBox="0 0 24 24"><path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
  cam: '<svg class="i" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  no: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
  book: '<svg class="i" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>'
};

/* ───────── defaults ───────── */
const COLORS = ['#7fb6d9', '#e7a86b', '#c9a0dc', '#9cc59a', '#e58c8c', '#d4c26a', '#8fd1c4'];
const DEFAULT_META = () => ({
  readers: [
    { id: 'emma', name: 'Emma', color: '#7fb6d9', kid: true },
    { id: 'nora', name: 'Nora', color: '#e7a86b', kid: true },
    { id: 'mom', name: 'Mom', color: '#c9a0dc', kid: false },
    { id: 'dad', name: 'Dad', color: '#9cc59a', kid: false }
  ],
  cases: [
    { id: 'A', name: 'Bookcase A', wall: 'Back wall', rows: 4, cols: 4 },
    { id: 'B', name: 'Bookcase B', wall: 'Right wall', rows: 4, cols: 4 }
  ],
  photos: {},
  aiKey: ''
});
const STATUS = { owned: 'Owned', wishlist: 'Wishlist', lent: 'Lent out', gone: 'Given away' };
const READ = { '': 'Not read', want: 'Wants to read', reading: 'Reading now', done: 'Finished', stopped: 'Stopped' };
const VERDICT = { loved: 'Loved it', liked: 'Liked it', okay: 'It was okay', disliked: 'Didn’t like it' };
const VMARK = { loved: '♥', liked: '✓', okay: '~', disliked: '✕' };
const AGES = [['0–3', 0, 3], ['4–7', 4, 7], ['8–12', 8, 12], ['Teen', 13, 17], ['Adult', 18, 99]];
const FORMATS = ['', 'Hardcover', 'Paperback', 'Board book', 'Picture book', 'Graphic novel', 'Box set', 'Other'];
const PAL = [['#2f5d50', '#f4ead2'], ['#c86a3c', '#fff3e0'], ['#3f5e86', '#eef2f7'], ['#d8b04f', '#2e2210'], ['#7a2e2a', '#f6e3c4'], ['#5b4a6e', '#f2eaf7'],
  ['#e9dcc0', '#3a2a1c'], ['#8c3f5a', '#fbeaf0'], ['#6f8f4e', '#f4f7ec'], ['#2c5a7a', '#e6f1f8'], ['#e2a33b', '#2a1b08'], ['#3b6e9a', '#fff8e8']];
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

/* ───────── on-device storage for photos (IndexedDB) ───────── */
const idb = (() => {
  let p;
  const open = () => p ||= new Promise((res, rej) => {
    const r = indexedDB.open('spencer-books', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const tx = db.transaction('kv', mode), req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => res(req?.result); tx.onerror = () => rej(tx.error);
  }));
  return { get: k => run('readonly', s => s.get(k)), set: (k, v) => run('readwrite', s => s.put(v, k)) };
})();

/* ───────── data store (this device, or Firebase when signed in) ───────── */
const DB = {
  mode: 'local', user: null, books: new Map(), meta: DEFAULT_META(), fb: null,
  loadLocal() {
    try {
      const s = JSON.parse(localStorage.getItem('sb-data'));
      if (s?.books) { s.books.forEach(b => this.books.set(b.id, b)); this.meta = { ...DEFAULT_META(), ...s.meta }; }
    } catch {}
  },
  persist() { try { localStorage.setItem('sb-data', JSON.stringify({ meta: this.meta, books: [...this.books.values()] })); } catch { toast('This device’s storage is full — turn on Sync in Settings'); } },
  path(sub) { return `libraries/${CFG.library || 'spencer'}` + (sub ? '/' + sub : ''); },
  async save(b, quiet) {
    b.updatedAt = Date.now(); b.updatedBy = this.user?.email || 'this device';
    this.books.set(b.id, b); this.persist(); if (!quiet) render();
    if (this.mode === 'cloud') { const { doc, setDoc } = this.fb; await setDoc(doc(this.fb.db, this.path('books'), b.id), b).catch(syncErr); }
  },
  async saveMany(list) {
    const now = Date.now();
    list.forEach(b => { b.updatedAt = now; b.updatedBy = this.user?.email || 'this device'; this.books.set(b.id, b); });
    this.persist(); render();
    if (this.mode === 'cloud') {
      const { doc, writeBatch } = this.fb;
      for (let i = 0; i < list.length; i += 400) { const w = writeBatch(this.fb.db); list.slice(i, i + 400).forEach(b => w.set(doc(this.fb.db, this.path('books'), b.id), b)); await w.commit().catch(syncErr); }
    }
  },
  async remove(id) {
    this.books.delete(id); this.persist(); render();
    if (this.mode === 'cloud') { const { doc, deleteDoc } = this.fb; await deleteDoc(doc(this.fb.db, this.path('books'), id)).catch(syncErr); }
  },
  async saveMeta(patch) {
    Object.assign(this.meta, patch); this.persist(); render();
    if (this.mode === 'cloud') { const { doc, setDoc } = this.fb; await setDoc(doc(this.fb.db, this.path()), patch, { merge: true }).catch(syncErr); }
  },
  async savePhoto(key, data) {
    await idb.set('photo:' + key, data).catch(() => {});
    if (this.mode === 'cloud') { const { doc, setDoc } = this.fb; await setDoc(doc(this.fb.db, this.path('photos'), key), data).catch(syncErr); }
  },
  async getPhoto(key) {
    const local = await idb.get('photo:' + key).catch(() => null);
    if (local) return local;
    if (this.mode === 'cloud') {
      const { doc, getDoc } = this.fb;
      try { const s = await getDoc(doc(this.fb.db, this.path('photos'), key)); if (s.exists()) { const d = s.data(); idb.set('photo:' + key, d).catch(() => {}); return d; } } catch (e) { console.warn(e); }
    }
    return null;
  }
};
function syncErr(e) { console.error(e); toast('Saved here — will sync when back online'); }

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
async function initCloud() {
  if (!CFG.firebase) return setSync('this device');
  try {
    const [{ initializeApp }, auth, fs] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
    const app = initializeApp(CFG.firebase, 'spencer-books');
    const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    let fbAuth;
    try { fbAuth = auth.initializeAuth(app, { persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence] }); }
    catch { fbAuth = auth.getAuth(app); }
    DB.fb = { ...auth, ...fs, app, db, auth: fbAuth };
    auth.onAuthStateChanged(fbAuth, user => {
      DB.user = user;
      if (user) { dev.set('lastEmail', user.email); return goCloud(); }
      DB.mode = 'local'; unsubs.forEach(u => u()); unsubs = [];
      setSync(dev.get('lastEmail', '') ? 'tap to sign in' : 'not synced'); render();
    });
  } catch (e) { console.error(e); setSync('offline'); }
}
let unsubs = [];
async function goCloud() {
  const { collection, doc, onSnapshot, getDocs, getDoc, writeBatch, setDoc } = DB.fb, db = DB.fb.db;
  setSync('connecting…');
  try {
    const existing = await getDocs(collection(db, DB.path('books')));
    const cloud = new Map(existing.docs.map(d => [d.id, d.data()]));
    // anything added on this device before signing in goes up, unless the shared copy is newer
    const newer = [...DB.books.values()].filter(b => !cloud.has(b.id) || (cloud.get(b.id).updatedAt || 0) < (b.updatedAt || 0));
    for (let i = 0; i < newer.length; i += 400) { const w = writeBatch(db); newer.slice(i, i + 400).forEach(b => w.set(doc(db, DB.path('books'), b.id), b)); await w.commit(); }
    const m = await getDoc(doc(db, DB.path()));
    if (!m.exists()) await setDoc(doc(db, DB.path()), DB.meta, { merge: true });
    if (newer.length) toast(`Sent ${newer.length} book${newer.length === 1 ? '' : 's'} from this device`);
  } catch (e) { console.error(e); setSync('no access'); toast('This login isn’t allowed in yet — see SETUP.md step 2'); return; }
  DB.mode = 'cloud';
  unsubs.forEach(u => u()); unsubs = [];
  const live = { includeMetadataChanges: true };
  let first = true;
  unsubs.push(onSnapshot(collection(db, DB.path('books')), live, snap => {
    if (snap.docChanges().length || first) { DB.books = new Map(snap.docs.map(d => [d.id, d.data()])); DB.persist(); render(); first = false; }
    const md = snap.metadata;
    setSync(md.hasPendingWrites ? 'saving…' : md.fromCache ? 'connecting…' : 'synced', !md.fromCache && !md.hasPendingWrites);
  }));
  unsubs.push(onSnapshot(doc(db, DB.path()), snap => {
    if (!snap.exists()) return;
    DB.meta = { ...DEFAULT_META(), ...snap.data() }; DB.persist(); render();
  }));
}
function setSync(txt, on = false) {
  const el = $('#sync'); el.innerHTML = `<span class="dot ${on ? 'on' : ''}"></span><span>${esc(txt)}</span>`;
  el.classList.toggle('needs', /sign in/.test(txt));
}

/* ───────── book helpers ───────── */
const readers = () => DB.meta.readers || [];
const kids = () => readers().filter(r => r.kid);
const reader = id => readers().find(r => r.id === id);
const rd = (b, rid) => (b.reads || {})[rid] || {};
const authorLine = b => (b.authors || []).join(', ');
const authorShort = b => (b.authors || [])[0] || '';
const caseOf = id => (DB.meta.cases || []).find(c => c.id === id);
const cubeIds = c => { const out = []; for (let r = 0; r < c.rows; r++) for (let k = 1; k <= c.cols; k++) out.push(String.fromCharCode(65 + r) + k); return out; };
const locKey = (c, cube) => `${c}-${cube}`;
const locLabel = b => b.loc?.c && b.loc?.cube ? `Case ${b.loc.c} · ${b.loc.cube}` : (b.status === 'owned' ? 'Not shelved yet' : '—');
const ageLabel = b => b.ageMin == null && b.ageMax == null ? '' : b.ageMax >= 99 ? `${b.ageMin}+` : `${b.ageMin ?? '?'}–${b.ageMax ?? '?'}`;
const seriesLine = b => b.series ? `${b.series}${b.seriesNo ? ' · Book ' + b.seriesNo : ''}` : '';
const sameSeries = b => b.series ? [...DB.books.values()].filter(x => x.series && norm(x.series) === norm(b.series)) : [];
const isbnOf = s => String(s || '').replace(/[^0-9Xx]/g, '').toUpperCase();
function isbn10to13(i) {
  if (i.length !== 10) return i;
  const core = '978' + i.slice(0, 9); let s = 0;
  for (let k = 0; k < 12; k++) s += +core[k] * (k % 2 ? 3 : 1);
  return core + ((10 - s % 10) % 10);
}
function findExisting(c) {
  const all = [...DB.books.values()];
  if (c.isbn13) { const hit = all.find(b => b.isbn13 && b.isbn13 === c.isbn13); if (hit) return hit; }
  const t = norm(c.title), a = norm(authorShort(c));
  return all.find(b => norm(b.title) === t && (!a || !authorShort(b) || norm(authorShort(b)).split(' ').pop() === a.split(' ').pop()));
}
function coverHTML(b, extra = '') {
  const [bg, ink] = PAL[hash(b.title) % PAL.length];
  const img = b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<div class="cover" ${extra} style="background:${bg};color:${ink}"><span class="ct">${esc(b.title)}</span><span class="ca">${esc(authorShort(b))}</span>${img}</div>`;
}
const thumbHTML = b => { const [bg] = PAL[hash(b.title) % PAL.length]; return `<span class="thumb" style="background:${bg}">${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`; };
const av = (r, size = 28) => `<span class="av" style="background:${r.color};width:${size}px;height:${size}px">${esc((r.name || '?')[0])}</span>`;
function dotsHTML(b) {
  return readers().map(r => {
    const x = rd(b, r.id);
    let mark = '';
    if (x.status === 'done') mark = VMARK[x.verdict] || '✓';
    else if (x.status === 'reading') mark = '…';
    else if (x.status === 'stopped') mark = VMARK[x.verdict] || '–';
    if (!mark) return '';
    const tip = `${r.name}: ${x.status === 'reading' ? 'reading now' : VERDICT[x.verdict] || READ[x.status]}`;
    return `<span class="dot2" title="${esc(tip)}" aria-label="${esc(tip)}" style="background:${r.color}">${mark}</span>`;
  }).join('');
}
function badgeOf(b) {
  if (b.needsReview) return ['review', 'Check me'];
  if (b.status === 'owned' && readers().some(r => rd(b, r.id).status === 'reading')) return ['reading', 'Reading'];
  return [b.status || 'owned', STATUS[b.status] || 'Owned'];
}
function newBook(data, extra = {}) {
  return { id: uid(), title: '', authors: [], genres: [], status: 'owned', copies: 1, reads: {}, wants: [], createdAt: Date.now(), ...data, ...extra };
}

/* ───────── book lookups (Google Books, then Open Library) ───────── */
function fromGoogle(v) {
  const i = v.volumeInfo || {};
  const ids = Object.fromEntries((i.industryIdentifiers || []).map(x => [x.type, x.identifier]));
  const isbn13 = ids.ISBN_13 || (ids.ISBN_10 ? isbn10to13(ids.ISBN_10) : '');
  let cover = i.imageLinks?.thumbnail || i.imageLinks?.smallThumbnail || '';
  cover = cover.replace(/^http:/, 'https:').replace('&edge=curl', '');
  if (!cover && isbn13) cover = `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg?default=false`;
  return {
    title: i.title || '', subtitle: i.subtitle || '', authors: i.authors || [], publisher: i.publisher || '',
    released: i.publishedDate || '', pages: i.pageCount || null, genres: (i.categories || []).flatMap(c => c.split(/\s*\/\s*/)).filter(g => !/^(juvenile|young adult) (fiction|nonfiction)$/i.test(g)).slice(0, 4),
    summary: (i.description || '').replace(/<[^>]+>/g, '').slice(0, 1200), cover, isbn13, isbn10: ids.ISBN_10 || '',
    ageHint: (i.categories || []).join(' ')
  };
}
function fromOL(d, isbn) {
  return {
    title: d.title || '', subtitle: d.subtitle || '', authors: (d.authors || []).map(a => a.name), publisher: d.publishers?.[0]?.name || '',
    released: d.publish_date ? (String(d.publish_date).match(/\d{4}/) || [''])[0] : '', pages: d.number_of_pages || null,
    genres: (d.subjects || []).map(s => s.name).filter(s => s.length < 30).slice(0, 4), summary: '',
    cover: d.cover?.medium || `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`, isbn13: isbn.length === 13 ? isbn : isbn10to13(isbn), isbn10: isbn.length === 10 ? isbn : ''
  };
}
async function getJSON(url, ms = 9000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); }
}
async function lookupISBN(isbn) {
  isbn = isbnOf(isbn);
  try { const j = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`); if (j.items?.length) { const g = fromGoogle(j.items[0]); if (!g.isbn13) g.isbn13 = isbn.length === 13 ? isbn : isbn10to13(isbn); return g; } } catch (e) { console.warn(e); }
  try { const j = await getJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`); const d = j['ISBN:' + isbn]; if (d) return fromOL(d, isbn); } catch (e) { console.warn(e); }
  return null;
}
async function searchBooks(q, author) {
  let out = [];
  const gq = author ? `intitle:${q} inauthor:${author}` : q;
  try { const j = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gq)}&maxResults=12&printType=books`); out = (j.items || []).map(fromGoogle); } catch (e) { console.warn(e); }
  if (!out.length && author) return searchBooks(q);
  if (!out.length) {
    try {
      const j = await getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q + (author ? ' ' + author : ''))}&limit=10&fields=title,author_name,isbn,first_publish_year,cover_i,publisher,number_of_pages_median`);
      out = (j.docs || []).map(d => {
        const isbn = (d.isbn || []).find(x => x.length === 13) || (d.isbn || [])[0] || '';
        return { title: d.title, authors: d.author_name || [], released: d.first_publish_year ? String(d.first_publish_year) : '', isbn13: isbn.length === 13 ? isbn : isbn ? isbn10to13(isbn) : '',
          cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '', publisher: (d.publisher || [])[0] || '', pages: d.number_of_pages_median || null, genres: [], summary: '' };
      });
    } catch (e) { console.warn(e); }
  }
  // drop exact duplicates
  const seen = new Set();
  return out.filter(b => b.title && !seen.has(norm(b.title) + '|' + norm(authorShort(b))) && seen.add(norm(b.title) + '|' + norm(authorShort(b))));
}

/* ───────── Claude (reads shelf photos, fills in age range / series / genre) ───────── */
const AI = {
  key: () => DB.meta.aiKey || dev.get('aiKey', ''),
  model: () => CFG.aiModel || 'claude-sonnet-5-5',
  async ask(content, maxTokens = 4000) {
    const key = this.key(); if (!key) throw new Error('no-key');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: this.model(), max_tokens: maxTokens, messages: [{ role: 'user', content }] })
    });
    if (!r.ok) { let m = r.status; try { m = (await r.json()).error?.message || m; } catch {} throw new Error(m); }
    const j = await r.json();
    return (j.content || []).map(c => c.text || '').join('');
  },
  json(text) { const a = text.indexOf('{'), b = text.lastIndexOf('}'); return JSON.parse(text.slice(a, b + 1)); }
};
async function enrich(list) {
  if (!AI.key() || !list.length) return;
  for (let i = 0; i < list.length; i += 20) {
    const chunk = list.slice(i, i + 20);
    const lines = chunk.map((b, k) => ({ i: k, title: b.title, author: authorShort(b), year: year(b), about: (b.summary || '').slice(0, 280) }));
    try {
      const t = await AI.ask([{ type: 'text', text:
`For each book below give typical details a children's librarian would know. Reply with JSON only:
{"books":[{"i":0,"series":"name or null","seriesNo":number or null,"genres":["2-3 short genres"],"ageMin":number,"ageMax":number,"grade":"e.g. 3–7 or null","level":"Lexile like 740L if known, else null"}]}
Use null when unsure. Books:
${JSON.stringify(lines)}` }], 3000);
      const res = AI.json(t).books || [];
      const changed = [];
      res.forEach(x => {
        const b = DB.books.get(chunk[x.i]?.id); if (!b) return;
        const est = { ...(b.est || {}) };
        if (!b.series && x.series) { b.series = x.series; if (x.seriesNo) b.seriesNo = x.seriesNo; }
        if ((!b.genres || !b.genres.length) && x.genres?.length) { b.genres = x.genres; est.genres = true; }
        if (b.ageMin == null && x.ageMin != null) { b.ageMin = x.ageMin; b.ageMax = x.ageMax ?? null; est.age = true; }
        if (!b.grade && x.grade) b.grade = x.grade;
        if (!b.level && x.level) b.level = x.level;
        b.est = est; changed.push(b);
      });
      if (changed.length) await DB.saveMany(changed);
    } catch (e) { console.warn('enrich', e); if (/no-key|401|403|auth/i.test(String(e))) return; }
  }
}

let enrichQ = [], enrichT = 0;
function enrichSoon(b) { if (!AI.key()) return; enrichQ.push(b); clearTimeout(enrichT); enrichT = setTimeout(() => { const q = enrichQ; enrichQ = []; enrich(q.map(x => DB.books.get(x.id)).filter(Boolean)); }, 4000); }

/* ───────── UI state ───────── */
const UI = { view: 'library', reader: 'all', shelf: 'owned', age: null, genre: '', filter: 'all', sort: dev.get('sort', 'added'), q: '', cube: null, sel: null, shopFor: 'all', caseSel: null };

function visibleBooks() {
  let list = [...DB.books.values()];
  const s = UI.shelf, r = UI.reader;
  if (s === 'owned') list = list.filter(b => b.status === 'owned' || !b.status);
  else if (s === 'wishlist') list = list.filter(b => b.status === 'wishlist');
  else if (s === 'reading') list = list.filter(b => readers().some(x => rd(b, x.id).status === 'reading'));
  else if (s === 'lent') list = list.filter(b => b.status === 'lent');
  else if (s === 'review') list = list.filter(b => b.needsReview);
  else if (s === 'gone') list = list.filter(b => b.status === 'gone');
  else if (s === 'unshelved') list = list.filter(b => b.status === 'owned' && !b.loc?.cube);
  if (UI.cube) list = list.filter(b => b.loc && locKey(b.loc.c, b.loc.cube) === UI.cube);
  if (r !== 'all') {
    const f = UI.filter;
    if (f === 'read') list = list.filter(b => rd(b, r).status === 'done');
    else if (f === 'unread') list = list.filter(b => !['done', 'reading'].includes(rd(b, r).status));
    else if (f === 'reading') list = list.filter(b => rd(b, r).status === 'reading');
    else if (f === 'wants') list = list.filter(b => rd(b, r).status === 'want' || (b.wants || []).includes(r));
    else if (f === 'loved') list = list.filter(b => ['loved', 'liked'].includes(rd(b, r).verdict));
  } else {
    if (UI.filter === 'read') list = list.filter(b => readers().some(x => rd(b, x.id).status === 'done'));
    else if (UI.filter === 'unread') list = list.filter(b => !readers().some(x => ['done', 'reading'].includes(rd(b, x.id).status)));
  }
  if (UI.age) { const [, lo, hi] = AGES.find(a => a[0] === UI.age); list = list.filter(b => b.ageMin != null && b.ageMin <= hi && (b.ageMax ?? 99) >= lo); }
  if (UI.genre) list = list.filter(b => (b.genres || []).some(g => norm(g) === norm(UI.genre)));
  if (UI.q) {
    const q = norm(UI.q), qi = isbnOf(UI.q);
    list = list.filter(b => (qi.length >= 9 && ((b.isbn13 || '').includes(qi) || (b.isbn10 || '').includes(qi))) ||
      [b.title, b.subtitle, authorLine(b), b.series, b.illustrator, (b.genres || []).join(' ')].some(x => norm(x).includes(q)));
  }
  const by = {
    added: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    title: (a, b) => norm(a.title).localeCompare(norm(b.title)),
    author: (a, b) => norm(authorShort(a).split(' ').pop()).localeCompare(norm(authorShort(b).split(' ').pop())) || norm(a.title).localeCompare(norm(b.title)),
    series: (a, b) => norm(a.series || '~' + a.title).localeCompare(norm(b.series || '~' + b.title)) || (a.seriesNo || 0) - (b.seriesNo || 0),
    released: (a, b) => (b.released || '').localeCompare(a.released || ''),
    shelf: (a, b) => (a.loc ? locKey(a.loc.c, a.loc.cube) : '~').localeCompare(b.loc ? locKey(b.loc.c, b.loc.cube) : '~') || (a.loc?.pos || 0) - (b.loc?.pos || 0)
  };
  return list.sort(by[UI.sort] || by.added);
}

/* ───────── render ───────── */
function render() {
  document.body.dataset.view = UI.view;
  renderSide();
  if (UI.view === 'library') renderLibrary();
  else if (UI.view === 'shopping') renderShopping();
  else if (UI.view === 'shelves') renderShelves();
  else if (UI.view === 'import') renderImport();
  renderDetail();
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === (UI.view === 'import' ? 'shelves' : UI.view)));
  if (sheetRefresh) sheetRefresh();
}

function renderSide() {
  const all = [...DB.books.values()];
  const owned = all.filter(b => b.status === 'owned' || !b.status);
  const views = [['library', 'Library', owned.length], ['shopping', 'Shopping list', all.filter(b => b.status === 'wishlist').length], ['shelves', 'Bookcases', (DB.meta.cases || []).length]];
  const shelves = [
    ['owned', 'Owned', '#7fb08a', owned.length], ['wishlist', 'Wishlist', '#d4a95a', all.filter(b => b.status === 'wishlist').length],
    ['reading', 'Currently reading', '#7fb6d9', all.filter(b => readers().some(x => rd(b, x.id).status === 'reading')).length],
    ['unshelved', 'Not shelved yet', '#a08c70', owned.filter(b => !b.loc?.cube).length],
    ['lent', 'Lent out', '#c9a0dc', all.filter(b => b.status === 'lent').length], ['review', 'Needs review', '#ff8a5c', all.filter(b => b.needsReview).length],
    ['gone', 'Given away', '#8a7358', all.filter(b => b.status === 'gone').length], ['all', 'Everything', '#efe2c8', all.length]
  ].filter(s => s[3] || ['owned', 'wishlist', 'all'].includes(s[0]));
  const genres = {}; owned.forEach(b => (b.genres || []).forEach(g => { genres[g] = (genres[g] || 0) + 1; }));
  const topG = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 14);
  $('#side').innerHTML = `
  <div class="navgroup"><span class="cap">View</span>${views.map(([id, n, c]) => `<button class="nav ${UI.view === id || (id === 'shelves' && UI.view === 'import') ? 'on' : ''}" data-act="view" data-v="${id}">${n}<span class="n">${c}</span></button>`).join('')}</div>
  <div class="navgroup"><span class="cap">Reader</span>
    <button class="nav ${UI.reader === 'all' ? 'on' : ''}" data-act="reader" data-v="all"><span class="av" style="background:var(--brass)">★</span>Everyone<span class="n">${owned.length}</span></button>
    ${readers().map(r => `<button class="nav ${UI.reader === r.id ? 'on' : ''}" data-act="reader" data-v="${r.id}">${av(r)}${esc(r.name)}<span class="n">${all.filter(b => rd(b, r.id).status === 'done').length} read</span></button>`).join('')}</div>
  <div class="navgroup"><span class="cap">Shelves</span>${shelves.map(([id, n, c, k]) => `<button class="nav ${UI.shelf === id && UI.view === 'library' ? 'on' : ''}" data-act="shelf" data-v="${id}"><span class="sq" style="background:${c}"></span>${n}<span class="n">${k}</span></button>`).join('')}</div>
  <div class="navgroup" style="padding:0 10px;gap:10px"><span class="cap" style="padding:0">Age range</span><div class="pills">${AGES.map(a => `<button class="pill ${UI.age === a[0] ? 'on' : ''}" data-act="age" data-v="${a[0]}">${a[0]}</button>`).join('')}</div></div>
  ${topG.length ? `<div class="navgroup" style="padding:0 10px;gap:10px"><span class="cap" style="padding:0">Genre</span><div class="pills">${topG.map(([g]) => `<button class="pill ${norm(UI.genre) === norm(g) ? 'on' : ''}" data-act="genre" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>` : ''}`;
}

function libTitle() {
  if (UI.cube) { const [c, q] = UI.cube.split('-'); return `Case ${c} · Cube ${q}`; }
  const r = reader(UI.reader);
  const sh = { owned: '', wishlist: 'Wishlist', reading: 'Reading now', lent: 'Lent out', review: 'Needs review', gone: 'Given away', all: 'Everything', unshelved: 'Not shelved yet' }[UI.shelf];
  if (r) return `${r.name}’s books${sh ? ' · ' + sh : ''}`;
  return sh || 'Our books';
}
function renderLibrary() {
  const all = [...DB.books.values()], owned = all.filter(b => b.status === 'owned' || !b.status);
  const ks = readers().slice(0, 2);
  const stats = [[owned.length, 'Books we own', 'var(--ink)'], ...ks.map(r => [all.filter(b => rd(b, r.id).status === 'done').length, `${r.name} has read`, r.color]),
    [all.filter(b => b.status === 'wishlist').length, 'On the wishlist', 'var(--brass)']];
  const segs = UI.reader === 'all' ? [['all', 'All'], ['read', 'Read by someone'], ['unread', 'Nobody’s read']]
    : [['all', 'All'], ['read', 'Read'], ['unread', 'Not read yet'], ['reading', 'Reading'], ['wants', 'Wants'], ['loved', 'Liked']];
  $('#main').innerHTML = `
  <div class="phonechips">
    <label class="search">${I.search}<input type="search" id="q2" aria-label="Search books" placeholder="Search title, author, ISBN…" value="${esc(UI.q)}" autocomplete="off"></label>
    <div class="pills"><button class="pill ${UI.reader === 'all' ? 'on' : ''}" data-act="reader" data-v="all">Everyone</button>${readers().map(r => `<button class="pill ${UI.reader === r.id ? 'on' : ''}" data-act="reader" data-v="${r.id}">${esc(r.name)}</button>`).join('')}
      <button class="pill ${UI.shelf === 'wishlist' ? 'on' : ''}" data-act="shelf" data-v="${UI.shelf === 'wishlist' ? 'owned' : 'wishlist'}">Wishlist</button>
      <button class="pill" data-act="shelf-photo">${'Photo a shelf'}</button></div>
  </div>
  <div class="stats">${stats.map(([v, l, c]) => `<div class="stat"><b style="color:${c}">${v}</b><span>${esc(l)}</span></div>`).join('')}</div>
  <div class="toolbar">
    <h1 id="libTitle">${esc(libTitle())}</h1>
    ${UI.cube || UI.age || UI.genre ? `<button class="btn sm" data-act="clear-filters">${I.x}Clear filters</button>` : ''}
    <div class="seg" role="group" aria-label="Filter">${segs.map(([id, n]) => `<button class="${UI.filter === id ? 'on' : ''}" data-act="filter" data-v="${id}">${n}</button>`).join('')}</div>
    <select class="sel" data-chg="sort" aria-label="Sort">${[['added', 'Recently added'], ['title', 'Title'], ['author', 'Author'], ['series', 'Series'], ['released', 'Newest'], ['shelf', 'Shelf order']].map(([v, n]) => `<option value="${v}" ${UI.sort === v ? 'selected' : ''}>Sort: ${n}</option>`).join('')}</select>
    <button class="btn sm" data-act="add-search">${I.plus}Add</button>
  </div>
  <div id="gridArea"></div>`;
  renderGrid();
}
function renderGrid() {
  const list = visibleBooks(), el = $('#gridArea'); if (!el) return;
  if (!DB.books.size) {
    el.innerHTML = `<div class="empty"><b>Let’s fill the shelves</b>Scan a barcode, photograph a cube of your bookcase, or search for a title.<div class="row2" style="max-width:520px;margin:18px auto 0">
      <button class="btn gold" data-act="scan">${I.scan}Scan barcode</button><button class="btn outline" data-act="shelf-photo">${I.cam}Photo a shelf</button><button class="btn" data-act="add-search">${I.search}Search</button></div></div>`;
    return;
  }
  if (!list.length) { el.innerHTML = `<div class="empty"><b>Nothing here</b>No books match these filters.</div>`; return; }
  el.innerHTML = `<div class="grid">${list.map(b => {
    const [bk, bl] = badgeOf(b);
    const meta = [year(b), ageLabel(b) && 'Ages ' + ageLabel(b)].filter(Boolean).join(' · ') || authorShort(b);
    return `<button class="card ${UI.sel === b.id && isWide() ? 'on' : ''}" data-act="open" data-id="${b.id}" aria-label="${esc(b.title)}">
      ${coverHTML(b)}<div class="cardrow"><span class="badge b-${bk}">${bl}</span><span class="dots">${dotsHTML(b)}</span></div>
      <span class="cardtitle">${esc(b.title)}</span><span class="cardmeta">${esc(meta)}</span></button>`;
  }).join('')}</div>`;
  const t = $('#libTitle'); if (t) t.textContent = `${libTitle()}${UI.q ? ` · ${list.length} found` : ''}`;
}

/* ───────── detail ───────── */
function recFor(b) {
  const out = [];
  const lovers = readers().filter(r => ['loved', 'liked'].includes(rd(b, r.id).verdict));
  const next = kids().filter(k => !rd(b, k.id).status);
  if (b.pick) out.push(`Family pick${b.pickFor ? ' for ' + esc(b.pickFor) : ''}.`);
  if (lovers.length && next.length) {
    const nx = sameSeries(b).find(x => x.seriesNo === (b.seriesNo || 0) + 1 && x.status === 'owned');
    out.push(`Recommended for ${esc(next.map(k => k.name).join(' & '))} — ${esc(lovers.map(r => r.name).join(' & '))} ${rd(b, lovers[0].id).verdict === 'loved' ? 'loved' : 'liked'} it${nx ? `, and Book ${nx.seriesNo} is already on the shelf` : ''}.`);
  }
  return out.join(' ');
}
function verdictButtons(b, r) {
  const x = rd(b, r.id);
  return `<div class="verd">${[['loved', 'Loved', I.heart, 'up'], ['liked', 'Liked', I.up, 'up'], ['okay', 'Okay', I.meh, 'mid'], ['disliked', 'Didn’t like', I.down, 'down']]
    .map(([v, n, ic, cls]) => `<button class="${cls} ${x.verdict === v ? 'on' : ''}" data-act="verdict" data-id="${b.id}" data-r="${r.id}" data-v="${v}" aria-pressed="${x.verdict === v}">${ic}${n}</button>`).join('')}</div>`;
}
function detailHTML(b) {
  const facts = [
    ['Released', fmtDate(b.released)], ['Genre', (b.genres || []).slice(0, 3).join(' · ') || '—', b.est?.genres],
    ['Age range', ageLabel(b) ? ageLabel(b) + (b.grade ? ` (Gr ${b.grade})` : '') : '—', b.est?.age], ['Pages', b.pages || '—'],
    ['Reading level', b.level || '—'], ['Publisher', b.publisher || '—'],
    ['Where', locLabel(b)], ['ISBN', b.isbn13 || b.isbn10 || '—']
  ];
  const [bk, bl] = badgeOf(b);
  const wishFor = (b.wants || []).map(reader).filter(Boolean);
  const rec = recFor(b);
  return `
  <div class="dhead">${coverHTML(b)}<div style="min-width:0;display:flex;flex-direction:column;gap:2px">
    ${seriesLine(b) ? `<span class="dser">${esc(seriesLine(b))}</span>` : ''}
    <h2 class="dtitle">${esc(b.title)}</h2>${b.subtitle ? `<span class="dauth" style="font-size:13px">${esc(b.subtitle)}</span>` : ''}
    <span class="dauth">${esc(authorLine(b))}${b.illustrator ? ` · ill. ${esc(b.illustrator)}` : ''}</span>
    <div class="chips"><span class="badge b-${bk}">${bl}${b.format && b.status === 'owned' ? ' · ' + esc(b.format) : ''}${b.copies > 1 ? ` · ${b.copies} copies` : ''}</span>
      ${b.pick ? `<span class="badge b-wishlist">Family pick</span>` : ''}${wishFor.length ? `<span class="badge b-wishlist">Wanted by ${esc(wishFor.map(r => r.name).join(', '))}</span>` : ''}
      ${b.status === 'lent' && b.lentTo ? `<span class="badge b-lent">Lent to ${esc(b.lentTo)}</span>` : ''}</div>
  </div></div>
  ${b.needsReview ? `<div class="warn">${I.no}<span>Added from a shelf photo — the match wasn’t certain. Check the title and edition, then tap <b>Looks right</b>.<br><button class="btn sm" style="margin-top:8px;border-color:#8a4a32" data-act="reviewed" data-id="${b.id}">${I.check}Looks right</button></span></div>` : ''}
  <div class="facts">${facts.map(([k, v, e]) => `<div><span>${k}</span><b>${esc(v)}${e ? ' <i>est.</i>' : ''}</b></div>`).join('')}</div>
  <div class="who"><span class="cap">Who’s read it</span>
    ${readers().map(r => {
      const x = rd(b, r.id);
      const sub = x.status === 'done' ? `Finished${x.done ? ' ' + fmtMonth(x.done) : ''}${x.times > 1 ? ` · read ${x.times}×` : ''}` : READ[x.status || ''];
      return `<div class="wrow"><div class="wtop">${av(r, 30)}<div class="nm"><b>${esc(r.name)}</b><small>${esc(sub)}${x.verdict ? ' · ' + VERDICT[x.verdict] : ''}</small></div>
        <select data-chg="read" data-id="${b.id}" data-r="${r.id}" aria-label="${esc(r.name)} reading status">${Object.entries(READ).map(([v, n]) => `<option value="${v}" ${(x.status || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        ${x.status === 'done' || x.status === 'stopped' ? verdictButtons(b, r) : ''}</div>`;
    }).join('')}</div>
  ${rec ? `<div class="rec">${I.star}<span>${rec}</span></div>` : ''}
  ${b.summary ? `<p class="summary">${esc(b.summary.length > 420 ? b.summary.slice(0, 420) + '…' : b.summary)}</p>` : ''}
  ${b.notes ? `<p class="summary"><b>Notes:</b> ${esc(b.notes)}</p>` : ''}
  <div class="row2">
    ${b.status === 'wishlist' ? `<button class="btn gold" data-act="got-it" data-id="${b.id}">${I.check}We got it</button>` : `<button class="btn gold" data-act="mark-read" data-id="${b.id}">Mark as read…</button>`}
    <button class="btn" data-act="edit" data-id="${b.id}">Edit details</button></div>`;
}
function renderDetail() {
  const el = $('#detail');
  if (!isWide()) { el.innerHTML = ''; return; }
  const b = DB.books.get(UI.sel);
  if (!b) {
    el.innerHTML = `<div class="empty" style="margin-top:20px"><b>Pick a book</b>Tap any cover to see its details, who’s read it, and where it lives.</div>`;
    return;
  }
  el.innerHTML = detailHTML(b);
}
function openBook(id) {
  UI.sel = id;
  if (isWide()) { closeSheet(); render(); $('#detail').scrollTop = 0; return; }
  openSheet(() => {
    const b = DB.books.get(id); if (!b) return closeSheet();
    return `<div class="shbar"><button class="btn sm" data-act="close">${I.back}Back</button><span></span></div>${detailHTML(b)}`;
  });
}

/* ───────── sheet & toast ───────── */
let sheetRefresh = null, sheetOnClose = null;
function openSheet(content, opts = {}) {
  const sh = $('#sheet');
  sh.classList.toggle('wide', !!opts.wide);
  const paint = () => { const h = typeof content === 'function' ? content() : content; if (h != null) { const st = sh.scrollTop; sh.innerHTML = h; sh.scrollTop = st; } };
  sheetRefresh = typeof content === 'function' && !opts.static ? paint : null;
  const prevClose = sheetOnClose; sheetOnClose = null; prevClose?.();
  sheetOnClose = opts.onClose || null;
  sh.scrollTop = 0; paint();
  $('#sheetWrap').classList.add('open');
  return sh;
}
function closeSheet() {
  if (!$('#sheetWrap').classList.contains('open')) return;
  $('#sheetWrap').classList.remove('open'); sheetRefresh = null;
  const f = sheetOnClose; sheetOnClose = null; f?.();
}
$('#sheetWrap').addEventListener('click', e => { if (e.target.id === 'sheetWrap') closeSheet(); });
let toastT;
function toast(msg, undo) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
  if (undo) t.querySelector('button').onclick = () => { t.classList.remove('show'); undo(); };
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), undo ? 5000 : 2600);
}

/* ───────── reading status changes ───────── */
async function setRead(id, rid, status) {
  const b = clone(DB.books.get(id)); b.reads = b.reads || {};
  const x = { ...(b.reads[rid] || {}) };
  if (!status) delete b.reads[rid];
  else {
    x.status = status;
    if (status === 'done') { x.done = x.done || thisMonth(); x.times = Math.max(1, x.times || 0); }
    if (status !== 'done' && status !== 'stopped') delete x.verdict;
    b.reads[rid] = x;
    if (status === 'done' || status === 'reading') b.wants = (b.wants || []).filter(w => w !== rid);
  }
  await DB.save(b);
}
async function setVerdict(id, rid, v) {
  const b = clone(DB.books.get(id)); b.reads = b.reads || {};
  const x = { ...(b.reads[rid] || { status: 'done', done: thisMonth(), times: 1 }) };
  x.verdict = x.verdict === v ? '' : v; b.reads[rid] = x;
  await DB.save(b);
}
function markReadSheet(id) {
  openSheet(() => {
    const b = DB.books.get(id); if (!b) return closeSheet();
    return `<div class="shbar"><span></span><button class="btn sm ghost" data-act="close">Done</button></div>
    <h2>Who finished ${esc(b.title)}?</h2><p class="sub">Tap a name, then how they liked it.</p>
    <div class="who">${readers().map(r => { const x = rd(b, r.id); return `<div class="wrow"><div class="wtop">${av(r, 32)}<div class="nm"><b>${esc(r.name)}</b><small>${esc(x.status === 'done' ? 'Finished' + (x.done ? ' ' + fmtMonth(x.done) : '') : READ[x.status || ''])}</small></div>
      ${x.status === 'done' ? `<button class="btn sm" data-act="read-again" data-id="${b.id}" data-r="${r.id}">Read again</button>` : `<button class="btn sm gold" data-act="read-done" data-id="${b.id}" data-r="${r.id}">${I.check}Finished</button>`}</div>
      ${x.status === 'done' ? verdictButtons(b, r) : ''}</div>`; }).join('')}</div>`;
  });
}

/* ───────── edit ───────── */
function editSheet(id, preset) {
  const b = id ? clone(DB.books.get(id)) : newBook(preset || {}, { addedBy: 'typed' });
  const cases = DB.meta.cases || [];
  const cubeOpts = c => (caseOf(c) ? cubeIds(caseOf(c)) : []).map(q => `<option ${b.loc?.cube === q ? 'selected' : ''}>${q}</option>`).join('');
  const sh = openSheet(`<div class="shbar"><button class="btn sm ghost" data-act="close">Cancel</button><button class="btn sm gold" id="edSave">Save</button></div>
  <h2>${id ? 'Edit book' : 'Add a book'}</h2>
  <div class="form" id="edForm">
    <label class="fld full"><span>Title</span><input name="title" value="${esc(b.title)}" required></label>
    <label class="fld full"><span>Subtitle</span><input name="subtitle" value="${esc(b.subtitle || '')}"></label>
    <label class="fld"><span>Author(s), comma between</span><input name="authors" value="${esc(authorLine(b))}"></label>
    <label class="fld"><span>Illustrator</span><input name="illustrator" value="${esc(b.illustrator || '')}"></label>
    <label class="fld"><span>Series</span><input name="series" value="${esc(b.series || '')}"></label>
    <label class="fld"><span>Book # in series</span><input name="seriesNo" inputmode="decimal" value="${esc(b.seriesNo ?? '')}"></label>
    <label class="fld"><span>Release date</span><input name="released" placeholder="2016-04-05 or 2016" value="${esc(b.released || '')}"></label>
    <label class="fld"><span>Genres, comma between</span><input name="genres" value="${esc((b.genres || []).join(', '))}"></label>
    <label class="fld"><span>Youngest age</span><input name="ageMin" inputmode="numeric" value="${esc(b.ageMin ?? '')}"></label>
    <label class="fld"><span>Oldest age</span><input name="ageMax" inputmode="numeric" value="${esc(b.ageMax ?? '')}"></label>
    <label class="fld"><span>Grade range</span><input name="grade" placeholder="3–7" value="${esc(b.grade || '')}"></label>
    <label class="fld"><span>Reading level</span><input name="level" placeholder="740L, AR 5.1, Level P…" value="${esc(b.level || '')}"></label>
    <label class="fld"><span>Format</span><select name="format">${FORMATS.map(f => `<option ${b.format === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <label class="fld"><span>Pages</span><input name="pages" inputmode="numeric" value="${esc(b.pages ?? '')}"></label>
    <label class="fld"><span>Publisher</span><input name="publisher" value="${esc(b.publisher || '')}"></label>
    <label class="fld"><span>ISBN</span><input name="isbn13" inputmode="numeric" value="${esc(b.isbn13 || b.isbn10 || '')}"></label>
    <label class="fld"><span>We…</span><select name="status">${Object.entries(STATUS).map(([v, n]) => `<option value="${v}" ${b.status === v ? 'selected' : ''}>${v === 'wishlist' ? 'Want it (wishlist)' : n}</option>`).join('')}</select></label>
    <label class="fld"><span>Copies</span><input name="copies" inputmode="numeric" value="${esc(b.copies || 1)}"></label>
    <label class="fld"><span>Bookcase</span><select name="locC" id="edCase"><option value="">Not shelved</option>${cases.map(c => `<option value="${c.id}" ${b.loc?.c === c.id ? 'selected' : ''}>${esc(c.name)} (${esc(c.wall || '')})</option>`).join('')}</select></label>
    <label class="fld"><span>Cube</span><select name="locCube" id="edCube">${cubeOpts(b.loc?.c)}</select></label>
    <label class="fld"><span>Condition</span><select name="condition">${['', 'New', 'Good', 'Worn', 'Falling apart'].map(c => `<option ${b.condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="fld"><span>Got it (when / where / gift from)</span><input name="acquired" value="${esc(b.acquired || '')}"></label>
    <label class="fld"><span>Lent to</span><input name="lentTo" value="${esc(b.lentTo || '')}"></label>
    <label class="fld"><span>Family pick for (optional)</span><input name="pickFor" value="${esc(b.pickFor || '')}"></label>
    <div class="fld full"><span>Wanted by (shopping list)</span><div class="pills">${readers().map(r => `<label class="check"><input type="checkbox" name="wants" value="${r.id}" ${(b.wants || []).includes(r.id) ? 'checked' : ''}>${esc(r.name)}</label>`).join('')}
      <label class="check" style="margin-left:12px"><input type="checkbox" name="pick" ${b.pick ? 'checked' : ''}>Family pick (recommended)</label></div></div>
    <label class="fld full"><span>Cover picture link</span><input name="cover" value="${esc(b.cover || '')}"></label>
    <label class="fld full"><span>Summary</span><textarea name="summary">${esc(b.summary || '')}</textarea></label>
    <label class="fld full"><span>Notes</span><textarea name="notes" style="min-height:60px">${esc(b.notes || '')}</textarea></label>
  </div>
  <div class="row2" style="margin-top:18px">
    <button class="btn" id="edFill">${I.star}Fill in missing details${AI.key() ? '' : ' (needs Claude key)'}</button>
    ${id ? `<button class="btn" id="edDel" style="color:var(--redink);border-color:#8a4a32">Delete book</button>` : ''}</div>`);
  $('#edCase', sh).onchange = e => { $('#edCube', sh).innerHTML = cubeOpts(e.target.value); };
  const collect = () => {
    const f = $('#edForm', sh), v = n => f.querySelector(`[name=${n}]`).value.trim();
    const num = n => { const x = parseFloat(v(n)); return isNaN(x) ? null : x; };
    if (!v('title')) { toast('A title is needed'); return null; }
    const o = { ...b, title: v('title'), subtitle: v('subtitle'), authors: v('authors').split(',').map(s => s.trim()).filter(Boolean), illustrator: v('illustrator'),
      series: v('series'), seriesNo: num('seriesNo'), released: v('released'), genres: v('genres').split(',').map(s => s.trim()).filter(Boolean),
      ageMin: num('ageMin'), ageMax: num('ageMax'), grade: v('grade'), level: v('level'), format: v('format'), pages: num('pages'), publisher: v('publisher'),
      status: v('status'), copies: num('copies') || 1, condition: v('condition'), acquired: v('acquired'), lentTo: v('lentTo'), pickFor: v('pickFor'),
      cover: v('cover'), summary: v('summary'), notes: v('notes'), pick: f.querySelector('[name=pick]').checked,
      wants: [...f.querySelectorAll('[name=wants]:checked')].map(x => x.value) };
    const isb = isbnOf(v('isbn13')); o.isbn13 = isb.length === 10 ? isbn10to13(isb) : isb; if (isb.length === 10) o.isbn10 = isb;
    const c = v('locC');
    if (c) { const cube = v('locCube'); o.loc = { c, cube, pos: b.loc?.c === c && b.loc?.cube === cube ? b.loc.pos : nextPos(c, cube) }; } else delete o.loc;
    const est = { ...(b.est || {}) };
    if (o.ageMin !== b.ageMin || o.ageMax !== b.ageMax) delete est.age;
    if (o.genres.join() !== (b.genres || []).join()) delete est.genres;
    o.est = est;
    return o;
  };
  $('#edSave', sh).onclick = async () => { const o = collect(); if (!o) return; await DB.save(o); closeSheet(); toast('Saved'); if (!id) openBook(o.id); else if (!isWide()) openBook(o.id); };
  $('#edFill', sh).onclick = async () => {
    if (!AI.key()) return settingsSheet('ai');
    const o = collect(); if (!o) return;
    await DB.save(o, true); toast('Asking Claude…'); await enrich([o]); editSheet(o.id);
  };
  if (id) $('#edDel', sh).onclick = async () => {
    if (!confirm(`Delete “${b.title}” from the library? This can’t be undone.`)) return;
    const copy = clone(DB.books.get(id)); await DB.remove(id); UI.sel = null; closeSheet(); toast('Deleted', () => DB.save(copy));
  };
}
function nextPos(c, cube) { return [...DB.books.values()].filter(b => b.loc?.c === c && b.loc?.cube === cube).reduce((m, b) => Math.max(m, b.loc.pos || 0), 0) + 1; }

/* ───────── search & add ───────── */
function searchSheet(opts = {}) {
  let results = [], busy = false, q = opts.q || '';
  const mode = opts.mode || 'owned';   // owned | wishlist
  const draw = () => `<div class="shbar"><button class="btn sm ghost" data-act="close">Close</button><button class="btn sm" id="srType">Type it in myself</button></div>
    <h2>${mode === 'wishlist' ? 'Add to the wishlist' : 'Find a book'}</h2>
    <form id="srForm" class="row2" style="margin-bottom:14px"><label class="search" style="flex:3">${I.search}<input id="srQ" value="${esc(q)}" placeholder="Title, author, or ISBN" autocomplete="off"></label><button class="btn gold" style="flex:0 0 auto">Search</button></form>
    ${mode === 'wishlist' ? `<div class="pills" style="margin-bottom:12px"><span class="note" style="align-self:center">For:</span>${readers().map(r => `<label class="check"><input type="checkbox" class="srFor" value="${r.id}" ${(opts.for || []).includes(r.id) ? 'checked' : ''}>${esc(r.name)}</label>`).join('')}</div>` : ''}
    <div id="srRes">${busy ? '<div class="busy"><div class="spin"></div>Searching…</div>' : results.length ? `<div class="list">${results.map((b, i) => {
      const ex = findExisting(b);
      return `<button class="li" data-i="${i}">${thumbHTML(b)}<span class="t"><b>${esc(b.title)}</b><small>${esc([authorLine(b), year(b), b.isbn13].filter(Boolean).join(' · '))}</small></span>
        ${ex ? `<span class="badge b-${ex.status}">${STATUS[ex.status] || 'Owned'}</span>` : `<span class="badge b-${mode}">${mode === 'wishlist' ? '+ Wishlist' : '+ Add'}</span>`}</button>`; }).join('')}</div>` : q ? '<p class="note">No matches yet — try fewer words, or type it in yourself.</p>' : ''}</div>`;
  const sh = openSheet(draw, { static: true });
  const wire = () => {
    $('#srForm', sh).onsubmit = async e => {
      e.preventDefault(); q = $('#srQ', sh).value.trim(); if (!q) return;
      busy = true; sh.innerHTML = draw(); wire();
      const qi = isbnOf(q);
      if (qi.length >= 10 && /^\d/.test(qi)) { const one = await lookupISBN(qi); results = one ? [one] : []; }
      else results = await searchBooks(q);
      busy = false; sh.innerHTML = draw(); wire();
    };
    $('#srType', sh).onclick = () => editSheet(null, { title: q, status: mode });
    $$('#srRes .li', sh).forEach(li => li.onclick = async () => {
      const c = results[+li.dataset.i], ex = findExisting(c);
      if (ex) { if (mode === 'wishlist' && ex.status === 'wishlist') { const w = new Set(ex.wants || []); $$('.srFor:checked', sh).forEach(x => w.add(x.value)); await DB.save({ ...clone(ex), wants: [...w] }); toast('Updated the wishlist'); } closeSheet(); return openBook(ex.id); }
      const wants = $$('.srFor:checked', sh).map(x => x.value);
      const b = newBook(c, { status: mode, addedBy: 'search', wants, ...(opts.loc ? { loc: { ...opts.loc, pos: nextPos(opts.loc.c, opts.loc.cube) } } : {}) });
      delete b.ageHint;
      await DB.save(b); enrichSoon(b);
      toast(mode === 'wishlist' ? `Added to the wishlist: ${b.title}` : `Added: ${b.title}`, () => DB.remove(b.id));
      if (opts.onPick) { opts.onPick(b); return; }
      li.querySelector('.badge').outerHTML = `<span class="badge b-${mode}">${STATUS[mode]}</span>`;
    });
    setTimeout(() => $('#srQ', sh)?.focus(), 50);
  };
  wire();
  if (q) $('#srForm', sh).requestSubmit();
}

/* ───────── barcode scanner ───────── */
let scanState = null;
function openScanner(opts = {}) {
  // opts.onISBN(isbn) → hand the code back (shelf-photo fixes); otherwise look it up here
  const st = { busy: false, last: null, keep: dev.get('keepScanning', false), shelveIn: opts.shelveIn || dev.get('shelveIn', '') };
  const cubes = (DB.meta.cases || []).flatMap(c => cubeIds(c).map(q => [locKey(c.id, q), `Case ${c.id} · ${q}`]));
  const sh = openSheet(`<div class="shbar"><span class="cap">${opts.onISBN ? 'Scan this book’s barcode' : 'Scan a book'}</span><button class="btn sm ghost" data-act="close">Close</button></div>
    <div id="reader"></div>
    <div class="lens hidden" id="lens" role="group" aria-label="Lens"><button data-lens="close">Close-up 0.5×</button><button data-lens="normal">Normal 1×</button></div>
    <p class="note" style="text-align:center;margin:10px 0 0">Point at the barcode on the back cover (the one starting 978 or 979).</p>
    <div id="lastScan"></div>
    <form class="row2" id="typedForm" style="margin-top:14px"><label class="fld" style="flex:2"><span>Or type the ISBN</span><input id="typed" inputmode="numeric" placeholder="978…" autocomplete="off"></label><button class="btn" style="flex:0 0 auto;align-self:end">Look up</button></form>
    ${opts.onISBN ? '' : `<button class="btn" style="width:100%;margin-top:10px" data-act="add-search">${I.search}Search by title instead</button>
    <div class="form" style="margin-top:14px">
      <label class="fld"><span>New books go on</span><select id="shelveIn"><option value="">Not shelved yet</option>${cubes.map(([k, n]) => `<option value="${k}" ${st.shelveIn === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="check" style="align-self:end;min-height:44px"><input type="checkbox" id="keepScan" ${st.keep ? 'checked' : ''}>Quick add: keep scanning, add each new book as ours</label>
    </div>`}`, { onClose: () => { Scanner.stop(); if (scanState === st) scanState = null; } });
  scanState = st;
  const el = $('#reader', sh);
  const showLens = (has, mode) => { $('#lens', sh).classList.toggle('hidden', !has); $$('#lens [data-lens]', sh).forEach(b => b.classList.toggle('on', b.dataset.lens === mode)); };
  const fail = () => { el.innerHTML = `<p class="note" style="color:#fff;padding:24px">The camera isn’t available here. Allow camera access in Settings, or type the ISBN below.</p>`; };
  const onText = txt => {
    if (!scanState || scanState.busy) return;
    const code = isbnOf(txt);
    if (!/^97[89]\d{10}$/.test(code)) { if (code.length >= 8) toast('That’s a store/price code — look for the barcode starting 978'); return; }
    if (scanState.last === code && Date.now() - scanState.lastT < 3500) return;
    scanState.busy = true; scanState.last = code; scanState.lastT = Date.now(); navigator.vibrate?.(30);
    handleCode(code, opts).finally(() => { if (scanState) setTimeout(() => { if (scanState) scanState.busy = false; }, 900); });
  };
  const start = () => Scanner.start(el, onText, { onLens: showLens, onFail: fail });
  $('#lens', sh).onclick = e => { const b = e.target.closest('[data-lens]'); if (!b || b.classList.contains('on')) return; Scanner.setLens(b.dataset.lens); start(); };
  $('#typedForm', sh).onsubmit = e => { e.preventDefault(); const v = isbnOf($('#typed', sh).value); if (v.length < 10) return toast('An ISBN has 10 or 13 digits'); $('#typed', sh).value = ''; handleCode(v.length === 10 ? isbn10to13(v) : v, opts); };
  if (!opts.onISBN) {
    $('#shelveIn', sh).onchange = e => { scanState.shelveIn = e.target.value; dev.set('shelveIn', e.target.value); };
    $('#keepScan', sh).onchange = e => { scanState.keep = e.target.checked; dev.set('keepScanning', e.target.checked); };
  }
  if (window.Scanner) start(); else setTimeout(start, 400);
}
async function handleCode(isbn, opts) {
  if (opts.onISBN) { await Scanner.stop(); return opts.onISBN(isbn); }
  const ex = findExisting({ isbn13: isbn, title: '\u0000' });
  if (ex && !scanState?.keep) { await Scanner.stop(); return resultSheet(ex.id, null); }
  if (ex) return showLast(ex, true);
  const box = $('#lastScan'); if (box) box.innerHTML = `<div class="last"><div class="spin" style="width:22px;height:22px;border-width:3px"></div><span>Looking up ${isbn}…</span></div>`;
  const found = await lookupISBN(isbn);
  if (!found) {
    if (box) box.innerHTML = `<div class="last dup"><span style="flex:1">Couldn’t find ${isbn} online.</span><button class="btn sm" data-act="type-new" data-isbn="${isbn}">Type it in</button></div>`;
    return;
  }
  delete found.ageHint;
  if (scanState?.keep) {
    const [c, cube] = (scanState.shelveIn || '').split('-');
    const b = newBook(found, { addedBy: 'barcode', ...(c ? { loc: { c, cube, pos: nextPos(c, cube) } } : {}) });
    await DB.save(b, true); render(); enrichSoon(b);
    return showLast(b, false);
  }
  await Scanner.stop();
  resultSheet(null, found);
}
function showLast(b, dup) {
  const box = $('#lastScan'); if (!box) return;
  box.innerHTML = `<div class="last ${dup ? 'dup' : ''}">${dup ? I.book : I.check}<div style="flex:1;min-width:0"><b style="display:block;font-size:14px">${dup ? 'Already have' : 'Added'}: ${esc(b.title)}</b><small style="font-size:12px;opacity:.85">${esc(locLabel(b))}</small></div>
    ${dup ? `<button class="btn sm" data-act="open" data-id="${b.id}">Open</button>` : `<button class="btn sm" data-act="undo-add" data-id="${b.id}">Undo</button>`}</div>`;
}
function seriesStrip(b) {
  const ss = sameSeries(b); if (!b.series || !b.seriesNo) return '';
  const own = new Set(ss.filter(x => x.status === 'owned').map(x => x.seriesNo));
  const max = Math.max(8, ...[...own].map(n => n + 1), b.seriesNo + 1);
  const ownedList = [...own].sort((a, c) => a - c);
  const nextFor = kids().map(k => {
    const doneNos = ss.filter(x => rd(x, k.id).status === 'done' && x.seriesNo).map(x => x.seriesNo);
    if (!doneNos.length) return null; const n = Math.max(...doneNos) + 1; return { k, n, have: own.has(n) };
  }).filter(Boolean);
  return `<div class="list" style="padding:14px;margin:12px 0">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="cap">${esc(b.series)} on our shelves</span><span style="font-size:12px;color:var(--brass)">${ownedList.length ? 'Own ' + ownedList.join(', ') : 'None yet'}</span></div>
    <div class="series">${Array.from({ length: Math.min(max, 20) }, (_, i) => i + 1).map(n => `<span class="${own.has(n) ? 'own' : ''} ${n === b.seriesNo ? 'cur' : ''}">${n}</span>`).join('')}</div>
    ${nextFor.map(x => `<div style="font-size:13px;margin-top:8px">${esc(x.k.name)} is up to <b style="color:var(--goldink)">Book ${x.n}</b>${x.have ? ' — we have it' : ' — we don’t have it yet'}</div>`).join('')}</div>`;
}
function resultSheet(id, found) {
  openSheet(() => {
    const b = id ? DB.books.get(id) : found; if (!b) return closeSheet();
    const wishFor = (b.wants || []).map(reader).filter(Boolean);
    let banner;
    if (id && b.status === 'owned') banner = `<div class="banner ok"><span class="bi" style="background:var(--green)">${I.check}</span><div><b>You already own this</b><small>${esc(locLabel(b))}${b.format ? ' · ' + esc(b.format) : ''}</small></div></div>`;
    else if (id && b.status === 'wishlist') banner = `<div class="banner gold"><span class="bi" style="background:var(--brass);color:#22170f">${I.star}</span><div><b>It’s on the wishlist</b><small>${wishFor.length ? 'Wanted by ' + esc(wishFor.map(r => r.name).join(' & ')) : 'Nobody picked yet'}</small></div></div>`;
    else if (id) banner = `<div class="banner gold"><span class="bi" style="background:var(--brass);color:#22170f">${I.book}</span><div><b>${esc(STATUS[b.status])}</b><small>${b.lentTo ? 'Lent to ' + esc(b.lentTo) : ''}</small></div></div>`;
    else banner = `<div class="banner new"><span class="bi" style="background:#7fb6d9;color:#22170f">${I.plus}</span><div><b>Not in our library yet</b><small>${esc(b.isbn13 || '')}</small></div></div>`;
    const who = readers().map(r => { const x = rd(b, r.id); return `<div class="wrow" style="padding:8px 10px"><div class="wtop">${av(r, 28)}<div class="nm"><b style="font-size:14px">${esc(r.name)}</b><small>${esc(x.verdict ? VERDICT[x.verdict] : READ[x.status || ''])}</small></div></div></div>`; }).join('');
    const prev = !id && b.series ? '' : '';
    return `<div class="shbar"><button class="btn sm" data-act="scan">${I.back}Scanner</button><button class="btn sm ghost" data-act="close">Close</button></div>
    ${banner}
    <div class="dhead">${coverHTML(b)}<div style="min-width:0;display:flex;flex-direction:column;gap:3px">
      ${seriesLine(b) ? `<span class="dser">${esc(seriesLine(b))}</span>` : ''}<h2 class="dtitle">${esc(b.title)}</h2><span class="dauth">${esc(authorLine(b))}</span>
      <span class="note">${esc([year(b), (b.genres || [])[0], ageLabel(b) && 'Ages ' + ageLabel(b)].filter(Boolean).join(' · '))}</span></div></div>
    ${id ? `<div class="cap" style="margin:16px 0 8px">Who’s read it</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${who}</div>${seriesStrip(b)}` : ''}
    ${!id && b.summary ? `<p class="summary" style="margin-top:14px">${esc(b.summary.slice(0, 300))}${b.summary.length > 300 ? '…' : ''}</p>` : ''}
    ${prev}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      ${!id ? `<button class="btn gold" data-act="add-found" data-s="owned">${I.check}We own it — add to library</button>
        <div class="pills" style="align-items:center"><span class="note">Wishlist for:</span>${readers().map(r => `<label class="check"><input type="checkbox" class="wf" value="${r.id}">${esc(r.name)}</label>`).join('')}</div>
        <button class="btn outline" data-act="add-found" data-s="wishlist">${I.star}Add to wishlist</button>` : ''}
      ${id && b.status === 'wishlist' ? `<button class="btn gold" data-act="got-it" data-id="${b.id}">${I.check}We bought it</button>` : ''}
      <button class="btn" data-act="scan">${I.scan}Scan the next book</button>
      ${id ? `<button class="btn ghost" data-act="open" data-id="${b.id}">Open full details</button>` : ''}
    </div>`;
  });
  sheetFound = found;
}
let sheetFound = null;

/* ───────── shopping list ───────── */
function renderShopping() {
  const all = [...DB.books.values()];
  const wl = all.filter(b => b.status === 'wishlist');
  const forR = UI.shopFor;
  const list = forR === 'all' ? wl : wl.filter(b => (b.wants || []).includes(forR) || rd(b, forR).status === 'want');
  // next-in-series ideas
  const ideas = [];
  const bySeries = {};
  all.filter(b => b.series && b.seriesNo).forEach(b => { (bySeries[norm(b.series)] ||= []).push(b); });
  kids().filter(k => forR === 'all' || forR === k.id).forEach(k => {
    Object.values(bySeries).forEach(ss => {
      const done = ss.filter(b => rd(b, k.id).status === 'done');
      if (!done.length || done.some(b => rd(b, k.id).verdict === 'disliked')) return;
      const n = Math.max(...done.map(b => b.seriesNo)) + 1;
      if (ss.some(b => b.seriesNo === n)) return;
      ideas.push({ k, series: ss[0].series, n });
    });
  });
  const skips = [];
  kids().filter(k => forR === 'all' || forR === k.id).forEach(k => all.filter(b => rd(b, k.id).verdict === 'disliked').forEach(b => skips.push({ k, b })));
  $('#main').innerHTML = `
  <div class="toolbar"><h1>Shopping list</h1>
    <div class="seg" role="group" aria-label="Show list for"><button class="${forR === 'all' ? 'on' : ''}" data-act="shop-for" data-v="all">Everyone · ${wl.length}</button>
      ${readers().map(r => { const n = wl.filter(b => (b.wants || []).includes(r.id) || rd(b, r.id).status === 'want').length; return `<button class="${forR === r.id ? 'on' : ''}" data-act="shop-for" data-v="${r.id}">${esc(r.name)} · ${n}</button>`; }).join('')}</div>
    <button class="btn sm gold" data-act="wish-add">${I.plus}Add</button><button class="btn sm" data-act="scan">${I.scan}Scan in store</button></div>
  <div class="cap" style="margin:4px 0 8px">Want to get</div>
  ${list.length ? `<div class="list">${list.map(b => {
    const who = [...new Set([...(b.wants || []), ...readers().filter(r => rd(b, r.id).status === 'want').map(r => r.id)])].map(reader).filter(Boolean);
    return `<div class="li"><label class="check" title="Got it"><input type="checkbox" data-chg="got" data-id="${b.id}" aria-label="We got ${esc(b.title)}"></label>
      <button class="li" style="padding:0;border:0" data-act="open" data-id="${b.id}">${thumbHTML(b)}<span class="t"><b>${esc(b.title)}</b><small>${esc([seriesLine(b) || authorLine(b), ageLabel(b) && 'ages ' + ageLabel(b)].filter(Boolean).join(' · '))}</small></span></button>
      <span style="display:flex;gap:3px">${who.map(r => av(r, 26)).join('')}</span></div>`; }).join('')}</div>`
    : `<div class="empty"><b>The list is empty</b>Add books the girls are asking for, or scan one in a store and tap “Add to wishlist”.</div>`}
  ${ideas.length ? `<div class="cap" style="margin:22px 0 8px">Next in a series they’re reading</div><div class="list">${ideas.map(x => `<div class="li">${av(x.k, 30)}<span class="t"><b>${esc(x.series)} · Book ${x.n}</b><small>${esc(x.k.name)} finished Book ${x.n - 1}</small></span><button class="btn sm" data-act="wish-add" data-q="${esc(x.series + ' ' + x.n)}" data-for="${x.k.id}">Find it</button></div>`).join('')}</div>` : ''}
  ${skips.length ? `<div class="cap" style="margin:22px 0 8px">Maybe skip</div>${skips.slice(0, 8).map(x => `<div class="warn">${I.no}<span><b>${esc(x.k.name)}</b> didn’t like <b>${esc(x.b.title)}</b>${x.b.series ? ` — skip more ${esc(x.b.series)} for her` : ''}.</span></div>`).join('')}` : ''}`;
}

/* ───────── bookcases ───────── */
function cubeStats(c, q) {
  const key = locKey(c, q), bs = [...DB.books.values()].filter(b => b.loc?.c === c && b.loc?.cube === q && b.status !== 'gone');
  return { key, bs, photo: (DB.meta.photos || {})[key], review: bs.filter(b => b.needsReview).length };
}
function nextCube() {
  for (const c of DB.meta.cases || []) for (const q of cubeIds(c)) { const s = cubeStats(c.id, q); if (!s.photo) return [c.id, q]; }
  return null;
}
function renderShelves() {
  const cases = DB.meta.cases || [];
  const total = cases.reduce((n, c) => n + c.rows * c.cols, 0);
  const done = Object.keys(DB.meta.photos || {}).length;
  const nx = nextCube();
  const sel = UI.caseSel;
  let info = '';
  if (sel) {
    const [c, q] = sel.split('-'), s = cubeStats(c, q);
    const counts = kids().map(k => `${k.name}: ${s.bs.filter(b => rd(b, k.id).status === 'done').length} read`);
    info = `<div class="cubeinfo"><div style="min-width:180px"><span class="cap" style="color:var(--brass)">Selected</span><div style="font:700 23px var(--fd)">Case ${c} · Cube ${q}</div>
      <span class="note">${s.bs.length} book${s.bs.length === 1 ? '' : 's'}${s.photo ? ' · photographed ' + new Date(s.photo.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ' · no photo yet'}</span></div>
      <div class="chips" style="flex:1">${counts.map(t => `<span class="badge" style="background:var(--bar);border:1px solid var(--line);font-size:13px;padding:6px 12px">${esc(t)}</span>`).join('')}${s.review ? `<span class="badge b-review" style="font-size:13px;padding:6px 12px">${s.review} to review</span>` : ''}</div>
      <div class="row2" style="flex-wrap:wrap;flex:0 0 auto">
        ${s.photo ? `<button class="btn sm gold" data-act="open-photo" data-k="${sel}">Open photo</button>` : ''}
        <button class="btn sm ${s.photo ? '' : 'gold'}" data-act="shelf-photo" data-k="${sel}">${I.cam}${s.photo ? 'Rescan' : 'Photo this cube'}</button>
        <button class="btn sm" data-act="scan-into" data-k="${sel}">${I.scan}Scan into it</button>
        <button class="btn sm" data-act="show-cube" data-k="${sel}">Show books</button></div></div>`;
  }
  $('#main').innerHTML = `
  <div class="toolbar"><h1>Bookcases</h1>
    <span class="note" style="display:flex;gap:14px;flex-wrap:wrap"><span><span class="sq" style="display:inline-block;width:11px;height:11px;border-radius:3px;background:var(--green);vertical-align:-1px"></span> Photographed</span><span><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:var(--amber);vertical-align:-1px"></span> Needs review</span><span><span style="display:inline-block;width:11px;height:11px;border-radius:3px;border:2px dashed #8a7358;vertical-align:-1px"></span> Not yet</span></span>
    ${nx ? `<button class="btn gold" data-act="shelf-photo" data-k="${locKey(nx[0], nx[1])}">${I.cam}Photo next cube (${nx[0]} · ${nx[1]})</button>` : ''}</div>
  ${info || `<p class="note" style="text-align:center;margin:0">Tap a cube to see its books, open its photo, or photograph it.</p>`}
  <div class="cases">${cases.map(c => `<div class="case"><h3>${esc(c.name)}<small>${esc(c.wall || '')} · ${c.rows} × ${c.cols}</small></h3>
    <div class="kallax" style="grid-template-columns:repeat(${c.cols},auto)">${cubeIds(c).map(q => {
      const s = cubeStats(c.id, q), cls = s.review ? 'review' : s.photo || s.bs.length ? 'done' : '';
      const bars = s.bs.slice(0, 14).map(b => `<i style="height:${50 + hash(b.title) % 50}%;background:${PAL[hash(b.title) % PAL.length][0]}"></i>`).join('');
      return `<button class="cube ${cls} ${sel === s.key ? 'on' : ''}" data-act="cube" data-k="${s.key}" aria-label="Case ${c.id} cube ${q}"><span class="id">${q}</span><span class="bars">${bars}</span>
        <span class="cb">${s.review ? s.review + ' to review' : s.bs.length ? s.bs.length + (s.bs.length === 1 ? ' book' : ' books') : s.photo ? 'Empty' : 'Tap to photo'}</span></button>`; }).join('')}</div></div>`).join('')}</div>
  <div class="cubeinfo" style="border-color:var(--line);margin-top:14px">
    <div class="room" role="img" aria-label="Room: ${esc(cases.map(c => c.name + ' on the ' + (c.wall || '').toLowerCase()).join(', '))}">
      <i style="top:3px;left:14px;width:42px;height:12px">${esc(cases[0]?.id || '')}</i>${cases[1] ? `<i style="top:22px;right:3px;width:12px;height:62px">${esc(cases[1].id)}</i>` : ''}
      <span style="position:absolute;bottom:-2px;right:6px;width:30px;height:3px;background:var(--bg)"></span><span style="position:absolute;bottom:4px;left:6px;font:600 9px var(--fb);color:var(--mute)">door</span></div>
    <div style="flex:1;min-width:200px"><span class="cap">Progress</span><div style="font:700 22px var(--fd)">${done} of ${total} cubes photographed</div>
      <div style="height:8px;border-radius:99px;background:var(--bar);overflow:hidden;margin-top:8px"><div style="width:${total ? done / total * 100 : 0}%;height:100%;background:var(--green)"></div></div></div>
    <span class="note" style="max-width:340px">Rows are lettered top to bottom (A–D), columns numbered left to right (1–4). So B3 is the second row, third cube.</span>
  </div>`;
}

/* ───────── shelf photo import ───────── */
let IMP = null;
function shelfPhotoStart(key) {
  if (!key) { const nx = nextCube(); key = nx ? locKey(nx[0], nx[1]) : locKey(DB.meta.cases[0].id, 'A1'); }
  const cubes = (DB.meta.cases || []).flatMap(c => cubeIds(c).map(q => [locKey(c.id, q), `Case ${c.id} · ${q}${(DB.meta.photos || {})[locKey(c.id, q)] ? ' (done)' : ''}`]));
  const sh = openSheet(`<div class="shbar"><span></span><button class="btn sm ghost" data-act="close">Cancel</button></div>
    <h2>Photograph a cube</h2><p class="sub">Stand straight in front of one cube so every spine is in the picture and readable. Good light helps; no flash glare.</p>
    ${AI.key() ? '' : `<div class="warn">${I.no}<span>Reading spines from a photo uses Claude. Add your Claude key in <button class="btn sm" data-act="settings-ai" style="margin-left:4px">Settings</button> first.<br>Until then you can still <b>scan barcodes into a cube</b>.</span></div>`}
    <label class="fld" style="margin-bottom:16px"><span>Which cube?</span><select id="spCube">${cubes.map(([k, n]) => `<option value="${k}" ${k === key ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <div class="row2"><button class="btn gold" id="spTake" ${AI.key() ? '' : 'disabled'}>${I.cam}Take photo</button><button class="btn" id="spPick" ${AI.key() ? '' : 'disabled'}>Choose from Photos</button></div>
    <button class="btn" style="width:100%;margin-top:10px" id="spScan">${I.scan}Scan barcodes into this cube instead</button>`);
  const go = inputId => { IMP = { key: $('#spCube', sh).value }; const inp = $('#' + inputId); inp.value = ''; inp.click(); };
  $('#spTake', sh).onclick = () => go('shelfFile');
  $('#spPick', sh).onclick = () => go('shelfPick');
  $('#spScan', sh).onclick = () => openScanner({ shelveIn: $('#spCube', sh).value });
}
function loadImage(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = rej; im.src = u; });
}
function shrink(im, max, q) {
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
async function onShelfFile(e) {
  const f = e.target.files?.[0]; if (!f || !IMP) return;
  closeSheet();
  const im = await loadImage(f);
  IMP = { ...IMP, img: shrink(im, 1400, .62), aiImg: shrink(im, 1568, .85), dets: [], busy: 'Reading the spines…', sel: null, at: Date.now() };
  UI.view = 'import'; render();
  try {
    const t = await AI.ask([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: IMP.aiImg.split(',')[1] } },
      { type: 'text', text:
`This photo shows one cube of a bookshelf. Identify every book, going left to right (include books lying flat, thin booklets, and spines you cannot read).
Reply with JSON only, no other text:
{"books":[{"title":"title as printed, or null if unreadable","author":"author or null","series":"series name or null","box":[x0,y0,x1,y1],"confidence":0.0-1.0,"readable":true,"note":"why unsure, if unsure"}]}
"box" is the spine's bounding box with coordinates from 0 to 1000 relative to the image width (x) and height (y).
"confidence" is how sure you are of the exact title. Use readable:false when no title can be made out.` }], 6000);
    const res = AI.json(t).books || [];
    IMP.aiImg = null;
    IMP.dets = res.map((d, i) => ({ id: i + 1, title: d.title || '', author: d.author || '', series: d.series || '', box: d.box || [0, 0, 0, 0], conf: +d.confidence || 0, readable: d.readable !== false && !!d.title, note: d.note || '', cands: [], match: null, state: 'pending' }));
    IMP.busy = `Matching ${IMP.dets.length} books…`; render();
    let k = 0;
    const worker = async () => { while (k < IMP.dets.length) { const d = IMP.dets[k++]; await matchDet(d); if (UI.view === 'import') render(); } };
    await Promise.all([worker(), worker(), worker()]);
    IMP.busy = null;
    IMP.sel = (IMP.dets.find(d => d.state !== 'matched') || {}).id || null;
    render();
  } catch (err) {
    console.error(err); IMP.busy = null; IMP.error = /no-key/.test(String(err)) ? 'Add your Claude key in Settings first.' : `Claude couldn’t read the photo (${err.message || err}). Check the key in Settings, or try again.`;
    render();
  }
}
async function matchDet(d) {
  if (!d.readable) { d.state = 'missed'; return; }
  d.cands = (await searchBooks(d.title, d.author)).slice(0, 5);
  const top = d.cands[0];
  const ok = top && (norm(top.title).includes(norm(d.title)) || norm(d.title).includes(norm(top.title)));
  d.match = top || null;
  d.state = d.conf >= .8 && ok ? 'matched' : 'unsure';
  if (!top) d.state = 'unsure';
  if (d.match) d.existing = findExisting(d.match)?.id || null;
}
function renderImport() {
  if (!IMP) { UI.view = 'shelves'; return renderShelves(); }
  const [c, q] = IMP.key.split('-');
  const ds = IMP.dets;
  const n = s => ds.filter(d => d.state === s).length;
  const tag = d => d.state === 'missed' ? `${d.id} · Can’t read` : d.state === 'unsure' ? `${d.id} · Not sure` : d.state === 'skipped' ? `${d.id} · Skipped` : String(d.id);
  const boxes = ds.map(d => {
    const [x0, y0, x1, y1] = d.box.map(v => Math.max(0, Math.min(1000, +v || 0)) / 10);
    return `<button class="box ${d.state === 'matched' ? 'ok' : d.state} ${IMP.sel === d.id ? 'sel' : ''}" data-act="det" data-d="${d.id}" aria-label="Book ${d.id}: ${esc(d.match?.title || d.title || 'unreadable')}" style="left:${x0}%;top:${y0}%;width:${Math.max(1.5, x1 - x0)}%;height:${Math.max(3, y1 - y0)}%"><span class="tag">${esc(tag(d))}</span></button>`;
  }).join('');
  const sel = ds.find(d => d.id === IMP.sel);
  const addable = ds.filter(d => d.match && (d.state === 'matched' || d.state === 'unsure'));
  const fixes = ds.filter(d => d.state === 'unsure' || d.state === 'missed');
  $('#main').innerHTML = `
  <div class="toolbar"><button class="iconbtn" data-act="view" data-v="shelves" aria-label="Back to bookcases">${I.back}</button>
    <div style="flex:1"><span class="cap" style="color:var(--brass)">Shelf import</span><h1 style="margin:0;font:700 23px var(--fd)">Case ${c} · Cube ${q}</h1></div>
    <button class="btn" data-act="shelf-photo" data-k="${IMP.key}">${I.cam}Retake photo</button></div>
  <div class="imp">
    <section class="photo" aria-label="Shelf photo"><div class="pwrap"><img src="${IMP.img}" alt="Photo of the cube">${boxes}</div>
      <div class="note" style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center"><span><span style="display:inline-block;width:12px;height:12px;border:3px solid var(--amber);border-radius:3px;vertical-align:-2px"></span> Not sure — please check</span><span><span style="display:inline-block;width:12px;height:12px;border:3px solid var(--orange);border-radius:3px;vertical-align:-2px"></span> Couldn’t read it</span><span>Tap any box to fix or swap the match</span></div></section>
    <aside>
      ${IMP.busy ? `<div class="busy"><div class="spin"></div><b style="color:var(--ink)">${esc(IMP.busy)}</b>This takes about half a minute.</div>` : IMP.error ? `<div class="warn">${I.no}<span>${esc(IMP.error)}</span></div>` : `
      <div class="tri"><div><b style="color:#9fd0aa">${n('matched')}</b><span>Matched</span></div><div style="border-color:#7a6030"><b style="color:var(--amber)">${n('unsure')}</b><span>Not sure</span></div><div style="border-color:#8a4a32"><b style="color:#ff9b72">${n('missed')}</b><span>Couldn’t read</span></div></div>
      ${sel ? fixPanel(sel) : fixes.length ? `<p class="note">Tap a flashing box to check it.</p>` : `<p class="note">Everything matched. Tap any box if something looks wrong.</p>`}
      <span class="cap" style="padding-top:4px">Left to right</span>
      <div class="list">${ds.map(d => `<button class="li" data-act="det" data-d="${d.id}" style="padding:8px 12px"><span class="num" style="background:${d.state === 'missed' ? 'var(--orange)' : d.state === 'unsure' ? 'var(--amber)' : d.state === 'skipped' ? '#8a7358' : 'var(--green)'}">${d.id}</span>
        <span class="t"><b style="font-size:14px">${esc(d.match?.title || d.title || 'Unreadable spine')}</b><small>${esc(d.state === 'skipped' ? 'Skipped' : d.match ? authorShort(d.match) : d.state === 'pending' ? 'Matching…' : 'No match yet')}</small></span>
        ${d.existing ? '<span class="badge b-wishlist">Already listed</span>' : d.match && d.state !== 'skipped' ? '<span class="badge b-owned">New</span>' : ''}</button>`).join('')}</div>
      <button class="btn gold" style="height:52px;font-size:16px" data-act="imp-add" ${addable.length ? '' : 'disabled'}>Add ${addable.length} book${addable.length === 1 ? '' : 's'}${n('unsure') ? ` (${n('unsure')} marked to check)` : ''}</button>`}
    </aside></div>`;
}
function fixPanel(d) {
  const cls = d.state === 'missed' ? 'missed' : d.state === 'matched' ? 'matched' : '';
  const col = d.state === 'missed' ? 'var(--orange)' : d.state === 'matched' ? 'var(--green)' : 'var(--amber)';
  let head;
  if (d.state === 'missed') head = `<b style="font-size:15px">No readable title</b><small class="note">${esc(d.note || 'Thin or worn spine')}</small>`;
  else if (d.match) head = `<b style="font-size:15px">${d.state === 'unsure' ? 'Best guess: ' : ''}${esc(d.match.title)}</b><small class="note">${esc([authorShort(d.match), year(d.match), d.state === 'unsure' ? Math.round(d.conf * 100) + '% sure' : '', d.note].filter(Boolean).join(' · '))}</small>`;
  else head = `<b style="font-size:15px">Read as “${esc(d.title)}”</b><small class="note">No match found online${d.note ? ' · ' + esc(d.note) : ''}</small>`;
  return `<div class="fix ${cls}">
    <div style="display:flex;gap:12px;align-items:center"><span class="num" style="background:${col}">${d.id}</span><div style="flex:1;min-width:0;display:flex;flex-direction:column">${head}</div>${d.match ? thumbHTML(d.match) : ''}</div>
    <div class="row2" style="flex-wrap:wrap">
      ${d.state === 'unsure' && d.match ? `<button class="btn sm gold" data-act="det-ok" data-d="${d.id}">${I.check}That’s right</button>` : ''}
      <button class="btn sm ${d.state === 'missed' ? 'gold' : ''}" data-act="det-scan" data-d="${d.id}">${I.scan}Scan its barcode</button>
      ${d.state !== 'skipped' ? `<button class="btn sm" data-act="det-skip" data-d="${d.id}">Skip</button>` : `<button class="btn sm" data-act="det-unskip" data-d="${d.id}">Undo skip</button>`}</div>
    ${d.cands.length > 1 || (d.cands.length && !d.match) ? `<details ${d.state === 'unsure' ? '' : ''}><summary class="note" style="cursor:pointer">Other matches (${d.cands.length})</summary><div class="list" style="margin-top:8px">${d.cands.map((c, i) => `<button class="li" data-act="det-cand" data-d="${d.id}" data-i="${i}" style="padding:8px 10px">${thumbHTML(c)}<span class="t"><b style="font-size:14px">${esc(c.title)}</b><small>${esc([authorShort(c), year(c)].filter(Boolean).join(' · '))}</small></span></button>`).join('')}</div></details>` : ''}
    <form class="row2" data-form="det-search" data-d="${d.id}"><label class="search" style="height:42px;flex:3">${I.search}<input name="q" placeholder="Type the title" value="${esc(d.title)}" autocomplete="off"></label><button class="btn sm" style="flex:0 0 auto;height:42px">Search</button></form>
  </div>`;
}
async function impAdd() {
  const [c, cube] = IMP.key.split('-');
  const add = [], upd = [];
  let pos = 0;
  IMP.dets.forEach(d => {
    if (!d.match || !['matched', 'unsure'].includes(d.state)) return;
    pos++;
    const ex = d.existing && DB.books.get(d.existing);
    const loc = { c, cube, pos };
    if (ex) { const b = clone(ex); b.loc = loc; if (b.status !== 'owned') b.status = 'owned'; if (d.state === 'unsure' && !b.reviewedAt) b.needsReview = true; upd.push(b); d.bookId = b.id; }
    else { const m = { ...d.match }; delete m.ageHint; const b = newBook(m, { addedBy: 'shelf', loc, needsReview: d.state === 'unsure' }); if (!b.series && d.series) b.series = d.series; add.push(b); d.bookId = b.id; }
  });
  await DB.saveMany([...add, ...upd]);
  const photo = { t: Date.now(), img: IMP.img, dets: IMP.dets.map(d => ({ id: d.id, box: d.box, state: d.state, title: d.match?.title || d.title, bookId: d.bookId || null })) };
  await DB.savePhoto(IMP.key, photo);
  await DB.saveMeta({ photos: { ...(DB.meta.photos || {}), [IMP.key]: { t: photo.t, n: add.length + upd.length } } });
  enrich(add);
  const key = IMP.key; IMP = null; UI.view = 'shelves'; UI.caseSel = key; render();
  const nx = nextCube();
  openSheet(`<h2>Added ${add.length} book${add.length === 1 ? '' : 's'}${upd.length ? ` · updated ${upd.length}` : ''}</h2>
    <p class="sub">Case ${c} · Cube ${cube} is done.${add.some(b => b.needsReview) ? ' Books you weren’t sure about are under “Needs review”.' : ''}</p>
    <div class="row2">${nx ? `<button class="btn gold" data-act="shelf-photo" data-k="${locKey(nx[0], nx[1])}">${I.cam}Next cube: ${nx[0]} · ${nx[1]}</button>` : ''}<button class="btn" data-act="close">Done for now</button></div>`);
}
async function openPhoto(key) {
  const p = await DB.getPhoto(key);
  if (!p) return toast('That photo isn’t on this device yet — try again in a moment');
  const [c, q] = key.split('-');
  openSheet(`<div class="shbar"><b style="font:700 20px var(--fd)">Case ${c} · Cube ${q}</b><button class="btn sm ghost" data-act="close">Close</button></div>
    <div style="text-align:center"><div class="pwrap"><img src="${p.img}" alt="Shelf photo" style="max-height:70vh">${(p.dets || []).filter(d => d.bookId).map(d => {
      const [x0, y0, x1, y1] = d.box.map(v => Math.max(0, Math.min(1000, +v || 0)) / 10);
      const b = DB.books.get(d.bookId);
      return `<button class="box ${b?.needsReview ? 'unsure' : ''}" data-act="open" data-id="${d.bookId}" aria-label="${esc(b?.title || d.title)}" style="left:${x0}%;top:${y0}%;width:${Math.max(1.5, x1 - x0)}%;height:${Math.max(3, y1 - y0)}%"></button>`; }).join('')}</div></div>
    <p class="note" style="text-align:center">Photographed ${new Date(p.t).toLocaleDateString()}. Tap a spine to open the book.</p>
    <div class="row2"><button class="btn" data-act="shelf-photo" data-k="${key}">${I.cam}Rescan this cube</button><button class="btn" data-act="show-cube" data-k="${key}">Show these books</button></div>`, { wide: true });
}

/* ───────── settings ───────── */
function settingsSheet(focus) {
  const m = DB.meta;
  const signedIn = DB.mode === 'cloud' && DB.user;
  const sh = openSheet(`<div class="shbar"><span></span><button class="btn sm ghost" data-act="close">Close</button></div>
  <h2>Settings</h2>
  <div class="secttl">Sync between iPad and iPhone</div>
  ${!CFG.firebase ? `<p class="note">Firebase isn’t set up yet, so books stay on this device. See SETUP.md.</p>`
    : signedIn ? `<p class="note">Signed in as <b>${esc(DB.user.email)}</b>. Everything syncs automatically, and works offline.</p><button class="btn sm" id="stOut">Sign out</button>`
    : `<p class="note">Use the same email and password as the food storage app.</p>
      <div class="form"><label class="fld"><span>Email</span><input id="stEmail" type="email" autocomplete="username" value="${esc(dev.get('lastEmail', ''))}"></label>
      <label class="fld"><span>Password</span><input id="stPass" type="password" autocomplete="current-password"></label></div>
      <div class="row2" style="margin-top:10px"><button class="btn gold" id="stIn">Sign in</button><button class="btn" id="stNew">First time? Create login</button></div>`}
  <div class="secttl">Readers</div>
  <div id="stReaders" style="display:flex;flex-direction:column;gap:8px">${m.readers.map((r, i) => `<div class="row2" style="align-items:center" data-i="${i}">
    <input type="color" value="${r.color}" aria-label="Color" style="flex:0 0 44px;height:44px;border:0;background:none;padding:0">
    <label class="fld" style="flex:2"><input class="rn" value="${esc(r.name)}" aria-label="Name"></label>
    <label class="check" style="flex:1"><input type="checkbox" class="rk" ${r.kid ? 'checked' : ''}>Kid (gets suggestions)</label>
    <button class="btn sm ghost" data-del="${i}" aria-label="Remove ${esc(r.name)}">${I.x}</button></div>`).join('')}</div>
  <button class="btn sm" id="stAddR" style="margin-top:8px">${I.plus}Add reader</button>
  <div class="secttl">Bookcases</div>
  <div id="stCases" style="display:flex;flex-direction:column;gap:8px">${m.cases.map((c, i) => `<div class="form" data-i="${i}" style="grid-template-columns:2fr 2fr 1fr 1fr">
    <label class="fld"><span>Name</span><input class="cn" value="${esc(c.name)}"></label><label class="fld"><span>Where</span><input class="cw" value="${esc(c.wall || '')}"></label>
    <label class="fld"><span>Rows</span><input class="cr" inputmode="numeric" value="${c.rows}"></label><label class="fld"><span>Columns</span><input class="cc" inputmode="numeric" value="${c.cols}"></label></div>`).join('')}</div>
  <div class="secttl" id="stAI">Claude (reads shelf photos, fills in details)</div>
  <p class="note">Paste an API key from console.anthropic.com → API keys. It’s saved in your private library so both devices can use it. Each shelf photo is one small request on your Anthropic account.</p>
  <label class="fld"><span>Claude API key</span><input id="stKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(AI.key())}"></label>
  <div class="row2" style="margin-top:8px"><button class="btn sm" id="stTest">Test the key</button><button class="btn sm" id="stFillAll">Fill in missing ages & series for all books</button></div>
  <div class="secttl">Backup</div>
  <div class="row2"><button class="btn sm" id="stBackup">Download a backup</button><button class="btn sm" id="stRestore">Restore from a backup</button></div>
  <div class="row2" style="margin-top:22px"><button class="btn gold" id="stSave">Save settings</button></div>`);
  if (focus === 'ai') setTimeout(() => { $('#stAI', sh)?.scrollIntoView({ block: 'start' }); $('#stKey', sh)?.focus(); }, 80);
  const auth = async create => {
    const em = $('#stEmail', sh).value.trim(), pw = $('#stPass', sh).value;
    if (!em || !pw) return toast('Enter your email and password');
    try { await (create ? DB.fb.createUserWithEmailAndPassword : DB.fb.signInWithEmailAndPassword)(DB.fb.auth, em, pw); closeSheet(); toast('Signed in — syncing'); }
    catch (e) { toast(/wrong-password|invalid-credential/.test(e.code) ? 'That password didn’t work' : /email-already/.test(e.code) ? 'That email already has a login — tap Sign in' : (e.code || e.message || 'Couldn’t sign in').replace('auth/', '')); }
  };
  if ($('#stIn', sh)) { if (!DB.fb) $('#stIn', sh).disabled = true; $('#stIn', sh).onclick = () => auth(false); $('#stNew', sh).onclick = () => auth(true); }
  if ($('#stOut', sh)) $('#stOut', sh).onclick = async () => { await DB.fb.signOut(DB.fb.auth); closeSheet(); };
  const gather = () => {
    const rs = $$('#stReaders > div', sh).map(row => { const r = m.readers[+row.dataset.i] || {}; return { id: r.id || uid(), name: $('.rn', row).value.trim() || 'Reader', color: $('input[type=color]', row).value, kid: $('.rk', row).checked }; });
    const cs = $$('#stCases > div', sh).map(row => { const c = m.cases[+row.dataset.i]; return { ...c, name: $('.cn', row).value.trim() || c.name, wall: $('.cw', row).value.trim(), rows: Math.max(1, Math.min(8, parseInt($('.cr', row).value) || c.rows)), cols: Math.max(1, Math.min(8, parseInt($('.cc', row).value) || c.cols)) }; });
    return { readers: rs, cases: cs, aiKey: $('#stKey', sh).value.trim() };
  };
  $('#stAddR', sh).onclick = async () => { const g = gather(); g.readers.push({ id: uid(), name: 'New reader', color: COLORS[g.readers.length % COLORS.length], kid: true }); await DB.saveMeta(g); settingsSheet(); };
  $$('[data-del]', sh).forEach(b => b.onclick = async () => { const g = gather(); const r = g.readers[+b.dataset.del]; if (!confirm(`Remove ${r.name}? Their reading history stays hidden in the books.`)) return; g.readers.splice(+b.dataset.del, 1); await DB.saveMeta(g); settingsSheet(); });
  $('#stSave', sh).onclick = async () => { await DB.saveMeta(gather()); closeSheet(); toast('Settings saved'); };
  $('#stTest', sh).onclick = async () => {
    await DB.saveMeta({ aiKey: $('#stKey', sh).value.trim() }); toast('Checking…');
    try { await AI.ask([{ type: 'text', text: 'Reply with the single word: ready' }], 10); toast('The key works'); } catch (e) { toast('That key didn’t work: ' + (e.message || e)); }
  };
  $('#stFillAll', sh).onclick = async () => {
    await DB.saveMeta({ aiKey: $('#stKey', sh).value.trim() });
    const need = [...DB.books.values()].filter(b => b.ageMin == null || !b.series || !(b.genres || []).length);
    if (!need.length) return toast('Every book already has its details');
    toast(`Filling in ${need.length} book${need.length === 1 ? '' : 's'}…`); await enrich(need); toast('Done filling in details');
  };
  $('#stBackup', sh).onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'spencer-books', t: Date.now(), meta: { ...DB.meta, aiKey: '' }, books: [...DB.books.values()] }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `spencer-books-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  $('#stRestore', sh).onclick = () => $('#restoreFile').click();
}
$('#restoreFile').addEventListener('change', async e => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (!Array.isArray(j.books)) throw 0;
    if (!confirm(`Restore ${j.books.length} books? Books with the same id are replaced; others are kept.`)) return;
    await DB.saveMany(j.books); if (j.meta) { const { aiKey, ...rest } = j.meta; await DB.saveMeta(rest); }
    closeSheet(); toast(`Restored ${j.books.length} books`);
  } catch { toast('That file isn’t a Spencer Library backup'); }
  e.target.value = '';
});

/* ───────── events ───────── */
const ACT = {
  view: d => { UI.view = d.v; if (d.v === 'library') UI.cube = null; render(); $('#main').scrollTop = 0; },
  reader: d => { UI.reader = d.v; UI.view = 'library'; if (d.v === 'all' && !['all', 'read', 'unread'].includes(UI.filter)) UI.filter = 'all'; render(); },
  shelf: d => { UI.shelf = d.v; UI.view = 'library'; UI.cube = null; render(); },
  age: d => { UI.age = UI.age === d.v ? null : d.v; UI.view = 'library'; render(); },
  genre: d => { UI.genre = norm(UI.genre) === norm(d.v) ? '' : d.v; UI.view = 'library'; render(); },
  filter: d => { UI.filter = d.v; render(); },
  'clear-filters': () => { UI.cube = null; UI.age = null; UI.genre = ''; render(); },
  open: d => openBook(d.id),
  close: () => closeSheet(),
  verdict: d => setVerdict(d.id, d.r, d.v),
  'read-done': d => setRead(d.id, d.r, 'done'),
  'read-again': async d => { const b = clone(DB.books.get(d.id)); const x = b.reads[d.r]; x.times = (x.times || 1) + 1; x.done = thisMonth(); await DB.save(b); toast(`Read again — ${x.times} times now`); },
  'mark-read': d => markReadSheet(d.id),
  edit: d => editSheet(d.id),
  reviewed: async d => { const b = clone(DB.books.get(d.id)); b.needsReview = false; b.reviewedAt = Date.now(); await DB.save(b); toast('Marked as checked'); },
  'got-it': async d => { const b = clone(DB.books.get(d.id)); const before = clone(b); b.status = 'owned'; b.acquired = b.acquired || new Date().toLocaleDateString(); await DB.save(b); toast(`Moved to the library: ${b.title}`, () => DB.save(before)); },
  scan: () => openScanner(),
  'add-search': () => searchSheet(),
  'wish-add': d => searchSheet({ mode: 'wishlist', q: d.q || '', for: d.for ? [d.for] : (UI.shopFor !== 'all' ? [UI.shopFor] : []) }),
  'shop-for': d => { UI.shopFor = d.v; render(); },
  'shelf-photo': d => shelfPhotoStart(d.k),
  'settings-ai': () => settingsSheet('ai'),
  cube: d => { UI.caseSel = UI.caseSel === d.k ? null : d.k; render(); },
  'open-photo': d => openPhoto(d.k),
  'scan-into': d => openScanner({ shelveIn: d.k }),
  'show-cube': d => { closeSheet(); UI.cube = d.k; UI.shelf = 'all'; UI.view = 'library'; UI.sort = 'shelf'; render(); },
  'undo-add': async d => { const b = DB.books.get(d.id); await DB.remove(d.id); const box = $('#lastScan'); if (box) box.innerHTML = `<div class="last dup"><span>Removed ${esc(b?.title || '')}</span></div>`; if (scanState) scanState.last = null; },
  'type-new': d => editSheet(null, { isbn13: d.isbn }),
  'add-found': async d => {
    const f = sheetFound; if (!f) return;
    const wants = d.s === 'wishlist' ? $$('.wf:checked').map(x => x.value) : [];
    const [c, cube] = (d.s === 'owned' ? dev.get('shelveIn', '') : '').split('-');
    const b = newBook(f, { status: d.s, addedBy: 'barcode', wants, ...(c ? { loc: { c, cube, pos: nextPos(c, cube) } } : {}) });
    await DB.save(b); enrichSoon(b); sheetFound = null;
    toast(d.s === 'wishlist' ? 'Added to the wishlist' : 'Added to the library', () => DB.remove(b.id));
    resultSheet(b.id);
  },
  det: d => { IMP.sel = +d.d; render(); },
  'det-ok': d => { const x = IMP.dets.find(z => z.id === +d.d); x.state = 'matched'; x.conf = 1; IMP.sel = (IMP.dets.find(z => z.state === 'unsure' || z.state === 'missed') || {}).id || null; render(); },
  'det-skip': d => { const x = IMP.dets.find(z => z.id === +d.d); x.prev = x.state; x.state = 'skipped'; IMP.sel = (IMP.dets.find(z => z.state === 'unsure' || z.state === 'missed') || {}).id || null; render(); },
  'det-unskip': d => { const x = IMP.dets.find(z => z.id === +d.d); x.state = x.prev || (x.match ? 'unsure' : 'missed'); render(); },
  'det-cand': d => { const x = IMP.dets.find(z => z.id === +d.d); x.match = x.cands[+d.i]; x.state = 'matched'; x.existing = findExisting(x.match)?.id || null; render(); },
  'det-scan': d => {
    const x = IMP.dets.find(z => z.id === +d.d);
    openScanner({ onISBN: async isbn => {
      closeSheet(); toast('Looking it up…');
      const found = await lookupISBN(isbn);
      if (!found) return toast('Couldn’t find that ISBN — try typing the title');
      x.match = found; x.cands = [found, ...x.cands]; x.state = 'matched'; x.existing = findExisting(found)?.id || null; render();
    } });
  },
  'imp-add': () => impAdd()
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const f = ACT[t.dataset.act]; if (!f) return;
  e.preventDefault(); f(t.dataset);
});
document.addEventListener('change', async e => {
  const t = e.target.closest('[data-chg]'); if (!t) return;
  const k = t.dataset.chg;
  if (k === 'sort') { UI.sort = t.value; dev.set('sort', t.value); renderGrid(); }
  else if (k === 'read') setRead(t.dataset.id, t.dataset.r, t.value);
  else if (k === 'got') { if (t.checked) ACT['got-it']({ id: t.dataset.id }); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form="det-search"]'); if (!f) return;
  e.preventDefault();
  const x = IMP?.dets.find(z => z.id === +f.dataset.d), q = f.q.value.trim(); if (!x || !q) return;
  x.title = q; toast('Searching…');
  x.cands = (await searchBooks(q)).slice(0, 6);
  if (x.cands.length) { x.match = x.cands[0]; x.state = 'unsure'; x.conf = .5; x.readable = true; x.existing = findExisting(x.match)?.id || null; }
  else toast('No matches — try a different spelling');
  render();
});
const onSearch = v => { UI.q = v; if (UI.view !== 'library') { UI.view = 'library'; render(); } else renderGrid(); };
$('#q').addEventListener('input', e => onSearch(e.target.value));
$('#main').addEventListener('input', e => { if (e.target.id === 'q2') onSearch(e.target.value); });
$('#goScan').onclick = () => openScanner();
$('#goShelf').onclick = () => shelfPhotoStart();
$('#goSettings').onclick = () => settingsSheet();
$('#sync').onclick = () => { if (DB.mode !== 'cloud') settingsSheet(); };
$$('#tabs button').forEach(b => b.onclick = () => { const t = b.dataset.tab; if (t === 'scan') return openScanner(); UI.view = t; if (t === 'library') UI.cube = null; render(); $('#main').scrollTop = 0; });
$('#shelfFile').addEventListener('change', onShelfFile);
$('#shelfPick').addEventListener('change', onShelfFile);
let wasWide = isWide();
addEventListener('resize', () => { if (isWide() !== wasWide) { wasWide = isWide(); if (wasWide && $('#sheetWrap').classList.contains('open') && UI.sel && !scanState) closeSheet(); render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ───────── start ───────── */
DB.loadLocal();
render();
initCloud();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
