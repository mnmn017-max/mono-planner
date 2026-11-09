/* =====================================================================
   MONO PLANNER · 암기 Test > 단어 Test
   - 선생님: 시험 목록(폴더) · 단어 올리기(붙여넣기→회차 분할) · 예약 배정 ·
             결과(학생별/단어별/히트맵/미통과 알림/개인 리포트) · 오답 시험
   - 학생:   홈 플래너 맨 위 필수 과제 · 시험 탭 목록 · 객관식/주관식 응시 ·
             결과(반원 게이지) · 내 단어 성적표
   index.html 의 window.MP_FB 를 통해 Firestore 를 사용한다.
   ===================================================================== */
(function () {
  'use strict';
  var WT = window.WT = {};
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };

  /* ------------------------------------------------------------------ 스타일 */
  var CSS = "\
.wt{font-family:'Noto Sans KR',sans-serif;color:#1A1010;--wt-page:#F8F5F4;--wt-line:#EDE2DF;--wt-line2:#F1E8E5;--wt-soft:#FBF8F7;--wt-track:#F1EAE8;--wt-mid:#E6D9D5;--wt-label:#8A6A66;--wt-eb:#B0895A;--wt-burg:#7B1D1D;--wt-green:#1B6B3A;--wt-rose:#9C2F2F;--wt-orange:#A65A12}\
.wt *{box-sizing:border-box}\
.wt button{font-family:inherit}\
.wt .p,.wt .s,.wt .g,.wt .o,.wt .ib{border:0;cursor:pointer;font-family:'Noto Sans KR',sans-serif;font-weight:800;letter-spacing:.02em;transition:transform .12s,box-shadow .12s,opacity .12s;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}\
.wt .p{background:radial-gradient(130% 160% at 50% -10%,#A63434 0%,#7B1D1D 55%,#571313 100%);color:#FFF6E6;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(255,214,205,.42),inset 0 1px 0 rgba(255,255,255,.22),0 2px 4px rgba(80,15,15,.3),0 14px 26px -10px rgba(90,20,20,.6)}\
.wt .s,.wt .ib{background:linear-gradient(180deg,#FFFFFF,#FAF5F3);color:#3D2B2B;border-radius:12px;box-shadow:inset 0 0 0 1px #E6D3CE,inset 0 1px 0 #fff,0 10px 20px -12px rgba(110,45,45,.45),0 1px 2px rgba(110,45,45,.08)}\
.wt .g{background:linear-gradient(135deg,#F7E6DC 0%,#E6C7B5 50%,#C99A86 100%);color:#3A1E18;border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 0 0 1px #E2D2CE,0 12px 22px -10px rgba(110,45,45,.35)}\
.wt .o{background:radial-gradient(130% 160% at 50% -10%,#C25555,#9C2F2F 60%,#6E1818);color:#fff;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(255,214,205,.4),0 12px 22px -10px rgba(156,47,47,.7)}\
.wt .p:hover,.wt .s:hover,.wt .g:hover,.wt .o:hover,.wt .ib:hover{transform:translateY(-1px)}\
.wt .p:active,.wt .s:active,.wt .g:active,.wt .o:active,.wt .ib:active{transform:translateY(1px) scale(.99);box-shadow:inset 0 0 0 1px rgba(255,214,205,.42),inset 0 3px 8px rgba(0,0,0,.22)}\
.wt .p:disabled,.wt .s:disabled,.wt .o:disabled,.wt .g:disabled{opacity:.45;cursor:default;transform:none}\
.wt .card{background:linear-gradient(180deg,#FFFFFF,#FAF5F3);border-radius:18px;box-shadow:inset 0 0 0 1px #EDE2DF,inset 0 1px 0 #fff,0 1px 1px rgba(110,45,45,.04),0 6px 12px -4px rgba(110,45,45,.06),0 24px 40px -22px rgba(110,45,45,.3)}\
.wt .well{background:linear-gradient(180deg,#F1E9E6,#F7F2F0);border-radius:12px;box-shadow:inset 0 2px 6px rgba(110,45,45,.12),inset 0 0 0 1px rgba(110,45,45,.06)}\
.wt .seg{display:flex;gap:3px;padding:3px}\
.wt .seg>button{border:0;background:transparent;height:34px;padding:0 13px;border-radius:9px;font:500 12.5px 'Noto Sans KR',sans-serif;color:#5A4848;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}\
.wt .seg>button.on,.wt .on{background:linear-gradient(180deg,#fff,#FAF5F3);border-radius:9px;box-shadow:inset 0 0 0 1px #E6D3CE,0 6px 12px -6px rgba(110,45,45,.5);color:#7B1D1D;font-weight:800}\
.wt .chip{background:linear-gradient(180deg,#FFFFFF,#FAF5F3);border-radius:999px;box-shadow:inset 0 0 0 1px #E6D3CE,0 4px 10px -6px rgba(110,45,45,.45);border:0;font-family:inherit}\
.wt .chip.off{opacity:.45;text-decoration:line-through}\
.wt .inp{background:linear-gradient(180deg,#FAF5F3,#fff);border:0;border-radius:12px;box-shadow:inset 0 0 0 1px #E6D3CE,inset 0 2px 5px rgba(110,45,45,.08);outline:none;font-family:inherit;color:#1A1010}\
.wt .inp:focus{box-shadow:inset 0 0 0 1.5px #7B1D1D,0 0 0 4px rgba(123,29,29,.08)}\
.wt .tog{width:46px;height:26px;border-radius:13px;background:linear-gradient(180deg,#571313,#8E2828);box-shadow:inset 0 0 0 1px rgba(255,214,205,.42),inset 0 2px 4px rgba(0,0,0,.35);position:relative;flex:none;border:0;cursor:pointer;padding:0}\
.wt .tog i{position:absolute;top:3px;left:23px;width:20px;height:20px;border-radius:10px;background:radial-gradient(circle at 35% 30%,#fff,#F3DCD4);box-shadow:0 2px 5px rgba(0,0,0,.35);transition:left .15s}\
.wt .tog.off{background:#DED3C5;box-shadow:inset 0 2px 4px rgba(0,0,0,.12)}.wt .tog.off i{left:3px;background:#fff}\
.wt .av{border-radius:999px;background:radial-gradient(circle at 35% 25%,#B04040,#6E1818 70%);color:#FFF6E6;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff,0 0 0 3px #E6D3CE,0 6px 12px -4px rgba(90,20,20,.5);flex:none}\
.wt .eb{font-size:10px;letter-spacing:.2em;color:var(--wt-eb);font-weight:800}\
.wt .serif{font-family:'Noto Serif KR',serif;font-weight:700}\
.wt .muted{color:#8A7B7B}\
.wt .row{display:flex;align-items:center;gap:8px}\
.wt .col{display:flex;flex-direction:column}\
.wt .tag{display:inline-flex;align-items:center;font-size:10.5px;font-weight:800;border-radius:6px;padding:3px 8px;white-space:nowrap}\
.wt .t-pass{color:#1B6B3A;background:#EAF3EC}.wt .t-fail{color:#9C2F2F;background:#F8E9E7}.wt .t-wait{color:#7A6A6A;background:#EFEAE7}.wt .t-run{color:#A65A12;background:#FBEEDD}\
.wt .scroll{overflow:auto;-webkit-overflow-scrolling:touch}\
.wt .scroll::-webkit-scrollbar{width:6px;height:6px}.wt .scroll::-webkit-scrollbar-thumb{background:rgba(110,45,45,.18);border-radius:3px}\
.wt-root{padding:4px 0 24px;display:flex;flex-direction:column;gap:14px}\
.wt-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap}\
.wt-title{font-family:'Noto Serif KR',serif;font-size:22px;font-weight:700;color:#7B1D1D}\
.wt-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}\
.wt-kpi{padding:13px 15px;display:flex;flex-direction:column;gap:2px}\
.wt-kpi b{font-family:'Noto Serif KR',serif;font-size:22px}\
.wt-split{display:grid;grid-template-columns:250px 1fr;gap:14px;align-items:start}\
.wt-tree button{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:8px;height:38px;padding:0 10px;border-radius:9px;font:500 13px 'Noto Sans KR',sans-serif;color:#3D2B2B;cursor:pointer;text-align:left}\
.wt-tree button.on{background:linear-gradient(180deg,#922B2B,#6E1818);color:#fff;font-weight:700;box-shadow:0 6px 12px -6px rgba(110,30,30,.6)}\
.wt-tree .grp{font-size:11px;font-weight:800;color:var(--wt-label);padding:10px 10px 4px;letter-spacing:.06em}\
.wt-table{width:100%;border-collapse:collapse;font-size:13px}\
.wt-table th{font-size:11px;font-weight:800;color:#8A7B7B;text-align:left;padding:10px 12px;background:#FBF8F7;box-shadow:inset 0 -1px 0 #F1E8E5}\
.wt-table td{padding:11px 12px;box-shadow:inset 0 -1px 0 #F6EFED;vertical-align:middle}\
.wt-table tr.click{cursor:pointer}.wt-table tr.click:hover td{background:#FDFAF9}\
.wt-bar{position:relative;height:8px;border-radius:8px;background:linear-gradient(90deg,#F6ECEA 0,#F6ECEA 60%,#EAF3EC 60%);box-shadow:inset 0 1px 2px rgba(110,45,45,.14)}\
.wt-bar>.f{position:absolute;left:0;top:0;bottom:0;border-radius:8px}\
.wt-bar>.c{position:absolute;left:60%;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:#C99A86;box-shadow:0 0 0 1.5px #fff;border-radius:1px}\
.wt-bar>.k{position:absolute;top:50%;width:15px;height:15px;margin:-7.5px 0 0 -7.5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#F3ECEA);box-shadow:0 0 0 2.5px var(--kc,#1B6B3A),0 3px 6px rgba(110,45,45,.3)}\
.wt-modal-bg{position:fixed;inset:0;background:rgba(26,16,16,.38);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;animation:wtFade .15s}\
.wt-modal{width:100%;max-width:880px;max-height:92vh;display:flex;flex-direction:column;background:#F8F5F4;border-radius:22px;box-shadow:0 30px 80px -20px rgba(0,0,0,.45);overflow:hidden}\
.wt-modal-h{display:flex;align-items:center;gap:10px;padding:16px 20px;background:#fff;box-shadow:0 1px 0 #EDE2DF}\
.wt-modal-b{flex:1;overflow:auto;padding:18px 20px}\
.wt-modal-f{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;background:#fff;box-shadow:0 -1px 0 #EDE2DF}\
.wt-full{position:fixed;inset:0;z-index:8500;background:#F8F5F4;display:flex;flex-direction:column;overflow:hidden;animation:wtFade .18s}\
.wt-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#2A1A1A;color:#fff;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;z-index:9500;box-shadow:0 12px 30px -8px rgba(0,0,0,.4);animation:wtFade .2s;max-width:90vw}\
.wt-steps{display:flex;gap:6px}\
.wt-steps>div{flex:1;display:flex;flex-direction:column;gap:5px}\
.wt-steps>div>i{height:4px;border-radius:2px;background:#E6D9D5}\
.wt-steps>div.on>i,.wt-steps>div.done>i{background:#7B1D1D}\
.wt-steps>div>span{font-size:11px;color:#A89898}.wt-steps>div.on>span{color:#7B1D1D;font-weight:800}\
.wt-hm-cell{border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;height:40px}\
@keyframes wtFade{from{opacity:0}to{opacity:1}}\
@property --wtn{syntax:'<integer>';initial-value:0;inherits:false}\
.wt-arcfill{stroke-dasharray:100;stroke-dashoffset:100;animation:wtArc 1.6s cubic-bezier(.22,1,.36,1) .25s forwards}\
.wt-arcknob{opacity:0;transform-box:fill-box;transform-origin:center;animation:wtKnob .5s cubic-bezier(.34,1.56,.64,1) 1.55s forwards}\
.wt-arccnt{--wtn:0;counter-reset:wtn var(--wtn);animation:wtCount 1.6s cubic-bezier(.22,1,.36,1) .25s forwards}\
.wt-arccnt::after{content:counter(wtn)}\
@keyframes wtArc{to{stroke-dashoffset:0}}\
@keyframes wtKnob{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:scale(1)}}\
@keyframes wtCount{to{--wtn:var(--to)}}\
@media (prefers-reduced-motion:reduce){.wt-arcfill,.wt-arccnt,.wt-arcknob{animation-duration:.01s;animation-delay:0s}}\
@media (max-width:900px){.wt-split{grid-template-columns:1fr}.wt-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.wt-hide-m{display:none!important}.wt-modal{max-height:100vh;border-radius:18px}}\
@media (min-width:901px){.wt-hide-d{display:none!important}}\
";
  function injectCss() {
    if (document.getElementById('wt-css')) return;
    var s = document.createElement('style'); s.id = 'wt-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  injectCss();

  /* ------------------------------------------------------------------ 유틸 */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IC = {
    x: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14', chev: 'M6 9l6 6 6-6', right: 'M9 6l6 6-6 6', left: 'M15 6l-6 6 6 6',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
    retry: 'M3 12a9 9 0 109-9M3 4v5h5', check: 'M5 12l5 5 9-10', folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
    gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z', book: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM8 7h8M8 11h6',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
    msg: 'M21 12a8 8 0 01-12 7l-6 2 2-6a8 8 0 1116-3z', print: 'M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6z', sound: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7'
  };
  function sv(k, c, s, w) { return '<svg width="' + (s || 16) + '" height="' + (s || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; }
  function toast(msg, ms) {
    var t = document.createElement('div'); t.className = 'wt-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2200);
  }
  function kstNow() { var n = new Date(); return new Date(n.getTime() + (9 * 60 + n.getTimezoneOffset()) * 60000); }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function todayStr() { try { return F().plannerDate(); } catch (e) { return ymd(kstNow()); } }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  // KST 날짜 + 시각 → 실제 ms
  function kstMs(dateStr, h, m) { var p = dateStr.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2], (h || 0) - 9, m || 0); }
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function md(s) { var d = parseYmd(s); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + DOW[d.getDay()]; }
  function tsMs(t) { if (!t) return 0; if (typeof t === 'number') return t; if (t.toMillis) return t.toMillis(); if (t.seconds) return t.seconds * 1000; return 0; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtSec(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function isMobile() { return window.innerWidth <= 900; }

  /* 단어 붙여넣기 해석: "001 abandon 버리다, 포기하다" / 탭 / 하이픈 / 쉼표 등 */
  WT.parseWords = function (text) {
    var out = [], seen = {}, dup = 0, noMeaning = 0;
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var l = line.replace(/ /g, ' ').trim();
      if (!l) return;
      l = l.replace(/^\s*(\d+)[\.\)]?\s+/, '');           // 앞 번호 제거
      var m = l.match(/^([A-Za-z][A-Za-z'\-\.\s]*?[A-Za-z\.])\s*(?:\t+|\s{2,}|\s*[:\-–—=|]\s*|\s+)(.*)$/);
      var en, ko;
      if (m) { en = m[1].trim(); ko = (m[2] || '').trim(); }
      else if (/^[A-Za-z][A-Za-z'\-\.]*$/.test(l)) { en = l; ko = ''; }
      else return;
      // "give up 포기하다" 처럼 숙어가 잘린 경우: 뜻 앞의 영어 단어를 표제어로 되돌림
      var mm;
      while ((mm = ko.match(/^([A-Za-z][A-Za-z'\-]*)(\s+)(.*)$/)) && /[^\x00-\x7F]/.test(mm[3])) { en += ' ' + mm[1]; ko = mm[3]; }
      ko = ko.replace(/^[,;:\-\s]+/, '').trim();
      var key = en.toLowerCase();
      if (seen[key]) { dup++; return; }
      seen[key] = 1;
      if (!ko) noMeaning++;
      out.push({ en: en, ko: ko });
    });
    return { words: out, dup: dup, noMeaning: noMeaning };
  };

  /* 주관식 채점: 띄어쓰기·문장부호 무시, 뜻 여러 개 중 하나만 맞아도 정답 */
  function norm(s) { return String(s || '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[\s~·.,;:!?'"“”‘’\-_/()\[\]]/g, '').toLowerCase(); }
  WT.gradeSA = function (given, ko) {
    var g = norm(given); if (!g) return false;
    var parts = String(ko || '').split(/[,;\/·]|、/).map(norm).filter(Boolean);
    if (norm(ko) === g) return true;
    for (var i = 0; i < parts.length; i++) { if (parts[i] === g) return true; }
    // "~하다" 형태 차이 허용(예: 포기 ↔ 포기하다)
    for (var j = 0; j < parts.length; j++) { var p = parts[j]; if (p.length >= 2 && (p === g + '하다' || g === p + '하다' || p === g + '한' || g === p + '한')) return true; }
    return false;
  };

  /* ------------------------------------------------------------------ 데이터 */
  var DB = {};
  function col(name) { return F().collection(F().db, name); }
  function q(name) {
    var args = [col(name)].concat([].slice.call(arguments, 1));
    return F().getDocs(F().query.apply(null, args)).then(function (s) { return s.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; }); });
  }
  function W(f, op, v) { return F().where(f, op, v); }
  DB.folders = function () { return q('wordFolders', W('branch', '==', ME().branch)).then(function (a) { return a.sort(function (x, y) { return (x.grade || '').localeCompare(y.grade || '', 'ko') || (x.order || 0) - (y.order || 0) || tsMs(x.createdAt) - tsMs(y.createdAt); }); }); };
  DB.tests = function () { return q('wordTests', W('branch', '==', ME().branch)).then(function (a) { return a.sort(function (x, y) { return (x.order || 0) - (y.order || 0) || tsMs(x.createdAt) - tsMs(y.createdAt); }); }); };
  DB.assignsAll = function () { return q('wordAssign', W('branch', '==', ME().branch)); };
  DB.assignsOf = function (uid) { return q('wordAssign', W('studentUid', '==', uid)); };
  DB.resultsAll = function () { return q('wordResults', W('branch', '==', ME().branch)); };
  DB.resultsOf = function (uid) { return q('wordResults', W('studentUid', '==', uid)); };
  DB.series = function () { return q('wordSeries', W('branch', '==', ME().branch)); };
  DB.add = function (name, data) { data.branch = data.branch || ME().branch; data.createdAt = F().serverTimestamp(); return F().addDoc(col(name), data); };
  DB.upd = function (name, id, data) { return F().updateDoc(F().doc(F().db, name, id), data); };
  DB.del = function (name, id) { return F().deleteDoc(F().doc(F().db, name, id)); };
  DB.get = function (name, id) { return F().getDoc(F().doc(F().db, name, id)).then(function (d) { if (!d.exists()) return null; var o = d.data(); o.id = d.id; return o; }); };
  DB.batchAdd = function (name, list) {
    var fb = F(), b = fb.writeBatch(fb.db), refs = [];
    list.forEach(function (data) { var r = fb.doc(col(name)); data.branch = data.branch || ME().branch; data.createdAt = fb.serverTimestamp(); b.set(r, data); refs.push(r.id); });
    return b.commit().then(function () { return refs; });
  };
  WT.DB = DB;
  /* 통과 기준: cutWrong(틀려도 되는 개수)이 있으면 그것을, 없으면 cutN · cutPct(%) 순서로 */
  WT.cutCount = function (n, o) {
    o = o || {};
    if (o.cutWrong != null && o.cutWrong !== '') return Math.max(0, n - (+o.cutWrong));
    if (o.cutN) return o.cutN;
    return Math.ceil(n * (o.cutPct != null ? o.cutPct : 80) / 100);
  };

  /* ------------------------------------------------------------------ 모달 */
  function modal(opts) {
    var bg = document.createElement('div'); bg.className = 'wt-modal-bg wt';
    bg.innerHTML = '<div class="wt-modal" style="max-width:' + (opts.width || 880) + 'px" role="dialog" aria-modal="true">'
      + '<div class="wt-modal-h"><div class="col" style="flex:1;gap:2px">' + (opts.eyebrow ? '<span class="eb">' + esc(opts.eyebrow) + '</span>' : '') + '<span class="serif" style="font-size:18px;color:#7B1D1D">' + esc(opts.title || '') + '</span></div>'
      + '<button type="button" class="ib" data-x aria-label="닫기" style="width:36px;height:36px">' + sv('x', '#5A4848', 14) + '</button></div>'
      + '<div class="wt-modal-b"></div><div class="wt-modal-f"></div></div>';
    document.body.appendChild(bg);
    var m = { el: bg, body: bg.querySelector('.wt-modal-b'), foot: bg.querySelector('.wt-modal-f'), close: function () { bg.remove(); if (opts.onClose) opts.onClose(); } };
    bg.querySelector('[data-x]').onclick = m.close;
    bg.addEventListener('mousedown', function (e) { if (e.target === bg && opts.dismissable !== false) m.close(); });
    return m;
  }
  function confirmBox(msg, okLabel) {
    return new Promise(function (res) {
      var m = modal({ title: '확인', width: 420, onClose: function () { res(false); } });
      m.body.innerHTML = '<div style="font-size:14px;line-height:1.7;color:#3D2B2B">' + msg + '</div>';
      m.foot.innerHTML = '<button type="button" class="s" data-n style="height:42px;padding:0 16px">취소</button><button type="button" class="p" data-y style="height:42px;padding:0 18px">' + esc(okLabel || '확인') + '</button>';
      m.foot.querySelector('[data-n]').onclick = function () { m.close(); };
      m.foot.querySelector('[data-y]').onclick = function () { m.el.remove(); res(true); };
    });
  }
  WT._u = { esc: esc, sv: sv, toast: toast, modal: modal, confirmBox: confirmBox, todayStr: todayStr, addDays: addDays, kstMs: kstMs, md: md, tsMs: tsMs, shuffle: shuffle, fmtSec: fmtSec, isMobile: isMobile, parseYmd: parseYmd, ymd: ymd };
})();

/* =====================================================================
   선생님 화면
   ===================================================================== */
(function () {
  'use strict';
  var WT = window.WT, U = WT._u, DB = WT.DB, esc = U.esc, sv = U.sv;
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };
  var S = { view: 'list', folderId: 'all', resView: 'student', resTestId: null, hmFolder: null, hmPanel: false, naSel: null, rpStudent: null, rvSel: {}, rvMode: 2, rvOff: {}, schSeries: null };
  var D = { folders: [], tests: [], assigns: [], results: [], students: [], series: [] };
  var root = null;

  function cutOf(t, total) { return WT.cutCount(total || (t.words || []).length, t); }
  function cutLabel(t) { return t.cutWrong != null ? '오답 ' + t.cutWrong + '개까지' : (t.cutPct != null ? t.cutPct : 80) + '%'; }
  WT.cutOf = cutOf;
  function testById(id) { for (var i = 0; i < D.tests.length; i++) if (D.tests[i].id === id) return D.tests[i]; return null; }
  function folderById(id) { for (var i = 0; i < D.folders.length; i++) if (D.folders[i].id === id) return D.folders[i]; return null; }
  function stuName(uid) { for (var i = 0; i < D.students.length; i++) if (D.students[i].uid === uid) return D.students[i].name; return ''; }

  var loadedAt = 0;
  function loadAll(force) {
    if (!force && loadedAt && Date.now() - loadedAt < 60000) return Promise.resolve();   // 탭을 다시 열 때 1분 안이면 다시 받지 않음
    return Promise.all([DB.folders(), DB.tests(), DB.assignsAll(), DB.resultsAll(), F().loadStudents(), DB.series()]).then(function (r) {
      D.folders = r[0]; D.tests = r[1]; D.assigns = r[2]; D.results = r[3].sort(function (a, b) { return U.tsMs(b.createdAt) - U.tsMs(a.createdAt); });
      D.students = (r[4] || []).map(function (s) { return { uid: s.uid || s.id, name: s.name || '', grade: s.grade || '', school: s.school || '' }; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
      D.series = r[5]; loadedAt = Date.now();
    });
  }

  WT.teacherMount = function (el) {
    root = el; root.classList.add('wt');
    root.innerHTML = '<div style="padding:30px;color:#8A7B7B;font-size:13px">불러오는 중...</div>';
    loadAll().then(render).catch(function (e) { console.error(e); root.innerHTML = '<div style="padding:30px;color:#9C2F2F">불러오지 못했어요: ' + esc(e.message || e) + '</div>'; });
  };
  function refresh() { return loadAll(true).then(render); }

  function render() {
    var tabs = [['list', '시험 목록'], ['sched', '예약 · 배정'], ['result', '결과 · 성적'], ['review', '오답 시험']];
    var pending = D.results.filter(function (r) { return !r.passed && !r.handled; }).length;
    var h = '<div class="wt-root">'
      + '<div class="wt-head"><div class="col" style="gap:3px"><span class="eb">MEMORIZATION · WORD TEST</span><span class="wt-title">단어 Test</span></div>'
      + '<button type="button" class="p" data-act="newtest" style="height:42px;padding:0 18px;font-size:13px">' + sv('plus', '#fff', 15) + '새 단어 Test</button></div>'
      + '<div class="well seg scroll" style="display:inline-flex;max-width:100%">' + tabs.map(function (t) {
        return '<button type="button" class="' + (S.view === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + (t[0] === 'result' && pending ? '<span style="min-width:17px;height:17px;border-radius:9px;background:linear-gradient(180deg,#C25555,#9C2F2F);color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 5px">' + pending + '</span>' : '') + '</button>';
      }).join('') + '</div>'
      + '<div id="wt-view"></div></div>';
    root.innerHTML = h;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.view = b.dataset.tab; render(); }; });
    root.querySelector('[data-act="newtest"]').onclick = function () { openWizard(); };
    var v = root.querySelector('#wt-view');
    if (S.view === 'list') viewList(v);
    else if (S.view === 'sched') viewSched(v);
    else if (S.view === 'result') viewResult(v);
    else viewReview(v);
  }

  /* -------------------------------------------------------- 시험 목록 */
  function viewList(v) {
    var today = U.todayStr();
    var todays = D.assigns.filter(function (a) { return a.date === today && a.kind !== 'retest'; });
    var stuToday = {}; todays.forEach(function (a) { stuToday[a.studentUid] = 1; });
    var doneToday = todays.filter(function (a) { return a.status === 'passed' || a.status === 'failed'; });
    var passToday = todays.filter(function (a) { return a.status === 'passed'; });
    var needRe = D.assigns.filter(function (a) { return a.kind === 'retest' && a.status !== 'passed'; });
    var late = D.assigns.filter(function (a) { return a.date < today && a.status === 'assigned' && a.kind !== 'retest'; });
    var lateStu = {}; late.forEach(function (a) { lateStu[a.studentUid] = (lateStu[a.studentUid] || 0) + 1; });
    var reNames = {}; needRe.forEach(function (a) { reNames[a.studentName] = 1; });
    var kpi = '<div class="wt-kpis">'
      + kp('오늘 응시 대상', Object.keys(stuToday).length + '<span style="font-size:13px"> 명</span>', '완료 ' + doneToday.length + ' · 남음 ' + (todays.length - doneToday.length), '#1A1010')
      + kp('오늘 통과', passToday.length + '<span style="font-size:13px"> 명</span>', todays.length ? '통과율 ' + Math.round(passToday.length / Math.max(1, doneToday.length) * 100) + '%' : '오늘 예약 없음', '#1B6B3A')
      + kp('재시험 필요', needRe.length + '<span style="font-size:13px"> 건</span>', Object.keys(reNames).slice(0, 3).join(' · ') || '없음', '#9C2F2F')
      + kp('밀린 시험', Object.keys(lateStu).length + '<span style="font-size:13px"> 명</span>', Object.keys(lateStu).slice(0, 2).map(stuName).join(' · ') || '없음', '#A65A12')
      + '</div>';
    // 트리
    var groups = {};
    D.folders.forEach(function (f) { (groups[f.grade || '기타'] = groups[f.grade || '기타'] || []).push(f); });
    var cnt = function (fid) { return D.tests.filter(function (t) { return t.folderId === fid && t.kind !== 'retest'; }).length; };
    var tree = '<div class="card wt-tree" style="padding:12px 10px;display:flex;flex-direction:column;gap:2px">'
      + '<div class="row" style="justify-content:space-between;padding:2px 6px 6px"><span style="font-size:13px;font-weight:800">학년 · 교재</span><button type="button" class="ib" data-act="newfolder" aria-label="새 폴더" style="width:30px;height:30px;border-radius:9px">' + sv('plus', '#5A4848', 13) + '</button></div>'
      + '<button type="button" data-folder="all" class="' + (S.folderId === 'all' ? 'on' : '') + '">' + sv('book', S.folderId === 'all' ? '#fff' : '#B0895A', 15) + '<span style="flex:1">전체 시험</span><span style="font-size:11px;opacity:.8">' + D.tests.filter(function (t) { return t.kind !== 'retest'; }).length + '</span></button>'
      + Object.keys(groups).sort().reverse().map(function (g) {
        return '<div class="grp">' + esc(g) + '</div>' + groups[g].map(function (f) {
          var on = S.folderId === f.id;
          return '<button type="button" data-folder="' + f.id + '" class="' + (on ? 'on' : '') + '">' + sv('folder', on ? '#fff' : '#B0895A', 15) + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(f.name) + '</span><span style="font-size:11px;opacity:.8">' + cnt(f.id) + '</span></button>';
        }).join('');
      }).join('')
      + (D.folders.length ? '' : '<div style="font-size:12px;color:#8A7B7B;padding:10px;line-height:1.6">폴더가 없어요. + 를 눌러 학년·교재 폴더를 만들어 주세요.</div>')
      + '</div>';
    var list = D.tests.filter(function (t) { return t.kind !== 'retest' && (S.folderId === 'all' || t.folderId === S.folderId); });
    var f = folderById(S.folderId);
    var rows = list.map(function (t) {
      var as = D.assigns.filter(function (a) { return a.testId === t.id && a.kind !== 'retest'; });
      var p = as.filter(function (a) { return a.status === 'passed'; }).length, fl = as.filter(function (a) { return a.status === 'failed'; }).length, w = as.length - p - fl;
      var tot = Math.max(1, as.length);
      var st = !as.length ? ['예약 전', 't-wait'] : (w ? ['진행 중', 't-run'] : ['완료', 't-pass']);
      return '<tr><td><div class="col" style="gap:2px"><b style="font-size:13.5px">' + esc(t.title) + '</b><span style="font-size:11px;color:#8A7B7B">' + (t.words || []).length + '단어' + (S.folderId === 'all' && folderById(t.folderId) ? ' · ' + esc(folderById(t.folderId).name) : '') + (t.kind === 'review' ? ' · 오답 시험' : '') + '</span></div></td>'
        + '<td>' + (t.type === 'sa' ? '주관식' : '객관식') + '</td><td>' + cutOf(t) + ' / ' + (t.words || []).length + '</td>'
        + '<td style="min-width:150px"><div class="row" style="gap:8px"><span style="flex:1;height:6px;border-radius:3px;background:#F1EAE8;display:flex;overflow:hidden;box-shadow:inset 0 1px 1px rgba(0,0,0,.06)"><span style="width:' + (p / tot * 100) + '%;background:#1B6B3A"></span><span style="width:' + (fl / tot * 100) + '%;background:#C25555"></span></span><span style="font-size:11px;font-weight:800;white-space:nowrap">' + (p + fl) + '/' + as.length + '</span></div></td>'
        + '<td><span class="tag ' + st[1] + '">' + st[0] + '</span></td>'
        + '<td style="text-align:right;white-space:nowrap"><button type="button" class="ib" data-print="' + t.id + '" aria-label="인쇄" title="시험지 인쇄" style="width:32px;height:32px;border-radius:9px">' + sv('print', '#7B1D1D', 14) + '</button> <button type="button" class="ib" data-edit="' + t.id + '" aria-label="수정" style="width:32px;height:32px;border-radius:9px">' + sv('edit', '#5A4848', 13) + '</button> <button type="button" class="ib" data-deltest="' + t.id + '" aria-label="삭제" style="width:32px;height:32px;border-radius:9px">' + sv('trash', '#9C2F2F', 13) + '</button></td></tr>';
    }).join('');
    var right = '<div class="card" style="overflow:hidden">'
      + '<div class="row" style="justify-content:space-between;padding:14px 16px;flex-wrap:wrap;gap:8px"><div class="col" style="gap:2px"><span style="font-size:15px;font-weight:800">' + (f ? esc((f.grade ? f.grade + ' · ' : '') + f.name) : '전체 시험') + '</span><span style="font-size:11px;color:#8A7B7B">시험 ' + list.length + '개</span></div>'
      + '<div class="row">' + (f ? '<button type="button" class="s" data-act="renfolder" style="height:34px;padding:0 12px;font-size:12px">' + sv('edit', '#5A4848', 13) + '폴더 이름</button><button type="button" class="s" data-act="delfolder" style="height:34px;padding:0 12px;font-size:12px">' + sv('trash', '#9C2F2F', 13) + '폴더 삭제</button>' : '') + '<button type="button" class="p" data-act="newtest2" style="height:34px;padding:0 14px;font-size:12px">' + sv('plus', '#fff', 13) + '이 폴더에 만들기</button></div></div>'
      + (list.length ? '<div class="scroll"><table class="wt-table"><thead><tr><th>시험</th><th>유형</th><th>커트</th><th>응시 · 결과</th><th>상태</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div style="padding:40px 20px;text-align:center;color:#8A7B7B;font-size:13px;line-height:1.8">아직 시험이 없어요.<br>위의 <b style="color:#7B1D1D">새 단어 Test</b> 로 단어를 붙여넣으면 회차별로 한 번에 만들어져요.</div>')
      + '</div>';
    v.innerHTML = kpi + '<div class="wt-split" style="margin-top:14px">' + tree + right + '</div>';
    v.querySelectorAll('[data-folder]').forEach(function (b) { b.onclick = function () { S.folderId = b.dataset.folder; render(); }; });
    var nf = v.querySelector('[data-act="newfolder"]'); if (nf) nf.onclick = function () { folderDialog(null); };
    var rf = v.querySelector('[data-act="renfolder"]'); if (rf) rf.onclick = function () { folderDialog(f); };
    var df = v.querySelector('[data-act="delfolder"]'); if (df) df.onclick = function () {
      if (list.length) { U.toast('폴더 안의 시험을 먼저 옮기거나 지워 주세요'); return; }
      U.confirmBox('"' + esc(f.name) + '" 폴더를 삭제할까요?', '삭제').then(function (ok) { if (ok) DB.del('wordFolders', f.id).then(function () { S.folderId = 'all'; refresh(); }); });
    };
    v.querySelector('[data-act="newtest2"]').onclick = function () { openWizard(f ? f.id : null); };
    v.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editTest(testById(b.dataset.edit)); }; });
    v.querySelectorAll('[data-print]').forEach(function (b) { b.onclick = function () { openPrintFor(testById(b.dataset.print)); }; });
    v.querySelectorAll('[data-deltest]').forEach(function (b) {
      b.onclick = function () {
        var t = testById(b.dataset.deltest), n = D.assigns.filter(function (a) { return a.testId === t.id && a.status === 'assigned'; });
        U.confirmBox('"' + esc(t.title) + '" 시험을 삭제할까요?' + (n.length ? '<br><span style="color:#9C2F2F">아직 응시 전인 예약 ' + n.length + '건도 함께 지워져요.</span>' : '') + '<br><span style="font-size:12px;color:#8A7B7B">이미 본 시험 결과는 남아 있어요.</span>', '삭제').then(function (ok) {
          if (!ok) return;
          Promise.all([DB.del('wordTests', t.id)].concat(n.map(function (a) { return DB.del('wordAssign', a.id); }))).then(function () { U.toast('삭제했어요'); refresh(); });
        });
      };
    });
  }
  /* 인쇄 모듈은 처음 누를 때만 받아 옴 (학생 기기에는 받지 않음) */
  var _prLoad = null;
  function loadPrintMods() {
    if (WT.openPrint && WT.openReportPrint) return Promise.resolve();
    if (_prLoad) return _prLoad;
    var add = function (src) { return new Promise(function (ok, no) { var sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = function () { _prLoad = null; no(new Error('load')); }; document.head.appendChild(sc); }); };
    var v = (document.querySelector('script[src*="/wordtest.js"]') || { src: '' }).src.split('?')[1] || '';
    _prLoad = add('/wordprint.js?' + v).then(function () { return add('/wordreport.js?' + v); });
    return _prLoad;
  }
  function withPrint(fn) { U.toast('인쇄 화면을 준비하고 있어요'); loadPrintMods().then(fn).catch(function () { U.toast('인쇄 기능을 불러오지 못했어요. 인터넷 연결을 확인해 주세요'); }); }
  function openPrintFor(t, preset, date) {
    if (!t) return;
    if (!WT.openPrint) { withPrint(function () { openPrintFor(t, preset, date); }); return; }
    var f = folderById(t.folderId), pool = [];
    D.tests.forEach(function (x) { if (x.folderId === t.folderId && x.id !== t.id) pool = pool.concat(x.words || []); });
    WT.openPrint({ test: t, folderName: f ? f.name : '', students: D.students, pickStudents: pickStudents, presetUids: preset || [], assignDate: date, extraPool: pool });
  }
  WT._openPrintFor = openPrintFor;
  function reportCtx() {
    var me = ME();
    return {
      results: D.results, assigns: D.assigns, testById: testById, folderById: folderById, stuName: stuName,
      student: function (uid) { for (var i = 0; i < D.students.length; i++) if (D.students[i].uid === uid) return D.students[i]; return null; },
      resultTests: resultTests, teacher: (me.profile || {}).name || ''
    };
  }
  function openReportFor(mode, testId, uids) {
    if (!WT.openReportPrint) { withPrint(function () { openReportFor(mode, testId, uids); }); return; }
    WT.openReportPrint({ ctx: reportCtx(), mode: mode, testId: testId, uids: uids || [], pickStudents: pickStudents });
  }
  function kp(k, v, sub, c) { return '<div class="card wt-kpi"><span style="font-size:11px;color:#8A7B7B">' + k + '</span><b style="color:' + c + '">' + v + '</b><span style="font-size:11px;color:#8A7B7B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(sub) + '</span></div>'; }

  function folderDialog(f) {
    var m = U.modal({ title: f ? '폴더 이름 바꾸기' : '새 폴더', eyebrow: 'FOLDER', width: 460 });
    var grades = ['고3', '고2', '고1', '중3', '중2', '중1', '초등', '성인', '기타'];
    m.body.innerHTML = '<div class="col" style="gap:12px"><label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">학년</span><div class="well seg" style="flex-wrap:wrap">' + grades.map(function (g) { return '<button type="button" data-g="' + g + '" class="' + ((f ? f.grade : '고3') === g ? 'on' : '') + '">' + g + '</button>'; }).join('') + '</div></label>'
      + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">교재 · 폴더 이름</span><input class="inp" id="wt-fname" value="' + esc(f ? f.name : '') + '" placeholder="예: 정석 VOCA 수능필수 2000" style="height:46px;padding:0 14px;font-size:14px;font-weight:700"></label></div>';
    var g = f ? f.grade : '고3';
    m.body.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { g = b.dataset.g; m.body.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    m.foot.innerHTML = '<button type="button" class="s" data-n style="height:44px;padding:0 16px">취소</button><button type="button" class="p" data-y style="height:44px;padding:0 20px">' + (f ? '저장' : '만들기') + '</button>';
    m.foot.querySelector('[data-n]').onclick = m.close;
    m.foot.querySelector('[data-y]').onclick = function () {
      var name = m.body.querySelector('#wt-fname').value.trim(); if (!name) { U.toast('폴더 이름을 적어 주세요'); return; }
      (f ? DB.upd('wordFolders', f.id, { name: name, grade: g }) : DB.add('wordFolders', { name: name, grade: g, order: Date.now() })).then(function (r) { m.close(); if (!f && r && r.id) S.folderId = r.id; refresh(); });
    };
    setTimeout(function () { m.body.querySelector('#wt-fname').focus(); }, 50);
  }

  function editTest(t) {
    var m = U.modal({ title: '시험 수정', eyebrow: 'EDIT', width: 640 });
    var type = t.type || 'mc', pct = t.cutPct != null ? t.cutPct : 80, cmode = t.cutWrong != null ? 'w' : 'p', wrong = t.cutWrong != null ? t.cutWrong : 2;
    var wordsTxt = (t.words || []).map(function (w) { return w.en + '\t' + w.ko; }).join('\n');
    m.body.innerHTML = '<div class="col" style="gap:14px">'
      + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">시험 이름</span><input class="inp" id="wt-et" value="' + esc(t.title) + '" style="height:44px;padding:0 14px;font-size:14px;font-weight:700"></label>'
      + '<div class="row" style="gap:12px;flex-wrap:wrap"><div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">유형</span><div class="well seg"><button type="button" data-ty="mc" class="' + (type === 'mc' ? 'on' : '') + '">객관식 5지선다</button><button type="button" data-ty="sa" class="' + (type === 'sa' ? 'on' : '') + '">주관식</button></div></div>'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">커트라인</span><div class="row" style="gap:8px;flex-wrap:wrap"><div class="well seg"><button type="button" data-cm="w" class="' + (cmode === 'w' ? 'on' : '') + '">오답 개수</button><button type="button" data-cm="p" class="' + (cmode === 'p' ? 'on' : '') + '">% 기준</button></div><span class="row" data-cmw style="gap:6px;' + (cmode === 'w' ? '' : 'display:none') + '"><span style="font-size:13px">오답</span><input class="inp" id="wt-ew2" type="number" min="0" max="50" value="' + wrong + '" style="width:64px;height:42px;padding:0 8px;font-size:14px;font-weight:800;text-align:center"><span style="font-size:13px">개까지 통과</span></span><span class="row" data-cmp style="gap:6px;' + (cmode === 'p' ? '' : 'display:none') + '"><input class="inp" id="wt-ep" type="number" min="0" max="100" value="' + pct + '" style="width:80px;height:42px;padding:0 10px;font-size:14px;font-weight:800;text-align:center"><span style="font-size:13px">% 이상 통과</span></span></div></div>'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">폴더</span><select class="inp" id="wt-ef" style="height:42px;padding:0 10px;font-size:13px">' + D.folders.map(function (f) { return '<option value="' + f.id + '"' + (f.id === t.folderId ? ' selected' : '') + '>' + esc((f.grade ? f.grade + ' · ' : '') + f.name) + '</option>'; }).join('') + '</select></div></div>'
      + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">단어 (한 줄에 하나 · 영어 뜻)</span><textarea class="inp" id="wt-ew" style="height:240px;padding:12px;font:13px/1.7 \'JetBrains Mono\',monospace;resize:vertical">' + esc(wordsTxt) + '</textarea></label></div>';
    m.body.querySelectorAll('[data-ty]').forEach(function (b) { b.onclick = function () { type = b.dataset.ty; m.body.querySelectorAll('[data-ty]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    m.body.querySelectorAll('[data-cm]').forEach(function (b) { b.onclick = function () { cmode = b.dataset.cm; m.body.querySelectorAll('[data-cm]').forEach(function (x) { x.classList.toggle('on', x === b); }); m.body.querySelector('[data-cmw]').style.display = cmode === 'w' ? '' : 'none'; m.body.querySelector('[data-cmp]').style.display = cmode === 'p' ? '' : 'none'; }; });
    m.foot.innerHTML = '<button type="button" class="s" data-n style="height:44px;padding:0 16px">취소</button><button type="button" class="p" data-y style="height:44px;padding:0 20px">저장</button>';
    m.foot.querySelector('[data-n]').onclick = m.close;
    m.foot.querySelector('[data-y]').onclick = function () {
      var pw = WT.parseWords(m.body.querySelector('#wt-ew').value);
      if (!pw.words.length) { U.toast('단어가 없어요'); return; }
      DB.upd('wordTests', t.id, { title: m.body.querySelector('#wt-et').value.trim() || t.title, type: type, cutPct: Math.max(0, Math.min(100, +m.body.querySelector('#wt-ep').value || 80)), cutWrong: cmode === 'w' ? Math.max(0, Math.min(50, Math.round(+m.body.querySelector('#wt-ew2').value || 0))) : null, folderId: m.body.querySelector('#wt-ef').value || t.folderId || null, words: pw.words })
        .then(function () { m.close(); U.toast('저장했어요'); refresh(); });
    };
  }

  /* -------------------------------------------------------- 새 단어 Test (붙여넣기 → 회차 나누기) */
  function openWizard(folderId) {
    var st = { step: 0, text: '', parsed: { words: [], dup: 0, noMeaning: 0 }, per: 30, order: 'seq', rule: '', start: 1, folderId: folderId || (S.folderId !== 'all' ? S.folderId : (D.folders[0] && D.folders[0].id)) || '', type: 'mc', pct: 80, cmode: 'w', wrong: 2, names: {} };
    var f0 = folderById(st.folderId); st.rule = (f0 ? f0.name.replace(/\s*\d{3,4}$/, '') : '단어') + ' {회차}일차';
    var m = U.modal({ title: '새 단어 Test', eyebrow: 'NEW TEST', width: 920, dismissable: false });
    function rounds() {
      var ws = st.order === 'mix' ? (st._mix || (st._mix = U.shuffle(st.parsed.words))) : st.parsed.words;
      var out = [], n = Math.max(1, st.per | 0);
      for (var i = 0; i < ws.length; i += n) {
        var k = out.length, no = st.start + k;
        var nm = st.names[k] != null ? st.names[k] : st.rule.replace(/\{회차\}/g, no).replace(/\{시작번호\}/g, i + 1).replace(/\{끝번호\}/g, Math.min(i + n, ws.length));
        out.push({ title: nm, words: ws.slice(i, i + n), range: (i + 1) + '~' + Math.min(i + n, ws.length) });
      }
      return out;
    }
    function prevHtml() {
      var pv = st.parsed.words;
      return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
          + [['인식한 단어', pv.length, '#1A1010'], ['중복 제외', st.parsed.dup, '#8A7B7B'], ['뜻 빠짐', st.parsed.noMeaning, st.parsed.noMeaning ? '#A65A12' : '#8A7B7B']].map(function (x) { return '<div class="card" style="padding:10px 12px;border-radius:14px"><div style="font-size:10.5px;color:#8A7B7B">' + x[0] + '</div><div class="serif" style="font-size:22px;color:' + x[2] + '">' + x[1] + '</div></div>'; }).join('')
          + '</div><div class="card scroll" style="max-height:286px;padding:4px 0">' + (pv.length ? pv.slice(0, 200).map(function (w, i) { return '<div class="row" style="padding:8px 14px;box-shadow:inset 0 -1px 0 #F6EFED;gap:10px' + (w.ko ? '' : ';background:#FFF8F0') + '"><span style="font:11px ui-monospace,monospace;color:#A89898;width:28px">' + String(i + 1).padStart(3, '0') + '</span><b style="font-size:13px;min-width:110px">' + esc(w.en) + '</b><span style="font-size:12px;color:' + (w.ko ? '#5A4848' : '#A65A12') + '">' + esc(w.ko || '뜻이 비어 있어요') + '</span></div>'; }).join('') + (pv.length > 200 ? '<div style="padding:8px 14px;font-size:11px;color:#8A7B7B">… 외 ' + (pv.length - 200) + '개</div>' : '') : '<div style="padding:40px 16px;text-align:center;font-size:12px;color:#A89898">붙여넣으면 여기에 미리 보여요</div>') + '</div>';
    }
    function steps() { return '<div class="wt-steps" style="margin-bottom:16px">' + ['단어 올리기', '회차 나누기', '유형 · 커트'].map(function (t, i) { return '<div class="' + (i === st.step ? 'on' : i < st.step ? 'done' : '') + '"><i></i><span>' + (i + 1) + '. ' + t + '</span></div>'; }).join('') + '</div>'; }
    function draw() {
      var b = m.body, h = steps();
      if (st.step === 0) {
        var pv = st.parsed.words;
        h += '<div class="row" style="align-items:stretch;gap:14px;flex-wrap:wrap"><div class="col" style="flex:1.3;min-width:280px;gap:10px">'
          + '<div class="col" style="gap:4px"><span class="serif" style="font-size:20px">단어를 한 번에 올려 주세요</span><span style="font-size:12.5px;color:#7A6060;line-height:1.6">엑셀·PDF·한글에서 복사해 붙여넣으세요. 번호·탭·하이픈·쉼표 어떤 형식이든 한 줄에 단어 하나씩 자동으로 나눠요.</span></div>'
          + '<textarea class="inp" id="wt-paste" placeholder="001 abandon 버리다, 포기하다&#10;002 abundant 풍부한&#10;003 accomplish 성취하다" style="height:300px;padding:14px;font:13px/1.75 \'JetBrains Mono\',ui-monospace,monospace;resize:vertical">' + esc(st.text) + '</textarea>'
          + '<div class="row"><label class="s" style="height:38px;padding:0 14px;font-size:12px;cursor:pointer">엑셀 · CSV 파일<input type="file" id="wt-file" accept=".csv,.txt,.tsv" style="display:none"></label><span style="font-size:11px;color:#8A7B7B">뜻이 여러 개면 하나만 맞혀도 정답이에요</span></div></div>'
          + '<div class="col" id="wt-prevcol" style="flex:1;min-width:260px;gap:10px">' + prevHtml() + '</div></div>';
      } else if (st.step === 1) {
        var rs = rounds(), n = st.parsed.words.length, rem = n % st.per;
        h += '<div class="row" style="gap:16px;align-items:flex-start;flex-wrap:wrap"><div class="col" style="flex:1;min-width:300px;gap:14px">'
          + '<div class="card" style="padding:18px;background:linear-gradient(150deg,#8E2626,#5A1414);color:#fff;box-shadow:0 18px 30px -16px rgba(90,20,20,.6)"><div style="font-size:12px;color:#F3D2C8;margin-bottom:8px">' + n + '단어를</div><div class="row" style="gap:12px;flex-wrap:wrap"><div class="row" style="background:#fff;border-radius:12px;height:46px;box-shadow:inset 0 0 0 1px rgba(255,214,205,.6)"><button type="button" data-per="-5" style="width:42px;height:46px;border:0;background:transparent;font:800 18px sans-serif;color:#7B1D1D;cursor:pointer">−</button><input id="wt-per" type="number" min="1" value="' + st.per + '" style="width:54px;border:0;text-align:center;font:700 20px \'Noto Serif KR\',serif;color:#1A1010;outline:none;background:transparent"><button type="button" data-per="5" style="width:42px;height:46px;border:0;background:transparent;font:800 18px sans-serif;color:#7B1D1D;cursor:pointer">+</button></div><span style="font-size:15px;font-weight:700">개씩 →</span><span class="serif" style="font-size:28px;color:#FFE1D6">' + rs.length + '회차</span></div><div style="font-size:11.5px;color:#F3D2C8;margin-top:8px">' + (rem ? '마지막 회차는 ' + rem + '단어예요' : '남는 단어 없이 딱 나눠져요') + '</div></div>'
          + '<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">'
          + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">이름 규칙</span><input class="inp" id="wt-rule" value="' + esc(st.rule) + '" style="height:44px;padding:0 12px;font-size:14px;font-weight:700"></label>'
          + '<div class="row" style="flex-wrap:wrap;gap:6px">' + ['{회차}', '{시작번호}', '{끝번호}'].map(function (t) { return '<button type="button" class="chip" data-tok="' + t + '" style="padding:6px 11px;font-size:11.5px;font-weight:800;color:#7B1D1D;cursor:pointer">+ ' + t.replace(/[{}]/g, '') + '</button>'; }).join('') + '</div>'
          + '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><div class="row"><span style="font-size:12px;color:#5A4848">회차 시작 번호</span><input class="inp" id="wt-start" type="number" min="0" value="' + st.start + '" style="width:70px;height:36px;text-align:center;font-weight:800"></div><div class="well seg"><button type="button" data-ord="seq" class="' + (st.order === 'seq' ? 'on' : '') + '">올린 순서대로</button><button type="button" data-ord="mix" class="' + (st.order === 'mix' ? 'on' : '') + '">섞어서</button></div></div>'
          + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">저장할 폴더</span><div class="row"><select class="inp" id="wt-fold" style="flex:1;height:42px;padding:0 10px;font-size:13px">' + (D.folders.length ? '' : '<option value="">폴더 없음</option>') + D.folders.map(function (f) { return '<option value="' + f.id + '"' + (f.id === st.folderId ? ' selected' : '') + '>' + esc((f.grade ? f.grade + ' · ' : '') + f.name) + '</option>'; }).join('') + '</select><button type="button" class="s" data-newf style="height:42px;padding:0 12px;font-size:12px">' + sv('plus', '#5A4848', 13) + '새 폴더</button></div></label>'
          + '</div></div>'
          + '<div class="card" style="flex:1;min-width:280px;overflow:hidden"><div class="row" style="justify-content:space-between;padding:12px 16px;box-shadow:inset 0 -1px 0 #F1E8E5"><b style="font-size:13px">만들어질 시험 ' + rs.length + '개</b><span style="font-size:11px;color:#8A7B7B">이름을 눌러 하나씩 바꿀 수 있어요</span></div><div class="scroll" style="max-height:380px">'
          + rs.map(function (r, i) { return '<div class="row" style="padding:8px 14px;box-shadow:inset 0 -1px 0 #F6EFED;gap:10px"><span style="width:26px;height:26px;border-radius:13px;background:#F6EEEC;color:#7B1D1D;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">' + (i + 1) + '</span><input class="inp" data-name="' + i + '" value="' + esc(r.title) + '" style="flex:1;height:34px;padding:0 10px;font-size:13px;font-weight:700;box-shadow:none;background:transparent"><span style="font-size:11px;color:#8A7B7B;white-space:nowrap">' + r.range + '번 · ' + esc((r.words[0] || {}).en || '') + ' …</span></div>'; }).join('')
          + '</div></div></div>';
      } else {
        var rs2 = rounds(), n0 = (rs2[0] || { words: [] }).words.length;
        h += '<div class="col" style="gap:14px;max-width:620px">'
          + '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px"><span style="font-size:13px;font-weight:800">시험 유형</span><div class="row" style="gap:10px;flex-wrap:wrap">'
          + [['mc', '객관식 5지선다', '영어 단어를 보고 알맞은 뜻 고르기'], ['sa', '주관식', '영어 단어를 보고 뜻 직접 쓰기 · 띄어쓰기 무시']].map(function (o) { var on = st.type === o[0]; return '<button type="button" data-type="' + o[0] + '" class="' + (on ? 'p' : 's') + '" style="flex:1;min-width:200px;height:auto;padding:14px 16px;flex-direction:column;align-items:flex-start;gap:3px;text-align:left"><span style="font-size:14px">' + o[1] + '</span><span style="font-size:11.5px;font-weight:500;opacity:.8;white-space:normal">' + o[2] + '</span></button>'; }).join('') + '</div></div>'
          + '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><span style="font-size:13px;font-weight:800">커트라인 (통과 기준)</span><div class="well seg"><button type="button" data-cm="w" class="' + (st.cmode === 'w' ? 'on' : '') + '">오답 개수</button><button type="button" data-cm="p" class="' + (st.cmode === 'p' ? 'on' : '') + '">% 기준</button></div></div>'
            + (st.cmode === 'w' ? '<div class="row" style="gap:12px;flex-wrap:wrap"><input type="range" id="wt-wr" min="0" max="10" step="1" value="' + st.wrong + '" style="flex:1;accent-color:#7B1D1D"><span class="serif" id="wt-wrv" style="font-size:20px;color:#7B1D1D;min-width:170px">오답 ' + st.wrong + '개까지 · ' + Math.max(0, n0 - st.wrong) + ' / ' + n0 + '</span></div>'
            : '<div class="row" style="gap:12px;flex-wrap:wrap"><input type="range" id="wt-pct" min="50" max="100" step="5" value="' + st.pct + '" style="flex:1;accent-color:#7B1D1D"><span class="serif" id="wt-pctv" style="font-size:20px;color:#7B1D1D;min-width:150px">' + st.pct + '% · ' + Math.ceil(n0 * st.pct / 100) + ' / ' + n0 + '</span></div>') + '<span style="font-size:11.5px;color:#8A7B7B">못 넘으면 담당 선생님께 바로 알림이 가고, 틀린 단어로 재시험이 자동으로 배정돼요.</span></div>'
          + '<div class="card" style="padding:14px 18px;font-size:13px;line-height:1.7;color:#3D2B2B">' + rs2.length + '개 시험이 <b>' + esc((folderById(st.folderId) || {}).name || '폴더 없음') + '</b> 폴더에 만들어져요. 만든 뒤 <b>예약 · 배정</b>에서 학생에게 하루 하나씩 내줄 수 있어요.</div>'
          + '</div>';
      }
      b.innerHTML = h;
      bind();
      m.foot.innerHTML = (st.step ? '<button type="button" class="s" data-prev style="height:46px;padding:0 18px">이전</button>' : '<button type="button" class="s" data-cancel style="height:46px;padding:0 18px">취소</button>')
        + '<button type="button" class="p" data-next style="height:46px;padding:0 22px;font-size:14px"' + (st.step === 0 && !st.parsed.words.length ? ' disabled' : '') + '>' + (st.step === 0 ? '다음 · 회차 나누기' : st.step === 1 ? '다음 · 유형과 커트라인' : rounds().length + '개 시험 만들기') + '</button>';
      var c = m.foot.querySelector('[data-cancel]'); if (c) c.onclick = function () { if (!st.parsed.words.length) { m.close(); return; } U.confirmBox('입력한 내용이 사라져요. 닫을까요?', '닫기').then(function (ok) { if (ok) m.close(); }); };
      var p = m.foot.querySelector('[data-prev]'); if (p) p.onclick = function () { st.step--; draw(); };
      m.foot.querySelector('[data-next]').onclick = function () {
        if (st.step === 0 && st.parsed.noMeaning) { U.confirmBox('뜻이 비어 있는 단어가 ' + st.parsed.noMeaning + '개 있어요. 그대로 진행할까요?<br><span style="font-size:12px;color:#8A7B7B">뜻 없는 단어는 시험에서 빠져요.</span>', '진행').then(function (ok) { if (ok) { st.parsed.words = st.parsed.words.filter(function (w) { return w.ko; }); st.parsed.noMeaning = 0; st.step = 1; draw(); } }); return; }
        if (st.step === 1 && !st.folderId) { U.toast('저장할 폴더를 먼저 만들어 주세요'); return; }
        if (st.step < 2) { st.step++; draw(); return; }
        create(this);
      };
    }
    function bind() {
      var b = m.body, ta = b.querySelector('#wt-paste');
      if (ta) {
        ta.oninput = function () { st.text = ta.value; st.parsed = WT.parseWords(ta.value); st._mix = null; m.body.querySelector('#wt-prevcol').innerHTML = prevHtml(); var nx = m.foot.querySelector('[data-next]'); if (nx) nx.disabled = !st.parsed.words.length; };
        var fi = b.querySelector('#wt-file'); fi.onchange = function () { var file = fi.files[0]; if (!file) return; file.text().then(function (t) { st.text = t.replace(/,/g, '\t').replace(/"/g, ''); st.parsed = WT.parseWords(st.text); draw(); }); };
      }
      var per = b.querySelector('#wt-per');
      if (per) {
        per.onchange = function () { st.per = Math.max(1, per.value | 0); st.names = {}; draw(); };
        b.querySelectorAll('[data-per]').forEach(function (x) { x.onclick = function () { st.per = Math.max(1, st.per + (+x.dataset.per)); st.names = {}; draw(); }; });
        var rule = b.querySelector('#wt-rule'); rule.onchange = function () { st.rule = rule.value; st.names = {}; draw(); };
        b.querySelectorAll('[data-tok]').forEach(function (x) { x.onclick = function () { st.rule = (rule.value + ' ' + x.dataset.tok).replace(/\s+/g, ' ').trim(); st.names = {}; draw(); }; });
        var stt = b.querySelector('#wt-start'); stt.onchange = function () { st.start = stt.value | 0; st.names = {}; draw(); };
        b.querySelectorAll('[data-ord]').forEach(function (x) { x.onclick = function () { st.order = x.dataset.ord; st._mix = null; draw(); }; });
        var fo = b.querySelector('#wt-fold'); fo.onchange = function () { st.folderId = fo.value; };
        b.querySelectorAll('[data-name]').forEach(function (x) { x.onchange = function () { st.names[+x.dataset.name] = x.value; }; });
        b.querySelector('[data-newf]').onclick = function () {
          var name = prompt('새 폴더 이름 (예: 정석 VOCA 수능필수 2000)'); if (!name) return;
          var grade = prompt('학년 (예: 고3)', '고3') || '';
          DB.add('wordFolders', { name: name.trim(), grade: grade.trim(), order: Date.now() }).then(function (r) { return DB.folders().then(function (fs) { D.folders = fs; st.folderId = r.id; draw(); }); });
        };
      }
      b.querySelectorAll('[data-type]').forEach(function (x) { x.onclick = function () { st.type = x.dataset.type; draw(); }; });
      b.querySelectorAll('[data-cm]').forEach(function (x) { x.onclick = function () { st.cmode = x.dataset.cm; draw(); }; });
      var wr = b.querySelector('#wt-wr');
      if (wr) wr.oninput = function () { st.wrong = +wr.value; var n0 = (rounds()[0] || { words: [] }).words.length; b.querySelector('#wt-wrv').textContent = '오답 ' + st.wrong + '개까지 · ' + Math.max(0, n0 - st.wrong) + ' / ' + n0; };
      var pct = b.querySelector('#wt-pct');
      if (pct) pct.oninput = function () { st.pct = +pct.value; var n0 = (rounds()[0] || { words: [] }).words.length; b.querySelector('#wt-pctv').textContent = st.pct + '% · ' + Math.ceil(n0 * st.pct / 100) + ' / ' + n0; };
    }
    function create(btn) {
      btn.disabled = true; btn.textContent = '만드는 중...';
      var rs = rounds(), base = Date.now();
      var list = rs.map(function (r, i) { return { title: r.title.trim() || ('단어 ' + (i + 1)), words: r.words, folderId: st.folderId, type: st.type, cutPct: st.pct, cutWrong: st.cmode === 'w' ? st.wrong : null, order: base + i, kind: 'normal', createdBy: ME().uid, createdByName: (ME().profile || {}).name || '' }; });
      var chunks = []; for (var i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
      chunks.reduce(function (pr, ch) { return pr.then(function () { return DB.batchAdd('wordTests', ch); }); }, Promise.resolve()).then(function () {
        m.close(); U.toast(list.length + '개 시험을 만들었어요'); S.view = 'list'; S.folderId = st.folderId; refresh();
      }).catch(function (e) { btn.disabled = false; btn.textContent = '다시 시도'; U.toast('만들지 못했어요: ' + (e.message || e)); });
    }
    draw();
  }
  WT.openWizard = openWizard;

  /* -------------------------------------------------------- 예약 · 배정 (2안) */
  var SC = null;
  function scDefault() {
    var fid = (S.folderId !== 'all' && S.folderId) || (D.folders[0] && D.folders[0].id) || '';
    var tests = folderTests(fid), firstOpen = 0;
    // 아직 한 번도 예약하지 않은 첫 회차부터
    for (var i = 0; i < tests.length; i++) { if (!D.assigns.some(function (a) { return a.testId === tests[i].id; })) { firstOpen = i; break; } }
    return { sub: 'new', students: [], folderId: fid, from: firstOpen, to: Math.min(tests.length - 1, firstOpen + 12), start: U.addDays(U.todayStr(), 1), days: [1, 2, 3, 4, 5, 6], perDay: 1, hour: 16, retestFirst: true, review5: true, lateAlert: true };
  }
  function folderTests(fid) { return D.tests.filter(function (t) { return t.folderId === fid && t.kind !== 'retest' && t.kind !== 'review'; }); }
  function plan() {
    var tests = folderTests(SC.folderId).slice(SC.from, SC.to + 1), out = [], d = SC.start, guard = 0, k = 0, sinceReview = [];
    if (!tests.length || !SC.days.length) return out;
    while (k < tests.length && guard++ < 400) {
      var dow = U.parseYmd(d).getDay();
      if (SC.days.indexOf(dow) >= 0) {
        if (SC.review5 && sinceReview.length >= 5) {
          var src = sinceReview.splice(0);
          out.push({ date: d, kind: 'review', title: '오답 모음 (' + shortNo(src[0]) + '~' + shortNo(src[src.length - 1]) + ')', sourceTestIds: src.map(function (t) { return t.id; }), type: src[0].type, cutPct: src[0].cutPct, cutWrong: src[0].cutWrong != null ? src[0].cutWrong : null });
        } else {
          for (var n = 0; n < SC.perDay && k < tests.length; n++) { var t = tests[k++]; out.push({ date: d, kind: 'normal', test: t, title: t.title }); sinceReview.push(t); }
        }
      }
      d = U.addDays(d, 1);
    }
    return out;
  }
  function shortNo(t) { var m = String(t.title || '').match(/(\d+)\s*(일차|회|강|day)?\s*$/i); return m ? m[1] + (m[2] || '') : t.title; }

  function viewSched(v) {
    if (!SC) SC = scDefault();
    var sub = '<div class="well seg" style="display:inline-flex;margin-bottom:14px"><button type="button" data-sub="new" class="' + (SC.sub === 'new' ? 'on' : '') + '">새 예약</button><button type="button" data-sub="stat" class="' + (SC.sub === 'stat' ? 'on' : '') + '">배정 현황</button></div>';
    v.innerHTML = sub + '<div id="wt-sc"></div>';
    v.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { SC.sub = b.dataset.sub; render(); }; });
    var box = v.querySelector('#wt-sc');
    if (SC.sub === 'new') schedNew(box); else schedStat(box);
  }
  function schedNew(box) {
    var tests = folderTests(SC.folderId), pl = plan(), f = folderById(SC.folderId);
    var end = pl.length ? pl[pl.length - 1].date : '';
    var nTests = pl.filter(function (x) { return x.kind === 'normal'; }).length;
    var names = SC.students.map(stuName);
    var left = '<div class="card" style="padding:22px;background:radial-gradient(130% 120% at 10% 0%,#9A2F2F,#6A1717 60%,#4E1010);color:#fff;box-shadow:0 22px 40px -20px rgba(80,15,15,.7);display:flex;flex-direction:column;gap:16px">'
      + '<div class="col" style="gap:4px"><span class="eb" style="color:#F3D2C8">DAILY SERIES</span><span class="serif" style="font-size:21px;line-height:1.35">' + esc(f ? f.name : '폴더를 골라 주세요') + (tests.length ? '<br><span style="font-size:15px;color:#FFE1D6">' + esc(shortNo(tests[SC.from] || {})) + ' ~ ' + esc(shortNo(tests[SC.to] || {})) + '</span>' : '') + '</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + [['시험', nTests + '<span style="font-size:12px"> 개</span>'], ['학생', SC.students.length + '<span style="font-size:12px"> 명</span>'], ['시작', SC.start ? U.md(SC.start) : '—'], ['끝 (예정)', end ? U.md(end) : '—']].map(function (x, i) { return '<div class="col" style="gap:2px"><span style="font-size:11px;color:#F3D2C8">' + x[0] + '</span><span class="' + (i < 2 ? 'serif' : '') + '" style="font-size:' + (i < 2 ? 24 : 15) + 'px;font-weight:800' + (i === 3 ? ';color:#FFE1D6' : '') + '">' + x[1] + '</span></div>'; }).join('')
      + '</div>'
      + '<div style="border-top:1px solid rgba(255,214,205,.25);padding-top:12px;display:flex;flex-direction:column;gap:5px;max-height:220px;overflow:auto" class="scroll">'
      + (pl.length ? pl.slice(0, 40).map(function (x) { return '<div class="row" style="font-size:12px;gap:10px"><span style="width:7px;height:7px;border-radius:4px;background:' + (x.kind === 'review' ? '#F3C9A8' : '#fff') + ';flex:none"></span><span style="color:#F3D2C8;width:58px;flex:none">' + U.md(x.date) + '</span><span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.title) + '</span></div>'; }).join('') : '<span style="font-size:12px;color:#F3D2C8">설정을 고르면 날짜별 미리보기가 나와요</span>')
      + '</div>'
      + '<button type="button" class="g" data-go style="height:50px;font-size:14px;margin-top:auto"' + (!pl.length || !SC.students.length ? ' disabled' : '') + '>' + SC.students.length + '명 · ' + nTests + '개 예약하기</button></div>';
    var rowS = 'display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 16px;box-shadow:inset 0 -1px 0 #F6EFED';
    var lab = function (t) { return '<span style="font-size:12.5px;color:#8A7B7B;width:86px;flex:none">' + t + '</span>'; };
    var right = '<div class="col" style="gap:14px"><div class="card" style="overflow:hidden">'
      + '<div style="' + rowS + '">' + lab('받는 학생') + '<div style="flex:1;font-size:13px;font-weight:700;line-height:1.5">' + (names.length ? esc(names.slice(0, 6).join(', ')) + (names.length > 6 ? ' 외 ' + (names.length - 6) + '명' : '') : '<span style="color:#A89898;font-weight:500">아직 없음</span>') + '</div><button type="button" class="s" data-pick style="height:34px;padding:0 12px;font-size:12px">' + sv('plus', '#5A4848', 13) + '학생 고르기</button></div>'
      + '<div style="' + rowS + '">' + lab('교재 폴더') + '<select class="inp" data-k="folderId" style="flex:1;height:38px;padding:0 10px;font-size:13px;font-weight:700">' + D.folders.map(function (x) { return '<option value="' + x.id + '"' + (x.id === SC.folderId ? ' selected' : '') + '>' + esc((x.grade ? x.grade + ' · ' : '') + x.name) + '</option>'; }).join('') + '</select></div>'
      + '<div style="' + rowS + '">' + lab('시험 범위') + '<select class="inp" data-k="from" style="flex:1;height:38px;padding:0 8px;font-size:13px">' + tests.map(function (t, i) { return '<option value="' + i + '"' + (i === SC.from ? ' selected' : '') + '>' + esc(t.title) + '</option>'; }).join('') + '</select><span style="font-size:12px">~</span><select class="inp" data-k="to" style="flex:1;height:38px;padding:0 8px;font-size:13px">' + tests.map(function (t, i) { return '<option value="' + i + '"' + (i === SC.to ? ' selected' : '') + '>' + esc(t.title) + '</option>'; }).join('') + '</select></div>'
      + '<div style="' + rowS + '">' + lab('시작일') + '<input type="date" class="inp" data-k="start" value="' + SC.start + '" style="height:38px;padding:0 10px;font-size:13px;font-weight:700"></div>'
      + '<div style="' + rowS + ';flex-wrap:wrap">' + lab('요일') + '<div class="row" style="gap:5px">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { var on = SC.days.indexOf(d) >= 0; return '<button type="button" data-day="' + d + '" class="' + (on ? 'p' : 's') + '" style="width:36px;height:36px;border-radius:18px;font-size:12px;padding:0">' + '일월화수목금토'[d] + '</button>'; }).join('') + '</div></div>'
      + '<div style="' + rowS + '">' + lab('하루에') + '<div class="row"><button type="button" class="ib" data-per="-1" aria-label="줄이기" style="width:34px;height:34px">−</button><span class="serif" style="font-size:18px;width:30px;text-align:center">' + SC.perDay + '</span><button type="button" class="ib" data-per="1" aria-label="늘리기" style="width:34px;height:34px">+</button><span style="font-size:13px">개씩</span></div></div>'
      + '<div style="' + rowS + '">' + lab('공개 · 마감') + '<select class="inp" data-k="hour" style="height:38px;padding:0 10px;font-size:13px;font-weight:700">' + [0, 6, 8, 10, 12, 14, 15, 16, 17, 18, 19, 20].map(function (h) { return '<option value="' + h + '"' + (h === SC.hour ? ' selected' : '') + '>' + (h === 0 ? '자정' : (h < 12 ? '오전 ' + h : '오후 ' + (h === 12 ? 12 : h - 12)) + '시') + '에 공개</option>'; }).join('') + '</select><span style="font-size:12.5px;color:#5A4848">그날 자정까지</span></div>'
      + '</div><div class="card" style="overflow:hidden">'
      + [['retestFirst', '통과 못 하면 재시험부터', '틀린 단어 재시험을 통과해야 다음 날 시험이 열려요'], ['review5', '5개마다 오답 모음 넣기', '그동안 틀린 단어만 모아 자동으로 끼워 넣어요'], ['lateAlert', '밀린 시험 알림', '하루라도 안 보면 밀림으로 표시하고, 매일 저녁 8시에 학생 폰으로 알림을 보내요']].map(function (r) {
        return '<div style="' + rowS + '"><div class="col" style="flex:1;gap:2px"><span style="font-size:13.5px;font-weight:800">' + r[1] + '</span><span style="font-size:11.5px;color:#8A7B7B">' + r[2] + '</span></div><button type="button" class="tog' + (SC[r[0]] ? '' : ' off') + '" data-tog="' + r[0] + '" aria-label="' + r[1] + '"><i></i></button></div>';
      }).join('') + '</div></div>';
    box.innerHTML = '<div style="display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:14px;align-items:start" class="wt-sc-grid">' + left + right + '</div><style>@media(max-width:900px){.wt-sc-grid{grid-template-columns:1fr!important}}</style>';
    box.querySelectorAll('[data-k]').forEach(function (el) {
      el.onchange = function () {
        var k = el.dataset.k, val = el.value;
        if (k === 'folderId') { SC.folderId = val; var n = folderTests(val).length; SC.from = 0; SC.to = Math.min(n - 1, 12); }
        else if (k === 'from' || k === 'to' || k === 'hour') { SC[k] = +val; if (SC.to < SC.from) SC.to = SC.from; }
        else SC[k] = val;
        render();
      };
    });
    box.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { var d = +b.dataset.day, i = SC.days.indexOf(d); if (i >= 0) SC.days.splice(i, 1); else SC.days.push(d); render(); }; });
    box.querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () { SC.perDay = Math.max(1, Math.min(5, SC.perDay + (+b.dataset.per))); render(); }; });
    box.querySelectorAll('[data-tog]').forEach(function (b) { b.onclick = function () { SC[b.dataset.tog] = !SC[b.dataset.tog]; render(); }; });
    box.querySelector('[data-pick]').onclick = function () { pickStudents(SC.students, function (sel) { SC.students = sel; render(); }); };
    var go = box.querySelector('[data-go]'); if (go) go.onclick = function () { if (go.disabled) return; createSeries(pl, go); };
  }
  function pickStudents(sel, cb) {
    sel = sel.slice();
    var m = U.modal({ title: '받는 학생 고르기', eyebrow: 'STUDENTS', width: 560 });
    var qv = '';
    function draw() {
      var groups = {};
      D.students.filter(function (s) { return !qv || s.name.indexOf(qv) >= 0 || (s.school || '').indexOf(qv) >= 0; }).forEach(function (s) { (groups[s.grade || '기타'] = groups[s.grade || '기타'] || []).push(s); });
      m.body.querySelector('#wt-pl').innerHTML = Object.keys(groups).sort().reverse().map(function (g) {
        var all = groups[g].every(function (s) { return sel.indexOf(s.uid) >= 0; });
        return '<div class="row" style="justify-content:space-between;padding:10px 4px 6px"><b style="font-size:12px;color:#8A6A66">' + esc(g) + ' · ' + groups[g].length + '명</b><button type="button" class="chip" data-all="' + esc(g) + '" style="padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;color:#7B1D1D">' + (all ? '모두 빼기' : '모두 고르기') + '</button></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px">'
          + groups[g].map(function (s) { var on = sel.indexOf(s.uid) >= 0; return '<button type="button" data-s="' + s.uid + '" class="' + (on ? 'p' : 's') + '" style="height:42px;justify-content:flex-start;padding:0 12px;font-size:13px;gap:8px"><span style="width:16px;height:16px;border-radius:5px;' + (on ? 'background:#fff;color:#7B1D1D' : 'box-shadow:inset 0 0 0 1.5px #D9C9C5') + ';display:flex;align-items:center;justify-content:center">' + (on ? sv('check', '#7B1D1D', 11, 3) : '') + '</span>' + esc(s.name) + '<span style="font-size:10.5px;opacity:.7;font-weight:500;overflow:hidden;text-overflow:ellipsis">' + esc(s.school || '') + '</span></button>'; }).join('') + '</div>';
      }).join('') || '<div style="padding:30px;text-align:center;color:#A89898;font-size:13px">학생이 없어요</div>';
      m.foot.querySelector('[data-y]').textContent = sel.length + '명 선택';
      m.body.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { var i = sel.indexOf(b.dataset.s); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.s); draw(); }; });
      m.body.querySelectorAll('[data-all]').forEach(function (b) { b.onclick = function () { var g = groups[b.dataset.all], all = g.every(function (s) { return sel.indexOf(s.uid) >= 0; }); g.forEach(function (s) { var i = sel.indexOf(s.uid); if (all && i >= 0) sel.splice(i, 1); if (!all && i < 0) sel.push(s.uid); }); draw(); }; });
    }
    m.body.innerHTML = '<input class="inp" id="wt-pq" placeholder="이름 · 학교 검색" style="width:100%;height:42px;padding:0 14px;font-size:13px;margin-bottom:4px"><div id="wt-pl"></div>';
    m.foot.innerHTML = '<button type="button" class="s" data-n style="height:44px;padding:0 16px">취소</button><button type="button" class="p" data-y style="height:44px;padding:0 20px"></button>';
    m.foot.querySelector('[data-n]').onclick = m.close;
    m.foot.querySelector('[data-y]').onclick = function () { m.el.remove(); cb(sel); };
    m.body.querySelector('#wt-pq').oninput = function (e) { qv = e.target.value.trim(); draw(); };
    draw();
  }
  function createSeries(pl, btn) {
    btn.disabled = true; btn.textContent = '예약하는 중...';
    var me = ME(), f = folderById(SC.folderId);
    var series = { title: (f ? f.name : '단어') + ' ' + shortNo(pl.filter(function (x) { return x.kind === 'normal'; })[0].test) + '~' + shortNo(pl.filter(function (x) { return x.kind === 'normal'; }).slice(-1)[0].test), folderId: SC.folderId, studentUids: SC.students, start: SC.start, end: pl[pl.length - 1].date, days: SC.days, perDay: SC.perDay, hour: SC.hour, rules: { retestFirst: SC.retestFirst, review5: SC.review5, lateAlert: SC.lateAlert }, count: pl.length, createdBy: me.uid, createdByName: (me.profile || {}).name || '' };
    DB.add('wordSeries', series).then(function (ref) {
      var list = [];
      SC.students.forEach(function (uid) {
        pl.forEach(function (x, i) {
          var t = x.test || {};
          list.push({ studentUid: uid, studentName: stuName(uid), testId: x.kind === 'normal' ? t.id : null, sourceTestIds: x.sourceTestIds || null, title: x.title, folderId: SC.folderId, type: (x.kind === 'normal' ? t.type : x.type) || 'mc', cutPct: (x.kind === 'normal' ? t.cutPct : x.cutPct) || 80, cutWrong: (x.kind === 'normal' ? t.cutWrong : x.cutWrong) != null ? (x.kind === 'normal' ? t.cutWrong : x.cutWrong) : null, total: x.kind === 'normal' ? (t.words || []).length : null, date: x.date, openAt: U.kstMs(x.date, SC.hour), dueAt: U.kstMs(x.date, 23, 59), status: 'assigned', kind: x.kind, seriesId: ref.id, seq: i, retestFirst: SC.retestFirst, teacherUid: me.uid, teacherName: (me.profile || {}).name || '', attempts: 0 });
        });
      });
      var chunks = []; for (var i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
      return chunks.reduce(function (pr, ch) { return pr.then(function () { return DB.batchAdd('wordAssign', ch); }); }, Promise.resolve()).then(function () { return ref.id; });
    }).then(function (sid) { U.toast('예약했어요 · ' + list0(pl) + '개 × ' + SC.students.length + '명'); SC.sub = 'stat'; SC.statSeries = sid; SC.students = []; refresh(); })
      .catch(function (e) { btn.disabled = false; btn.textContent = '다시 시도'; U.toast('예약하지 못했어요: ' + (e.message || e)); });
  }
  function list0(pl) { return pl.length; }

  function schedStat(box) {
    var today = U.todayStr();
    var sers = D.series.slice().sort(function (a, b) { return U.tsMs(b.createdAt) - U.tsMs(a.createdAt); });
    if (!sers.length) { box.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:#8A7B7B;font-size:13px">아직 예약이 없어요. <b style="color:#7B1D1D">새 예약</b>에서 만들어 주세요.</div>'; return; }
    var sid = SC.statSeries && sers.some(function (s) { return s.id === SC.statSeries; }) ? SC.statSeries : sers[0].id;
    var se = sers.filter(function (s) { return s.id === sid; })[0];
    var as = D.assigns.filter(function (a) { return a.seriesId === sid; });
    var reAs = D.assigns.filter(function (a) { return a.kind === 'retest' && se.studentUids.indexOf(a.studentUid) >= 0 && a.status !== 'passed'; });
    var lanes = se.studentUids.map(function (uid) {
      var mine = as.filter(function (a) { return a.studentUid === uid; }).sort(function (a, b) { return a.date.localeCompare(b.date) || a.seq - b.seq; });
      var done = mine.filter(function (a) { return a.status === 'passed'; }).length;
      var late = mine.filter(function (a) { return a.date < today && a.status === 'assigned'; }).length;
      var re = reAs.filter(function (a) { return a.studentUid === uid; }).length + mine.filter(function (a) { return a.status === 'failed'; }).length;
      return { uid: uid, name: stuName(uid) || (mine[0] || {}).studentName || '', mine: mine, done: done, late: late, re: re };
    });
    var nRe = lanes.filter(function (l) { return l.re; }).length, nLate = lanes.filter(function (l) { return l.late; }).length;
    function blk(a) {
      var lbl = a.kind === 'review' ? '오답' : shortNo({ title: a.title });
      var c = a.status === 'passed' ? 'background:linear-gradient(180deg,#2A8250,#1B6B3A);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 8px -4px rgba(27,107,58,.6)'
        : a.status === 'failed' ? 'background:#FBEDEA;color:#9C2F2F;box-shadow:inset 0 0 0 1.5px #E3A9A0'
          : a.date < today ? 'background:linear-gradient(180deg,#922B2B,#6E1818);color:#fff'
            : a.date === today ? 'background:#fff;color:#7B1D1D;box-shadow:inset 0 0 0 2px #7B1D1D'
              : 'background:#F5F0EE;color:#A89898';
      var st = a.status === 'passed' ? '통과' : a.status === 'failed' ? '재시험' : a.date < today ? '밀림' : a.date === today ? '오늘' : U.md(a.date).split(' ')[0];
      return '<div title="' + esc(a.title + ' · ' + U.md(a.date)) + '" style="min-width:58px;height:46px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;' + c + '"><span style="font-size:12px;font-weight:800">' + esc(lbl) + '</span><span style="font-size:9.5px;opacity:.85">' + st + '</span></div>';
    }
    box.innerHTML = '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">' + sers.map(function (s) { return '<button type="button" class="' + (s.id === sid ? 'p' : 's') + '" data-ser="' + s.id + '" style="height:34px;padding:0 12px;font-size:12px">' + esc(s.title) + ' · ' + (s.studentUids || []).length + '명</button>'; }).join('') + '</div>'
      + '<div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="wt-kpis" style="flex:1;grid-template-columns:repeat(3,minmax(0,1fr))">' + kp('학생', lanes.length + '명', U.md(se.start) + ' ~ ' + U.md(se.end), '#1A1010') + kp('재시험', nRe + '명', '통과 못 한 학생', '#9C2F2F') + kp('밀림', nLate + '명', '지난 날짜에 안 본 학생', '#A65A12') + '</div>'
      + '<button type="button" class="s" data-delser style="height:40px;padding:0 14px;font-size:12px">' + sv('trash', '#9C2F2F', 13) + '남은 예약 취소</button></div>'
      + '<div class="col" style="gap:10px">' + lanes.map(function (l) {
        return '<div class="card" style="padding:12px 14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="row" style="width:150px;flex:none"><span class="av" style="width:34px;height:34px;font-size:13px">' + esc(l.name[0] || '?') + '</span><div class="col"><b style="font-size:14px">' + esc(l.name) + '</b><span style="font-size:11px;color:#8A7B7B"><b style="color:#1A1010">' + l.done + '</b> / ' + l.mine.length + ' 완료' + (l.late ? ' · <span style="color:#9C2F2F">밀림 ' + l.late + '</span>' : '') + '</span></div></div><div class="scroll" style="flex:1;min-width:0;display:flex;gap:5px;padding:2px 2px 6px">' + l.mine.map(blk).join('') + '</div></div>';
      }).join('') + '</div>';
    box.querySelectorAll('[data-ser]').forEach(function (b) { b.onclick = function () { SC.statSeries = b.dataset.ser; render(); }; });
    box.querySelector('[data-delser]').onclick = function () {
      var rest = as.filter(function (a) { return a.status === 'assigned'; });
      U.confirmBox('"' + esc(se.title) + '" 의 아직 안 본 예약 ' + rest.length + '건을 취소할까요?<br><span style="font-size:12px;color:#8A7B7B">이미 본 시험 결과는 그대로 남아요.</span>', '예약 취소').then(function (ok) {
        if (!ok) return;
        var fb = F(), chunks = []; for (var i = 0; i < rest.length; i += 400) chunks.push(rest.slice(i, i + 400));
        chunks.reduce(function (pr, ch) { return pr.then(function () { var b = fb.writeBatch(fb.db); ch.forEach(function (a) { b.delete(fb.doc(fb.db, 'wordAssign', a.id)); }); return b.commit(); }); }, Promise.resolve())
          .then(function () { return as.length === rest.length ? DB.del('wordSeries', sid) : null; }).then(function () { U.toast('취소했어요'); SC.statSeries = null; refresh(); });
      });
    };
  }

  /* -------------------------------------------------------- 결과 · 성적 */
  function firstResultMap() {
    var m = {};
    D.results.forEach(function (r) { if (!r.assignId) return; var c = m[r.assignId]; if (!c || U.tsMs(r.createdAt) < U.tsMs(c.createdAt)) m[r.assignId] = r; });
    return m;
  }
  function resultTests() {
    var seen = {}, out = [];
    D.results.forEach(function (r) { if (r.testId && !seen[r.testId] && testById(r.testId)) { seen[r.testId] = 1; out.push(testById(r.testId)); } });
    D.tests.forEach(function (t) { if (!seen[t.id] && t.kind !== 'retest' && D.assigns.some(function (a) { return a.testId === t.id; })) { seen[t.id] = 1; out.push(t); } });
    return out;
  }
  function viewResult(v) {
    var tests = resultTests();
    if (!S.resTestId || !testById(S.resTestId)) S.resTestId = tests[0] ? tests[0].id : null;
    var pending = D.results.filter(function (r) { return !r.passed && !r.handled; }).length;
    var tabs = [['student', '학생별'], ['word', '단어별 오답률'], ['heat', '점수 히트맵'], ['alert', '미통과 알림'], ['report', '개인 리포트']];
    var sel = (S.resView === 'heat' || S.resView === 'alert' || S.resView === 'report') ? '' :
      '<select class="inp" id="wt-rtest" style="height:40px;padding:0 12px;font-size:13px;font-weight:800;max-width:100%">' + (tests.length ? tests.map(function (t) { var f = folderById(t.folderId); return '<option value="' + t.id + '"' + (t.id === S.resTestId ? ' selected' : '') + '>' + esc(t.title) + (f ? ' · ' + esc(f.name) : '') + ' · ' + (t.type === 'sa' ? '주관식' : '객관식') + '</option>'; }).join('') : '<option>아직 결과가 없어요</option>') + '</select>';
    v.innerHTML = '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px"><div class="well seg scroll" style="max-width:100%">' + tabs.map(function (t) { return '<button type="button" data-rv="' + t[0] + '" class="' + (S.resView === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'alert' && pending ? '<span style="min-width:17px;height:17px;border-radius:9px;background:linear-gradient(180deg,#C25555,#9C2F2F);color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 5px">' + pending + '</span>' : '') + '</button>'; }).join('') + '</div><div class="row" style="gap:8px;flex-wrap:wrap">' + sel + '<button type="button" class="s" data-rprint style="height:40px;padding:0 14px;font-size:12.5px">' + sv('print', '#7B1D1D', 14) + '성적표 인쇄</button></div></div><div id="wt-rv"></div>';
    v.querySelectorAll('[data-rv]').forEach(function (b) { b.onclick = function () { S.resView = b.dataset.rv; render(); }; });
    var rs = v.querySelector('#wt-rtest'); if (rs) rs.onchange = function () { S.resTestId = rs.value; render(); };
    var rpb = v.querySelector('[data-rprint]'); if (rpb) rpb.onclick = function () {
      if (S.resView === 'report') openReportFor('sum', null, S.rpStudent ? [S.rpStudent] : []);
      else openReportFor(S.resView === 'student' ? 'class' : 'single', S.resTestId, []);
    };
    var box = v.querySelector('#wt-rv');
    if (S.resView === 'student') rvStudent(box);
    else if (S.resView === 'word') rvWord(box);
    else if (S.resView === 'heat') rvHeat(box);
    else if (S.resView === 'alert') rvAlert(box);
    else rvReport(box);
  }
  function emptyCard(msg) { return '<div class="card" style="padding:44px 20px;text-align:center;color:#8A7B7B;font-size:13px;line-height:1.8">' + msg + '</div>'; }
  function cutBar(score, total, cut, h) {
    h = h || 8; var ok = score >= cut;
    var lo = Math.max(0, Math.min(cut - 6, total * .5)), span = Math.max(1, total - lo);
    var p = Math.max(0, Math.min(100, (score - lo) / span * 100)), cp = (cut - lo) / span * 100;
    return '<div style="position:relative;padding-top:14px"><span style="position:absolute;left:' + cp + '%;top:0;transform:translateX(-50%);font-size:9px;font-weight:800;color:#8A6A66;white-space:nowrap">커트 ' + cut + '</span><div class="wt-bar" style="height:' + h + 'px;background:linear-gradient(90deg,#F6ECEA 0,#F6ECEA ' + cp + '%,#EAF3EC ' + cp + '%)"><div class="f" style="width:' + p + '%;background:' + (ok ? 'linear-gradient(90deg,#9FD0B0,#1B6B3A)' : 'linear-gradient(90deg,#EBB8AE,#9C2F2F)') + '"></div><div class="c" style="left:' + cp + '%"></div><div class="k" style="left:' + p + '%;--kc:' + (ok ? '#1B6B3A' : '#9C2F2F') + '"></div></div></div>';
  }
  function rvStudent(box) {
    var t = testById(S.resTestId); if (!t) { box.innerHTML = emptyCard('예약한 시험이 생기면 여기에서 결과를 볼 수 있어요.'); return; }
    var fm = firstResultMap(), as = D.assigns.filter(function (a) { return a.testId === t.id && a.kind !== 'retest'; });
    var rows = as.map(function (a) { var r = fm[a.id]; return { a: a, r: r, name: a.studentName || stuName(a.studentUid) }; });
    var pass = rows.filter(function (x) { return x.r && x.r.passed; }), fail = rows.filter(function (x) { return x.r && !x.r.passed; }), none = rows.filter(function (x) { return !x.r; });
    var done = pass.concat(fail), avg = done.length ? (done.reduce(function (s, x) { return s + x.r.score; }, 0) / done.length).toFixed(1) : '–';
    var total = (t.words || []).length, cut = cutOf(t);
    function card(x, fl) {
      var r = x.r;
      return '<div class="card" style="padding:11px 13px;border-radius:13px;display:flex;flex-direction:column;gap:5px"><div class="row" style="gap:9px"><span class="av" style="width:28px;height:28px;font-size:11px">' + esc(x.name[0] || '?') + '</span><b style="flex:1;font-size:13px">' + esc(x.name) + '</b><span class="serif" style="font-size:17px;color:' + (r.passed ? '#1B6B3A' : '#9C2F2F') + '">' + r.score + '<span style="font-size:10px;color:#A89898;font-family:Noto Sans KR"> /' + r.total + '</span></span>' + (fl ? '<button type="button" class="o" data-sendre="' + r.id + '" aria-label="재시험 보내기" style="width:30px;height:30px;border-radius:9px;margin-left:2px">' + sv('send', '#fff', 12) + '</button>' : '') + '</div>' + cutBar(r.score, r.total, r.cut, 7)
        + '<div class="row" style="justify-content:space-between;font-size:10px;color:#8A7B7B"><span>' + U.fmtSec(r.timeSec) + '</span><span style="font-weight:800;color:' + (r.passed ? '#1B6B3A' : '#9C2F2F') + '">' + (r.passed ? '+' + (r.score - r.cut) + ' 여유' : (r.cut - r.score) + '개 부족') + '</span></div></div>';
    }
    function head(tt, c, n) { return '<div class="row" style="gap:8px;padding:2px 4px 8px"><span style="width:9px;height:9px;border-radius:5px;background:' + c + ';box-shadow:0 0 0 3px ' + c + '22"></span><b style="font-size:13px">' + tt + '</b><span style="font-size:12px;color:#8A7B7B">' + n + '명</span></div>'; }
    box.innerHTML = '<div class="wt-kpis" style="margin-bottom:12px">' + kp('응시', done.length + ' / ' + rows.length, '미응시 ' + none.length + '명', '#1A1010') + kp('평균', avg, '만점 ' + total + ' · 커트 ' + cut, '#1A1010') + kp('통과', pass.length + '명', '', '#1B6B3A') + kp('재시험', fail.length + '명', '', '#9C2F2F') + '</div>'
      + '<div style="display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr) minmax(0,.8fr);gap:12px" class="wt-kb">'
      + '<div class="well" style="padding:12px">' + head('통과', '#1B6B3A', pass.length) + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">' + pass.sort(function (a, b) { return b.r.score - a.r.score; }).map(function (x) { return card(x); }).join('') + '</div></div>'
      + '<div class="well" style="padding:12px;display:flex;flex-direction:column;gap:8px">' + head('재시험 필요', '#9C2F2F', fail.length) + fail.map(function (x) { return card(x, 1); }).join('') + '</div>'
      + '<div class="well" style="padding:12px;display:flex;flex-direction:column;gap:8px">' + head('미응시', '#7A6A6A', none.length) + none.map(function (x) { return '<div class="card" style="padding:11px 13px;border-radius:13px;display:flex;align-items:center;gap:9px"><span class="av" style="width:28px;height:28px;font-size:11px;filter:grayscale(.6);opacity:.8">' + esc(x.name[0] || '?') + '</span><div class="col" style="flex:1"><b style="font-size:13px">' + esc(x.name) + '</b><span style="font-size:10px;color:#8A7B7B">' + (x.a.date < U.todayStr() ? '밀림 · ' : '') + U.md(x.a.date) + '</span></div><button type="button" class="ib" data-nudge="' + x.a.studentUid + '" aria-label="알림 보내기" style="width:32px;height:32px;border-radius:9px">' + sv('bell', '#5A4848', 13) + '</button></div>'; }).join('') + '</div>'
      + '</div><style>@media(max-width:900px){.wt-kb{grid-template-columns:1fr!important}}</style>';
    box.querySelectorAll('[data-sendre]').forEach(function (b) { b.onclick = function () { S.resView = 'alert'; S.naSel = b.dataset.sendre; render(); }; });
    box.querySelectorAll('[data-nudge]').forEach(function (b) { b.onclick = function () { F().push([b.dataset.nudge], '📚 단어 Test 알림', '"' + t.title + '" 아직 안 봤어요. 오늘 꼭 봐 주세요!', { type: 'wordtest' }); U.toast('알림을 보냈어요'); }; });
  }
  function rvWord(box) {
    var t = testById(S.resTestId); if (!t) { box.innerHTML = emptyCard('결과가 생기면 단어별 오답률을 볼 수 있어요.'); return; }
    var fm = firstResultMap(), rs = D.assigns.filter(function (a) { return a.testId === t.id && a.kind !== 'retest'; }).map(function (a) { return fm[a.id]; }).filter(Boolean);
    if (!rs.length) { box.innerHTML = emptyCard('아직 응시한 학생이 없어요.'); return; }
    var stat = (t.words || []).map(function (w) {
      var wrong = 0, picks = {};
      rs.forEach(function (r) { (r.answers || []).forEach(function (x) { if (x.en === w.en && !x.ok) { wrong++; if (x.given) picks[x.given] = (picks[x.given] || 0) + 1; } }); });
      var top = Object.keys(picks).sort(function (a, b) { return picks[b] - picks[a]; })[0];
      return { en: w.en, ko: w.ko, wrong: wrong, p: Math.round(wrong / rs.length * 100), top: top, topN: top ? picks[top] : 0 };
    }).sort(function (a, b) { return b.wrong - a.wrong; });
    var worst = stat.filter(function (x) { return x.topN; })[0];
    var hi = stat.filter(function (x) { return x.p >= 40; });
    box.innerHTML = '<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:14px" class="wt-kb">'
      + '<div class="card" style="padding:16px 20px"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b style="font-size:14px">오답률 높은 단어</b><span style="font-size:12px;color:#7A6060">응시 ' + rs.length + '명 기준</span></div>'
      + stat.slice(0, 15).map(function (x, i) { return '<div style="display:grid;grid-template-columns:24px 130px 1fr 44px;align-items:center;gap:10px;height:42px;box-shadow:inset 0 1px 0 #F6EFED"><span class="serif" style="font-size:14px;color:#B0895A">' + (i + 1) + '</span><div class="col"><b style="font-size:13px">' + esc(x.en) + '</b><span style="font-size:11px;color:#8A7B7B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.ko) + '</span></div><div style="height:10px;border-radius:5px;background:#F3EEEC;box-shadow:inset 0 1px 2px rgba(110,45,45,.1)"><div style="height:10px;border-radius:5px;width:' + Math.max(x.p, 1.5) + '%;background:' + (x.p >= 40 ? 'linear-gradient(90deg,#B84545,#7B1D1D)' : x.p >= 20 ? 'linear-gradient(90deg,#E6A27E,#C9743F)' : '#DCCFCB') + '"></div></div><b style="font-size:13px;text-align:right">' + x.p + '%</b></div>'; }).join('') + '</div>'
      + '<div class="col" style="gap:14px">'
      + (worst ? '<div class="card" style="padding:20px;background:radial-gradient(130% 120% at 10% 0%,#9A2F2F,#6A1717 60%,#4E1010);color:#fff;display:flex;flex-direction:column;gap:10px;box-shadow:0 18px 32px -16px rgba(80,15,15,.6)"><span class="eb" style="color:#F3D2C8">가장 많이 고른 오답</span><span class="serif" style="font-size:28px">' + esc(worst.en) + '</span><div class="row" style="flex-wrap:wrap;gap:8px;font-size:12.5px"><span style="padding:4px 10px;border-radius:8px;background:rgba(255,255,255,.14)">정답 · ' + esc(worst.ko) + '</span><span style="padding:4px 10px;border-radius:8px;background:#FFE1D6;color:#4E1010;font-weight:800">오답 · ' + esc(worst.top) + ' ' + worst.topN + '명</span></div></div>' : '')
      + '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px"><b style="font-size:13px">한 번에 오답 시험으로</b><span style="font-size:12.5px;color:#7A6060;line-height:1.6">오답률 40% 넘는 단어 ' + hi.length + '개를 틀린 학생에게만 다시 내줄 수 있어요.</span><button type="button" class="p" data-mkrv style="height:44px;font-size:13px"' + (hi.length ? '' : ' disabled') + '>오답 시험 만들기</button></div></div></div>';
    var mk = box.querySelector('[data-mkrv]'); if (mk) mk.onclick = function () { S.view = 'review'; S.rvSel = {}; S.rvSel[t.id] = 1; S.rvMode = 2; render(); };
  }

  /* --- 히트맵 (색상 · 구간 설정 숨길 수 있음) */
  var HM_PRESETS = {
    '기본': { full: '#1B6B3A', pass: '#D7ECDD', near: '#F3CF9F', far: '#7B1D1D' },
    '선명하게': { full: '#0E7A3D', pass: '#A6DDB8', near: '#FFB34D', far: '#C0262D' },
    '색약 배려': { full: '#1E5AA8', pass: '#CFE0F5', near: '#F2B25C', far: '#6B3FA0' }
  };
  var HM_KEY = 'wt_hm_v1', hmTimer = null;
  function hmCfg() {
    var c = null, me = null;
    try { me = ME(); } catch (e) { }
    var acc = me && me.profile ? me.profile.wtHeatmap : undefined;
    if (acc && acc.colors) c = acc;
    else if (acc === undefined) { try { c = JSON.parse(localStorage.getItem(HM_KEY) || 'null'); } catch (e) { } }
    c = c ? JSON.parse(JSON.stringify(c)) : null;
    return c || { preset: '기본', colors: Object.assign({}, HM_PRESETS['기본']), near: 3, auto: true, panel: true };
  }
  /* 계정(users 문서)에 저장 → 같은 계정이면 어느 기기에서나 같은 색 */
  function hmSave(c) {
    try { if (c) localStorage.setItem(HM_KEY, JSON.stringify(c)); else localStorage.removeItem(HM_KEY); } catch (e) { }
    var me = null; try { me = ME(); } catch (e) { }
    if (!me || !me.uid) return;
    if (me.profile) me.profile.wtHeatmap = c || null;
    clearTimeout(hmTimer);
    hmTimer = setTimeout(function () {
      F().updateDoc(F().doc(F().db, 'users', me.uid), { wtHeatmap: c || null })
        .catch(function () { U.toast('색상 설정을 계정에 저장하지 못했어요'); });
    }, 400);
  }
  function lum(hex) { var n = parseInt(hex.slice(1), 16); var r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function rvHeat(box) {
    var cfg = hmCfg(), C = cfg.colors;
    var fid = S.hmFolder || (testById(S.resTestId) || {}).folderId || (D.folders[0] || {}).id;
    var tests = folderTests(fid).filter(function (t) { return D.assigns.some(function (a) { return a.testId === t.id; }); }).slice(-10);
    var fm = firstResultMap();
    var stuSet = {};
    D.assigns.forEach(function (a) { if (a.kind !== 'retest' && tests.some(function (t) { return t.id === a.testId; })) stuSet[a.studentUid] = a.studentName || stuName(a.studentUid); });
    var uids = Object.keys(stuSet).sort(function (a, b) { return stuSet[a].localeCompare(stuSet[b], 'ko'); });
    function cell(uid, t) {
      var a = D.assigns.filter(function (x) { return x.testId === t.id && x.studentUid === uid && x.kind !== 'retest'; })[0];
      if (!a) return '<div class="wt-hm-cell" style="background:transparent"></div>';
      var r = fm[a.id];
      if (!r) return '<div class="wt-hm-cell" style="background:repeating-linear-gradient(45deg,#EFEAE7 0 5px,#F7F3F1 5px 10px);color:#A89898;box-shadow:inset 0 0 0 1px #E6DED9">–</div>';
      var lv = r.score >= r.total ? 'full' : r.score >= r.cut ? 'pass' : r.score >= r.cut - cfg.near ? 'near' : 'far', bg = C[lv];
      return '<div class="wt-hm-cell" title="' + esc(stuSet[uid] + ' · ' + t.title + ' · ' + r.score + '/' + r.total) + '" style="background:' + bg + ';color:' + (lum(bg) < .55 ? '#fff' : '#1A1010') + ';box-shadow:' + (lum(bg) < .55 ? 'inset 0 1px 0 rgba(255,255,255,.2),0 2px 4px -1px rgba(0,0,0,.25)' : 'inset 0 0 0 1px rgba(0,0,0,.06)') + '">' + r.score + '</div>';
    }
    var legend = [['full', '만점'], ['pass', '통과 (커트 이상)'], ['near', '조금 부족 (' + cfg.near + '개 이내)'], ['far', '많이 부족']].map(function (x) { return '<span class="chip" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:700"><span style="width:16px;height:16px;border-radius:4px;background:' + C[x[0]] + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)"></span>' + x[1] + '</span>'; }).join('') + '<span class="chip" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:700"><span style="width:16px;height:16px;border-radius:4px;background:repeating-linear-gradient(45deg,#EFEAE7 0 4px,#F7F3F1 4px 8px);box-shadow:inset 0 0 0 1px #E6DED9"></span>미응시</span>';
    var cols = '96px repeat(' + Math.max(1, tests.length) + ',minmax(44px,1fr))';
    var grid = tests.length && uids.length ? '<div class="scroll"><div style="min-width:' + (110 + tests.length * 52) + 'px;display:flex;flex-direction:column;gap:6px"><div style="display:grid;grid-template-columns:' + cols + ';gap:6px;font-size:11px;font-weight:800;color:#8A7B7B;text-align:center"><span></span>' + tests.map(function (t) { return '<span title="' + esc(t.title) + '" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(shortNo(t)) + '</span>'; }).join('') + '</div>'
      + uids.map(function (u) { return '<div style="display:grid;grid-template-columns:' + cols + ';gap:6px"><span style="display:flex;align-items:center;font-size:13px;font-weight:800">' + esc(stuSet[u]) + '</span>' + tests.map(function (t) { return cell(u, t); }).join('') + '</div>'; }).join('') + '</div></div>' : '<div style="padding:30px;text-align:center;color:#8A7B7B;font-size:13px">이 폴더에는 아직 응시 결과가 없어요</div>';
    var panel = !cfg.panel ? '' : '<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px;align-self:start">'
      + '<div class="row">' + sv('gear', '#7B1D1D', 16) + '<b style="font-size:14px;flex:1">색상 · 구간 설정</b><button type="button" class="s" data-hide style="height:30px;padding:0 10px;font-size:11px;border-radius:8px">숨기기</button></div>'
      + '<div class="well seg">' + Object.keys(HM_PRESETS).map(function (p) { return '<button type="button" data-pre="' + p + '" class="' + (cfg.preset === p ? 'on' : '') + '" style="flex:1;justify-content:center">' + p + '</button>'; }).join('') + '</div>'
      + [['full', '만점'], ['pass', '통과'], ['near', '조금 부족'], ['far', '많이 부족']].map(function (x) {
        return '<div class="row" style="gap:10px;padding:6px 0;box-shadow:inset 0 -1px 0 #F6EFED"><label class="s" style="width:38px;height:38px;padding:0;border-radius:10px;cursor:pointer;position:relative" title="색 바꾸기"><span style="width:24px;height:24px;border-radius:7px;background:' + C[x[0]] + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></span><input type="color" data-col="' + x[0] + '" value="' + C[x[0]] + '" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><b style="flex:1;font-size:13px">' + x[1] + '</b>'
          + (x[0] === 'near' ? '<div class="row" style="gap:4px"><span style="font-size:11px;color:#8A7B7B">커트에서</span><input class="inp" type="number" min="1" max="10" data-near value="' + cfg.near + '" style="width:48px;height:32px;text-align:center;font-weight:800">개</div>' : x[0] === 'full' ? '<span style="font-size:11px;color:#8A7B7B">전부 정답</span>' : x[0] === 'pass' ? '<span style="font-size:11px;color:#8A7B7B">커트 이상</span>' : '<span style="font-size:11px;color:#8A7B7B">그보다 아래</span>') + '</div>';
      }).join('')
      + '<div class="row" style="gap:10px;padding-top:4px"><button type="button" class="tog' + (cfg.auto ? '' : ' off') + '" data-auto aria-label="커트라인 따라 자동"><i></i></button><span style="font-size:12px;line-height:1.4">시험마다 커트라인이 달라도<br>구간을 자동으로 맞추기</span></div>'
      + '<button type="button" class="s" data-reset style="height:38px;font-size:12px">기본값으로</button></div>';
    box.innerHTML = '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><select class="inp" id="wt-hmf" style="height:38px;padding:0 12px;font-size:13px;font-weight:800">' + D.folders.map(function (f) { return '<option value="' + f.id + '"' + (f.id === fid ? ' selected' : '') + '>' + esc((f.grade ? f.grade + ' · ' : '') + f.name) + '</option>'; }).join('') + '</select>' + (cfg.panel ? '' : '<button type="button" class="s" data-show style="height:38px;padding:0 13px;font-size:12px;margin-left:auto">' + sv('gear', '#7B1D1D', 14) + '색상 · 구간 설정</button>') + '</div>'
      + '<div style="display:grid;grid-template-columns:' + (cfg.panel ? 'minmax(0,1fr) 284px' : '1fr') + ';gap:14px" class="wt-kb"><div class="col" style="gap:10px;min-width:0"><div class="row" style="flex-wrap:wrap;gap:6px">' + legend + '</div><div class="card" style="padding:14px 16px">' + grid + '</div></div>' + panel + '</div>';
    box.querySelector('#wt-hmf').onchange = function (e) { S.hmFolder = e.target.value; render(); };
    var sh = box.querySelector('[data-show]'); if (sh) sh.onclick = function () { cfg.panel = true; hmSave(cfg); render(); };
    var hd = box.querySelector('[data-hide]'); if (hd) hd.onclick = function () { cfg.panel = false; hmSave(cfg); render(); };
    box.querySelectorAll('[data-pre]').forEach(function (b) { b.onclick = function () { cfg.preset = b.dataset.pre; cfg.colors = Object.assign({}, HM_PRESETS[cfg.preset]); hmSave(cfg); render(); }; });
    box.querySelectorAll('[data-col]').forEach(function (inp) { inp.onchange = function () { cfg.colors = Object.assign({}, cfg.colors); cfg.colors[inp.dataset.col] = inp.value; cfg.preset = '직접'; hmSave(cfg); render(); }; });
    var nr = box.querySelector('[data-near]'); if (nr) nr.onchange = function () { cfg.near = Math.max(1, Math.min(10, nr.value | 0)); hmSave(cfg); render(); };
    var au = box.querySelector('[data-auto]'); if (au) au.onclick = function () { cfg.auto = !cfg.auto; hmSave(cfg); render(); };
    var rsb = box.querySelector('[data-reset]'); if (rsb) rsb.onclick = function () { hmSave(null); render(); };
  }

  /* --- 미통과 알림 (왼쪽 알림함 A + 가운데 재시험 만들기 + 오른쪽 받는 순서 B) */
  var NB = null;
  function relTime(ms) { var d = Date.now() - ms, mi = Math.round(d / 60000); if (mi < 1) return '방금'; if (mi < 60) return mi + '분 전'; var h = Math.round(mi / 60); if (h < 24) return h + '시간 전'; return Math.round(h / 24) + '일 전'; }
  function rvAlert(box) {
    var fails = D.results.filter(function (r) { return !r.passed; });
    if (!fails.length) { box.innerHTML = emptyCard('미통과한 학생이 없어요. 커트라인을 못 넘으면 여기에 바로 알림이 와요.'); return; }
    var today = U.todayStr(), yest = U.addDays(today, -1);
    var sel = fails.filter(function (r) { return r.id === S.naSel; })[0] || fails.filter(function (r) { return !r.handled; })[0] || fails[0];
    if (!sel.seen) { DB.upd('wordResults', sel.id, { seen: true }).catch(function () { }); sel.seen = true; }
    S.naSel = sel.id;
    function info(r) {
      var gap = r.cut - r.score, recent = fails.filter(function (x) { return x.studentUid === r.studentUid && x.id !== r.id && Math.abs(U.tsMs(x.createdAt) - U.tsMs(r.createdAt)) < 7 * 864e5; }).length;
      var sev = r.handled ? { c: '#7A6A6A', b: '#EFEAE7', t: '처리함' } : (gap >= 4 || recent) ? { c: '#9C2F2F', b: '#F8E9E7', t: '급함' } : { c: '#A65A12', b: '#FBEEDD', t: '보통' };
      return { gap: gap, pat: recent ? '이번 주 ' + (recent + 1) + '번째' : (gap === 1 ? '아깝게 1개' : '처음'), sev: sev };
    }
    function item(r) {
      var x = info(r), on = r.id === sel.id;
      return '<button type="button" data-na="' + r.id + '" class="' + (on ? 'card' : '') + '" style="position:relative;display:flex;gap:10px;padding:11px 12px 11px 14px;border-radius:12px;border:0;text-align:left;cursor:pointer;width:100%;background:' + (on ? '#fff' : 'transparent') + ';box-shadow:' + (on ? '0 0 0 2px #7B1D1D,0 10px 22px -10px rgba(90,20,20,.45)' : 'none') + ';font-family:inherit"><span style="position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:2px;background:' + x.sev.c + '"></span><span class="av" style="width:32px;height:32px;font-size:12px">' + esc((r.studentName || '?')[0]) + '</span><span class="col" style="flex:1;gap:3px;min-width:0"><span class="row" style="gap:6px"><b style="font-size:13px">' + esc(r.studentName) + '</b><span class="tag" style="font-size:9px;padding:2px 6px;color:' + x.sev.c + ';background:' + x.sev.b + '">' + x.sev.t + '</span><span style="margin-left:auto;font-size:10px;color:#8A7B7B;white-space:nowrap">' + relTime(U.tsMs(r.createdAt)) + '</span></span><span style="font-size:11px;color:#5A4848;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b class="serif" style="color:' + x.sev.c + '">' + r.score + '</b> · ' + esc(r.title) + ' · ' + x.pat + '</span></span>' + (r.seen ? '' : '<span style="position:absolute;right:8px;top:8px;width:7px;height:7px;border-radius:4px;background:#7B1D1D"></span>') + '</button>';
    }
    var grp = { '오늘': [], '어제': [], '이전': [] };
    fails.forEach(function (r) { var d = r.date || U.ymd(new Date(U.tsMs(r.createdAt) + 9 * 3600e3 + new Date().getTimezoneOffset() * 60e3)); (d === today ? grp['오늘'] : d === yest ? grp['어제'] : grp['이전']).push(r); });
    var unread = fails.filter(function (r) { return !r.seen; }).length;
    var left = '<div class="well scroll" style="padding:12px 10px;display:flex;flex-direction:column;gap:6px;max-height:640px"><div class="row" style="justify-content:space-between;padding:0 4px 4px"><b style="font-size:13px">알림함</b><span style="font-size:11px;font-weight:800;color:#7B1D1D">' + (unread ? '안 읽음 ' + unread : '모두 읽음') + '</span></div>'
      + Object.keys(grp).filter(function (k) { return grp[k].length; }).map(function (k) { return '<span style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#8A7B7B;padding:6px 4px 0">' + k + '</span>' + grp[k].slice(0, 30).map(item).join(''); }).join('') + '</div>';
    // 빌더
    var wrong = (sel.answers || []).filter(function (a) { return !a.ok; });
    var existing = D.assigns.filter(function (a) { return a.parentResultId === sel.id; })[0];
    if (!NB || NB.id !== sel.id) NB = { id: sel.id, off: {}, due: 'today', type: (existing && existing.type) || sel.type || 'mc', passN: null, auto: true, msg: (existing && existing.message) || '', prev: 0 };
    var chosen = wrong.filter(function (a) { return !NB.off[a.en]; });
    if (NB.passN == null || NB.passN > chosen.length) NB.passN = Math.max(1, Math.ceil(chosen.length * ((sel.cut / Math.max(1, sel.total)) || .8)));
    var exState = existing ? (existing.status === 'passed' ? '<span class="tag t-pass">재시험 통과</span>' : existing.status === 'failed' ? '<span class="tag t-fail">재시험도 미통과</span>' : '<span class="tag t-run">재시험 배정됨 · 아직 안 봄</span>') : '';
    var mid = '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px;min-width:0">'
      + '<div class="row" style="gap:12px"><span class="av" style="width:42px;height:42px;font-size:15px">' + esc((sel.studentName || '?')[0]) + '</span><div class="col" style="flex:1;gap:2px"><span class="serif" style="font-size:19px">' + esc(sel.studentName) + ' 재시험 만들기</span><span style="font-size:12px;color:#7A6060">' + esc(sel.title) + ' · ' + sel.score + '/' + sel.total + ' · 커트 ' + sel.cut + '</span></div>' + exState + '</div>'
      + '<span style="font-size:12px;font-weight:800;color:#5A4848">넣을 단어 <span style="color:#7B1D1D">' + chosen.length + ' / ' + wrong.length + '</span> <span style="font-weight:500;color:#8A7B7B">· 눌러서 빼기</span></span>'
      + '<div class="row" style="flex-wrap:wrap;gap:6px">' + wrong.map(function (a) { return '<button type="button" class="chip' + (NB.off[a.en] ? ' off' : '') + '" data-w="' + esc(a.en) + '" style="padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer" title="' + esc(a.ko) + '">' + esc(a.en) + '</button>'; }).join('') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">마감</span><div class="well seg"><button type="button" data-due="today" class="' + (NB.due === 'today' ? 'on' : '') + '" style="flex:1;justify-content:center">오늘 자정</button><button type="button" data-due="tomorrow" class="' + (NB.due === 'tomorrow' ? 'on' : '') + '" style="flex:1;justify-content:center">내일 자정</button></div></div>'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">유형</span><div class="well seg"><button type="button" data-ty="sa" class="' + (NB.type === 'sa' ? 'on' : '') + '" style="flex:1;justify-content:center">주관식</button><button type="button" data-ty="mc" class="' + (NB.type === 'mc' ? 'on' : '') + '" style="flex:1;justify-content:center">객관식</button></div></div>'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">통과 기준</span><div class="row"><button type="button" class="ib" data-pn="-1" aria-label="줄이기" style="width:34px;height:34px">−</button><span class="serif" style="font-size:18px;width:62px;text-align:center">' + NB.passN + ' / ' + chosen.length + '</span><button type="button" class="ib" data-pn="1" aria-label="늘리기" style="width:34px;height:34px">+</button></div></div>'
      + '<div class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">또 떨어지면</span><div class="row" style="height:34px"><button type="button" class="tog' + (NB.auto ? '' : ' off') + '" data-auto aria-label="다음 날 자동 재시험"><i></i></button><span style="font-size:12px">다음 날 자동 재시험</span></div></div></div>'
      + '<label class="col" style="gap:6px"><span style="font-size:12px;font-weight:800;color:#5A4848">학생에게 한마디</span><textarea class="inp" id="wt-namsg" style="height:58px;padding:10px 12px;font-size:12.5px;resize:none" placeholder="예: arbitrary, ambiguous는 예문이랑 같이 외우자.">' + esc(NB.msg) + '</textarea></label>'
      + '<div class="row" style="margin-top:auto"><button type="button" class="s" data-later style="height:46px;padding:0 16px;font-size:13px">' + (sel.handled ? '처리 취소' : '나중에') + '</button><button type="button" class="p" data-send style="flex:1;height:46px;font-size:14px"' + (chosen.length ? '' : ' disabled') + '>' + sv('send', '#fff', 15) + (existing && existing.status === 'assigned' ? '재시험 내용 바꿔 보내기' : esc(sel.studentName) + '에게 재시험 보내기') + '</button></div></div>';
    // 받는 순서 미리보기 (B)
    var msgTxt = NB.msg || '틀린 단어 ' + chosen.length + '개로 재시험이 도착했어요.';
    var lock = '<div style="border-radius:20px;background:radial-gradient(120% 90% at 50% 0%,#5A2A2A,#1A1010 70%);padding:18px 12px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 18px 30px -16px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.06);min-height:250px">'
      + (NB.prev === 0 ? '<span class="serif" style="font-size:34px;color:#fff;line-height:1">' + new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0') + '</span><span style="font-size:10px;color:#C9B9B9;margin-top:-6px">지금</span><div style="align-self:stretch;border-radius:14px;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);padding:10px;display:flex;gap:8px"><span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(160deg,#962E2E,#661717);flex:none;display:flex;align-items:center;justify-content:center;color:#FFE1D6;font:700 12px \'Noto Serif KR\',serif">M</span><div class="col" style="gap:2px;color:#fff"><span style="font-size:9px;color:#E7DADA">MONO PLANNER · 지금</span><b style="font-size:12px">' + esc(sel.title) + ' 재시험이 도착했어요</b><span style="font-size:10px;color:#E7DADA;line-height:1.45">' + esc(msgTxt) + '</span></div></div>'
        : NB.prev === 1 ? '<div style="align-self:stretch;border-radius:14px;background:#F8F5F4;padding:12px;display:flex;flex-direction:column;gap:8px"><span style="font-size:11px;font-weight:800;color:#7B1D1D">오늘의 플래너</span><div style="border-radius:10px;background:#FBF4F1;box-shadow:inset 3px 0 0 #9C2F2F;padding:9px 10px;display:flex;flex-direction:column;gap:3px"><span class="row" style="gap:5px"><b style="font-size:12px">' + esc(sel.title) + ' 재시험</b><span style="font-size:8px;font-weight:800;color:#fff;background:#9C2F2F;border-radius:4px;padding:2px 5px">필수</span></span><span style="font-size:10px;color:#7A6060">' + chosen.length + '단어 · ' + NB.passN + '개 이상 통과 · ' + (NB.due === 'today' ? '오늘' : '내일') + ' 자정까지</span></div><span style="height:6px;border-radius:3px;background:#EEE6E3;width:80%"></span><span style="height:6px;border-radius:3px;background:#EEE6E3;width:60%"></span></div>'
          : '<div style="align-self:stretch;border-radius:14px;background:#F8F5F4;padding:16px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center"><span class="eb">RETEST</span><b class="serif" style="font-size:16px">' + esc(sel.title) + '</b><span style="font-size:11px;color:#7A6060">' + (NB.type === 'sa' ? '주관식' : '객관식') + ' ' + chosen.length + '문항 · ' + NB.passN + '개 이상 통과</span>' + (NB.msg ? '<div style="font-size:10.5px;color:#3D2B2B;background:#fff;border-radius:9px;padding:8px;box-shadow:inset 0 0 0 1px #EDE2DF;line-height:1.5">"' + esc(NB.msg) + '"</div>' : '') + '<span class="p" style="height:32px;padding:0 16px;font-size:11px;border-radius:9px">시작하기</span></div>')
      + '</div>';
    var right = '<div class="col" style="gap:10px"><div class="row" style="gap:6px">' + sv('eye', '#7B1D1D', 15) + '<b style="font-size:12px">학생이 받는 순서</b></div><div class="well seg">' + ['① 알림', '② 과제', '③ 시작'].map(function (t, i) { return '<button type="button" data-prev="' + i + '" class="' + (NB.prev === i ? 'on' : '') + '" style="flex:1;justify-content:center;font-size:11px">' + t + '</button>'; }).join('') + '</div>' + lock
      + '<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:6px"><b style="font-size:11px;color:#5A4848">함께 가는 것</b>' + ['앱 푸시 알림', '홈 플래너 맨 위 필수 과제', '담당 선생님 한마디'].map(function (t) { return '<div class="row" style="font-size:11px;gap:8px"><span style="width:16px;height:16px;border-radius:5px;background:linear-gradient(180deg,#922B2B,#661717);display:flex;align-items:center;justify-content:center">' + sv('check', '#fff', 10, 3) + '</span>' + t + '</div>'; }).join('') + '</div></div>';
    box.innerHTML = '<div style="display:grid;grid-template-columns:268px minmax(0,1fr) 248px;gap:14px;align-items:start" class="wt-na">' + left + mid + right + '</div><style>@media(max-width:1100px){.wt-na{grid-template-columns:1fr!important}}</style>';
    box.querySelectorAll('[data-na]').forEach(function (b) { b.onclick = function () { S.naSel = b.dataset.na; render(); }; });
    box.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { NB.off[b.dataset.w] = !NB.off[b.dataset.w]; NB.passN = null; render(); }; });
    box.querySelectorAll('[data-due]').forEach(function (b) { b.onclick = function () { NB.due = b.dataset.due; render(); }; });
    box.querySelectorAll('[data-ty]').forEach(function (b) { b.onclick = function () { NB.type = b.dataset.ty; render(); }; });
    box.querySelectorAll('[data-pn]').forEach(function (b) { b.onclick = function () { NB.passN = Math.max(1, Math.min(chosen.length, NB.passN + (+b.dataset.pn))); render(); }; });
    box.querySelectorAll('[data-prev]').forEach(function (b) { b.onclick = function () { NB.prev = +b.dataset.prev; render(); }; });
    box.querySelector('[data-auto]').onclick = function () { NB.auto = !NB.auto; render(); };
    var ta = box.querySelector('#wt-namsg'); ta.oninput = function () { NB.msg = ta.value; }; ta.onchange = function () { render(); };
    box.querySelector('[data-later]').onclick = function () { DB.upd('wordResults', sel.id, { handled: !sel.handled }).then(refresh); };
    var sd = box.querySelector('[data-send]'); if (sd) sd.onclick = function () {
      sd.disabled = true;
      var me = ME(), words = chosen.map(function (a) { return { en: a.en, ko: a.ko }; }), date = NB.due === 'today' ? today : U.addDays(today, 1);
      var data = { words: words, total: words.length, cutN: NB.passN, cutPct: Math.round(NB.passN / words.length * 100), type: NB.type, date: date, openAt: Date.now(), dueAt: U.kstMs(date, 23, 59), message: NB.msg || '', autoNext: NB.auto, teacherUid: me.uid, teacherName: (me.profile || {}).name || '' };
      var p = existing && existing.status === 'assigned' ? DB.upd('wordAssign', existing.id, data)
        : DB.add('wordAssign', Object.assign(data, { studentUid: sel.studentUid, studentName: sel.studentName, testId: sel.testId || null, title: String(sel.title).replace(/\s*재시험$/, '') + ' 재시험', folderId: sel.folderId || null, status: 'assigned', kind: 'retest', parentResultId: sel.id, parentAssignId: sel.assignId || null, attempts: 0 }));
      p.then(function () { return DB.upd('wordResults', sel.id, { handled: true, seen: true }); }).then(function () {
        F().push([sel.studentUid], '📚 재시험이 도착했어요', (NB.msg ? NB.msg + ' — ' : '') + sel.title + ' · ' + words.length + '단어', { type: 'wordtest' });
        U.toast(sel.studentName + '에게 재시험을 보냈어요'); NB = null; refresh();
      }).catch(function (e) { sd.disabled = false; U.toast('보내지 못했어요: ' + (e.message || e)); });
    };
  }

  /* --- 개인 리포트 */
  function rvReport(box) {
    var fm = firstResultMap(), byStu = {};
    Object.keys(fm).forEach(function (k) { var r = fm[k]; if (r.kind === 'retest') return; (byStu[r.studentUid] = byStu[r.studentUid] || []).push(r); });
    var uids = Object.keys(byStu); if (!uids.length) { box.innerHTML = emptyCard('응시 결과가 쌓이면 학생별 리포트를 볼 수 있어요.'); return; }
    var avg = function (u) { var a = byStu[u]; return Math.round(a.reduce(function (s, r) { return s + r.score / r.total; }, 0) / a.length * 100); };
    uids.sort(function (a, b) { return (byStu[a][0].studentName || '').localeCompare(byStu[b][0].studentName || '', 'ko'); });
    var uid = S.rpStudent && byStu[S.rpStudent] ? S.rpStudent : uids[0]; S.rpStudent = uid;
    var mine = byStu[uid].slice().sort(function (a, b) { return U.tsMs(a.createdAt) - U.tsMs(b.createdAt); });
    var all = D.results.filter(function (r) { return r.studentUid === uid; });
    var once = mine.filter(function (r) { return r.passed; }).length, re = all.filter(function (r) { return r.kind === 'retest'; }).length;
    var learned = 0; D.assigns.forEach(function (a) { if (a.studentUid === uid && a.status === 'passed' && a.kind === 'normal') learned += a.total || (testById(a.testId) || { words: [] }).words.length; });
    var cnt = {}; all.forEach(function (r) { (r.answers || []).forEach(function (a) { if (!a.ok) cnt[a.en] = (cnt[a.en] || 0) + 1; }); });
    var rep = Object.keys(cnt).filter(function (k) { return cnt[k] >= 2; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 12);
    var pts = mine.slice(-12), Wd = 620, Hd = 190, pad = 24;
    var xs = pts.map(function (r, i) { return pts.length === 1 ? Wd / 2 : pad + i * (Wd - 2 * pad) / (pts.length - 1); });
    var y = function (p) { return Hd - 28 - (p - 40) / 60 * (Hd - 50); };
    var cutY = y(pts.length ? Math.round(pts.reduce(function (s, r) { return s + r.cut / r.total; }, 0) / pts.length * 100) : 80);
    var svg = '<svg viewBox="0 0 ' + Wd + ' ' + Hd + '" width="100%" height="' + Hd + '" role="img" aria-label="회차별 정답률"><line x1="0" y1="' + cutY + '" x2="' + Wd + '" y2="' + cutY + '" stroke="#C99A86" stroke-dasharray="5 5"/><text x="' + (Wd - 4) + '" y="' + (cutY - 6) + '" text-anchor="end" font-size="11" fill="#8A6A66" font-family="Noto Sans KR">커트</text>'
      + '<polyline fill="none" stroke="#7B1D1D" stroke-width="2.6" stroke-linejoin="round" points="' + pts.map(function (r, i) { return xs[i] + ',' + y(r.score / r.total * 100); }).join(' ') + '"/>'
      + pts.map(function (r, i) { var ok = r.passed; return '<circle cx="' + xs[i] + '" cy="' + y(r.score / r.total * 100) + '" r="5" fill="' + (ok ? '#7B1D1D' : '#fff') + '" stroke="' + (ok ? '#fff' : '#C9743F') + '" stroke-width="2.4"><title>' + esc(r.title + ' ' + r.score + '/' + r.total) + '</title></circle><text x="' + xs[i] + '" y="' + (Hd - 6) + '" text-anchor="middle" font-size="10" fill="#8A7B7B" font-family="Noto Sans KR">' + esc(shortNo({ title: r.title })) + '</text>'; }).join('') + '</svg>';
    var name = mine[0].studentName || stuName(uid);
    box.innerHTML = '<div style="display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;align-items:start" class="wt-kb">'
      + '<div class="card scroll" style="padding:10px;display:flex;flex-direction:column;gap:2px;max-height:620px">' + uids.map(function (u) { var on = u === uid, a = avg(u); return '<button type="button" data-rp="' + u + '" style="border:0;display:flex;justify-content:space-between;align-items:center;height:42px;padding:0 12px;border-radius:9px;font:' + (on ? 800 : 500) + ' 13px \'Noto Sans KR\',sans-serif;cursor:pointer;background:' + (on ? 'linear-gradient(180deg,#922B2B,#6E1818)' : 'transparent') + ';color:' + (on ? '#fff' : '#3D2B2B') + '"><span>' + esc(byStu[u][0].studentName || stuName(u)) + '</span><span style="font-size:11px;opacity:.8">' + a + '%</span></button>'; }).join('') + '</div>'
      + '<div class="card" style="padding:20px 22px;display:flex;flex-direction:column;gap:14px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><span class="serif" style="font-size:26px">' + esc(name) + '</span><div class="row" style="gap:8px"><button type="button" class="s" data-rpsum style="height:38px;padding:0 14px;font-size:12px">' + sv('print', '#7B1D1D', 13) + '종합 성적표</button><button type="button" class="p" data-rvme style="height:38px;padding:0 14px;font-size:12px">이 학생 오답 시험</button></div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));box-shadow:inset 0 1px 0 #F1E8E5,inset 0 -1px 0 #F1E8E5">' + [['평균 정답률', avg(uid) + '%', '#1A1010'], ['한 번에 통과', once + ' / ' + mine.length, '#1A1010'], ['재시험', re + '회', '#9C2F2F'], ['익힌 단어', learned, '#1A1010']].map(function (x, i) { return '<div class="col" style="padding:12px 0 12px ' + (i ? 16 : 0) + 'px;gap:2px;' + (i ? 'box-shadow:inset 1px 0 0 #F1E8E5' : '') + '"><span style="font-size:11px;color:#8A6A66">' + x[0] + '</span><span class="serif" style="font-size:22px;color:' + x[2] + '">' + x[1] + '</span></div>'; }).join('') + '</div>'
      + svg + '<div class="row" style="flex-wrap:wrap;gap:6px"><b style="font-size:12px;color:#8A6A66;margin-right:4px">계속 틀리는 단어</b>' + (rep.length ? rep.map(function (k) { return '<span style="padding:5px 10px;border-radius:14px;background:#F6E9E6;color:#7B1D1D;font-size:12px;font-weight:700">' + esc(k) + ' ×' + cnt[k] + '</span>'; }).join('') : '<span style="font-size:12px;color:#A89898">아직 없어요</span>') + '</div></div></div>';
    box.querySelectorAll('[data-rp]').forEach(function (b) { b.onclick = function () { S.rpStudent = b.dataset.rp; render(); }; });
    box.querySelector('[data-rpsum]').onclick = function () { openReportFor('sum', null, [uid]); };
    box.querySelector('[data-rvme]').onclick = function () { S.view = 'review'; S.rvSel = {}; mine.forEach(function (r) { if (r.testId) S.rvSel[r.testId] = 1; }); S.rvOnly = uid; S.rvMode = 1; render(); };
  }

  /* -------------------------------------------------------- 오답 시험 */
  function viewReview(v) {
    var fm = firstResultMap();
    var tests = resultTests().filter(function (t) { return t.kind !== 'retest'; });
    if (!tests.length) { v.innerHTML = emptyCard('응시 결과가 있는 시험이 생기면 여러 시험을 골라 오답 시험을 만들 수 있어요.'); return; }
    var selIds = tests.filter(function (t) { return S.rvSel[t.id]; }).map(function (t) { return t.id; });
    // 학생별 틀린 단어
    var perStu = {}, wordCnt = {}, ko = {}, names = {};
    D.assigns.forEach(function (a) {
      if (selIds.indexOf(a.testId) < 0 || a.kind === 'retest') return; if (S.rvOnly && a.studentUid !== S.rvOnly) return;
      var r = fm[a.id]; if (!r) return; names[a.studentUid] = a.studentName || stuName(a.studentUid);
      (r.answers || []).forEach(function (x) {
        var bad = !x.ok && (S.rvMode === 3 || !x.unknown);
        if (!bad) return;
        ko[x.en] = x.ko; (perStu[a.studentUid] = perStu[a.studentUid] || {})[x.en] = 1;
      });
    });
    Object.keys(perStu).forEach(function (u) { Object.keys(perStu[u]).forEach(function (w) { wordCnt[w] = (wordCnt[w] || 0) + 1; }); });
    var minN = S.rvMode === 2 ? 2 : 1;
    var pool = Object.keys(wordCnt).filter(function (w) { return wordCnt[w] >= minN; }).sort(function (a, b) { return wordCnt[b] - wordCnt[a] || a.localeCompare(b); });
    var use = pool.filter(function (w) { return !S.rvOff[w]; });
    var targets = Object.keys(perStu).filter(function (u) { return use.some(function (w) { return perStu[u][w]; }); });
    if (S.rvPer == null) S.rvPer = true;
    if (!S.rvType) S.rvType = 'sa';
    if (S.rvPct == null) S.rvPct = 80;
    var selT = tests.filter(function (t) { return S.rvSel[t.id]; });
    var defName = selT.length ? (selT.length === 1 ? selT[0].title : shortNo(selT[selT.length - 1]) + '~' + shortNo(selT[0])) + ' 오답 모음' : '오답 모음';
    var groups = {}; tests.forEach(function (t) { var f = folderById(t.folderId); var k = f ? (f.grade ? f.grade + ' · ' : '') + f.name : '기타'; (groups[k] = groups[k] || []).push(t); });
    var c1 = '<div class="card scroll" style="padding:16px 14px;display:flex;flex-direction:column;gap:4px;max-height:600px"><div class="row" style="margin-bottom:6px"><span style="width:22px;height:22px;border-radius:11px;background:linear-gradient(180deg,#922B2B,#661717);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">1</span><b style="font-size:14px;flex:1">시험 고르기</b><span style="font-size:12px;color:#7B1D1D;font-weight:800">' + selIds.length + '개</span></div>'
      + Object.keys(groups).map(function (g) { return '<span style="font-size:11px;color:#8A6A66;font-weight:800;padding:6px 4px 2px">' + esc(g) + '</span>' + groups[g].map(function (t) { var on = !!S.rvSel[t.id], nw = 0; D.assigns.forEach(function (a) { if (a.testId === t.id && fm[a.id]) nw += (fm[a.id].answers || []).filter(function (x) { return !x.ok; }).length; }); return '<label style="display:flex;align-items:center;gap:10px;height:40px;padding:0 8px;border-radius:9px;background:' + (on ? '#FBF4F1' : 'transparent') + ';font-size:13px;cursor:pointer"><input type="checkbox" data-t="' + t.id + '"' + (on ? ' checked' : '') + ' style="width:17px;height:17px;accent-color:#7B1D1D"><span style="flex:1;font-weight:' + (on ? 800 : 500) + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.title) + '</span><span style="font-size:11px;color:#9C2F2F;font-weight:700">오답 ' + nw + '</span></label>'; }).join(''); }).join('') + '</div>';
    var c2 = '<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0"><div class="row"><span style="width:22px;height:22px;border-radius:11px;background:linear-gradient(180deg,#922B2B,#661717);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">2</span><b style="font-size:14px;flex:1">들어갈 단어</b>' + (S.rvOnly ? '<span class="chip" style="padding:5px 10px;font-size:11px;font-weight:800;color:#7B1D1D">' + esc(stuName(S.rvOnly)) + '만 <button type="button" data-clear style="border:0;background:none;cursor:pointer;color:#7B1D1D;font-weight:800">✕</button></span>' : '') + '</div>'
      + '<div class="well seg" style="align-self:flex-start;flex-wrap:wrap">' + [[2, '2명 이상 틀림'], [1, '1명이라도'], [3, '모름 포함']].map(function (x) { var n = Object.keys(wordCnt).filter(function (w) { return wordCnt[w] >= (x[0] === 2 ? 2 : 1); }).length; return '<button type="button" data-mode="' + x[0] + '" class="' + (S.rvMode === x[0] ? 'on' : '') + '">' + x[1] + ' · ' + n + '</button>'; }).join('') + '</div>'
      + (pool.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px">' + pool.map(function (w) { var off = S.rvOff[w]; return '<button type="button" data-w="' + esc(w) + '" class="s" style="height:36px;justify-content:space-between;padding:0 11px;font-size:12px;border-radius:9px;' + (off ? 'opacity:.4;text-decoration:line-through' : '') + '" title="' + esc(ko[w] || '') + '"><span>' + esc(w) + '</span><span class="serif" style="color:' + (wordCnt[w] >= 3 ? '#7B1D1D' : '#B0895A') + '">' + wordCnt[w] + '</span></button>'; }).join('') + '</div><span style="font-size:11.5px;color:#8A7B7B">숫자 = 틀린 학생 수 · 단어를 누르면 빼기</span>'
        : '<div style="padding:30px;text-align:center;color:#A89898;font-size:13px">' + (selIds.length ? '조건에 맞는 단어가 없어요' : '왼쪽에서 시험을 골라 주세요') + '</div>') + '</div>';
    var c3 = '<div class="card" style="padding:20px;background:radial-gradient(130% 120% at 10% 0%,#9A2F2F,#6A1717 60%,#4E1010);color:#fff;display:flex;flex-direction:column;gap:12px;box-shadow:0 22px 40px -20px rgba(80,15,15,.7)"><div class="row"><span style="width:22px;height:22px;border-radius:11px;background:#FFE1D6;color:#4E1010;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">3</span><b style="font-size:14px">만들기</b></div>'
      + '<input id="wt-rvname" value="' + esc(S.rvName || defName) + '" style="background:rgba(255,255,255,.1);border:0;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(255,214,205,.35);color:#fff;font:700 17px \'Noto Serif KR\',serif;padding:10px 12px;outline:none">'
      + '<div class="col" style="gap:8px;font-size:13px">' + [['단어', use.length + '개'], ['대상', targets.length + '명' + (targets.length ? ' (' + targets.slice(0, 3).map(function (u) { return names[u]; }).join(', ') + (targets.length > 3 ? ' 외' : '') + ')' : '')]].map(function (x) { return '<div class="row" style="justify-content:space-between;box-shadow:inset 0 -1px 0 rgba(255,214,205,.25);padding-bottom:8px"><span style="color:#F3D2C8">' + x[0] + '</span><b style="text-align:right">' + x[1] + '</b></div>'; }).join('') + '</div>'
      + '<div class="row" style="gap:6px"><span style="color:#F3D2C8;font-size:13px;flex:1">유형</span><div class="row" style="gap:3px;padding:3px;border-radius:10px;background:rgba(0,0,0,.2)">' + [['sa', '주관식'], ['mc', '객관식']].map(function (x) { var on = S.rvType === x[0]; return '<button type="button" data-rt="' + x[0] + '" style="border:0;height:28px;padding:0 10px;border-radius:8px;font:' + (on ? 800 : 500) + ' 12px \'Noto Sans KR\';cursor:pointer;background:' + (on ? '#fff' : 'transparent') + ';color:' + (on ? '#7B1D1D' : '#F3D2C8') + '">' + x[1] + '</button>'; }).join('') + '</div></div>'
      + '<div class="row" style="gap:6px"><span style="color:#F3D2C8;font-size:13px;flex:1">커트라인</span><input type="number" id="wt-rvpct" min="50" max="100" step="5" value="' + S.rvPct + '" style="width:58px;height:30px;border:0;border-radius:8px;text-align:center;font-weight:800;color:#1A1010"><span style="font-size:13px">%</span></div>'
      + '<div style="background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,205,.3);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:flex-start"><button type="button" class="tog' + (S.rvPer ? '' : ' off') + '" data-per aria-label="학생마다 따로 만들기" style="margin-top:2px"><i></i></button><div class="col" style="gap:2px"><b style="font-size:13px">학생마다 따로 만들기</b><span style="font-size:11px;color:#F3D2C8;line-height:1.5">' + (S.rvPer ? '각자 틀린 단어로만 ' + targets.length + '개 시험' : '같은 ' + use.length + '단어를 ' + targets.length + '명에게') + '</span></div></div>'
      + '<button type="button" class="g" data-mk style="height:50px;font-size:14px;margin-top:6px"' + (use.length && targets.length ? '' : ' disabled') + '>만들고 오늘 배정하기</button></div>';
    v.innerHTML = '<div style="display:grid;grid-template-columns:270px minmax(0,1fr) 290px;gap:14px;align-items:start" class="wt-rvg">' + c1 + c2 + c3 + '</div><style>@media(max-width:1100px){.wt-rvg{grid-template-columns:1fr!important}}</style>';
    v.querySelectorAll('[data-t]').forEach(function (b) { b.onchange = function () { if (b.checked) S.rvSel[b.dataset.t] = 1; else delete S.rvSel[b.dataset.t]; S.rvName = null; render(); }; });
    v.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { S.rvMode = +b.dataset.mode; render(); }; });
    v.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { S.rvOff[b.dataset.w] = !S.rvOff[b.dataset.w]; render(); }; });
    v.querySelectorAll('[data-rt]').forEach(function (b) { b.onclick = function () { S.rvType = b.dataset.rt; render(); }; });
    var cl = v.querySelector('[data-clear]'); if (cl) cl.onclick = function () { S.rvOnly = null; render(); };
    v.querySelector('[data-per]').onclick = function () { S.rvPer = !S.rvPer; render(); };
    v.querySelector('#wt-rvname').onchange = function (e) { S.rvName = e.target.value; };
    v.querySelector('#wt-rvpct').onchange = function (e) { S.rvPct = Math.max(50, Math.min(100, +e.target.value || 80)); };
    var mk = v.querySelector('[data-mk]'); if (mk) mk.onclick = function () {
      mk.disabled = true; mk.textContent = '만드는 중...';
      var me = ME(), today = U.todayStr(), title = (v.querySelector('#wt-rvname').value || defName).trim(), fid = (selT[0] || {}).folderId || null;
      var base = { title: title, folderId: fid, type: S.rvType, cutPct: S.rvPct, date: today, openAt: Date.now(), dueAt: U.kstMs(today, 23, 59), status: 'assigned', kind: 'review', teacherUid: me.uid, teacherName: (me.profile || {}).name || '', attempts: 0, sourceTestIds: selIds };
      var wordsOf = function (list) { return list.map(function (w) { return { en: w, ko: ko[w] }; }); };
      var job;
      if (S.rvPer) {
        job = DB.batchAdd('wordAssign', targets.map(function (u) { var ws = wordsOf(use.filter(function (w) { return perStu[u][w]; })); return Object.assign({}, base, { studentUid: u, studentName: names[u], testId: null, words: ws, total: ws.length }); }));
      } else {
        var ws = wordsOf(use);
        job = DB.add('wordTests', { title: title, words: ws, folderId: fid, type: S.rvType, cutPct: S.rvPct, order: Date.now(), kind: 'review', createdBy: me.uid }).then(function (ref) {
          return DB.batchAdd('wordAssign', targets.map(function (u) { return Object.assign({}, base, { studentUid: u, studentName: names[u], testId: ref.id, total: ws.length }); }));
        });
      }
      job.then(function () { F().push(targets, '📚 오답 시험이 도착했어요', title + ' · 오늘 자정까지', { type: 'wordtest' }); U.toast(targets.length + '명에게 오답 시험을 배정했어요'); S.rvSel = {}; S.rvOff = {}; S.rvName = null; S.rvOnly = null; refresh(); })
        .catch(function (e) { mk.disabled = false; mk.textContent = '다시 시도'; U.toast('만들지 못했어요: ' + (e.message || e)); });
    };
  }
})();

/* =====================================================================
   학생 화면
   ===================================================================== */
(function () {
  'use strict';
  var WT = window.WT, U = WT._u, DB = WT.DB, esc = U.esc, sv = U.sv;
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };
  var MY = { assigns: [], tests: {}, loadedAt: 0 };

  function loadMine(force) {
    if (!force && Date.now() - MY.loadedAt < 15000) return Promise.resolve(MY);
    var uid = ME().uid; if (!uid) return Promise.resolve(MY);
    return DB.assignsOf(uid).then(function (as) {
      MY.assigns = as; MY.loadedAt = Date.now();
      var need = {}; as.forEach(function (a) { if (a.testId && !MY.tests[a.testId]) need[a.testId] = 1; });
      return Promise.all(Object.keys(need).map(function (id) { return DB.get('wordTests', id).then(function (t) { if (t) MY.tests[id] = t; }); })).then(function () { return MY; });
    });
  }
  function totalOf(a) { return a.total || (a.words ? a.words.length : ((MY.tests[a.testId] || {}).words || []).length) || 0; }
  function cutOfA(a) { return WT.cutCount(totalOf(a), a); }
  // 오늘 해야 할 것
  function todayTasks() {
    var now = Date.now(), today = U.todayStr();
    var open = MY.assigns.filter(function (a) { return a.status === 'assigned' && (a.openAt || 0) <= now && a.date <= today; });
    var re = open.filter(function (a) { return a.kind === 'retest'; });
    var rest = open.filter(function (a) { return a.kind !== 'retest'; }).sort(function (a, b) { return a.date.localeCompare(b.date) || (a.seq || 0) - (b.seq || 0); });
    var lockByRetest = re.length && rest.some(function (a) { return a.retestFirst; });
    var donePassed = MY.assigns.filter(function (a) { return a.date === today && a.status === 'passed'; });
    return { re: re, rest: rest, lock: lockByRetest, passed: donePassed };
  }
  WT.myTodayCount = function () { var t = todayTasks(); return t.re.length + t.rest.length; };

  /* -------------------------------------------------------- 홈: 오늘의 플래너 맨 위 고정 (2안) */
  WT.studentHomePin = function (el) {
    if (!el) return;
    el.classList.add('wt');
    loadMine(true).then(function () {
      var t = todayTasks(), rows = '';
      function row(a, locked) {
        var n = totalOf(a), isRe = a.kind === 'retest', late = a.date < U.todayStr();
        var tag = isRe ? '<span style="font-size:9px;font-weight:800;color:#fff;background:linear-gradient(180deg,#C25555,#9C2F2F);border-radius:4px;padding:2px 6px">재시험</span>' : '<span style="font-size:9px;font-weight:800;color:#fff;background:linear-gradient(180deg,#922B2B,#6E1818);border-radius:4px;padding:2px 6px">필수</span>';
        var sub = (a.type === 'sa' ? '주관식 ' : '객관식 ') + n + '문항 · ' + cutOfA(a) + '개 이상 통과' + (late ? ' · <b style="color:#9C2F2F">' + U.md(a.date) + ' 밀림</b>' : ' · 통과해야 완료 체크돼요');
        if (locked) sub = '재시험을 먼저 통과하면 열려요';
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 10px;margin:0 0 6px;border-radius:10px;background:' + (isRe ? '#FBF1EF' : '#FBF4F1') + ';box-shadow:inset 3px 0 0 ' + (isRe ? '#9C2F2F' : '#7B1D1D') + (locked ? ';opacity:.6' : '') + '"><span style="width:17px;height:17px;border-radius:5px;border:2px solid ' + (isRe ? '#9C2F2F' : '#7B1D1D') + ';flex:none"></span><div style="flex:1;display:flex;flex-direction:column;gap:2px;min-width:0"><div style="display:flex;align-items:center;gap:6px;min-width:0"><span style="font-size:13px;font-weight:800;color:#1A1010;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">단어 Test · ' + esc(a.title) + '</span>' + tag + '</div><span style="font-size:11px;color:#7A6060">' + sub + '</span></div>'
          + '<button type="button" class="' + (isRe ? 'o' : 'p') + '" data-go="' + a.id + '" style="height:32px;padding:0 13px;font-size:12px;border-radius:9px;flex:none"' + (locked ? ' disabled' : '') + '>' + (locked ? '잠김' : '응시') + '</button></div>';
      }
      t.re.forEach(function (a) { rows += row(a, false); });
      t.rest.slice(0, 3).forEach(function (a) { rows += row(a, t.lock); });
      if (t.rest.length > 3) rows += '<div style="font-size:11px;color:#9C2F2F;font-weight:700;padding:0 4px 8px">밀린 단어 Test ' + (t.rest.length - 3) + '개 더 있어요 · 시험 탭에서 확인</div>';
      t.passed.forEach(function (a) { if (a.kind === 'retest') return; rows += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin:0 0 6px;border-radius:10px;background:#F3F8F4"><span style="width:17px;height:17px;border-radius:5px;background:linear-gradient(180deg,#2A8250,#1B6B3A);display:flex;align-items:center;justify-content:center;flex:none">' + sv('check', '#fff', 11, 3) + '</span><span style="flex:1;font-size:12.5px;color:#5A7A64;text-decoration:line-through">단어 Test · ' + esc(a.title) + '</span><span style="font-size:11px;font-weight:800;color:#1B6B3A">통과 ' + (a.bestScore != null ? a.bestScore + '/' + totalOf(a) : '') + '</span></div>'; });
      el.innerHTML = rows;
      el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { if (!b.disabled) WT.startTest(b.dataset.go); }; });
    }).catch(function (e) { console.warn('[wordtest] home pin', e); });
  };

  /* -------------------------------------------------------- 시험 탭: 단어 Test 목록 */
  WT.studentExamSection = function (el) {
    if (!el) return;
    el.classList.add('wt');
    loadMine(true).then(function () {
      var t = todayTasks(), today = U.todayStr();
      var upcoming = MY.assigns.filter(function (a) { return a.status === 'assigned' && (a.date > today || (a.openAt || 0) > Date.now()); }).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 5);
      var recent = MY.assigns.filter(function (a) { return a.status === 'passed' || a.status === 'failed'; }).sort(function (a, b) { return U.tsMs(b.doneAt) - U.tsMs(a.doneAt); }).slice(0, 4);
      function line(a, kind) {
        var n = totalOf(a), btn = '';
        if (kind === 'now') btn = '<button type="button" class="' + (a.kind === 'retest' ? 'o' : 'p') + '" data-go="' + a.id + '" style="height:34px;padding:0 14px;font-size:12px"' + (t.lock && a.kind !== 'retest' ? ' disabled' : '') + '>' + (t.lock && a.kind !== 'retest' ? '잠김' : '응시') + '</button>';
        else if (kind === 'done') btn = '<span class="tag ' + (a.status === 'passed' ? 't-pass' : 't-fail') + '">' + (a.status === 'passed' ? '통과' : '재시험') + ' ' + (a.bestScore != null ? a.bestScore + '/' + n : '') + '</span>';
        else btn = '<span class="tag t-wait">' + U.md(a.date) + ' 공개</span>';
        return '<div class="row" style="padding:11px 4px;box-shadow:inset 0 -1px 0 #F6EFED;gap:10px"><span style="width:34px;height:34px;border-radius:10px;background:' + (a.kind === 'retest' ? '#F8E9E7' : '#F6EEEC') + ';display:flex;align-items:center;justify-content:center;flex:none">' + sv(a.kind === 'retest' ? 'retry' : 'book', a.kind === 'retest' ? '#9C2F2F' : '#B0895A', 16) + '</span><div class="col" style="flex:1;gap:2px;min-width:0"><b style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.title) + '</b><span style="font-size:11px;color:#8A7B7B">' + (a.type === 'sa' ? '주관식' : '객관식') + ' ' + n + '문항 · 커트 ' + cutOfA(a) + (kind === 'now' && a.date < today ? ' · <b style="color:#9C2F2F">밀림</b>' : '') + '</span></div>' + btn + '</div>';
      }
      var nowList = t.re.concat(t.rest);
      el.innerHTML = '<div class="card" style="padding:16px 16px 10px;margin-bottom:12px">'
        + '<div class="row" style="justify-content:space-between;margin-bottom:4px"><div class="col" style="gap:2px"><span class="eb">WORD TEST</span><span class="serif" style="font-size:18px;color:#7B1D1D">단어 Test</span></div><button type="button" class="s" data-report style="height:36px;padding:0 13px;font-size:12px">내 단어 성적표</button></div>'
        + (nowList.length ? nowList.map(function (a) { return line(a, 'now'); }).join('') : '<div style="padding:16px 4px;font-size:12.5px;color:#8A7B7B">오늘 볼 단어 Test가 없어요' + (t.passed.length ? ' · 오늘 ' + t.passed.length + '개 통과!' : '') + '</div>')
        + (upcoming.length ? '<div style="font-size:11px;font-weight:800;color:#8A6A66;padding:12px 4px 2px">다가오는 시험</div>' + upcoming.map(function (a) { return line(a, 'up'); }).join('') : '')
        + (recent.length ? '<div style="font-size:11px;font-weight:800;color:#8A6A66;padding:12px 4px 2px">최근 결과</div>' + recent.map(function (a) { return line(a, 'done'); }).join('') : '')
        + '</div>';
      el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { if (!b.disabled) WT.startTest(b.dataset.go); }; });
      el.querySelector('[data-report]').onclick = function () { WT.openReport(); };
    }).catch(function (e) { console.warn('[wordtest] exam section', e); el.innerHTML = ''; });
  };

  /* -------------------------------------------------------- 응시 */
  function resolveWords(a) {
    if (a.words && a.words.length) return Promise.resolve(a.words);
    if (a.testId) { var t = MY.tests[a.testId]; return t ? Promise.resolve(t.words || []) : DB.get('wordTests', a.testId).then(function (x) { if (x) MY.tests[x.id] = x; return x ? x.words || [] : []; }); }
    if (a.sourceTestIds && a.sourceTestIds.length) {   // 5개마다 오답 모음: 내가 틀린 단어
      return DB.resultsOf(ME().uid).then(function (rs) {
        var seen = {}, out = [];
        rs.filter(function (r) { return a.sourceTestIds.indexOf(r.testId) >= 0; }).forEach(function (r) { (r.answers || []).forEach(function (x) { if (!x.ok && !seen[x.en]) { seen[x.en] = 1; out.push({ en: x.en, ko: x.ko }); } }); });
        return out;
      });
    }
    return Promise.resolve([]);
  }
  function poolFor(a, words) {
    var pool = words.slice();
    if (pool.length < 8) Object.keys(MY.tests).forEach(function (id) { if (MY.tests[id].folderId === a.folderId) pool = pool.concat(MY.tests[id].words || []); });
    var seen = {}; return pool.filter(function (w) { if (!w.ko || seen[w.ko]) return false; seen[w.ko] = 1; return true; });
  }
  var FILL = ['결정하다', '개선하다', '분배하다', '기대하다', '증가하다', '유지하다', '비교하다', '거절하다', '참여하다', '발견하다', '정확한', '풍부한', '명백한', '독특한', '필수적인'];
  function makeOptions(w, pool) {
    var ds = U.shuffle(pool.filter(function (p) { return p.ko !== w.ko && p.en !== w.en; })).slice(0, 4).map(function (p) { return p.ko; });
    var fi = U.shuffle(FILL); while (ds.length < 4 && fi.length) { var f = fi.pop(); if (f !== w.ko && ds.indexOf(f) < 0) ds.push(f); }
    return U.shuffle(ds.concat([w.ko]));
  }
  var T = null; // 현재 응시 상태
  WT.startTest = function (assignId) {
    var a = MY.assigns.filter(function (x) { return x.id === assignId; })[0];
    var p = a ? Promise.resolve(a) : DB.get('wordAssign', assignId);
    p.then(function (asg) {
      if (!asg) { U.toast('시험을 찾지 못했어요'); return; }
      return resolveWords(asg).then(function (words) {
        words = (words || []).filter(function (w) { return w && w.en && w.ko; });
        if (!words.length) {
          if (asg.kind === 'review') { DB.upd('wordAssign', asg.id, { status: 'passed', doneAt: Date.now(), note: '틀린 단어 없음' }).then(function () { U.toast('틀린 단어가 없어서 오답 모음은 통과예요!'); refreshHome(); }); return; }
          U.toast('단어가 없는 시험이에요. 선생님께 알려 주세요'); return;
        }
        var key = 'wt_sess_' + asg.id, saved = null; try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
        if (saved && saved.qs && saved.qs.length === words.length) T = saved;
        else {
          var pool = poolFor(asg, words);
          T = { id: asg.id, qs: U.shuffle(words).map(function (w) { return { en: w.en, ko: w.ko, opts: asg.type === 'sa' ? null : makeOptions(w, pool), ans: null, unknown: false }; }), cur: 0, start: Date.now() };
        }
        T.a = asg; T.key = key; T.type = asg.type === 'sa' ? 'sa' : 'mc';
        openRunner();
      });
    }).catch(function (e) { U.toast('시험을 열지 못했어요: ' + (e.message || e)); });
  };
  function saveSess() { try { var c = Object.assign({}, T); delete c.a; localStorage.setItem(T.key, JSON.stringify(c)); } catch (e) { } }
  var full = null, tick = null;
  function closeRunner() { if (tick) clearInterval(tick); tick = null; document.removeEventListener('keydown', onKey); if (full) full.remove(); full = null; document.body.style.overflow = ''; }
  function openRunner() {
    closeRunner();
    full = document.createElement('div'); full.className = 'wt-full wt'; document.body.appendChild(full); document.body.style.overflow = 'hidden';
    try { if (window.history && history.pushState) history.pushState({ wt: 1 }, ''); } catch (e) { }
    drawQ();
    tick = setInterval(function () { var el = full && full.querySelector('[data-time]'); if (el) el.textContent = U.fmtSec((Date.now() - T.start) / 1000); }, 1000);
    document.addEventListener('keydown', onKey);
  }
  function answered(q) { return q.unknown || (q.ans != null && q.ans !== ''); }
  function drawQ() {
    var q = T.qs[T.cur], n = T.qs.length, a = T.a, mob = U.isMobile(), done = T.qs.filter(answered).length;
    var segs = n <= 60 ? '<div style="flex:1;display:grid;grid-template-columns:repeat(' + n + ',1fr);gap:' + (n > 40 ? 1 : 2) + 'px">' + T.qs.map(function (x, i) { return '<span style="height:6px;border-radius:2px;background:' + (i === T.cur ? '#C99A86' : answered(x) ? (x.unknown ? '#E6B9A8' : '#7B1D1D') : '#E8DEDA') + '"></span>'; }).join('') + '</div>'
      : '<div style="flex:1;height:6px;border-radius:3px;background:#E8DEDA"><div style="height:6px;border-radius:3px;width:' + (done / n * 100) + '%;background:#7B1D1D"></div></div>';
    var top = '<div style="padding:' + (mob ? '14px 16px 0' : '20px 28px 0') + ';display:flex;flex-direction:column;gap:10px;flex:none"><div class="row" style="gap:10px"><button type="button" class="ib" data-exit aria-label="나가기" style="width:38px;height:38px;border-radius:19px;flex:none">' + sv('x', '#3D2B2B', 14) + '</button><div class="col" style="flex:1;gap:1px;min-width:0"><span class="eb" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.title) + '</span><b style="font-size:13.5px">' + (T.type === 'sa' ? '주관식' : '객관식') + ' 단어 Test' + (a.kind === 'retest' ? ' · 재시험' : '') + '</b></div><span class="chip" style="height:32px;display:flex;align-items:center;gap:5px;padding:0 11px;font-size:12.5px;font-weight:800;color:#7B1D1D;flex:none">' + sv('clock', '#7B1D1D', 13) + '<span data-time>' + U.fmtSec((Date.now() - T.start) / 1000) + '</span></span></div>'
      + '<div class="row" style="gap:10px">' + segs + '<span style="font-size:13.5px;font-weight:800;flex:none"><span style="color:#7B1D1D">' + (T.cur + 1) + '</span><span style="color:#A89898;font-weight:600"> / ' + n + '</span></span></div></div>';
    var body;
    if (T.type === 'mc') {
      body = '<div style="background:#fff;border-radius:22px;padding:' + (mob ? '28px 18px 22px' : '34px 20px 28px') + ';display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:inset 0 0 0 1px #EDE2DF,0 18px 36px -22px rgba(110,45,45,.4)"><span class="eb">Q ' + (T.cur + 1) + '</span><span class="serif" style="font-size:' + (q.en.length > 14 ? (mob ? 28 : 36) : (mob ? 36 : 46)) + 'px;text-align:center;word-break:break-word">' + esc(q.en) + '</span><span style="font-size:12px;color:#8A7B7B">알맞은 뜻을 고르세요</span></div>'
        + '<div style="display:grid;grid-template-columns:' + (mob ? '1fr' : '1fr 1fr') + ';gap:' + (mob ? 9 : 10) + 'px">' + q.opts.map(function (o, i) {
          var on = q.ans === o;
          return '<button type="button" data-opt="' + i + '" class="' + (on ? 'p' : 's') + '" style="height:56px;justify-content:flex-start;gap:14px;padding:0 16px;font-size:15px;font-weight:' + (on ? 800 : 500) + ';text-align:left;white-space:normal"><span style="width:28px;height:28px;border-radius:14px;flex:none;display:flex;align-items:center;justify-content:center;font:700 14px \'Noto Serif KR\',serif;' + (on ? 'background:radial-gradient(circle at 35% 30%,#FFF1EA,#F3D2C8);color:#4E1010' : 'box-shadow:inset 0 0 0 1px #D9C9C5;color:#8A6A66') + '">' + (i + 1) + '</span><span style="flex:1">' + esc(o) + '</span>' + (on ? sv('check', '#FFE1D6', 18, 2.6) : '') + '</button>';
        }).join('') + '</div>';
    } else {
      body = '<div style="padding:' + (mob ? '18px 4px 0' : '26px 6px 0') + ';display:flex;flex-direction:column;gap:6px"><span class="serif" style="font-size:' + (q.en.length > 14 ? (mob ? 30 : 40) : (mob ? 38 : 52)) + 'px;word-break:break-word">' + esc(q.en) + '</span></div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;padding:6px 4px 0"><label for="wt-sa" style="font-size:11px;font-weight:800;color:#B0895A;letter-spacing:.1em">뜻 쓰기</label><div class="row" style="border-bottom:2px solid #7B1D1D;padding-bottom:8px"><input id="wt-sa" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" value="' + esc(q.unknown ? '' : (q.ans || '')) + '" placeholder="' + (q.unknown ? '모름으로 표시했어요' : '') + '" style="flex:1;border:0;background:transparent;font:700 ' + (mob ? 24 : 30) + 'px \'Noto Sans KR\',sans-serif;color:#1A1010;outline:none;padding:0;min-width:0"><button type="button" class="ib" data-clear aria-label="지우기" style="width:28px;height:28px;border-radius:14px">' + sv('x', '#7A6060', 10, 3) + '</button></div><span style="font-size:11.5px;color:#8A7B7B">띄어쓰기는 채점에 상관없어요 · 뜻 하나만 써도 정답 · 엔터 누르면 다음</span></div>';
    }
    var last = T.cur === n - 1;
    var foot = '<div class="row" style="gap:8px">' + (T.cur ? '<button type="button" class="s" data-prev aria-label="이전 문항" style="width:52px;height:52px;flex:none">' + sv('left', '#3D2B2B', 18) + '</button>' : '') + '<button type="button" class="s" data-unk style="height:52px;padding:0 16px;font-size:13px' + (q.unknown ? ';box-shadow:inset 0 0 0 2px #C99A86' : '') + '">' + (T.type === 'sa' ? '모름 · 건너뛰기' : '모르겠어요') + '</button><button type="button" class="p" data-next style="flex:1;height:52px;font-size:14.5px">' + (last ? '제출하기' : '다음 문항') + (last ? '' : sv('right', '#fff', 16, 2.4)) + '</button></div>';
    var grid = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">' + T.qs.map(function (x, i) { var st = i === T.cur ? 'cur' : answered(x) ? (x.unknown ? 'unk' : 'done') : 'todo'; return '<button type="button" data-jump="' + i + '" style="height:32px;border-radius:8px;border:0;cursor:pointer;font:800 11px \'Noto Sans KR\';' + ({ cur: 'background:#fff;color:#7B1D1D;box-shadow:inset 0 0 0 2px #7B1D1D', done: 'background:linear-gradient(180deg,#922B2B,#6E1818);color:#fff', unk: 'background:#F6E2D8;color:#9C2F2F', todo: 'background:transparent;color:#A89898;box-shadow:inset 0 0 0 1px #E6D9D5' })[st] + '">' + (i + 1) + '</button>'; }).join('') + '</div>';
    var keys = (T.type === 'mc' ? [['1~5', '보기 고르기'], ['Enter', '다음 문항'], ['←', '이전 문항'], ['0', '모르겠어요']] : [['Enter', '다음 문항'], ['Tab', '모름 · 건너뛰기'], ['↑ ↓', '이전 · 다음']]).map(function (k) { return '<span class="row" style="gap:8px;font-size:11px;color:#8A7B7B"><span style="min-width:30px;height:22px;padding:0 6px;border-radius:6px;background:#F3ECEA;color:#5A4848;font-weight:800;display:inline-flex;align-items:center;justify-content:center">' + k[0] + '</span>' + k[1] + '</span>'; }).join('');
    var bg = T.type === 'sa' ? '#FBF8F2' : '#F8F5F4';
    full.style.background = bg;
    if (mob) {
      full.innerHTML = top + '<div style="flex:1;overflow:auto;padding:16px 16px 0;display:flex;flex-direction:column;gap:14px">' + body + (T.type === 'sa' ? '<div style="padding-top:6px">' + foot + '</div>' : '') + '</div>' + (T.type === 'mc' ? '<div style="padding:12px 16px 20px;flex:none">' + foot + '</div>' : '<div style="height:8px"></div>');
    } else {
      full.innerHTML = '<div style="width:100%;max-width:1180px;margin:0 auto;height:100%;display:flex;flex-direction:column">' + top + '<div style="flex:1;display:flex;gap:22px;padding:22px 28px 26px;min-height:0"><div style="flex:1;display:flex;flex-direction:column;gap:14px;min-width:0;overflow:auto">' + body + '<div style="flex:1"></div>' + foot + '</div><div class="card" style="width:252px;flex:none;padding:18px;display:flex;flex-direction:column;gap:12px;overflow:auto"><b style="font-size:13px">번호로 이동</b>' + grid + '<div style="flex:1"></div><div style="box-shadow:inset 0 1px 0 #EDE2DF;padding-top:12px;display:flex;flex-direction:column;gap:7px"><b style="font-size:11px">키보드로 빠르게</b>' + keys + '</div></div></div></div>';
    }
    bindQ();
  }
  function bindQ() {
    var q = T.qs[T.cur];
    full.querySelector('[data-exit]').onclick = function () { U.confirmBox('지금 나가도 푼 내용은 저장돼요.<br>다시 들어오면 이어서 풀 수 있어요.', '나가기').then(function (ok) { if (ok) { saveSess(); closeRunner(); refreshHome(); } }); };
    full.querySelectorAll('[data-opt]').forEach(function (b) { b.onclick = function () { q.ans = q.opts[+b.dataset.opt]; q.unknown = false; saveSess(); drawQ(); }; });
    full.querySelectorAll('[data-jump]').forEach(function (b) { b.onclick = function () { commitSA(); T.cur = +b.dataset.jump; drawQ(); }; });
    var inp = full.querySelector('#wt-sa');
    if (inp) {
      setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }, 30);
      inp.oninput = function () { q.ans = inp.value; if (inp.value) q.unknown = false; };
      inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); next(); } };
      full.querySelector('[data-clear]').onclick = function () { inp.value = ''; q.ans = ''; inp.focus(); };
    }
    var pv = full.querySelector('[data-prev]'); if (pv) pv.onclick = function () { commitSA(); T.cur--; drawQ(); };
    full.querySelector('[data-unk]').onclick = function () { q.unknown = true; q.ans = null; saveSess(); next(true); };
    full.querySelector('[data-next]').onclick = function () { next(); };
  }
  function commitSA() { if (T.type !== 'sa') return; var inp = full && full.querySelector('#wt-sa'); if (inp) { T.qs[T.cur].ans = inp.value; if (inp.value) T.qs[T.cur].unknown = false; } saveSess(); }
  function next(skipCheck) {
    commitSA();
    if (T.cur < T.qs.length - 1) { T.cur++; drawQ(); return; }
    var left = T.qs.filter(function (x) { return !answered(x); }).length;
    U.confirmBox(left ? '아직 안 푼 문항이 <b>' + left + '개</b> 있어요.<br>그대로 제출할까요?' : '모든 문항을 풀었어요. 제출할까요?', '제출').then(function (ok) { if (ok) submit(); else if (left) { T.cur = T.qs.findIndex(function (x) { return !answered(x); }); drawQ(); } });
  }
  function onKey(e) {
    if (!full || document.querySelector('.wt-modal-bg')) return;
    var tag = (e.target && e.target.tagName) || '';
    if (T.type === 'mc') {
      if (/^[1-5]$/.test(e.key)) { var b = full.querySelector('[data-opt="' + (+e.key - 1) + '"]'); if (b) b.click(); }
      else if (e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' && T.cur) { T.cur--; drawQ(); }
      else if (e.key === 'ArrowRight') { next(); }
      else if (e.key === '0') full.querySelector('[data-unk]').click();
    } else {
      if (e.key === 'Tab') { e.preventDefault(); full.querySelector('[data-unk]').click(); }
      else if (e.key === 'ArrowUp' && T.cur) { e.preventDefault(); commitSA(); T.cur--; drawQ(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); next(); }
    }
  }
  window.addEventListener('popstate', function () { if (full && T) { saveSess(); closeRunner(); refreshHome(); } });

  function submit() {
    var a = T.a, n = T.qs.length, cut = WT.cutCount(n, a);
    var answers = T.qs.map(function (q) { var ok = !q.unknown && (T.type === 'mc' ? q.ans === q.ko : WT.gradeSA(q.ans, q.ko)); return { en: q.en, ko: q.ko, given: q.unknown ? '' : (q.ans || ''), ok: ok, unknown: !!q.unknown }; });
    var score = answers.filter(function (x) { return x.ok; }).length, passed = score >= cut, sec = Math.round((Date.now() - T.start) / 1000);
    var me = ME(), prof = me.profile || {}, today = U.todayStr();
    full.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#8A7B7B;font-size:14px">채점하는 중...</div>';
    var res = { assignId: a.id, testId: a.testId || null, title: a.title, kind: a.kind || 'normal', type: T.type, folderId: a.folderId || null, studentUid: me.uid, studentName: prof.name || a.studentName || '', score: score, total: n, cut: cut, passed: passed, timeSec: sec, answers: answers, date: today, teacherUid: a.teacherUid || null, attempt: (a.attempts || 0) + 1, seen: passed, handled: passed };
    DB.add('wordResults', res).then(function (ref) {
      var up = { status: passed ? 'passed' : 'failed', attempts: (a.attempts || 0) + 1, lastResultId: ref.id, doneAt: Date.now(), bestScore: Math.max(a.bestScore || 0, score) };
      var jobs = [DB.upd('wordAssign', a.id, up)];
      var wrong = answers.filter(function (x) { return !x.ok; }).map(function (x) { return { en: x.en, ko: x.ko }; });
      var retest = null;
      if (!passed && (a.kind !== 'retest' || a.autoNext !== false)) {
        var d = a.kind === 'retest' ? U.addDays(today, 1) : today;
        retest = { studentUid: me.uid, studentName: res.studentName, testId: a.testId || null, title: String(a.title).replace(/\s*재시험$/, '') + ' 재시험', folderId: a.folderId || null, words: wrong, total: wrong.length, cutPct: a.cutPct != null ? a.cutPct : 80, cutWrong: a.cutWrong != null ? a.cutWrong : null, type: a.type || 'mc', date: d, openAt: a.kind === 'retest' ? U.kstMs(d, 0) : Date.now(), dueAt: U.kstMs(d, 23, 59), status: 'assigned', kind: 'retest', parentResultId: ref.id, parentAssignId: a.id, teacherUid: a.teacherUid || null, teacherName: a.teacherName || '', autoNext: true, auto: true, attempts: 0 };
        jobs.push(DB.add('wordAssign', retest));
      }
      if (!passed && a.teacherUid) F().push([a.teacherUid], '🔔 단어 Test 미통과', res.studentName + ' · ' + a.title + ' ' + score + '/' + n + ' (커트 ' + cut + ')', { type: 'wordtest' });
      return Promise.all(jobs).then(function () { try { localStorage.removeItem(T.key); } catch (e) { } showResult(res, retest); });
    }).catch(function (e) { full.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:20px;text-align:center"><b>제출하지 못했어요</b><span style="font-size:13px;color:#8A7B7B">' + esc(e.message || e) + '</span><button type="button" class="p" data-retry style="height:46px;padding:0 20px">다시 제출</button></div>'; full.querySelector('[data-retry]').onclick = submit; });
  }

  /* -------------------------------------------------------- 결과 (2안 · 반원 게이지 동작) */
  function arc(sc, total, cut, ok, size) {
    var cx = size / 2, r = size / 2 - 20, cy = cx;
    function pt(v) { var a = Math.PI * (1 - v / Math.max(1, total)); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    var p0 = pt(0), p1 = pt(total), ps = pt(Math.max(.0001, sc)), ac = Math.PI * (1 - cut / Math.max(1, total));
    var t1 = [cx + (r + 14) * Math.cos(ac), cy - (r + 14) * Math.sin(ac)], t0 = [cx + (r - 14) * Math.cos(ac), cy - (r - 14) * Math.sin(ac)];
    var col = ok ? 'url(#wtgp)' : 'url(#wtgf)', f = function (x) { return x.toFixed(1); };
    return '<div style="position:relative;width:' + size + 'px;max-width:100%"><span class="wt-arccnt" style="--to:' + sc + ';position:absolute;left:0;right:0;top:' + Math.round(cy - 56) + 'px;text-align:center;font:700 58px/1 \'Noto Serif KR\',serif;color:#1A1010"></span>'
      + '<svg width="100%" viewBox="0 0 ' + size + ' ' + (size / 2 + 30) + '" role="img" aria-label="' + sc + '점, 커트 ' + cut + '"><defs><linearGradient id="wtgp" x1="0" x2="1"><stop offset="0" stop-color="#A9D6B8"/><stop offset="1" stop-color="#1B6B3A"/></linearGradient><linearGradient id="wtgf" x1="0" x2="1"><stop offset="0" stop-color="#F0C4BB"/><stop offset="1" stop-color="#9C2F2F"/></linearGradient><filter id="wtds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#6E2D2D" flood-opacity=".25"/></filter></defs>'
      + '<path d="M' + f(p0[0]) + ',' + f(p0[1]) + ' A' + r + ',' + r + ' 0 0 1 ' + f(p1[0]) + ',' + f(p1[1]) + '" fill="none" stroke="#F1EAE8" stroke-width="18" stroke-linecap="round"/>'
      + (sc > 0 ? '<path class="wt-arcfill" pathLength="100" d="M' + f(p0[0]) + ',' + f(p0[1]) + ' A' + r + ',' + r + ' 0 0 1 ' + f(ps[0]) + ',' + f(ps[1]) + '" fill="none" stroke="' + col + '" stroke-width="18" stroke-linecap="round" filter="url(#wtds)"/>' : '')
      + '<line x1="' + f(t0[0]) + '" y1="' + f(t0[1]) + '" x2="' + f(t1[0]) + '" y2="' + f(t1[1]) + '" stroke="#C99A86" stroke-width="3" stroke-linecap="round"/><text x="' + f(t0[0] - 6) + '" y="' + f(t0[1] + 12) + '" text-anchor="end" font-size="11" font-weight="800" fill="#8A6A66" font-family="Noto Sans KR">커트 ' + cut + '</text>'
      + '<circle class="wt-arcknob" cx="' + f(ps[0]) + '" cy="' + f(ps[1]) + '" r="11" fill="#fff" stroke="' + (ok ? '#1B6B3A' : '#9C2F2F') + '" stroke-width="4" filter="url(#wtds)"/>'
      + '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="13" fill="#A89898">/ ' + total + '</text>'
      + '<text x="' + f(p0[0]) + '" y="' + f(p0[1] + 24) + '" text-anchor="middle" font-size="11" fill="#A89898" font-family="Noto Sans KR">0</text><text x="' + f(p1[0]) + '" y="' + f(p1[1] + 24) + '" text-anchor="middle" font-size="11" fill="#A89898" font-family="Noto Sans KR">' + total + '</text></svg></div>';
  }
  function showResult(res, retest) {
    var mob = U.isMobile(), ok = res.passed, name = /^[가-힣]{3}$/.test(res.studentName || '') ? res.studentName.slice(1) : '';
    var wrong = res.answers.filter(function (x) { return !x.ok; });
    var gauge = '<div class="card" style="padding:' + (mob ? '18px 14px 16px' : '26px 20px 22px') + ';display:flex;flex-direction:column;align-items:center;gap:8px;flex:none">' + arc(res.score, res.total, res.cut, ok, mob ? 260 : 320)
      + '<div class="col" style="align-items:center;gap:4px;text-align:center"><span class="serif" style="font-size:' + (mob ? 22 : 26) + 'px">' + (ok ? '통과했어요' + (name ? ', ' + esc(name) : '') : (res.cut - res.score) + '개만 더 맞히면 통과') + '</span><span style="font-size:12px;color:#7A6060">' + (ok ? (res.score === res.total ? '만점이에요! · ' : '커트보다 ' + (res.score - res.cut) + '개 더 맞혔어요 · ') + U.fmtSec(res.timeSec) : '틀린 단어만 다시 보면 금방이에요') + '</span></div></div>';
    var reCard = retest ? '<div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:12px;flex:none;box-shadow:inset 0 0 0 1.5px #EFD3CF,0 12px 24px -14px rgba(156,47,47,.45)"><span style="width:40px;height:40px;border-radius:12px;background:linear-gradient(160deg,#B84545,#7B1D1D);display:flex;align-items:center;justify-content:center;flex:none">' + sv('retry', '#fff', 18) + '</span><div class="col" style="flex:1;gap:1px"><b style="font-size:14px">재시험 · 틀린 ' + retest.words.length + '단어</b><span style="font-size:11px;color:#7A6060">' + Math.ceil(retest.words.length * retest.cutPct / 100) + '개 이상 통과 · ' + (retest.date === U.todayStr() ? '오늘' : '내일') + ' 자정까지</span></div></div>' : '';
    var words = '<div style="display:grid;grid-template-columns:' + (mob ? '1fr' : '1fr 1fr') + ';gap:8px">' + wrong.map(function (x) { return '<div class="card" style="padding:11px 14px;border-radius:14px;display:flex;flex-direction:column;gap:4px"><div class="row" style="justify-content:space-between;align-items:baseline"><span class="serif" style="font-size:17px">' + esc(x.en) + '</span><span style="font-size:10px;color:#A89898">' + (x.unknown ? '모름' : '내 답 <span style="text-decoration:line-through">' + esc(x.given || '—') + '</span>') + '</span></div><b style="font-size:12px;color:#7B1D1D">' + esc(x.ko) + '</b></div>'; }).join('') + '</div>';
    var btns = '<div class="row" style="gap:8px;flex:none"><button type="button" class="s" data-all style="height:52px;padding:0 18px;font-size:14px">전체 답안</button><button type="button" class="p" data-home style="flex:1;height:52px;font-size:15px">' + (retest && retest.date === U.todayStr() ? '재시험 시작' : '홈으로') + '</button></div>';
    var head = '<div class="row" style="justify-content:space-between;flex:none"><div class="col" style="gap:2px"><span class="eb">' + esc(res.title) + ' · ' + (res.type === 'sa' ? '주관식' : '객관식') + '</span><span style="font-size:12px;color:#8A7B7B">방금 제출</span></div><button type="button" class="ib" data-close aria-label="닫기" style="width:38px;height:38px">' + sv('x', '#5A4848', 14) + '</button></div>';
    var wl = '<b style="font-size:13px;flex:none">' + (wrong.length ? (ok ? '다시 볼 단어 ' : '틀린 단어 ') + wrong.length + '개' : '틀린 단어가 없어요 👏') + '</b>';
    full.style.background = '#F8F5F4';
    if (mob) full.innerHTML = '<div style="flex:1;overflow:auto;padding:16px 16px 20px;display:flex;flex-direction:column;gap:12px">' + head + gauge + reCard + wl + words + '</div><div style="padding:10px 16px 20px;flex:none;background:#F8F5F4">' + btns + '</div>';
    else full.innerHTML = '<div style="width:100%;max-width:1100px;margin:0 auto;height:100%;padding:26px 40px;display:flex;flex-direction:column;gap:18px">' + head + '<div style="flex:1;display:grid;grid-template-columns:400px 1fr;gap:22px;min-height:0"><div class="col" style="gap:12px">' + gauge + reCard + '</div><div class="col" style="gap:12px;min-height:0">' + wl + '<div class="scroll" style="flex:1;min-height:0">' + words + '</div>' + btns + '</div></div></div>';
    var close = function () { closeRunner(); refreshHome(); };
    full.querySelector('[data-close]').onclick = close;
    full.querySelector('[data-home]').onclick = function () {
      if (retest && retest.date === U.todayStr()) { loadMine(true).then(function () { var r = MY.assigns.filter(function (x) { return x.parentResultId && x.status === 'assigned' && x.kind === 'retest'; }).sort(function (a, b) { return U.tsMs(b.createdAt) - U.tsMs(a.createdAt); })[0]; if (r) WT.startTest(r.id); else close(); }); }
      else close();
    };
    full.querySelector('[data-all]').onclick = function () {
      var m = U.modal({ title: '전체 답안 · ' + res.score + ' / ' + res.total, eyebrow: res.title, width: 560 });
      m.body.innerHTML = res.answers.map(function (x, i) { return '<div class="row" style="padding:9px 4px;box-shadow:inset 0 -1px 0 #F6EFED;gap:10px"><span style="width:22px;height:22px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:' + (x.ok ? '#EAF3EC' : '#F8E9E7') + '">' + sv(x.ok ? 'check' : 'x', x.ok ? '#1B6B3A' : '#9C2F2F', 11, 3) + '</span><b style="font-size:13.5px;width:120px;flex:none">' + esc(x.en) + '</b><span style="flex:1;font-size:12.5px;color:#7B1D1D;font-weight:700">' + esc(x.ko) + '</span><span style="font-size:11px;color:#A89898;' + (x.ok ? '' : 'text-decoration:line-through') + '">' + esc(x.unknown ? '모름' : x.given) + '</span></div>'; }).join('');
      m.foot.innerHTML = '<button type="button" class="p" style="height:42px;padding:0 20px">닫기</button>'; m.foot.querySelector('button').onclick = m.close;
    };
  }
  function refreshHome() {
    MY.loadedAt = 0;
    var pin = document.getElementById('wt-home-pin'); if (pin) WT.studentHomePin(pin);
    var ex = document.getElementById('wt-exam-sec'); if (ex) WT.studentExamSection(ex);
  }
  WT.refreshStudent = refreshHome;

  /* -------------------------------------------------------- 내 단어 성적표 (PC 1안 / 모바일 2안 · 꺾은선 ↔ 막대) */
  var RP = { mode: null, folder: null };
  WT.openReport = function () {
    var uid = ME().uid;
    Promise.all([DB.resultsOf(uid), loadMine(true), F().getDocs(F().query(F().collection(F().db, 'wordFolders'), F().where('branch', '==', ME().branch))).then(function (s) { return s.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; }); }).catch(function () { return []; })]).then(function (r) {
      var results = r[0].sort(function (a, b) { return U.tsMs(a.createdAt) - U.tsMs(b.createdAt); }), folders = r[2];
      closeRunner();
      full = document.createElement('div'); full.className = 'wt-full wt'; document.body.appendChild(full); document.body.style.overflow = 'hidden';
      try { history.pushState({ wt: 1 }, ''); } catch (e) { }
      if (RP.mode == null) RP.mode = U.isMobile() ? 1 : 0;
      drawReport(results, folders);
    }).catch(function (e) { U.toast('성적표를 불러오지 못했어요'); console.warn(e); });
  };
  function drawReport(results, folders) {
    var mob = U.isMobile();
    var fids = {}; results.forEach(function (r) { if (r.folderId) fids[r.folderId] = 1; });
    var fl = folders.filter(function (f) { return fids[f.id]; });
    if (RP.folder && !fids[RP.folder]) RP.folder = null;
    if (!RP.folder && fl[0]) RP.folder = fl[0].id;
    var firsts = {}, inF = results.filter(function (r) { return !RP.folder || r.folderId === RP.folder || !r.folderId; });
    inF.forEach(function (r) { if (r.kind !== 'retest' && !firsts[r.assignId]) firsts[r.assignId] = r; });
    var pts = Object.keys(firsts).map(function (k) { return firsts[k]; }).sort(function (a, b) { return U.tsMs(a.createdAt) - U.tsMs(b.createdAt); }).slice(-10);
    var avg = pts.length ? Math.round(pts.reduce(function (s, r) { return s + r.score / r.total; }, 0) / pts.length * 100) : 0;
    var passN = pts.filter(function (r) { return r.passed; }).length, reN = inF.filter(function (r) { return r.kind === 'retest'; }).length;
    var learned = 0; MY.assigns.forEach(function (a) { if (a.status === 'passed' && a.kind === 'normal' && (!RP.folder || a.folderId === RP.folder)) learned += totalOf(a); });
    var cnt = {}, lastOk = {}, ko = {};
    inF.forEach(function (r) { (r.answers || []).forEach(function (a) { ko[a.en] = a.ko; if (!a.ok) cnt[a.en] = (cnt[a.en] || 0) + 1; else if (cnt[a.en]) lastOk[a.en] = U.tsMs(r.createdAt); }); });
    var lastBad = {}; inF.forEach(function (r) { (r.answers || []).forEach(function (a) { if (!a.ok) lastBad[a.en] = U.tsMs(r.createdAt); }); });
    var words = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 6).map(function (w, i) { var ok = (lastOk[w] || 0) > (lastBad[w] || 0); return { r: i + 1, en: w, ko: ko[w], k: cnt[w], ok: ok }; });
    var trend = pts.length >= 3 && pts[pts.length - 1].score / pts[pts.length - 1].total > pts[pts.length - 3].score / pts[pts.length - 3].total;
    function toggle(dark) {
      return '<div style="display:flex;gap:3px;padding:3px;border-radius:11px;' + (dark ? 'background:rgba(0,0,0,.18);box-shadow:inset 0 2px 4px rgba(0,0,0,.25)' : 'background:linear-gradient(180deg,#F1E9E6,#F7F2F0);box-shadow:inset 0 2px 6px rgba(110,45,45,.12)') + '">' + ['꺾은선', '막대'].map(function (t, i) { var on = RP.mode === i; return '<button type="button" data-mode="' + i + '" style="border:0;height:28px;padding:0 11px;border-radius:8px;font:' + (on ? 800 : 500) + ' 11.5px \'Noto Sans KR\';cursor:pointer;' + (on ? 'background:linear-gradient(180deg,#fff,#F7EFED);color:#7B1D1D;box-shadow:0 4px 10px -4px rgba(0,0,0,.35)' : 'background:transparent;color:' + (dark ? '#F0D9D5' : '#5A4848')) + '">' + t + '</button>'; }).join('') + '</div>';
    }
    function lineSvg(W, H, dark) {
      if (!pts.length) return '<div style="height:' + H + 'px;display:flex;align-items:center;justify-content:center;font-size:12px;color:' + (dark ? '#F0D9D5' : '#A89898') + '">아직 결과가 없어요</div>';
      var pad = 18, xs = pts.map(function (r, i) { return pts.length === 1 ? W / 2 : pad + i * (W - 2 * pad) / (pts.length - 1); });
      var y = function (p) { return H - 26 - (p - 40) / 60 * (H - 46); }, cp = Math.round(pts.reduce(function (s, r) { return s + r.cut / r.total; }, 0) / pts.length * 100), cy = y(cp);
      var st = dark ? '#fff' : '#7B1D1D';
      var P = pts.map(function (r, i) { return xs[i].toFixed(0) + ',' + y(r.score / r.total * 100).toFixed(0); });
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="회차별 정답률"><defs><linearGradient id="wtar' + (dark ? 1 : 0) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + st + '" stop-opacity=".2"/><stop offset="1" stop-color="' + st + '" stop-opacity="0"/></linearGradient></defs><line x1="0" y1="' + cy + '" x2="' + W + '" y2="' + cy + '" stroke="' + (dark ? 'rgba(255,226,214,.8)' : '#C99A86') + '" stroke-dasharray="4 4"/>'
        + '<path d="M' + P.join(' L') + ' L' + xs[xs.length - 1].toFixed(0) + ',' + (H - 26) + ' L' + xs[0].toFixed(0) + ',' + (H - 26) + ' Z" fill="url(#wtar' + (dark ? 1 : 0) + ')"/><polyline fill="none" stroke="' + st + '" stroke-width="2.6" stroke-linejoin="round" points="' + P.join(' ') + '"/>'
        + pts.map(function (r, i) { var bad = !r.passed; return '<circle cx="' + xs[i].toFixed(0) + '" cy="' + y(r.score / r.total * 100).toFixed(0) + '" r="' + (i === pts.length - 1 ? 6 : 4.5) + '" fill="' + (bad ? '#fff' : st) + '" stroke="' + (bad ? '#C9743F' : (dark ? '#7B1D1D' : '#fff')) + '" stroke-width="2.4"/><text x="' + xs[i].toFixed(0) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="' + (dark ? '#F0D9D5' : '#8A7B7B') + '" font-family="Noto Sans KR">' + (i + 1) + '</text>'; }).join('') + '</svg>';
    }
    function bars(H, dark) {
      if (!pts.length) return '<div style="height:' + H + 'px;display:flex;align-items:center;justify-content:center;font-size:12px;color:' + (dark ? '#F0D9D5' : '#A89898') + '">아직 결과가 없어요</div>';
      var sc = (H - 40) / 60, cp = Math.round(pts.reduce(function (s, r) { return s + r.cut / r.total; }, 0) / pts.length * 100);
      return '<div style="position:relative;height:' + H + 'px;display:flex;align-items:flex-end;gap:8px;padding-bottom:18px;box-sizing:border-box"><span style="position:absolute;left:0;right:0;bottom:' + Math.round((cp - 40) * sc + 18) + 'px;border-top:1px dashed ' + (dark ? 'rgba(255,226,214,.8)' : 'rgba(201,154,134,.9)') + '"></span>'
        + pts.map(function (r, i) { var p = Math.round(r.score / r.total * 100), bad = !r.passed, last = i === pts.length - 1; var bg = bad ? (dark ? 'linear-gradient(180deg,#F3B58C,#D27B42)' : 'linear-gradient(180deg,#E9A77A,#C9743F)') : last ? (dark ? 'linear-gradient(180deg,#FFF1EA,#FFD3C2)' : 'linear-gradient(180deg,#B84545,#7B1D1D)') : (dark ? 'rgba(255,255,255,.55)' : 'linear-gradient(180deg,#D9B3AC,#B98A82)'); return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative"><span style="font-size:10px;font-weight:700;color:' + (dark ? '#F0D9D5' : '#5A4848') + '">' + p + '</span><span style="width:100%;max-width:34px;height:' + Math.max(4, Math.round((Math.max(40, p) - 40) * sc)) + 'px;border-radius:7px 7px 3px 3px;background:' + bg + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.35)' + (dark ? '' : ',0 4px 8px -4px rgba(110,45,45,.4)') + '"></span><span style="position:absolute;bottom:-17px;font-size:10px;color:' + (dark ? '#F0D9D5' : '#8A7B7B') + '">' + (i + 1) + '</span></div>'; }).join('') + '</div>';
    }
    var fsel = fl.length > 1 ? '<div class="row" style="gap:6px;flex-wrap:wrap">' + fl.map(function (f) { var on = f.id === RP.folder; return '<button type="button" data-f="' + f.id + '" class="' + (on ? 'p' : 's') + '" style="height:32px;padding:0 12px;font-size:12px">' + esc(f.name) + '</button>'; }).join('') + '</div>' : '';
    var wtab = words.length ? words.map(function (w) { return '<div class="row" style="gap:10px;height:50px;padding:0 16px;box-shadow:inset 0 -1px 0 #F6EFED"><span class="serif" style="font-size:13px;color:#B0895A;width:14px">' + w.r + '</span><div class="col" style="flex:1;min-width:0"><b style="font-size:13px">' + esc(w.en) + '</b><span style="font-size:11px;color:#8A7B7B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(w.ko) + '</span></div><span style="font-size:11px;font-weight:800;color:#7B1D1D">×' + w.k + '</span><span class="tag ' + (w.ok ? 't-pass' : 't-fail') + '" style="font-size:10px">' + (w.ok ? '최근 맞힘' : '아직 틀림') + '</span></div>'; }).join('') : '<div style="padding:24px;text-align:center;font-size:12.5px;color:#A89898">틀린 단어가 아직 없어요</div>';
    var kp = [['평균 정답률', avg + '%', '#1A1010'], ['통과', passN + ' / ' + pts.length, '#1A1010'], ['재시험', reN + '회', '#9C2F2F'], ['익힌 단어', learned, '#1A1010']];
    var closeBtn = '<button type="button" class="ib" data-close aria-label="닫기" style="width:38px;height:38px;flex:none">' + sv('x', '#5A4848', 14) + '</button>';
    if (mob) {
      full.innerHTML = '<div style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:12px;padding-bottom:20px">'
        + '<div style="background:radial-gradient(130% 120% at 20% 0%,#9A2F2F,#6A1717 60%,#4E1010);color:#fff;padding:18px 16px 14px;display:flex;flex-direction:column;gap:12px;box-shadow:0 14px 28px -16px rgba(80,15,15,.6)">'
        + '<div class="row" style="justify-content:space-between"><div class="col" style="gap:2px"><span class="eb" style="color:#F3D2C8">MY WORDS</span><span class="serif" style="font-size:21px">내 단어 성적표</span></div><button type="button" data-close aria-label="닫기" style="width:38px;height:38px;border:0;border-radius:19px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,214,205,.35);cursor:pointer;display:flex;align-items:center;justify-content:center">' + sv('x', '#fff', 14) + '</button></div>'
        + '<div class="row" style="align-items:flex-end;gap:12px"><span class="serif" style="font-size:50px;line-height:1">' + avg + '<span style="font-size:18px">%</span></span><div class="col" style="gap:2px;padding-bottom:6px;flex:1"><span style="font-size:12px;color:#F3D2C8">최근 ' + pts.length + '회 평균 정답률</span>' + (trend ? '<span style="font-size:12px;font-weight:800;color:#FFE1D6">최근 오르는 중</span>' : '') + '</div><div style="padding-bottom:4px">' + toggle(true) + '</div></div>'
        + (RP.mode === 1 ? bars(150, true) : lineSvg(320, 150, true))
        + '<span style="font-size:10px;color:#F0D9D5">점선 = 커트라인 · ' + (RP.mode === 1 ? '주황 = 재시험' : '빈 동그라미 = 재시험') + '</span></div>'
        + (fsel ? '<div style="padding:0 16px">' + fsel + '</div>' : '')
        + '<div style="padding:0 16px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">' + kp.map(function (x) { return '<div class="card" style="padding:9px 8px;border-radius:12px;text-align:center"><div style="font-size:9.5px;color:#8A7B7B">' + x[0] + '</div><div class="serif" style="font-size:15px;color:' + x[2] + '">' + x[1] + '</div></div>'; }).join('') + '</div>'
        + '<div class="row" style="justify-content:space-between;padding:0 16px"><b style="font-size:13px">자주 틀린 단어 TOP 6</b><span style="font-size:11px;color:#8A7B7B">틀린 횟수</span></div>'
        + '<div style="padding:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px">' + (words.length ? words.map(function (w) { return '<div class="card" style="padding:11px 13px;border-radius:14px;display:flex;flex-direction:column;gap:3px"><div class="row" style="justify-content:space-between"><span class="serif" style="font-size:12px;color:#B0895A">0' + w.r + '</span><span style="font-size:11px;font-weight:800;color:#7B1D1D">×' + w.k + '</span></div><b style="font-size:14px">' + esc(w.en) + '</b><span style="font-size:11px;color:#8A7B7B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(w.ko) + '</span></div>'; }).join('') : '<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:12.5px;color:#A89898">틀린 단어가 아직 없어요</div>') + '</div></div>';
    } else {
      full.innerHTML = '<div style="width:100%;max-width:1180px;margin:0 auto;height:100%;padding:24px 32px;display:flex;flex-direction:column;gap:14px">'
        + '<div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><div class="col" style="gap:2px"><span class="eb">MY WORDS</span><span class="serif" style="font-size:24px;color:#7B1D1D">내 단어 성적표</span></div><div class="row" style="gap:10px">' + fsel + closeBtn + '</div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">' + kp.map(function (x) { return '<div class="card" style="padding:14px 16px"><div style="font-size:11px;color:#8A7B7B">' + x[0] + '</div><div class="serif" style="font-size:24px;color:' + x[2] + '">' + x[1] + '</div></div>'; }).join('') + '</div>'
        + '<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start;overflow:auto"><div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:10px"><div class="row" style="justify-content:space-between"><div class="col"><b style="font-size:14px">회차별 점수</b>' + (trend ? '<span style="font-size:11px;color:#1B6B3A;font-weight:800">최근 오르는 중</span>' : '') + '</div>' + toggle(false) + '</div>' + (RP.mode === 1 ? bars(340, false) : lineSvg(520, 340, false)) + '<span style="font-size:10px;color:#A89898">점선 = 커트라인 · ' + (RP.mode === 1 ? '주황 막대 = 재시험' : '빈 동그라미 = 재시험') + '</span></div>'
        + '<div class="col" style="gap:10px"><b style="font-size:14px">자주 틀린 단어</b><div class="card" style="overflow:hidden">' + wtab + '</div></div></div></div>';
    }
    full.querySelector('[data-close]').onclick = function () { closeRunner(); };
    full.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { RP.mode = +b.dataset.mode; drawReport(results, folders); }; });
    full.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { RP.folder = b.dataset.f; drawReport(results, folders); }; });
  }
})();
/* 스크립트가 홈 화면보다 늦게 실렸을 때 한 번 그려 줌 */
setTimeout(function () { try { var pin = document.getElementById('wt-home-pin'); if (pin && window.MP_FB && window.MP_FB.me && window.MP_FB.me().uid && !pin.innerHTML) window.WT.studentHomePin(pin); } catch (e) { } }, 0);
/* 링크로 단어 Test 일괄 등록: https://…/?wtimport=<key>  (data/wtimport-<key>.json) — 선생님·원장만 */
(function () {
  var key = (location.search.match(/[?&]wtimport=([\w-]+)/) || [])[1]; if (!key) return;
  var WT = window.WT, U = WT && WT._u;
  function clearParam() { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { } }
  var tries = 0;
  (function wait() {
    var me = null; try { me = window.MP_FB && window.MP_FB.me && window.MP_FB.me(); } catch (e) { }
    if (!me || !me.uid || !me.profile) { if (++tries < 120) return setTimeout(wait, 500); return; }
    if (['teacher', 'master'].indexOf(me.profile.role) < 0) { clearParam(); U.toast('선생님 계정에서만 등록할 수 있어요'); return; }
    fetch('/data/wtimport-' + key + '.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('파일 없음'); return r.json(); }).then(function (pack) {
      return Promise.all([WT.DB.folders(), WT.DB.tests()]).then(function (r) {
        var folders = r[0], tests = r[1], n = 0, dup = 0;
        pack.forEach(function (f) { var fo = folders.filter(function (x) { return x.name === f.folder; })[0]; f.tests.forEach(function (t) { if (fo && tests.some(function (x) { return x.folderId === fo.id && x.title === t.title; })) dup++; else n++; }); });
        var m = U.modal({ title: '단어 Test 일괄 등록', eyebrow: 'IMPORT', width: 560 });
        m.body.innerHTML = '<div class="col" style="gap:10px;font-size:13.5px;line-height:1.7">' + pack.map(function (f) { return '<div class="card" style="padding:12px 14px"><b style="color:#7B1D1D">' + U.esc(f.folder) + '</b><div style="font-size:12px;color:#6A5A5A;margin-top:4px">' + f.tests.map(function (t) { return U.esc(t.title) + ' · ' + t.words.length + '단어'; }).join('<br>') + '</div></div>'; }).join('')
          + '<div>새로 등록 <b>' + n + '개</b>' + (dup ? ' · 이미 있는 ' + dup + '개는 건너뛰어요' : '') + ' · 주관식 · 커트 80%</div></div>';
        m.foot.innerHTML = '<button type="button" class="s" data-n style="height:42px;padding:0 18px">취소</button><button type="button" class="p" data-y style="height:42px;padding:0 22px"' + (n ? '' : ' disabled') + '>등록하기</button>';
        m.foot.querySelector('[data-n]').onclick = function () { m.close(); clearParam(); };
        m.foot.querySelector('[data-y]').onclick = function () {
          var btn = this; btn.disabled = true; btn.textContent = '등록 중…';
          var chain = Promise.resolve(), base = Date.now();
          pack.forEach(function (f, fi) {
            chain = chain.then(function () {
              var fo = folders.filter(function (x) { return x.name === f.folder; })[0];
              return (fo ? Promise.resolve(fo.id) : WT.DB.add('wordFolders', { name: f.folder, grade: f.grade || '고2', order: base + fi }).then(function (ref) { return ref.id; })).then(function (fid) {
                var list = f.tests.filter(function (t) { return !tests.some(function (x) { return x.folderId === fid && x.title === t.title; }); })
                  .map(function (t, i) { return { title: t.title, words: t.words, folderId: fid, type: t.type || 'sa', cutPct: t.cutPct || 80, cutWrong: t.cutWrong != null ? t.cutWrong : 2, order: base + fi * 100 + i, kind: 'normal', createdBy: me.uid }; });
                return list.length ? WT.DB.batchAdd('wordTests', list) : null;
              });
            });
          });
          chain.then(function () { m.close(); clearParam(); U.toast(n + '개를 등록했어요. 암기 Test → 시험 목록에서 볼 수 있어요'); try { if (window.teacherTab) window.teacherTab(14); } catch (e) { } })
            .catch(function (e) { btn.disabled = false; btn.textContent = '다시 시도'; U.toast('등록하지 못했어요: ' + (e.message || e)); });
        };
      });
    }).catch(function (e) { clearParam(); U.toast('등록 파일을 불러오지 못했어요'); });
  })();
})();
