/* =========================================================
   مواقيت الصلاة — حساب فلكي كامل بدون إنترنت
   مسجد مقطع مناور — أبو خزيمة الأنصاري — المحمدية، معسكر، الجزائر
   طريقة وزارة الشؤون الدينية: فجر 18° ، عشاء 17°
   ========================================================= */
'use strict';

/* ---------- الإعدادات الافتراضية ---------- */
const DEFAULTS = {
  mosqueName: 'مسجد مقطع مناور — أبو خزيمة الأنصاري',
  city: 'مقطع مناور أبو خزيمة الأنصاري — المحمدية، معسكر',
  imam: '',
  phone: '',
  address: '',
  lat: 35.4467,      // المحمدية، معسكر
  lng: 0.2286,
  tz: 1,             // الجزائر: GMT+1 طوال السنة
  elevation: 0,
  fajrAngle: 18,
  ishaAngle: 17,
  asrFactor: 1,      // 1 = الجمهور ، 2 = الحنفي
  adhkarMinutes: 15, // مدة أذكار ما بعد الصلاة
  adhanSound: true,  // تشغيل صوت الأذان
  adhanVolume: 80    // مستوى الصوت (0-100)
};

const PRAYERS = [
  { key: 'fajr',    name: 'الفجر',    tag: 'مؤدى' },
  { key: 'sunrise', name: 'الشروق',  tag: '' },
  { key: 'dhuhr',   name: 'الظهر',    tag: 'مؤدى' },
  { key: 'asr',     name: 'العصر',    tag: 'مؤدى' },
  { key: 'maghrib', name: 'المغرب',   tag: 'مؤدى' },
  { key: 'isha',    name: 'العشاء',   tag: 'مؤدى' }
].map(p => (p.key === 'sunrise' ? { ...p, tag: '' } : { ...p, tag: 'الأذان' }));

/* ---------- أذكار ما بعد الصلاة ---------- */
const POST_ADHKAR = [
  'أستغفر الله العظيم وأتوب إليه ( ×3 )',
  'اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام',
  'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
  'اللهم لا مانع لما أعطيت ولا معطي لما منعت',
  'سبحان الله وبحمده، سبحان الله العظيم',
  'اللهم أعني على ذكرك وشكرك وحسن عبادتك',
  'لا حول ولا قوة إلا بالله، الله أكبر ربي وأعلى بأمره',
  'الحمد لله الذي أطعمني هذا الطعام ورزقنيه من غير حول مني ولا قوة'
];

/* ---------- الشريط المتحرك ---------- */
const TICKER = [
  'قال ﷺ: «إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ، فَصَلُّوا عَلَيْهِ وسَلِّمُوا»',
  'أستغفر الله العظيم وأتوب إليه، ربِّ اغفر لي وتُبْ عليَّ إنك أنت التَّوَّابُ الرَّحِيم',
  'سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
  'قال ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان: سُبْحَانَ الله وبحَمْدِه، سُبْحَانَ اللهِ العَظِيم»',
  'اللهم صلِّ وسلم وبارك على سيدنا محمد وعلى آله وصحبه وسلم',
  'قال ﷺ: «أفضل الأعمال الصلاة على وقتها»',
  'قال ﷺ: «من صلى البردين دخل الجنة» — والبردان: صلاة الفجر والعصر',
  'قال ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان: سُبْحَانَ الله وبحَمْدِه، سُبْحَانَ اللهِ العَظِيم»',
  'قال ﷺ: «أحب البيوت إلى الله»: الصفوف في جماعة في المسجد',
  'لا إله إلا أنت سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِين',
  'قال الله تعالى: «أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَى غَسَقِ اللَّيْلِ»'
];
/* ---------- أدوات الأذان ---------- */
const AZAN_WINDOW_SEC = 90;           // نافذة تشغيل الأذان بعد دخول الوقت
const AZAN_FILES = {
  fajr: 'adhan-fajr.mp3',             // أذان الفجر: «الصلاة خير من النوم»
  other: 'adhan.mp3'                  // أذان مكة المكرمة
};

function setAudioVolume() {
  const v = clamp((S.adhanVolume ?? 80) / 100, 0, 1);
  azanAudio.volume = v;
  azanFajrAudio.volume = v;
}

/* تفعيل الصوت: يتطلب تفاعل المستخدم مرة واحدة */
function unlockAudio() {
  audioUnlocked = true;
  try { localStorage.setItem('mqpt_azan_unlocked', '1'); } catch (e) {}
  try { window.AudioContext && new AudioContext().resume(); } catch (e) {}
  Object.values(AUDIO).forEach(a => a.play().then(() => {
    a.pause(); a.currentTime = 0;
  }).catch(() => {}));
  $('soundUnlock').classList.add('hidden');
}

/* تشغيل الأذان عند دخول الوقت */
function fireAdhan(key) {
  if (!S.adhanSound || !audioUnlocked) return;
  azanFiredKey = key;
  const audio = AUDIO[key === 'fajr' ? 'fajr' : 'other'];
  try { Object.values(AUDIO).forEach(a => { a.pause(); }); } catch (e) {}
  audio.currentTime = 0;
  setAudioVolume();
  audio.play().catch(() => {
    // فشل التشغيل (سياسة المتصفح) — إظهار زر التفعيل
    audioUnlocked = false;
    $('soundUnlock').classList.remove('hidden');
    $('soundUnlock').classList.add('urgent');
    hideAdhanOverlay();
  });
  $('azanName').textContent = PRAYERS.find(p => p.key === key).name;
  $('azanOverlay').classList.remove('hidden');
  document.getElementById('app').classList.add('azan-active');
}

function hideAdhanOverlay() {
  $('azanOverlay').classList.add('hidden');
  document.getElementById('app').classList.remove('azan-active');
}


const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = id => document.getElementById(id);

/* عناصر الأذان */
let azanFiredKey = null;              // مفتاح الأذان المشغّل حاليًا (يمنع التكرار)
let audioUnlocked = localStorage.getItem('mqpt_azan_unlocked') === '1';
const azanAudio = $('azanAudio');
const azanFajrAudio = $('azanFajrAudio');
const AUDIO = { fajr: azanFajrAudio, other: azanAudio };

[azanAudio, azanFajrAudio].forEach(a => a.addEventListener('ended', () => {
  hideAdhanOverlay();
  azanFiredKey = null;
}));

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('mqpt_settings') || '{}') };
  } catch (e) {
    return { ...DEFAULTS };
  }
}
let S = loadSettings();
const saveSettings = () => localStorage.setItem('mqpt_settings', JSON.stringify(S));

/* ---------- الحساب الفلكي ---------- */
function julianDate(y, m, d) {
  if (m < 3) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/* موقع الشمس (Meeus مبسط) */
function sunPos(jd) {
  const D = jd - 2451545.0;
  const g = rad(((357.529 + 0.98560028 * D) % 360 + 360) % 360);
  const q = ((280.459 + 0.98564736 * D) % 360 + 360) % 360;
  const L = rad(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  const e = rad(23.439 - 0.00000036 * D);
  const decl = deg(Math.asin(Math.sin(e) * Math.sin(L)));
  let RA = deg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  RA = ((RA % 24) + 24) % 24;
  let eqt = q / 15 - RA;              // ساعات
  if (eqt > 12) eqt -= 24;
  if (eqt < -12) eqt += 24;
  return { decl, eqt };
}

/* الفرق الزمني (بالساعات) بين الظهر الشمسي ووقت بلوغ ارتفاع الشمس alt */
function hourDiff(alt, lat, decl) {
  const num = Math.sin(rad(alt)) - Math.sin(rad(lat)) * Math.sin(rad(decl));
  const dn = clamp(num / (Math.cos(rad(lat)) * Math.cos(rad(decl))), -1, 1);
  return deg(Math.acos(dn)) / 15;
}

function prayerTimes(date, s) {
  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { decl, eqt } = sunPos(jd);
  const dhuhr = 12 + s.tz - s.lng / 15 - eqt;
  const G = alt => hourDiff(alt, s.lat, decl);
  const ref = -0.833 - 0.017 * Math.sqrt(s.elevation || 0);

  const fajr = dhuhr - G(-s.fajrAngle);
  const sunrise = dhuhr - G(ref);
  const asrAlt = deg(Math.atan(1 / (s.asrFactor + Math.tan(rad(Math.abs(s.lat - decl))))));
  const asr = dhuhr + G(asrAlt);
  const maghrib = dhuhr + G(ref);
  const isha = dhuhr + G(-s.ishaAngle);

  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

/* تحويل الساعات العشرية إلى HH:MM مع التقريب للدقيقة */
function fmt(h) {
  const total = Math.round(h * 60);
  const hh = ((Math.floor(total / 60) % 24) + 24) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function fmtClock(d) {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

/* القبلة: الاتجاه إلى الكعبة (خط 21.4225N — 39.8262E) */
function qiblaAngle(lat, lng) {
  const φ2 = rad(21.4225), λ2 = rad(39.8262);
  const φ1 = rad(lat), λ1 = rad(lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return ((deg(Math.atan2(y, x)) % 360) + 360) % 360;
}

/* التاريخ الهجري (تقويم أم القرى المتوفر في المتصفح) */
function hijriStr(d) {
  try {
    return new Intl.DateTimeFormat('ar-DZ-u-ca-islamic-umalqura',
      { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace('م', 'هـ');
  } catch (e) {
    return '';
  }
}
function gregStr(d) {
  return new Intl.DateTimeFormat('ar-DZ',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/* ---------- بناء واجهة الصلوات ---------- */
let todayTimes = null;
let currentDateStr = '';

function buildRows() {
  const box = $('prayers');
  box.innerHTML = '';
  PRAYERS.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${p.key}`;
    row.innerHTML = `<span class="name">${p.name}</span>
      <span class="time" id="time-${p.key}">--:--</span>
      <span class="tag">${p.tag}</span>`;
    box.appendChild(row);
  });
}

function renderTimes(times) {
  PRAYERS.forEach(p => {
    $(`time-${p.key}`).textContent = fmt(times[p.key]);
  });
}

/* ---------- المنطق الرئيسي ---------- */
let lastAdhkarIdx = 0, lastTickerIdx = 0;

function tick() {
  const now = new Date();
  $('clock').textContent = fmtClock(now);

  // إعادة حساب عند تغيير اليوم
  const ds = now.toDateString();
  if (ds !== currentDateStr || !todayTimes) {
    currentDateStr = ds;
    todayTimes = prayerTimes(now, S);
    renderTimes(todayTimes);
    $('hijriDate').textContent = hijriStr(now) || '—';
    $('gregDate').textContent = gregStr(now);
  }

  // الصلوات (بدون الشروق) مرتبة
  const seq = PRAYERS.filter(p => p.key !== 'sunrise').map(p => ({
    ...p, t: todayTimes[p.key]
  }));

  // الصلاة السابقة والقادمة
  let prev = null, next = null;
  for (const p of seq) {
    if (p.t <= now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) prev = p;
    else { next = p; break; }
  }
  if (!next) { // كل صلوات اليوم انقضت — الفجر غدًا بإذن الله
    const tm = new Date(now); tm.setDate(tm.getDate() + 1);
    next = { ...seq[0], t: prayerTimes(tm, S).fajr, tomorrow: true };
  }

  // رسم الصفوف
  document.querySelectorAll('.row').forEach(r => r.classList.remove('next', 'current'));
  if (next) $(`row-${next.key}`).classList.add('next');
  if (prev) $(`row-${prev.key}`).classList.add('current');

  // فحص دخول الأوقات وتشغيل الأذان
  const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  for (const p of seq) {
    const ss = Math.round((nowH - p.t) * 3600);
    const dayKey = `${ds}-${p.key}`;
    if (ss >= 0 && ss <= AZAN_WINDOW_SEC && azanFiredKey !== dayKey) {
      azanFiredKey = dayKey;
      if (S.adhanSound && audioUnlocked) fireAdhan(p.key);
    }
  }

  // العد التنازلي
  const hoursToNext = next.t - (now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600);
  const remaining = Math.max(0, Math.round(hoursToNext * 3600));
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const cd = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // مرحلة أذكار ما بعد الصلاة
  const minsSincePrev = prev ? (now.getHours() + now.getMinutes() / 60 - prev.t) * 60 : 99;
  const inAdhkar = prev && minsSincePrev >= 0 && minsSincePrev < S.adhkarMinutes;

  $('nextName').textContent = next.name;
  $('nextTime').textContent = next.tomorrow
    ? `في ${fmt(next.t)} غدًا إن شاء الله`
    : `في الساعة ${fmt(next.t)}`;
  $('countdown').textContent = cd;
  $(`row-${next.key}`) && ($('countdown').parentElement.style.borderColor =
    inAdhkar ? 'rgba(120,220,180,.35)' : 'rgba(217,180,90,.7)');

  if (inAdhkar) {
    // إظهار بطاقة الأذكار بدل العد التنازلي
    $('adhkarCard').classList.remove('hidden');
    $('countdown').parentElement.classList.add('hidden');
    const gi = Math.floor(minsSincePrev / (S.adhkarMinutes / POST_ADHKAR.length) ) % POST_ADHKAR.length;
    if (gi !== lastAdhkarIdx) {
      lastAdhkarIdx = gi;
      const el = $('adhkarText');
      el.classList.add('fade');
      setTimeout(() => {
        el.textContent = POST_ADHKAR[gi];
        el.classList.remove('fade');
      }, 500);
    }
    $('adhkarSub').textContent = 'سبحان الله وبحمده، سبحان الله العظيم';
  } else {
    $('adhkarCard').classList.add('hidden');
    $('countdown').parentElement.classList.remove('hidden');
    lastAdhkarIdx = -1;
  }

  // الشريط
  const ti = Math.floor(Date.now() / 7000) % TICKER.length;
  if (ti !== lastTickerIdx) {
    lastTickerIdx = ti;
    const el = $('ticker');
    el.classList.add('fade');
    setTimeout(() => {
      el.textContent = TICKER[ti];
      el.classList.remove('fade');
    }, 500);
  }
}

/* ---------- الإعدادات ---------- */
function openSettings() {
  const f = $('settingsForm');
  Object.keys(S).forEach(k => {
    if (!f[k]) return;
    if (f[k].type === 'checkbox') f[k].checked = !!S[k];
    else f[k].value = S[k];
  });
  $('settings').classList.remove('hidden');
}
function closeSettings() { $('settings').classList.add('hidden'); }

function bindSettings() {
  $('gear').addEventListener('click', openSettings);
  $('closeBtn').addEventListener('click', closeSettings);
  $('settings').addEventListener('click', e => {
    if (e.target.id === 'settings') closeSettings();
  });

  $('settingsForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = $('settingsForm');
    ['mosqueName', 'city', 'imam', 'phone', 'address'].forEach(k => {
      if (f[k]) S[k] = String(f[k].value).trim();
    });
    ['lat', 'lng', 'tz', 'elevation', 'fajrAngle', 'ishaAngle', 'asrFactor', 'adhkarMinutes']
      .forEach(k => { if (f[k]) S[k] = parseFloat(f[k].value) || DEFAULTS[k]; });
    if (f.adhanSound) S.adhanSound = f.adhanSound.checked;
    if (f.adhanVolume) S.adhanVolume = clamp(parseInt(f.adhanVolume.value || '80', 10), 0, 100);
    setAudioVolume();
    saveSettings();
    applyIdentity();
    todayTimes = null; // إعادة حساب
    closeSettings();
  });

  $('resetBtn').addEventListener('click', () => {
    if (confirm('هل تريد استعادة الإعدادات الافتراضية؟')) {
      S = { ...DEFAULTS };
      saveSettings();
      applyIdentity();
      todayTimes = null;
      openSettings();
    }
  });
}

function applyIdentity() {
  $('mosqueName').textContent = S.mosqueName;
  $('cityName').textContent = S.imam
    ? `${S.city} • إمام المسجد: ${S.imam}` : S.city;
  const q = qiblaAngle(S.lat, S.lng).toFixed(1);
  $('qibla').textContent = `اتجاه القبلة: ${q}° من الشمال`;
  document.title = `مواقيت الصلاة | ${S.mosqueName}`;
}

/* ---------- الاختصارات وإخفاء المؤشر ---------- */
function bindInput() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSettings();
    if ((e.key === 'f' || e.key === 'F') && $('settings').classList.contains('hidden')) {
      toggleFullscreen();
    }
    if ((e.key === 's' || e.key === 'S') && $('settings').classList.contains('hidden')) {
      openSettings();
    }
  });

  let mouseTimer;
  const showCursor = () => {
    document.body.classList.add('cursor-shown');
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => document.body.classList.remove('cursor-shown'), 3000);
  };
  document.addEventListener('mousemove', showCursor);
  showCursor();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

/* ---------- الإطلاق ---------- */
buildRows();
applyIdentity();
setAudioVolume();
bindSettings();
bindInput();

// زر تفعيل الصوت + أي نقرة أولى على الشاشة تفعّل الصوت
$('soundUnlock').addEventListener('click', e => { e.stopPropagation(); unlockAudio(); });
document.addEventListener('click', () => { if (!audioUnlocked) unlockAudio(); });
if (audioUnlocked) $('soundUnlock').classList.add('hidden');

$('ticker').textContent = TICKER[0];
$('adhkarText').textContent = POST_ADHKAR[0];
$('countdown').parentElement && ($('countdown').textContent = '--:--:--');

setInterval(tick, 1000);
tick();
