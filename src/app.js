import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ===================== CONFIG ===================== */
const APP_NAME = 'BizWork'; // izina ry'agateganyo, rirashobora guhindurwa
const SUPABASE_URL = 'https://goqybceqbcfwlybrmpne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a2cF61dOc1Sp2D2WM-GFcg_fQvP2p4Z'; // publishable key (si ibanga)
const PAGE = 10; // amatangazo kuri buri rupapuro
const IMG_PAGE = 24; // amafoto kuri buri rupapuro mu gutangaza kwose
const MAX_PRODUCT_IMAGES = 200;
const MAX_JOB_IMAGES = 2;
const CURRENCIES = ['ZAR', 'BIF', 'USD', 'EUR', 'RWF', 'UGX', 'TZS', 'KES', 'CDF'];

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const KINDS = {
  product: { table: 'products', owner: 'seller_id', likes: 'product_likes', comments: 'product_comments', fk: 'product_id', imgs: 'product_images', bucket: 'product-images', route: 'p', report: 'product', commentReport: 'product_comment', preview: 4 },
  job: { table: 'jobs', owner: 'owner_id', likes: 'job_likes', comments: 'job_comments', fk: 'job_id', imgs: 'job_images', bucket: 'job-images', route: 'j', report: 'job', commentReport: 'job_comment', preview: 2 },
};

/* ===================== HELPERS ===================== */
const root = document.getElementById('app');

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function toast(msg, bad) {
  const t = h('div', { class: 'toast' + (bad ? ' bad' : '') }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

function modal(content, wide) {
  const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : '') }, content));
  const close = () => back.remove();
  document.body.append(back);
  return close;
}

function fmtDate(s) {
  try { return new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ''; }
}

function msgOf(e) { return (e && (e.message || e.error_description)) || String(e); }

async function busy(btn, fn) {
  const old = btn.textContent;
  btn.disabled = true;
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}

const phoneClean = (s) => (s || '').replace(/[\s\-()]/g, '');
const phoneOk = (s) => /^\+?[0-9]{7,15}$/.test(phoneClean(s));

function imgUrl(bucket, path) {
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function avatar(profile, cls) {
  const name = (profile && profile.full_name) || '?';
  if (profile && profile.profile_photo_path) {
    return h('img', { class: 'av ' + (cls || ''), alt: name, loading: 'lazy', src: imgUrl('profile-photos', profile.profile_photo_path) });
  }
  return h('span', { class: 'av ' + (cls || '') }, name.trim().charAt(0).toUpperCase());
}

async function compressImage(file, maxDim = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const hh = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = hh;
  c.getContext('2d').drawImage(bmp, 0, 0, w, hh);
  if (bmp.close) bmp.close();
  return canvasToBlob(c, quality);
}

function canvasToBlob(c, quality = 0.85) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Ifoto ntiyashobotse'))), 'image/jpeg', quality));
}

async function runPool(items, limit, worker) {
  let i = 0;
  const results = new Array(items.length);
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; results[idx] = await worker(items[idx], idx); }
  });
  await Promise.all(runners);
  return results;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/* ===================== STATE ===================== */
let session = null;
let myProfile; // undefined = itarapakirwa
const profileCache = new Map();

async function loadMyProfile(force) {
  if (!session) return null;
  if (myProfile !== undefined && !force) return myProfile;
  const { data, error } = await sb.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error) throw error;
  myProfile = data;
  return data;
}

async function getProfiles(ids) {
  const need = [...new Set(ids)].filter((i) => !profileCache.has(i));
  if (need.length) {
    const { data, error } = await sb.from('public_profiles').select('*').in('user_id', need);
    if (error) throw error;
    data.forEach((p) => profileCache.set(p.user_id, p));
    need.forEach((i) => { if (!profileCache.has(i)) profileCache.set(i, null); });
  }
  const m = new Map();
  ids.forEach((i) => m.set(i, profileCache.get(i)));
  return m;
}

function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

function store(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch {} }
function fetchStore(k) { try { return sessionStorage.getItem(k); } catch { return null; } }

/* ===================== LAYOUT ===================== */
function shell(content) {
  const right = myProfile && myProfile.is_complete
    ? h('a', { href: '#/me', title: 'Konti yanje' }, avatar({ full_name: myProfile.full_name, profile_photo_path: myProfile.profile_photo_path }, 'sm'))
    : null;
  return h('div', {}, h('header', { class: 'top' }, h('div', { class: 'brand' }, APP_NAME), right), h('main', {}, content));
}

/* ===================== LOGIN ===================== */
function loginPage() {
  let mode = 'email';
  const msg = h('p', { class: 'err' });
  const body = h('div', {});
  const tabEmail = h('button', { class: 'btn ghost on', onclick: () => setMode('email') }, 'Email');
  const tabPhone = h('button', { class: 'btn ghost', onclick: () => setMode('phone') }, 'Numero ya telefone');

  function setMode(m) {
    mode = m;
    tabEmail.classList.toggle('on', m === 'email');
    tabPhone.classList.toggle('on', m === 'phone');
    msg.textContent = '';
    body.replaceChildren(m === 'email' ? emailForm() : phoneForm());
  }

  function emailForm() {
    const email = h('input', { type: 'email', autocomplete: 'email', placeholder: 'email@example.com' });
    const pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Ijambo ry\'ibanga (nibura inyuguti 6)' });
    const bIn = h('button', { class: 'btn block', onclick: () => busy(bIn, async () => {
      msg.textContent = '';
      const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
      if (error) msg.textContent = 'Kwinjira ntibishobotse: ' + error.message;
    }) }, 'Injira');
    const bUp = h('button', { class: 'btn ghost block', onclick: () => busy(bUp, async () => {
      msg.textContent = '';
      if (pass.value.length < 6) { msg.textContent = 'Ijambo ry\'ibanga rigomba kugira nibura inyuguti 6.'; return; }
      const { data, error } = await sb.auth.signUp({ email: email.value.trim(), password: pass.value, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) { msg.textContent = 'Kwiyandikisha ntibishobotse: ' + error.message; return; }
      if (!data.session) toast('Turakoherereje email yo kwemeza. Yifungure hanyuma wongere winjire.');
    }) }, 'Iyandikishe (konti nshasha)');
    const forgot = h('button', { class: 'clink', onclick: async () => {
      if (!email.value.trim()) { msg.textContent = 'Banza wandike email yawe hejuru.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + location.pathname });
      if (error) msg.textContent = error.message; else toast('Tubohereje email yo guhindura ijambo ry\'ibanga.');
    } }, 'Wibagiye ijambo ry\'ibanga?');
    return h('div', { class: 'stack' }, h('div', {}, h('label', {}, 'Email'), email), h('div', {}, h('label', {}, 'Ijambo ry\'ibanga'), pass), bIn, bUp, forgot);
  }

  function phoneForm() {
    const phone = h('input', { type: 'tel', autocomplete: 'tel', placeholder: '+27712345678' });
    const code = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'Kode wakiriye muri SMS', class: 'hidden' });
    const send = h('button', { class: 'btn block', onclick: () => busy(send, async () => {
      msg.textContent = '';
      const p = phoneClean(phone.value);
      if (!/^\+[0-9]{7,15}$/.test(p)) { msg.textContent = 'Andika numero itangura na + n\'inomero y\'igihugu (urugero +257...).'; return; }
      if (code.classList.contains('hidden')) {
        const { error } = await sb.auth.signInWithOtp({ phone: p });
        if (error) { msg.textContent = 'Kode ntiyoherejwe: ' + error.message; return; }
        code.classList.remove('hidden'); send.textContent = 'Emeza kode';
        toast('Kode yoherejwe.');
      } else {
        const { error } = await sb.auth.verifyOtp({ phone: p, token: code.value.trim(), type: 'sms' });
        if (error) msg.textContent = 'Kode ntiyemewe: ' + error.message;
      }
    }) }, 'Ohereza kode');
    return h('div', { class: 'stack' },
      h('p', { class: 'hint' }, 'Kwinjira na SMS bisaba ko SMS provider iba yashizweho muri Supabase.'),
      h('div', {}, h('label', {}, 'Numero ya telefone'), phone), code, send);
  }

  const google = h('button', { class: 'btn block', onclick: async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) msg.textContent = 'Google ntirashirwaho neza: ' + error.message;
  } }, 'Komeza na Google');

  setMode('email');
  return h('div', { class: 'stack' },
    h('h1', {}, 'Injira muri ' + APP_NAME),
    h('div', { class: 'panel stack' }, google, h('div', { class: 'hint center' }, 'canke'), h('div', { class: 'tabs' }, tabEmail, tabPhone), body, msg));
}

function resetPage() {
  const pass = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Ijambo ry\'ibanga rishasha' });
  const msg = h('p', { class: 'err' });
  const b = h('button', { class: 'btn', onclick: () => busy(b, async () => {
    if (pass.value.length < 6) { msg.textContent = 'Nibura inyuguti 6.'; return; }
    const { error } = await sb.auth.updateUser({ password: pass.value });
    if (error) { msg.textContent = error.message; return; }
    toast('Ijambo ry\'ibanga ryahinduwe.'); go('#/');
  }) }, 'Bika');
  return h('div', { class: 'stack' }, h('h1', {}, 'Ijambo ry\'ibanga rishasha'), pass, b, msg);
}

/* ===================== FACE CHECK (camera) ===================== */
let detectorPromise = null;
function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
      const vision = await import(base + '/vision_bundle.mjs');
      const files = await vision.FilesetResolver.forVisionTasks(base + '/wasm');
      return vision.FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.6,
      });
    })().catch((e) => { detectorPromise = null; throw e; });
  }
  return detectorPromise;
}

function analyzeCanvas(c) {
  const w = 160;
  const hh = Math.max(8, Math.round((160 * c.height) / c.width));
  const s = document.createElement('canvas');
  s.width = w; s.height = hh;
  const ctx = s.getContext('2d');
  ctx.drawImage(c, 0, 0, w, hh);
  const d = ctx.getImageData(0, 0, w, hh).data;
  const g = new Float32Array(w * hh);
  let sum = 0;
  for (let i = 0; i < w * hh; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
  let m = 0, m2 = 0, n = 0;
  for (let y = 1; y < hh - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = -4 * g[i] + g[i - 1] + g[i + 1] + g[i - w] + g[i + w];
    m += l; m2 += l * l; n++;
  }
  return { mean: sum / (w * hh), variance: m2 / n - (m / n) * (m / n) };
}

// Isubiza {ok, msg}. Ntikugenzura ko umuntu ari nyene konti; kigenzura gusa ko mu maso haboneka neza.
async function checkFace(canvas) {
  const { mean, variance } = analyzeCanvas(canvas);
  if (mean < 45) return { ok: false, msg: 'Hari umwijima mwinshi. Shaka ahari urumuri ongere ufate ifoto.' };
  if (mean > 225) return { ok: false, msg: 'Hari urumuri rwinshi cane. Ongera ufate ifoto.' };
  if (variance < 15) return { ok: false, msg: 'Ifoto ntisobanutse. Fata telefone neza ongere ufate ifoto.' };
  let det;
  try { det = await getDetector(); } catch (e) {
    return { ok: false, msg: 'Ubuhinga bwo kugenzura mu maso ntibwashobotse gufungurwa (reba internet) maze wongere ugerageze.' };
  }
  const faces = det.detect(canvas).detections || [];
  if (faces.length === 0) return { ok: false, msg: 'Mu maso ntiboneka. Shira mu maso hawe imbere ya camera ongere ufate ifoto.' };
  if (faces.length > 1) return { ok: false, msg: 'Ifoto ifise abantu barenga umwe. Ubwawe gusa.' };
  const f = faces[0];
  const score = (f.categories && f.categories[0] && f.categories[0].score) || 0;
  const b = f.boundingBox;
  if (score < 0.7) return { ok: false, msg: 'Mu maso ntiboneka neza. Ongera ufate ifoto.' };
  if (b.width / canvas.width < 0.25) return { ok: false, msg: 'Egera camera gato kugira mu maso hagaragare neza.' };
  const pad = 6;
  if (b.originX < -pad || b.originY < -pad || b.originX + b.width > canvas.width + pad || b.originY + b.height > canvas.height + pad) {
    return { ok: false, msg: 'Mu maso hagomba kugaragara hose mu kadirishya.' };
  }
  return { ok: true };
}

/* ===================== PROFILE SETUP ===================== */
function setupPage() {
  const user = session.user;
  let stream = null;
  let photoBlob = null;

  const name = h('input', { type: 'text', autocomplete: 'name', maxlength: 100, value: (user.user_metadata && user.user_metadata.full_name) || '' });
  const phone = h('input', { type: 'tel', autocomplete: 'tel', placeholder: '+257... canke +27...', value: user.phone ? '+' + user.phone.replace(/^\+/, '') : '' });
  const email = h('input', { type: 'email', autocomplete: 'email', value: user.email || '' });
  const loc = h('input', { type: 'text', maxlength: 150, placeholder: 'Umujyi / agace (urugero Cape Town)' });
  const showPhone = h('input', { type: 'checkbox' });
  const msg = h('p', { class: 'err' });
  const camMsg = h('p', { class: 'hint' }, 'Ifoto y\'umwirondoro ifatirwa kuri camera ako kanya. Ntushobora kuyihitamwo muri Gallery.');
  const video = h('video', { class: 'cam hidden', playsinline: '', autoplay: '' });
  video.muted = true;
  const preview = h('img', { class: 'cam hidden', alt: 'Ifoto yawe' });
  const bOpen = h('button', { type: 'button', class: 'btn block', onclick: openCam }, 'Fungura camera');
  const bShot = h('button', { type: 'button', class: 'btn block hidden', onclick: () => busy(bShot, shoot) }, 'Fata ifoto');
  const bSave = h('button', { type: 'button', class: 'btn block', disabled: true, onclick: () => busy(bSave, save) }, 'Bika konti');

  function stopCam() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }

  async function openCam() {
    photoBlob = null; bSave.disabled = true;
    preview.classList.add('hidden');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
    } catch {
      camMsg.textContent = 'Camera ntiyemerewe canke ntiboneka. Emera camera mu settings ya browser, hanyuma wongere ugerageze.';
      return;
    }
    video.srcObject = stream;
    try { await video.play(); } catch {}
    video.classList.remove('hidden'); bShot.classList.remove('hidden');
    bOpen.textContent = 'Subira ufungure camera';
    camMsg.textContent = 'Shira mu maso hawe hagati mu kadirishya, ahari urumuri, hanyuma ukande "Fata ifoto".';
  }

  async function shoot() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    const scale = Math.min(1, 720 / Math.max(vw, vh));
    const c = document.createElement('canvas');
    c.width = Math.round(vw * scale); c.height = Math.round(vh * scale);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    camMsg.textContent = 'Turagenzura ifoto...';
    const r = await checkFace(c);
    if (!r.ok) { camMsg.textContent = r.msg; return; }
    photoBlob = await canvasToBlob(c, 0.85);
    preview.src = URL.createObjectURL(photoBlob);
    preview.classList.remove('hidden'); video.classList.add('hidden'); bShot.classList.add('hidden');
    stopCam();
    camMsg.textContent = 'Ifoto yemewe: mu maso haragaragara neza. (Ibi ntibihamya ko uri nyene konti; bigenzura gusa ifoto.)';
    bSave.disabled = false;
  }

  async function save() {
    msg.textContent = '';
    const full = name.value.trim(), ph = phoneClean(phone.value), lc = loc.value.trim(), em = email.value.trim();
    if (full.length < 2) { msg.textContent = 'Andika amazina yawe yose.'; return; }
    if (!phoneOk(ph)) { msg.textContent = 'Numero ya telefone ntiyemewe (inomero 7 kugeza 15, ushobora gutangura na +).'; return; }
    if (lc.length < 2) { msg.textContent = 'Andika aho uri (location).'; return; }
    if (!photoBlob) { msg.textContent = 'Banza ufate ifoto ukoresheje camera.'; return; }
    const path = `${user.id}/${Date.now()}.jpg`;
    const up = await sb.storage.from('profile-photos').upload(path, photoBlob, { contentType: 'image/jpeg' });
    if (up.error) { msg.textContent = 'Ifoto ntiyoherejwe: ' + up.error.message; return; }
    const { error } = await sb.from('profiles').upsert({
      user_id: user.id, full_name: full, phone_number: ph, email: em || null, location: lc,
      profile_photo_path: path, show_phone: showPhone.checked,
    }, { onConflict: 'user_id' });
    if (error) {
      await sb.storage.from('profile-photos').remove([path]);
      msg.textContent = 'Konti ntiyabitswe: ' + error.message;
      return;
    }
    const old = myProfile && myProfile.profile_photo_path;
    if (old && old !== path) sb.storage.from('profile-photos').remove([old]);
    profileCache.delete(user.id);
    await loadMyProfile(true);
    stopCam();
    go(fetchStore('redirect') || '#/');
    store('redirect', null);
  }

  return h('div', { class: 'stack' },
    h('h1', {}, 'Uzuza konti yawe'),
    h('div', {}, h('label', {}, 'Amazina yose *'), name),
    h('div', {}, h('label', {}, 'Numero ya telefone *'), phone),
    h('div', {}, h('label', {}, 'Email (si ngombwa)'), email),
    h('div', {}, h('label', {}, 'Aho uri (location) *'), loc),
    h('label', { class: 'row' }, showPhone, h('span', {}, 'Nemeye ko abandi babona numero yanje kugira bampamagare')),
    h('div', { class: 'panel' }, h('label', {}, 'Ifoto y\'umwirondoro (camera) *'), video, preview, camMsg, bOpen, h('div', { class: 'sp' }), bShot),
    bSave, msg);
}

/* ===================== ME ===================== */
function mePage() {
  const p = myProfile;
  const show = h('input', { type: 'checkbox', checked: p.show_phone, onchange: async () => {
    const { error } = await sb.from('profiles').update({ show_phone: show.checked }).eq('user_id', session.user.id);
    if (error) { toast('Ntibyabitswe: ' + error.message, true); show.checked = !show.checked; return; }
    p.show_phone = show.checked; profileCache.delete(session.user.id); toast('Vyabitswe.');
  } });
  const out = h('button', { class: 'btn danger', onclick: async () => { await sb.auth.signOut(); } }, 'Sohoka');
  return h('div', { class: 'stack' },
    h('h1', {}, 'Konti yanje'),
    h('div', { class: 'panel stack center' }, h('div', {}, avatar(p, 'lg')), h('b', {}, p.full_name), h('div', { class: 'meta' }, p.location), h('div', { class: 'meta' }, p.phone_number)),
    h('label', { class: 'row' }, show, h('span', {}, 'Abandi bashobora kubona numero yanje')),
    h('a', { class: 'btn ghost', href: '#/seller/' + p.user_id }, 'Reba amatangazo yanje'),
    out);
}

/* ===================== HOME ===================== */
function homePage() {
  return h('div', {},
    h('h1', {}, 'Murakaza neza'),
    h('a', { class: 'big', href: '#/business' }, h('b', {}, 'Ubudandaji'), h('span', {}, 'Gurisha canke ugure ibicuruzwa')),
    h('a', { class: 'big', href: '#/jobs' }, h('b', {}, 'Akazi n\'abakozi'), h('span', {}, 'Rondera akazi canke abakozi')));
}

/* ===================== FEED DATA ===================== */
async function fetchPosts(kind, { from = 0, ownerId = null, id = null, full = false } = {}) {
  const K = KINDS[kind];
  let q = sb.from(K.table).select('*');
  if (id) q = q.eq('id', id);
  else {
    if (ownerId) q = q.eq(K.owner, ownerId);
    q = q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, from + PAGE - 1);
  }
  const { data: posts, error } = await q;
  if (error) throw error;
  if (!posts.length) return { posts: [], ctx: new Map() };
  const ids = posts.map((p) => p.id);
  const ownerIds = [...new Set(posts.map((p) => p[K.owner]))];
  const imgLimit = full ? IMG_PAGE : K.preview;
  const [owners, im, lk] = await Promise.all([
    getProfiles(ownerIds),
    sb.from(K.imgs).select('*').in(K.fk, ids).lt('display_order', imgLimit).order('display_order'),
    sb.from(K.likes).select(`${K.fk}, user_id`).in(K.fk, ids),
  ]);
  if (im.error) throw im.error;
  if (lk.error) throw lk.error;
  const ctx = new Map();
  posts.forEach((p) => ctx.set(p.id, { owner: owners.get(p[K.owner]), images: [], likeCount: 0, liked: false }));
  im.data.forEach((r) => ctx.get(r[K.fk]).images.push(r));
  lk.data.forEach((r) => { const c = ctx.get(r[K.fk]); c.likeCount++; if (r.user_id === session.user.id) c.liked = true; });
  return { posts, ctx };
}

/* ===================== POST CARD ===================== */
function sharePost(kind, id, text) {
  const url = `${location.origin}${location.pathname}#/${KINDS[kind].route}/${id}`;
  if (navigator.share) { navigator.share({ title: APP_NAME, text: (text || '').slice(0, 100), url }).catch(() => {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link yakopowe.'), () => toast(url));
  else toast(url);
}

function reportDialog(entityType, entityId) {
  const reasons = ['Ubuhemu / scam', 'Itangazo ry\'ibinyoma', 'Spam canke ibitajanye', 'Ivyononera canke ibitubaha', 'Ibindi'];
  const reason = h('select', {}, reasons.map((r) => h('option', { value: r }, r)));
  const desc = h('textarea', { rows: 3, maxlength: 2000, placeholder: 'Sobanura (si ngombwa)' });
  const send = h('button', { class: 'btn', onclick: () => busy(send, async () => {
    const { error } = await sb.from('reports').insert({
      reporter_id: session.user.id, entity_type: entityType, entity_id: entityId,
      reason: reason.value, description: desc.value.trim() || null,
    });
    if (error) { toast(error.code === '23505' ? 'Wamaze gutanga raporo kuri ivyo.' : 'Raporo ntiyoherejwe: ' + error.message, true); return; }
    toast('Murakoze. Raporo yakiriwe.'); close();
  }) }, 'Tanga raporo');
  const close = modal(h('div', { class: 'stack' },
    h('h3', {}, 'Tanga raporo'), reason, desc,
    h('p', { class: 'hint' }, 'Raporo ntivuga ko uwo muntu ari umubeshi. Irasuzumwa mbere yo gufata ingingo.'),
    h('div', { class: 'row' }, send, h('button', { class: 'btn ghost', onclick: () => close() }, 'Reka'))));
}

function imageSection(kind, post, first, full) {
  const K = KINDS[kind];
  const grid = h('div', {});
  const wrap = h('div', {}, grid);
  let loaded = first.length;
  const add = (rows) => {
    const imgs = rows.map((r) => {
      const url = imgUrl(K.bucket, r.storage_path);
      return h('img', { src: url, loading: 'lazy', alt: '', onclick: () => modal(h('img', { src: url, alt: '' }), true) });
    });
    if (!full) { grid.className = 'grid n' + Math.min(imgs.length, 4); grid.replaceChildren(...imgs); }
    else { if (!grid.className) grid.className = 'grid n2'; grid.append(...imgs); }
  };
  if (first.length) add(first);
  if (!full && kind === 'product' && first.length >= K.preview) {
    wrap.append(h('a', { class: 'btn ghost small', href: '#/p/' + post.id }, 'Reba amafoto yose'));
  }
  if (full && first.length >= IMG_PAGE) {
    const more = h('button', { class: 'btn ghost block', onclick: () => busy(more, async () => {
      const { data, error } = await sb.from(K.imgs).select('*').eq(K.fk, post.id)
        .gte('display_order', loaded).lt('display_order', loaded + IMG_PAGE).order('display_order');
      if (error) { toast('Amafoto ntiyashobotse', true); return; }
      add(data); loaded += IMG_PAGE;
      if (data.length < IMG_PAGE) more.remove();
    }) }, 'Garagaza andi mafoto');
    wrap.append(more);
  }
  return wrap;
}

function commentRow(kind, c, author, onDeleted) {
  const K = KINDS[kind];
  const mine = c.author_id === session.user.id;
  const bodyEl = h('span', {}, c.body);
  const links = h('div', {});
  if (mine) {
    links.append(
      h('button', { class: 'clink', onclick: async () => {
        const nb = prompt('Hindura comment yawe', c.body);
        if (nb == null || !nb.trim() || nb.trim() === c.body) return;
        const { error } = await sb.from(K.comments).update({ body: nb.trim() }).eq('id', c.id);
        if (error) { toast('Ntibyahindutse: ' + error.message, true); return; }
        c.body = nb.trim(); bodyEl.textContent = c.body;
      } }, 'Hindura'),
      h('button', { class: 'clink', onclick: async () => {
        if (!confirm('Wohava usiba iyi comment?')) return;
        const { error } = await sb.from(K.comments).delete().eq('id', c.id);
        if (error) { toast('Ntibyasibwe: ' + error.message, true); return; }
        row.remove(); if (onDeleted) onDeleted();
      } }, 'Siba'));
  } else {
    links.append(h('button', { class: 'clink', onclick: () => reportDialog(K.commentReport, c.id) }, 'Raporo'));
  }
  const row = h('div', { class: 'crow' }, avatar(author, 'sm'),
    h('div', { class: 'cbody' }, h('b', {}, (author && author.full_name) || 'Umukoresha'), bodyEl, h('div', { class: 'meta' }, fmtDate(c.created_at)), links));
  return row;
}

function commentsSection(kind, postId) {
  const K = KINDS[kind];
  const list = h('div', {});
  let from = 0;
  const more = h('button', { class: 'btn ghost small hidden', onclick: () => load() }, 'Garagaza izindi');
  const input = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Andika comment...' });
  const send = h('button', { class: 'btn small', onclick: () => busy(send, async () => {
    const body = input.value.trim();
    if (!body) return;
    const { data, error } = await sb.from(K.comments).insert({ [K.fk]: postId, author_id: session.user.id, body }).select().single();
    if (error) { toast('Comment ntiyoherejwe: ' + error.message, true); return; }
    input.value = '';
    list.prepend(commentRow(kind, data, myProfile));
  }) }, 'Ohereza');

  async function load() {
    const { data, error } = await sb.from(K.comments).select('*').eq(K.fk, postId)
      .order('created_at', { ascending: false }).range(from, from + 19);
    if (error) { toast('Comments ntizashobotse', true); return; }
    from += data.length;
    more.classList.toggle('hidden', data.length < 20);
    const authors = await getProfiles(data.map((c) => c.author_id));
    data.forEach((c) => list.append(commentRow(kind, c, authors.get(c.author_id))));
    if (!data.length && from === 0) list.append(h('p', { class: 'hint' }, 'Nta comment ziraba zihari.'));
  }
  load();
  return h('div', { class: 'comments' }, h('div', { class: 'stack' }, input, h('div', {}, send)), list, more);
}

async function deletePost(kind, post) {
  const K = KINDS[kind];
  if (!confirm('Wohava usiba iri tangazo burundu?')) return false;
  const { data } = await sb.from(K.imgs).select('storage_path').eq(K.fk, post.id).limit(1000);
  const paths = (data || []).map((r) => r.storage_path);
  const { error } = await sb.from(K.table).delete().eq('id', post.id);
  if (error) { toast('Ntibyasibwe: ' + error.message, true); return false; }
  for (let i = 0; i < paths.length; i += 100) await sb.storage.from(K.bucket).remove(paths.slice(i, i + 100));
  toast('Itangazo ryasibwe.');
  return true;
}

function postCard(kind, post, c, full) {
  const K = KINDS[kind];
  const ownerId = post[K.owner];
  const mine = ownerId === session.user.id;
  const card = h('article', { class: 'card' });

  card.append(h('div', { class: 'ph', onclick: () => go('#/seller/' + ownerId) },
    avatar(c.owner, ''), h('div', {}, h('b', {}, (c.owner && c.owner.full_name) || 'Umukoresha'),
      h('div', { class: 'meta' }, [post.location || (c.owner && c.owner.location), fmtDate(post.created_at)].filter(Boolean).join(' · ')))));

  if (kind === 'job') {
    const statusEl = h('span', { class: 'badge ' + post.status }, post.status === 'taken' ? 'TAKEN ✅' : 'Rirakenewe');
    card.append(statusEl);
  }
  card.append(h('div', { class: 'cap' }, post.caption));
  if (kind === 'product' && post.price != null) card.append(h('div', { class: 'price' }, `${Number(post.price).toLocaleString('en-US')} ${post.currency || ''}`.trim()));
  if (kind === 'product' && post.details) card.append(h('div', { class: 'meta cap' }, post.details));

  card.append(imageSection(kind, post, c.images, full));

  const likeBtn = h('button', { class: 'btn ghost small' + (c.liked ? ' liked' : ''), onclick: () => busy(likeBtn, toggleLike) });
  const paintLike = () => { likeBtn.textContent = `Like (${c.likeCount})`; likeBtn.classList.toggle('liked', c.liked); };
  async function toggleLike() {
    if (c.liked) {
      const { error } = await sb.from(K.likes).delete().eq(K.fk, post.id).eq('user_id', session.user.id);
      if (error) { toast('Ntibyashobotse', true); return; }
      c.liked = false; c.likeCount--;
    } else {
      const { error } = await sb.from(K.likes).insert({ [K.fk]: post.id, user_id: session.user.id });
      if (error && error.code !== '23505') { toast('Ntibyashobotse', true); return; }
      if (!error) c.likeCount++;
      c.liked = true;
    }
    paintLike();
    likeBtn.textContent = `Like (${c.likeCount})`;
  }
  paintLike();

  let commentsEl = null;
  const commentBtn = h('button', { class: 'btn ghost small', onclick: () => {
    if (commentsEl) { commentsEl.remove(); commentsEl = null; return; }
    commentsEl = commentsSection(kind, post.id);
    card.append(commentsEl);
  } }, 'Comment');
  const shareBtn = h('button', { class: 'btn ghost small', onclick: () => sharePost(kind, post.id, post.caption) }, 'Share');
  const acts = h('div', { class: 'acts' }, likeBtn, commentBtn, shareBtn);
  if (!mine) acts.append(h('button', { class: 'btn ghost small', onclick: () => reportDialog(K.report, post.id) }, 'Raporo'));
  card.append(acts);

  if (mine) {
    const own = h('div', { class: 'acts' });
    if (kind === 'job' && post.status === 'open') {
      const t = h('button', { class: 'btn small', onclick: () => busy(t, async () => {
        if (!confirm('Kamaze gufatwa? Itangazo rizokwerekana TAKEN ✅.')) return;
        const { error } = await sb.from('jobs').update({ status: 'taken' }).eq('id', post.id);
        if (error) { toast('Ntibyahindutse: ' + error.message, true); return; }
        post.status = 'taken'; go(location.hash);
      }) }, 'Fata nka TAKEN ✅');
      own.append(t);
    }
    own.append(h('button', { class: 'btn danger small', onclick: async () => { if (await deletePost(kind, post)) { card.remove(); if (full) history.back(); } } }, 'Siba'));
    card.append(own);
  }
  return card;
}

/* ===================== FEED PAGES ===================== */
function feedList(kind, { ownerId = null } = {}) {
  const list = h('div', { class: 'feed' });
  const info = h('p', { class: 'hint center' });
  let from = 0;
  const more = h('button', { class: 'btn ghost block hidden', onclick: () => busy(more, loadNext) }, 'Garagaza izindi');
  async function loadNext() {
    try {
      const { posts, ctx } = await fetchPosts(kind, { from, ownerId });
      posts.forEach((p) => list.append(postCard(kind, p, ctx.get(p.id), false)));
      from += posts.length;
      more.classList.toggle('hidden', posts.length < PAGE);
      if (!from) info.textContent = 'Nta tangazo ririraba rihari.';
      else info.textContent = '';
    } catch (e) { info.textContent = 'Ntibyashobotse gupakira: ' + msgOf(e); }
  }
  info.textContent = 'Biriho birapakirwa...';
  loadNext();
  return h('div', {}, list, info, more);
}

function businessPage() {
  return h('div', {}, h('h1', {}, 'Ubudandaji'),
    h('a', { class: 'btn block', href: '#/new-product' }, '+ Shiraho igicuruzwa'), h('div', { class: 'sp' }), feedList('product'));
}
function jobsPage() {
  return h('div', {}, h('h1', {}, 'Akazi n\'abakozi'),
    h('a', { class: 'btn block', href: '#/new-job' }, '+ Shiraho itangazo ry\'akazi'), h('div', { class: 'sp' }), feedList('job'));
}

function detailPage(kind, id) {
  const box = h('div', {}, h('p', { class: 'hint' }, 'Biriho birapakirwa...'));
  fetchPosts(kind, { id, full: true }).then(({ posts, ctx }) => {
    if (!posts.length) { box.replaceChildren(h('p', {}, 'Itangazo ntiriraboneka canke ryasibwe.')); return; }
    box.replaceChildren(postCard(kind, posts[0], ctx.get(posts[0].id), true));
  }).catch((e) => box.replaceChildren(h('p', { class: 'err' }, msgOf(e))));
  return box;
}

function sellerPage(id) {
  const box = h('div', { class: 'stack' }, h('p', { class: 'hint' }, 'Biriho birapakirwa...'));
  getProfiles([id]).then((m) => {
    const p = m.get(id);
    if (!p) { box.replaceChildren(h('p', {}, 'Iyi konti ntiraboneka canke ntirarangira kwuzuzwa.')); return; }
    const feed = h('div', {});
    let cur = null;
    const bP = h('button', { class: 'btn ghost on', onclick: () => show('product') }, 'Ibicuruzwa');
    const bJ = h('button', { class: 'btn ghost', onclick: () => show('job') }, 'Akazi');
    function show(k) { cur = k; bP.classList.toggle('on', k === 'product'); bJ.classList.toggle('on', k === 'job'); feed.replaceChildren(feedList(k, { ownerId: id })); }
    const mine = id === session.user.id;
    const call = p.phone_number
      ? h('a', { class: 'btn', href: 'tel:' + p.phone_number }, 'Call')
      : h('button', { class: 'btn', disabled: true, title: 'Uyu muntu ntiyemeye ko numero ye iboneka' }, 'Call');
    const msgBtn = h('button', { class: 'btn ghost', onclick: () => toast('Message ntirakora: izoza vuba.') }, 'Message (izoza vuba)');
    box.replaceChildren(
      h('div', { class: 'panel stack center' }, h('div', {}, avatar(p, 'lg')), h('h1', {}, p.full_name), h('div', { class: 'meta' }, p.location),
        mine ? null : h('div', { class: 'row', style: 'justify-content:center' }, msgBtn, call),
        !mine && !p.phone_number ? h('p', { class: 'hint' }, 'Uyu muntu ntiyemeye ko numero ye iboneka.') : null,
        mine ? null : h('button', { class: 'clink', onclick: () => reportDialog('profile', id) }, 'Tanga raporo kuri iyi konti')),
      h('div', { class: 'tabs' }, bP, bJ), feed);
    show('product');
  }).catch((e) => box.replaceChildren(h('p', { class: 'err' }, msgOf(e))));
  return box;
}

/* ===================== NEW POST PAGES ===================== */
function imagePicker(max) {
  let files = [];
  const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/*', multiple: true });
  const info = h('p', { class: 'hint' }, `Amafoto agera kuri ${max}.`);
  const thumbs = h('div', { class: 'thumbs' });
  input.addEventListener('change', () => {
    const picked = [...input.files].filter((f) => f.type.startsWith('image/') && f.size <= 25 * 1024 * 1024);
    const skipped = input.files.length - picked.length;
    files = picked.slice(0, max);
    info.textContent = `${files.length} ifoto zatoranijwe` + (picked.length > max ? ` (hemewe ${max} gusa)` : '') + (skipped ? `, ${skipped} ntizemewe (zirenze 25MB canke si ifoto)` : '');
    thumbs.replaceChildren(...files.slice(0, 12).map((f) => h('img', { src: URL.createObjectURL(f), alt: '' })));
  });
  return { el: h('div', {}, input, info, thumbs), get files() { return files; } };
}

async function uploadImages(bucket, folder, files, onProgress) {
  let done = 0;
  const results = await runPool(files, 3, async (f) => {
    try {
      const blob = await compressImage(f);
      const path = `${session.user.id}/${folder}/${uid()}.jpg`;
      const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      return { ok: true, path };
    } catch (e) { return { ok: false }; } finally { done++; onProgress(done, files.length); }
  });
  return results.filter((r) => r.ok).map((r) => r.path);
}

function newProductPage() {
  const caption = h('textarea', { rows: 3, maxlength: 2000, placeholder: 'Sobanura ivyo uragurisha...' });
  const price = h('input', { type: 'number', min: 0, step: '0.01', inputmode: 'decimal', placeholder: 'Igiciro (si ngombwa)' });
  const cur = h('select', {}, CURRENCIES.map((c) => h('option', { value: c }, c)));
  const details = h('textarea', { rows: 2, maxlength: 4000, placeholder: 'Ibindi bisobanuro (si ngombwa)' });
  const loc = h('input', { type: 'text', maxlength: 150, value: myProfile.location });
  const pick = imagePicker(MAX_PRODUCT_IMAGES);
  const bar = h('i', {});
  const barWrap = h('div', { class: 'bar hidden' }, bar);
  const msg = h('p', { class: 'err' });
  const send = h('button', { class: 'btn block', onclick: () => busy(send, async () => {
    msg.textContent = '';
    if (!caption.value.trim()) { msg.textContent = 'Andika caption.'; return; }
    if (!pick.files.length) { msg.textContent = 'Hitamwo nibura ifoto imwe.'; return; }
    const row = { seller_id: session.user.id, caption: caption.value.trim(), details: details.value.trim() || null, location: loc.value.trim() || null };
    if (price.value !== '') { row.price = Number(price.value); row.currency = cur.value; }
    const { data: post, error } = await sb.from('products').insert(row).select().single();
    if (error) { msg.textContent = 'Itangazo ntiryashizweho: ' + error.message; return; }
    barWrap.classList.remove('hidden');
    const paths = await uploadImages('product-images', post.id, pick.files, (d, n) => { bar.style.width = (100 * d / n) + '%'; send.textContent = `Amafoto ${d}/${n}...`; });
    if (!paths.length) {
      await sb.from('products').delete().eq('id', post.id);
      msg.textContent = 'Nta foto yoherejwe. Gerageza kandi (reba internet).';
      return;
    }
    for (let i = 0; i < paths.length; i += 50) {
      const batch = paths.slice(i, i + 50).map((p, j) => ({ product_id: post.id, storage_path: p, display_order: i + j }));
      const { error: e2 } = await sb.from('product_images').insert(batch);
      if (e2) { msg.textContent = 'Amwe mu mafoto ntiyabitswe: ' + e2.message; return; }
    }
    const failed = pick.files.length - paths.length;
    toast(failed ? `Itangazo ryashizweho. Amafoto ${failed} ntiyoherejwe.` : 'Itangazo ryashizweho.');
    go('#/p/' + post.id);
  }) }, 'Shiraho itangazo');
  return h('div', { class: 'stack' }, h('h1', {}, 'Igicuruzwa gishasha'),
    h('div', {}, h('label', {}, 'Caption *'), caption),
    h('div', { class: 'row' }, h('div', { style: 'flex:2;min-width:140px' }, h('label', {}, 'Igiciro'), price), h('div', { style: 'flex:1;min-width:90px' }, h('label', {}, 'Ifaranga'), cur)),
    h('div', {}, h('label', {}, 'Ibisobanuro'), details),
    h('div', {}, h('label', {}, 'Aho kiri'), loc),
    h('div', {}, h('label', {}, 'Amafoto *'), pick.el), barWrap, send, msg);
}

function newJobPage() {
  const caption = h('textarea', { rows: 4, maxlength: 2000, placeholder: 'Sobanura akazi...' });
  const loc = h('input', { type: 'text', maxlength: 150, value: myProfile.location });
  const pick = imagePicker(MAX_JOB_IMAGES);
  const msg = h('p', { class: 'err' });
  const send = h('button', { class: 'btn block', onclick: () => busy(send, async () => {
    msg.textContent = '';
    if (!caption.value.trim()) { msg.textContent = 'Andika ivyerekeye akazi.'; return; }
    const { data: job, error } = await sb.from('jobs').insert({ owner_id: session.user.id, caption: caption.value.trim(), location: loc.value.trim() || null }).select().single();
    if (error) { msg.textContent = 'Itangazo ntiryashizweho: ' + error.message; return; }
    if (pick.files.length) {
      const paths = await uploadImages('job-images', job.id, pick.files, () => {});
      if (paths.length) {
        const { error: e2 } = await sb.from('job_images').insert(paths.map((p, i) => ({ job_id: job.id, storage_path: p, display_order: i })));
        if (e2) toast('Amafoto ntiyabitswe: ' + e2.message, true);
      } else toast('Amafoto ntiyoherejwe, ariko itangazo ryashizweho.', true);
    }
    toast('Itangazo ryashizweho.');
    go('#/j/' + job.id);
  }) }, 'Shiraho itangazo');
  return h('div', { class: 'stack' }, h('h1', {}, 'Itangazo ry\'akazi'),
    h('div', {}, h('label', {}, 'Ivyerekeye akazi *'), caption),
    h('div', {}, h('label', {}, 'Aho akazi kari (si ngombwa)'), loc),
    h('div', {}, h('label', {}, 'Ifoto imwe canke zibiri (si ngombwa)'), pick.el), send, msg);
}

/* ===================== ROUTER ===================== */
let routeToken = 0;

async function route() {
  const my = ++routeToken;
  const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/');
  const name = parts[0] || 'home';
  const arg = parts[1];
  try {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (my !== routeToken) return;

    if (!session) {
      if (name !== 'login') { store('redirect', location.hash && location.hash !== '#/login' ? location.hash : null); }
      if (name !== 'login') { location.hash = '#/login'; return; }
      root.replaceChildren(shell(loginPage()));
      return;
    }

    const profile = await loadMyProfile();
    if (my !== routeToken) return;
    const complete = !!(profile && profile.is_complete);

    if (name === 'reset') { root.replaceChildren(shell(resetPage())); return; }
    if (!complete && name !== 'setup') { location.hash = '#/setup'; return; }
    if (complete && (name === 'login' || name === 'setup')) { location.hash = fetchStore('redirect') || '#/'; store('redirect', null); return; }

    let page;
    switch (name) {
      case 'setup': page = setupPage(); break;
      case 'home': page = homePage(); break;
      case 'business': page = businessPage(); break;
      case 'jobs': page = jobsPage(); break;
      case 'new-product': page = newProductPage(); break;
      case 'new-job': page = newJobPage(); break;
      case 'p': page = detailPage('product', arg); break;
      case 'j': page = detailPage('job', arg); break;
      case 'seller': page = sellerPage(arg); break;
      case 'me': page = mePage(); break;
      default: page = homePage();
    }
    root.replaceChildren(shell(page));
    window.scrollTo(0, 0);
  } catch (e) {
    root.replaceChildren(shell(h('div', { class: 'stack' }, h('h1', {}, 'Ikosa'), h('p', { class: 'err' }, msgOf(e)),
      h('button', { class: 'btn', onclick: () => route() }, 'Ongera ugerageze'))));
  }
}

let lastUser = null;
sb.auth.onAuthStateChange((event, sess) => {
  const id = sess && sess.user ? sess.user.id : null;
  if (event === 'PASSWORD_RECOVERY') { setTimeout(() => { location.hash = '#/reset'; route(); }, 0); return; }
  if (id !== lastUser) {
    lastUser = id; myProfile = undefined; profileCache.clear();
    setTimeout(route, 0);
  }
});
window.addEventListener('hashchange', route);
route();
