/* =====================================================================
   MONO PLANNER · 시험 탭 개편 (선생님 시험관리 + 학생 시험 탭)
   - 선생님: 폴더(한 시험 → 여러 폴더, 1단계 하위 폴더) + 자동 보기(과목 / 회차 세트 / 학생별)
             + 자동 분류 규칙(제목 포함 · 분류) + 정리 대기 + 진행 중 / 완료 / 보관
   - 학생:   지금 볼 시험 → 아직 안 본 시험 → 시리즈 진도 → 응시 완료(접힘)
   - 버튼/카드/칩은 단어 Test(wordtest.js)의 .wt 스타일을 그대로 사용
   폴더 설정은 examSourceOptions/{branch}__folders 문서 한 개에 저장
   (읽기: 회원 전체 / 쓰기: 선생님 이상 — 기존 보안 규칙 그대로 사용)
   ===================================================================== */
(function () {
  'use strict';
  var EXH = window.EXH = {};
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };
  var X = function () { return window.MP_EX || {}; };
  var U = function () { return (window.WT && WT._u) || {}; };

  /* ------------------------------------------------------------------ 스타일 */
  var CSS = "\
.exh{display:flex;flex-direction:column;gap:14px;padding:2px 0 28px}\
.exh .tnum{font-variant-numeric:tabular-nums}\
.exh-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.exh-title{font-family:'Noto Serif KR',serif;font-size:24px;font-weight:700;color:#7B1D1D;margin-top:3px;line-height:1.2}\
.exh-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\
.exh-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\
.exh-chip{height:34px;padding:0 13px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:#5A4848;cursor:pointer;white-space:nowrap}\
.exh-chip b{font-size:11px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}\
.exh-chip.on{background:radial-gradient(130% 160% at 50% -10%,#A63434 0%,#7B1D1D 55%,#571313 100%)!important;color:#FFF6E6;font-weight:800;box-shadow:inset 0 0 0 1px rgba(255,214,205,.42),inset 0 1px 0 rgba(255,255,255,.22),0 8px 16px -8px rgba(90,20,20,.6)!important}\
.exh-search{height:38px;padding:0 12px 0 36px;font-size:13px;width:220px;max-width:100%}\
.exh-sw{position:relative;display:inline-flex;align-items:center}\
.exh-sw>svg{position:absolute;left:12px;pointer-events:none}\
.exh-split{display:grid;grid-template-columns:272px minmax(0,1fr);gap:14px;align-items:start}\
.exh-tree{padding:12px;display:flex;flex-direction:column;gap:2px}\
.exh-tree .grp{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;color:#8A6A66;padding:8px 8px 6px;letter-spacing:.06em}\
.exh-tree .grp button{border:0;background:none;font:800 11.5px 'Noto Sans KR',sans-serif;color:#7B1D1D;cursor:pointer;padding:2px 4px}\
.exh-ti{display:flex;align-items:center;gap:8px;min-height:38px;padding:0 10px;border-radius:10px;border:0;background:transparent;width:100%;font:500 13px 'Noto Sans KR',sans-serif;color:#3D2B2B;cursor:pointer;text-align:left}\
.exh-ti:hover{background:#F8F1EF}\
.exh-ti .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.exh-ti .n{font-size:11.5px;font-weight:700;color:#8A7B7B;font-variant-numeric:tabular-nums}\
.exh-ti .tw{width:16px;display:inline-flex;justify-content:center;flex:none}\
.exh-ti.sub{padding-left:34px;min-height:34px;font-size:12.5px}\
.exh-ti.on{background:linear-gradient(180deg,#922B2B,#6E1818);color:#fff;font-weight:700;box-shadow:0 6px 12px -6px rgba(110,30,30,.6)}\
.exh-ti.on .n{color:#F3D9C9}\
.exh-ti.hid .nm{opacity:.6}\
.exh-inbox{margin-top:8px;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:0;width:100%;text-align:left;cursor:pointer;background:linear-gradient(180deg,#FBF3E4,#F6EAD3);box-shadow:inset 0 0 0 1px #EAD9B8,0 8px 16px -12px rgba(140,100,30,.5);font-family:inherit}\
.exh-inbox.on{box-shadow:inset 0 0 0 2px #B8841A,0 8px 16px -10px rgba(140,100,30,.6)}\
.exh-inbox .bd{min-width:26px;height:26px;padding:0 7px;border-radius:13px;background:#B8841A;color:#fff;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}\
.exh-main{overflow:hidden}\
.exh-mh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;flex-wrap:wrap;box-shadow:inset 0 -1px 0 #F1E8E5}\
.exh-crumb{font-size:11.5px;color:#8A7B7B;font-weight:600;margin-bottom:3px}\
.exh-mt{display:flex;align-items:center;gap:8px;font-size:19px;font-weight:800;color:#1A1010;flex-wrap:wrap}\
.exh-mt small{font-size:12px;font-weight:600;color:#8A7B7B}\
.exh-th,.exh-row{display:grid;grid-template-columns:88px minmax(0,1fr) 54px 60px 128px 64px var(--acw,174px);align-items:center;gap:10px;padding:0 18px}\
.exh-th{height:36px;font-size:11px;font-weight:800;color:#8A7B7B;background:#FBF8F7;box-shadow:inset 0 -1px 0 #F1E8E5}\
.exh-row{min-height:58px;padding-top:9px;padding-bottom:9px;box-shadow:inset 0 -1px 0 #F6EFED}\
.exh-row:hover{background:#FDFAF9}\
.exh-row .tt{font-size:13.5px;font-weight:700;line-height:1.35;color:#1A1010;word-break:keep-all}\
.exh-row .sm{font-size:11.5px;color:#8A7B7B;margin-top:2px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}\
.exh-row .ac{display:flex;gap:6px;justify-content:flex-end}\
.exh-wide{--acw:206px}\
.exs-sc .exh-pb{flex:none;width:100%}\
.exh-row2{grid-template-columns:88px minmax(0,1fr) auto}\
.exh-row .ac .s,.exh-row .ac .p{height:34px;padding:0 12px;font-size:12px}\
.exh-row .ac .ib{width:34px;height:34px}\
.exh-row .mm{display:none}\
.exh-sbj{display:inline-flex;align-items:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:800;padding:4px 8px;border-radius:7px;color:#7B1D1D;background:#F6E9E6}\
.exh-prog{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;color:#5A4848}\
.exh-pb{position:relative;flex:1;height:7px;border-radius:7px;background:#F1EAE8;box-shadow:inset 0 1px 2px rgba(110,45,45,.14);overflow:hidden;min-width:40px}\
.exh-pb>i{position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:linear-gradient(90deg,#9C2F2F,#7B1D1D)}\
.exh-pb.ok>i{background:linear-gradient(90deg,#2C8A50,#1B6B3A)}\
.exh-sec{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px;background:#FBF8F7;box-shadow:inset 0 -1px 0 #F1E8E5,inset 0 1px 0 #F1E8E5;cursor:pointer}\
.exh-sec .l{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:800;color:#3D2B2B;min-width:0}\
.exh-sec .l span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.exh-sec .n{font-size:12px;color:#8A7B7B;font-weight:700}\
.exh-sec .s{height:32px;padding:0 12px;font-size:12px}\
.exh-subf{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;padding:14px 18px;box-shadow:inset 0 -1px 0 #F1E8E5}\
.exh-sf{display:flex;align-items:center;gap:10px;padding:12px;border:0;cursor:pointer;text-align:left;font-family:inherit;border-radius:14px}\
.exh-fic{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:none;background:linear-gradient(180deg,#FBF3E4,#F3E3C4);box-shadow:inset 0 1px 0 #fff,0 0 0 1px #EAD9B8}\
.exh-empty{padding:40px 20px;text-align:center;color:#8A7B7B;font-size:13px;line-height:1.7}\
.exh-note{display:flex;gap:8px;align-items:flex-start;padding:12px 18px;font-size:12px;color:#8A6A66;line-height:1.6;background:#FCF9F6}\
.exh-studs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:14px 18px}\
.exh-st{display:flex;flex-direction:column;gap:8px;padding:14px;border:0;cursor:pointer;text-align:left;font-family:inherit;border-radius:16px}\
.exh-menu{position:fixed;z-index:9600;min-width:210px;max-width:280px;padding:6px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px #EDE2DF,0 20px 40px -12px rgba(60,20,20,.35);animation:wtFade .12s;max-height:70vh;overflow:auto}\
.exh-menu button{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;padding:0 10px;border:0;background:none;border-radius:9px;font:600 13px 'Noto Sans KR',sans-serif;color:#3D2B2B;cursor:pointer;text-align:left}\
.exh-menu button:hover{background:#F8F1EF}\
.exh-menu button.dg{color:#9C2F2F}\
.exh-menu hr{border:0;height:1px;background:#F1E8E5;margin:5px 4px}\
.exh-menu .lb{font-size:10.5px;font-weight:800;color:#B0895A;letter-spacing:.12em;padding:6px 10px 2px}\
.exh-pick{display:flex;align-items:center;gap:10px;min-height:44px;padding:6px 10px;border-radius:10px;cursor:pointer;font-size:13px}\
.exh-pick:hover{background:#FBF6F4}\
.exh-pick input{width:18px;height:18px;accent-color:#7B1D1D;flex:none}\
.wt .exh-back{display:none}\
.exh-chips{display:flex;gap:8px;align-items:center}\
.exh .exh-dseg{display:inline-flex}.exh .exh-mseg{display:none}\
@media (max-width:1100px){.exh-th,.exh-row{grid-template-columns:80px minmax(0,1fr) 60px 116px 60px var(--acw,174px)}.exh-th>.c-time,.exh-row>.c-time{display:none}}\
@media (max-width:900px){.exh-split{grid-template-columns:1fr}.exh-split.pane-content .exh-tree{display:none}.exh-split.pane-tree .exh-main{display:none}.wt .exh-back{display:inline-flex}.exh-title{font-size:21px}}\
@media (max-width:760px){.exh-th{display:none}.exh-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'t t' 'p a';row-gap:9px;padding:12px 14px}.exh-row>.c-sbj,.exh-row>.c-time,.exh-row>.c-asg,.exh-row>.c-st{display:none}.exh-row>.c-tt{grid-area:t}.exh-row>.c-prog{grid-area:p}.exh-row>.ac{grid-area:a}.exh-row .mm{display:inline-flex}.exh-row.exh-row2{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'t a'}.exh-mh{padding:14px}.exh-sec{padding:11px 14px}.exh-subf,.exh-studs{padding:12px 14px}.exh .exh-dseg{display:none}.exh .exh-mseg{display:flex}.exh-mseg>button{flex:1;justify-content:center;padding:0 6px}.exh-bar{flex-direction:column;align-items:stretch}.exh-bar>span{display:none}.exh-chips{overflow-x:auto;margin:0 -16px;padding:2px 16px 4px;scrollbar-width:none}.exh-chips::-webkit-scrollbar{display:none}.exh-sw{width:100%}.exh-search{width:100%;height:42px}}\
/* 학생 */\
.exs{display:flex;flex-direction:column;gap:14px;padding:2px 0 8px}\
.exs-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}\
.exs-col{display:flex;flex-direction:column;gap:12px;min-width:0}\
.exs-hero{border-radius:22px;padding:18px;color:#fff;background:radial-gradient(120% 100% at 15% 0%,#A63434 0%,#7B1D1D 50%,#4E1010 100%);box-shadow:inset 0 0 0 1px rgba(255,214,205,.25),inset 0 1px 0 rgba(255,255,255,.18),0 18px 34px -16px rgba(80,15,15,.7);display:flex;flex-direction:column;gap:10px}\
.exs-hero .eb2{font-size:11px;letter-spacing:.22em;color:#F3D9A4;font-weight:800}\
.exs-hero .ht{font-family:'Noto Serif KR',serif;font-size:21px;font-weight:700;line-height:1.35;word-break:keep-all}\
.exs-hero .hs{font-size:12.5px;color:rgba(255,255,255,.82)}\
.exs-hero .pill{font-size:11px;font-weight:800;padding:4px 9px;border-radius:7px;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);white-space:nowrap}\
.exs-hero .g{height:48px;font-size:14.5px;margin-top:4px}\
.exs-sh{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 0}\
.exs-sh b{font-size:15px;font-weight:800;color:#1A1010}\
.exs-sh b em{font-style:normal;color:#9C2F2F;margin-left:4px;font-variant-numeric:tabular-nums}\
.exs-sh .s{height:32px;padding:0 12px;font-size:12px}\
.exs-it{display:flex;align-items:center;gap:12px;padding:13px 14px}\
.exs-it .tt{font-size:14px;font-weight:800;line-height:1.35;word-break:keep-all}\
.exs-it .sm{font-size:11.5px;color:#8A7B7B;margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}\
.exs-it .p,.exs-it .s{height:38px;padding:0 15px;font-size:12.5px;flex:none}\
.exs-series{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}\
.exs-sc{display:flex;flex-direction:column;gap:8px;padding:13px 14px;border:0;text-align:left;cursor:pointer;font-family:inherit;border-radius:18px;min-width:0}\
.exs-sc .nm{font-size:13px;font-weight:800;color:#1A1010;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.exs-sc .ft{font-size:11.5px;color:#8A7B7B;display:flex;justify-content:space-between;gap:6px}\
.exs-sc .ft b{color:#1A1010;font-variant-numeric:tabular-nums}\
.exs-done{overflow:hidden}\
.exs-dh{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;cursor:pointer}\
.exs-dh b{font-size:14.5px;font-weight:800}\
.exs-dh b span{color:#8A7B7B;margin-left:4px;font-variant-numeric:tabular-nums}\
.exs-dh .s{height:32px;padding:0 12px;font-size:12px}\
.exs-dr{display:flex;align-items:center;gap:10px;padding:11px 16px;box-shadow:inset 0 1px 0 #F6EFED}\
.exs-dr .tt{font-size:13px;font-weight:700;line-height:1.35;word-break:keep-all}\
.exs-dr .sm{font-size:11.5px;color:#8A7B7B;margin-top:2px}\
.exs-dr .sc{font-size:15px;font-weight:800;color:#7B1D1D;font-variant-numeric:tabular-nums;white-space:nowrap}\
.exs-dr .s,.exs-dr .g{height:32px;padding:0 10px;font-size:11.5px}\
@media (max-width:999px){.exs-grid{grid-template-columns:1fr}}\
@media (max-width:640px){.exs-series{display:flex;overflow-x:auto;padding:2px 2px 8px;margin:0 -2px;scroll-snap-type:x mandatory}.exs-sc{flex:none;width:150px;scroll-snap-align:start}.exs-dr{flex-wrap:wrap;row-gap:6px}.exs-dr>div:first-child{flex-basis:100%}.exs-dr .sc{order:2;margin-right:auto}.exs-dr .acts{order:3;margin-left:auto}}\
";
  function injectCss() { if (document.getElementById('exh-css')) return; var s = document.createElement('style'); s.id = 'exh-css'; s.textContent = CSS; document.head.appendChild(s); }
  injectCss();

  /* ------------------------------------------------------------------ 유틸 */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IC = {
    plus: 'M12 5v14M5 12h14', chev: 'M6 9l6 6 6-6', right: 'M9 6l6 6-6 6', left: 'M15 6l-6 6 6 6',
    folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
    more: 'M5 12h.01M12 12h.01M19 12h.01', search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z', play: 'M7 4l13 8-13 8z',
    pin: 'M12 17v5M5 17h14l-2-4V5H7v8z', box: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
    eyeoff: 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0112 5c7 0 11 7 11 7a18 18 0 01-3.2 4M6.6 6.6A18 18 0 001 12s4 7 11 7a10 10 0 005.4-1.6',
    rule: 'M4 6h16M4 12h10M4 18h6M17 15l2 2 4-4', live: 'M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0M5 5a10 10 0 000 14M19 5a10 10 0 010 14',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', check: 'M5 12l5 5 9-10', inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z',
    book: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM8 7h8M8 11h6',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
    link: 'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1', trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3',
    screen: 'M3 4h18v12H3zM8 20h8M12 16v4', retry: 'M3 12a9 9 0 109-9M3 4v5h5', leaf: 'M5 21c0-9 5-15 15-16-1 10-7 15-15 16zM5 21l7-7',
    ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', lamp: 'M9 21h6M10 17h4l1-5H9zM12 3v3M5 8l2 1M19 8l-2 1'
  };
  function sv(k, c, s, w) { return '<svg width="' + (s || 16) + '" height="' + (s || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; }
  function tsMs(t) { if (!t) return 0; if (typeof t === 'number') return t; if (t.toMillis) return t.toMillis(); if (t.seconds) return t.seconds * 1000; return 0; }
  function toast(m) { if (U().toast) U().toast(m); else alert(m); }
  function natCmp(a, b) { return String(a || '').localeCompare(String(b || ''), 'ko', { numeric: true }); }
  function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
  function uid6() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function dayDiff(ms) { return ms ? Math.max(0, Math.floor((Date.now() - ms) / 86400000)) : 0; }
  function md(ms) { if (!ms) return ''; var d = new Date(ms); return (d.getMonth() + 1) + '.' + d.getDate(); }
  function qa(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function call(fn) { var a = [].slice.call(arguments, 1); if (typeof window[fn] === 'function') return window[fn].apply(null, a); toast('이 기능을 아직 불러오지 못했어요. 잠시 후 다시 눌러 주세요'); }

  function subjName(ex) {
    var s = ex.subjects || [];
    if (s.length > 1) return '여러 과목';
    var f = X().subjName; return s[0] ? (f ? f(s[0]) : (s[0].subject || '')) : '';
  }
  function srcLabel(ex) { var f = X().sourceLabel; return f ? f(ex.examSource) : (ex.examSource || ''); }
  function durOf(ex) { return (ex.subjects || []).reduce(function (a, s) { return a + (+s.durationMin || 0); }, 0); }

  /* 회차 세트 키: 제목에서 연도 · 과목명 · '모의고사' 류를 빼고 남은 시리즈명 + N회 */
  var SUBJ_RE = /(생활과\s*윤리|윤리와\s*사상|사회\s*·?\s*문화|한국\s*지리|세계\s*지리|동아시아사|세계사|정치와\s*법|경제|물리학?\s*[ⅠⅡ12]?|화학\s*[ⅠⅡ12]?|생명\s*과학\s*[ⅠⅡ12]?|지구\s*과학\s*[ⅠⅡ12]?|통합\s*과학|통합\s*사회|과학\s*탐구|사회\s*탐구|한국사|국어|수학|영어|생윤|윤사|사문|한지|세지|물리|화학|생명|지구)/g;
  function roundInfo(title) {
    var t = String(title || ''), m = t.match(/(\d+)\s*회/);
    if (!m) return null;
    var series = t.replace(m[0], ' ').replace(/(19|20)\d\d\s*(학년도)?/g, ' ').replace(SUBJ_RE, ' ')
      .replace(/시대인재|이투스|메가스터디|강남대성|대성|종로|EBS|ebs|전국|모의\s*고사|모의\s*평가|모의|평가|시험|고사|\(.*?\)|\[.*?\]/g, ' ').replace(/[·\-_|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { key: norm(series) + '|' + (+m[1]), label: (series || '회차') + ' ' + (+m[1]) + '회', n: +m[1], series: series };
  }
  /* 학생 쪽 자동 시리즈: 제목에서 N회 이후와 연도만 뺀 이름 */
  function seriesName(title) {
    var t = String(title || '').replace(/(\d+)\s*회.*$/, '').replace(/(19|20)\d\d\s*(학년도)?/g, ' ').replace(/\s+/g, ' ').trim();
    return t || null;
  }

  /* ------------------------------------------------------------------ 폴더 설정 */
  function cfgRef() { var fb = F(); return fb.doc(fb.db, 'examSourceOptions', ME().branch + '__folders'); }
  function loadCfg() { return F().getDoc(cfgRef()).then(function (d) { var o = d.exists() ? d.data() : {}; return { folders: (o.folders || []).slice() }; }).catch(function () { return { folders: [] }; }); }
  function saveCfg(cfg) { var fb = F(); return fb.setDoc(cfgRef(), { folders: cfg.folders, branch: ME().branch, updatedAt: fb.serverTimestamp() }, { merge: true }); }

  function ruleHit(r, ex) {
    if (!r || !r.value) return false;
    if (r.field === 'source') return srcLabel(ex) === r.value;
    return norm(ex.title).indexOf(norm(r.value)) !== -1;
  }
  /* 폴더에 직접 들어 있는 시험 id (직접 넣은 것 ∪ 규칙에 맞는 것 − 직접 뺀 것) */
  function directIds(f, exams) {
    var set = {}, ex = f.exclude || [];
    (f.examIds || []).forEach(function (id) { set[id] = 1; });
    if ((f.rules || []).length) exams.forEach(function (e) { if (f.rules.some(function (r) { return ruleHit(r, e); })) set[e.id] = 1; });
    ex.forEach(function (id) { delete set[id]; });
    return set;
  }

  /* ================================================================== 선생님 */
  var T = { view: 'folder', status: 'active', folderId: '__all', q: '', pane: 'tree', open: {}, secOpen: {}, studentUid: null };
  var D = null, Dts = 0, loading = null, host = null;

  function loadT(force) {
    if (D && !force && Date.now() - Dts < 30000) return Promise.resolve(D);
    if (loading) return loading;
    var fb = F(), br = ME().branch;
    loading = Promise.all([
      fb.getDocs(fb.query(fb.collection(fb.db, 'exams'), fb.where('branch', '==', br))),
      fb.getDocs(fb.query(fb.collection(fb.db, 'examSessions'), fb.where('status', 'in', ['not_started', 'waiting', 'in_progress', 'break']))),
      loadCfg(),
      fb.loadStudents().catch(function () { return []; })
    ]).then(function (r) {
      var exams = r[0].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
      var byId = {}; exams.forEach(function (e) { byId[e.id] = e; });
      var pend = {};
      r[1].docs.forEach(function (d) {
        var s = d.data(); if (!byId[s.examId]) return;
        s.id = d.id; (pend[s.examId] = pend[s.examId] || []).push(s);
      });
      var rows = exams.map(function (e) {
        var asg = e.assignedTo || [], p = (pend[e.id] || []).filter(function (s) { return asg.indexOf(s.studentUid) !== -1; });
        var st = e.archived ? 'arch' : (asg.length && !p.length ? 'done' : 'active');
        return { id: e.id, ex: e, title: e.title || '(제목 없음)', subj: subjName(e), src: srcLabel(e), dur: durOf(e), asg: asg.length, pend: p, done: Math.max(0, asg.length - p.length), st: st, pinned: !!e.pinned, created: tsMs(e.createdAt) };
      });
      rows.sort(function (a, b) { return natCmp(a.title, b.title); });
      D = { rows: rows, byId: {}, cfg: r[2], students: (r[3] || []).filter(function (s) { return !s.role || s.role === 'student'; }) };
      rows.forEach(function (x) { D.byId[x.id] = x; });
      Dts = Date.now(); loading = null;
      return D;
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  EXH.invalidate = function () { Dts = 0; };

  function stOk(x) { return T.status === 'all' ? true : x.st === T.status; }
  function qOk(x) { if (!T.q) return true; var q = norm(T.q); return norm(x.title).indexOf(q) !== -1 || norm(x.subj).indexOf(q) !== -1 || norm(x.src).indexOf(q) !== -1; }
  function visible(list) { return list.filter(function (x) { return stOk(x) && qOk(x); }); }

  function folders() { return D.cfg.folders; }
  function fById(id) { return folders().find(function (f) { return f.id === id; }); }
  function kids(id) { return folders().filter(function (f) { return f.parentId === id; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || natCmp(a.name, b.name); }); }
  function tops() { return folders().filter(function (f) { return !f.parentId || !fById(f.parentId); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || natCmp(a.name, b.name); }); }
  function exList() { return D.rows.map(function (x) { return x.ex; }); }
  function idsOf(f, deep) {
    var set = directIds(f, exList());
    if (deep) kids(f.id).forEach(function (k) { Object.assign(set, directIds(k, exList())); });
    return set;
  }
  function rowsOf(set) { return D.rows.filter(function (x) { return set[x.id]; }); }
  function filedSet() { var s = {}; folders().forEach(function (f) { Object.assign(s, directIds(f, exList())); }); return s; }
  function inboxRows() { var s = filedSet(); return D.rows.filter(function (x) { return !s[x.id] && x.st !== 'arch'; }); }
  function foldersOfExam(id) { return folders().filter(function (f) { return directIds(f, exList())[id]; }); }

  EXH.teacherMount = function (el) {
    host = el; if (!el) return;
    el.className = 'wt';
    if (D) render(); else el.innerHTML = '<div class="exh"><div class="card exh-empty">시험 목록을 불러오는 중…</div></div>';
    loadT(true).then(function () { if (host === el && document.body.contains(el)) render(); })
      .catch(function (e) { console.error(e); if (host === el) el.innerHTML = '<div class="exh"><div class="card exh-empty" style="color:#9C2F2F">시험 목록을 불러오지 못했어요<br><span style="font-size:12px">' + esc(e.message || e) + '</span></div></div>'; });
  };
  function reload() { return loadT(true).then(render); }
  function rerender() { if (host && document.body.contains(host)) render(); }

  function counts() { var c = { active: 0, done: 0, arch: 0, all: D.rows.length }; D.rows.forEach(function (x) { c[x.st]++; }); return c; }

  function render() {
    if (!host || !D) return;
    var c = counts();
    var seg = [['folder', '폴더'], ['subject', '과목'], ['round', '회차 세트'], ['student', '학생별']].map(function (v) { return '<button type="button" data-act="view" data-v="' + v[0] + '" class="' + (T.view === v[0] ? 'on' : '') + '">' + v[1] + '</button>'; }).join('');
    var chips = [['active', '진행 중'], ['done', '완료'], ['arch', '보관'], ['all', '전체']].map(function (v) { return '<button type="button" class="chip exh-chip' + (T.status === v[0] ? ' on' : '') + '" data-act="status" data-v="' + v[0] + '">' + v[1] + ' <b>' + c[v[0]] + '</b></button>'; }).join('');
    var h = '<div class="exh">'
      + '<div class="exh-head"><div><div class="eb">EXAM MANAGEMENT</div><div class="exh-title">시험 관리</div></div>'
      + '<div class="exh-tools"><div class="seg well exh-dseg">' + seg + '</div>'
      + '<button type="button" class="p" data-act="new" style="height:40px;padding:0 16px;font-size:13px">' + sv('plus', '#FFF6E6', 15, 2.6) + '새 시험</button>'
      + '<button type="button" class="ib" data-act="more" aria-label="더보기" style="width:40px;height:40px">' + sv('more', '#5A4848', 18, 3) + '</button></div></div>'
      + '<div class="seg well exh-mseg">' + seg + '</div>'
      + '<div class="exh-bar"><div class="exh-chips">' + chips + '</div><span style="flex:1"></span><label class="exh-sw">' + sv('search', '#A89898', 15) + '<input class="inp exh-search" data-act-input="q" placeholder="시험 · 과목 · 분류 검색" value="' + esc(T.q) + '"></label></div>'
      + '<div id="exh-body">' + body() + '</div></div>';
    host.innerHTML = h;
    bind();
  }
  function renderBody() { var b = host && host.querySelector('#exh-body'); if (b) { b.innerHTML = body(); } }
  function body() {
    if (T.view === 'subject') return viewSubject();
    if (T.view === 'round') return viewRound();
    if (T.view === 'student') return viewStudent();
    return viewFolder();
  }

  /* ---------- 공통: 시험 행 ---------- */
  function stTag(x) {
    if (x.st === 'arch') return '<span class="tag t-wait">보관</span>';
    if (!x.asg) return '<span class="tag t-wait">미배정</span>';
    if (x.st === 'done') return '<span class="tag t-pass">완료</span>';
    if (x.pend.some(function (s) { return s.status !== 'not_started'; })) return '<span class="tag t-run">응시 중</span>';
    return x.done ? '<span class="tag t-run">진행</span>' : '<span class="tag t-wait">응시 전</span>';
  }
  function asgLabel(x) {
    if (!x.asg) return '—';
    if (x.asg === 1) { var s = D.students.find(function (s) { return s.uid === x.ex.assignedTo[0]; }); return s ? esc(s.name) : '1명'; }
    return x.asg + '명';
  }
  function row(x, opt) {
    opt = opt || {};
    var pct = x.asg ? Math.round(x.done / x.asg * 100) : 0;
    var badges = (x.pinned ? '<span class="tag" style="color:#7B1D1D;background:#F6E9E6">' + sv('pin', '#7B1D1D', 11, 2.4) + '&nbsp;오늘 볼 시험</span>' : '')
      + (opt.showSrc !== false && x.src ? '<span>' + esc(x.src) + '</span>' : '');
    return '<div class="exh-row" data-id="' + x.id + '">'
      + '<div class="c-sbj"><span class="exh-sbj" title="' + esc(x.subj) + '">' + esc(x.subj || '—') + '</span></div>'
      + '<div class="c-tt" style="min-width:0"><div class="tt">' + esc(x.title) + '</div>'
      + '<div class="sm"><span class="mm exh-sbj" style="font-size:10.5px;padding:2px 7px">' + esc(x.subj || '—') + '</span><span class="mm">' + x.dur + '분 · ' + asgLabel(x) + '</span><span class="mm">' + stTag(x) + '</span>' + badges + '</div></div>'
      + '<div class="c-time tnum" style="font-size:12.5px;color:#5A4848">' + x.dur + '분</div>'
      + '<div class="c-asg" style="font-size:12.5px;color:#5A4848;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + asgLabel(x) + '</div>'
      + '<div class="c-prog exh-prog"><div class="exh-pb' + (x.asg && x.done === x.asg ? ' ok' : '') + '"><i style="width:' + pct + '%"></i></div><span class="tnum">' + x.done + '/' + x.asg + '</span></div>'
      + '<div class="c-st">' + stTag(x) + '</div>'
      + '<div class="ac">' + (opt.inbox ? '<button type="button" class="s" data-act="file" data-id="' + x.id + '">' + sv('folder', '#B8841A', 14) + '폴더 지정</button>' : '<button type="button" class="s" data-act="monitor" data-id="' + x.id + '">현황</button>')
      + '<button type="button" class="s" data-act="assign" data-id="' + x.id + '">배정</button>'
      + '<button type="button" class="ib" data-act="rowmenu" data-id="' + x.id + '" aria-label="더보기">' + sv('more', '#5A4848', 16, 3) + '</button></div>'
      + '</div>';
  }
  function table(list, opt) {
    if (!list.length) return '<div class="exh-empty">' + (opt && opt.empty || (T.q ? '검색 결과가 없어요' : '이 조건에 해당하는 시험이 없어요')) + '</div>';
    return '<div class="' + (opt && opt.inbox ? 'exh-wide' : '') + '"><div class="exh-th"><div>과목</div><div>시험</div><div class="c-time">시간</div><div>배정</div><div>응시</div><div>상태</div><div></div></div>' + list.map(function (x) { return row(x, opt); }).join('') + '</div>';
  }

  /* ---------- 폴더 보기 ---------- */
  function viewFolder() {
    var allN = visible(D.rows).length, inbox = inboxRows(), inboxN = visible(inbox).length;
    var tree = '<div class="card exh-tree">'
      + '<button type="button" class="exh-ti' + (T.folderId === '__all' ? ' on' : '') + '" data-act="folder" data-v="__all"><span class="tw">' + sv('list', T.folderId === '__all' ? '#fff' : '#8A6A66', 15) + '</span><span class="nm">전체 시험</span><span class="n">' + allN + '</span></button>'
      + '<div class="grp"><span>내 폴더</span><button type="button" data-act="newfolder">+ 새 폴더</button></div>';
    var tp = tops();
    if (!tp.length) tree += '<div style="font-size:12px;color:#8A7B7B;line-height:1.6;padding:6px 10px 10px">아직 폴더가 없어요.<br><button type="button" class="s" data-act="seed" style="height:34px;padding:0 12px;font-size:12px;margin-top:8px">' + sv('rule', '#7B1D1D', 14) + '분류대로 폴더 자동 만들기</button></div>';
    tp.forEach(function (f) {
      var ks = kids(f.id), on = T.folderId === f.id, open = T.open[f.id] || ks.some(function (k) { return k.id === T.folderId; });
      tree += '<button type="button" class="exh-ti' + (on ? ' on' : '') + (f.showStudents === false ? ' hid' : '') + '" data-act="folder" data-v="' + f.id + '">'
        + '<span class="tw" data-act="twist" data-v="' + f.id + '">' + (ks.length ? sv(open ? 'chev' : 'right', on ? '#fff' : '#8A6A66', 14, 2.4) : '') + '</span>'
        + sv('folder', on ? '#F3D9A4' : '#B8841A', 16) + '<span class="nm">' + esc(f.name) + '</span>' + (f.showStudents === false ? sv('eyeoff', on ? '#F3D9C9' : '#B0A0A0', 13) : '') + '<span class="n">' + visible(rowsOf(idsOf(f, true))).length + '</span></button>';
      if (open) ks.forEach(function (k) {
        var kon = T.folderId === k.id;
        tree += '<button type="button" class="exh-ti sub' + (kon ? ' on' : '') + (k.showStudents === false ? ' hid' : '') + '" data-act="folder" data-v="' + k.id + '">' + sv('folder', kon ? '#F3D9A4' : '#C9A35A', 14) + '<span class="nm">' + esc(k.name) + '</span><span class="n">' + visible(rowsOf(idsOf(k))).length + '</span></button>';
      });
    });
    tree += '<button type="button" class="exh-inbox' + (T.folderId === '__inbox' ? ' on' : '') + '" data-act="folder" data-v="__inbox"><span class="bd">' + inbox.length + '</span><span style="flex:1;font-size:12px;line-height:1.45;color:#3D2B2B"><b>폴더 정리 대기</b><br><span style="color:#8A7B7B">어느 폴더에도 없는 시험</span></span>' + sv('right', '#8A7B7B', 14) + '</button>'
      + '<button type="button" class="exh-ti" data-act="rules" style="margin-top:6px;color:#7B1D1D;font-weight:700"><span class="tw">' + sv('rule', '#7B1D1D', 15) + '</span><span class="nm">자동 분류 규칙</span><span class="n">' + folders().reduce(function (a, f) { return a + (f.rules || []).length; }, 0) + '</span></button>'
      + '</div>';
    return '<div class="exh-split pane-' + T.pane + '">' + tree + '<div class="card exh-main">' + folderMain() + '</div></div>';
  }
  function backBtn() { return '<button type="button" class="ib exh-back" data-act="back" aria-label="폴더 목록" style="width:34px;height:34px;margin-right:2px">' + sv('left', '#5A4848', 16, 2.6) + '</button>'; }
  function folderMain() {
    var id = T.folderId;
    if (id === '__all') {
      return '<div class="exh-mh"><div style="min-width:0"><div class="exh-mt">' + backBtn() + '전체 시험 <small>' + visible(D.rows).length + '개</small></div></div></div>' + table(visible(D.rows));
    }
    if (id === '__inbox') {
      var ib = visible(inboxRows());
      return '<div class="exh-mh"><div style="min-width:0"><div class="exh-mt">' + backBtn() + '폴더 정리 대기 <small>' + ib.length + '개</small></div><div style="font-size:12px;color:#8A7B7B;margin-top:4px">규칙에도 안 맞고 직접 넣은 폴더도 없는 시험이에요. ‘폴더 지정’으로 정리해 주세요.</div></div>'
        + '<div class="exh-tools"><button type="button" class="s" data-act="rules" style="height:38px;padding:0 13px;font-size:12.5px">' + sv('rule', '#7B1D1D', 14) + '자동 분류 규칙</button></div></div>'
        + table(ib, { inbox: true, empty: '정리할 시험이 없어요 👍' });
    }
    var f = fById(id); if (!f) { T.folderId = '__all'; return folderMain(); }
    var par = f.parentId && fById(f.parentId), ks = kids(f.id);
    var direct = visible(rowsOf(idsOf(f)));
    var h = '<div class="exh-mh"><div style="min-width:0">' + (par ? '<div class="exh-crumb">' + esc(par.name) + ' ›</div>' : '')
      + '<div class="exh-mt">' + backBtn() + sv('folder', '#B8841A', 19) + esc(f.name) + ' <small>' + (ks.length ? '하위 폴더 ' + ks.length + ' · ' : '') + '시험 ' + visible(rowsOf(idsOf(f, true))).length + '</small>'
      + (f.showStudents === false ? '<span class="tag t-wait">' + sv('eyeoff', '#7A6A6A', 11) + '&nbsp;학생에게 숨김</span>' : '') + '</div>'
      + ((f.rules || []).length ? '<div style="font-size:11.5px;color:#8A7B7B;margin-top:5px">자동 분류: ' + f.rules.map(function (r) { return (r.field === 'source' ? '분류가 “' : '제목에 “') + esc(r.value) + (r.field === 'source' ? '”' : '” 포함'); }).join(' · ') + '</div>' : '')
      + '</div><div class="exh-tools">'
      + '<button type="button" class="s" data-act="fassign" data-v="' + f.id + '" style="height:38px;padding:0 13px;font-size:12.5px">' + sv('user', '#5A4848', 14) + '폴더 통째로 배정</button>'
      + '<button type="button" class="s" data-act="fadd" data-v="' + f.id + '" style="height:38px;padding:0 13px;font-size:12.5px">' + sv('plus', '#5A4848', 14, 2.6) + '시험 넣기</button>'
      + '<button type="button" class="ib" data-act="fmenu" data-v="' + f.id + '" aria-label="폴더 메뉴" style="width:38px;height:38px">' + sv('more', '#5A4848', 17, 3) + '</button></div></div>';
    if (ks.length) h += '<div class="exh-subf">' + ks.map(function (k) { return '<button type="button" class="card exh-sf" data-act="folder" data-v="' + k.id + '"><span class="exh-fic">' + sv('folder', '#B8841A', 18) + '</span><span style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(k.name) + '</b><span style="font-size:11.5px;color:#8A7B7B">시험 ' + visible(rowsOf(idsOf(k))).length + (k.showStudents === false ? ' · 학생에게 숨김' : '') + '</span></span>' + sv('right', '#B9A99E', 16) + '</button>'; }).join('') + '</div>';
    if (direct.length || !ks.length) h += table(direct, { showSrc: false, empty: '이 폴더에 아직 시험이 없어요. ‘시험 넣기’로 추가하거나 자동 분류 규칙을 만들어 보세요.' });
    var multi = direct.filter(function (x) { return foldersOfExam(x.id).length > 1; });
    if (multi.length) h += '<div class="exh-note">' + sv('link', '#B8841A', 14) + '<span>이 중 ' + multi.length + '개 시험은 다른 폴더에도 들어 있어요 — 한 시험을 여러 폴더에 넣을 수 있어요 (복사가 아니라 바로가기).</span></div>';
    return h;
  }

  /* ---------- 과목 보기 ---------- */
  function sections(groups, opts) {
    if (!groups.length) return '<div class="card exh-empty">' + (T.q ? '검색 결과가 없어요' : '이 조건에 해당하는 시험이 없어요') + '</div>';
    return '<div class="card exh-main">' + groups.map(function (g) {
      var open = T.secOpen[g.key] != null ? T.secOpen[g.key] : groups.length <= 3;
      return '<div class="exh-sec" data-act="sec" data-v="' + esc(g.key) + '"><div class="l">' + sv(open ? 'chev' : 'right', '#8A6A66', 15, 2.4) + (opts.tag ? opts.tag(g) : '') + '<span>' + esc(g.label) + '</span><span class="n">' + g.rows.length + '</span>' + (g.sub ? '<span class="n" style="font-weight:500">· ' + esc(g.sub) + '</span>' : '') + '</div>'
        + (opts.action ? opts.action(g) : '') + '</div>' + (open ? table(g.rows, { showSrc: opts.showSrc }) : '');
    }).join('') + '</div>';
  }
  function viewSubject() {
    var m = {};
    visible(D.rows).forEach(function (x) { var k = x.subj || '기타'; (m[k] = m[k] || []).push(x); });
    var groups = Object.keys(m).sort(natCmp).map(function (k) {
      var rows = m[k].sort(function (a, b) { var ra = roundInfo(a.title), rb = roundInfo(b.title); return natCmp(ra ? ra.series : a.title, rb ? rb.series : b.title) || ((ra && rb) ? ra.n - rb.n : natCmp(a.title, b.title)); });
      return { key: 's:' + k, label: k, rows: rows };
    });
    return '<div class="exh-note card" style="padding:12px 16px">' + sv('book', '#B8841A', 14) + '<span>과목별로 자동으로 묶은 보기예요 — 폴더를 만들지 않아도 바로 보여요. 오래 쓸 정리는 폴더에서 하세요.</span></div>'
      + sections(groups, {});
  }
  /* ---------- 회차 세트 보기 ---------- */
  function viewRound() {
    var m = {};
    visible(D.rows).forEach(function (x) { var r = roundInfo(x.title); if (!r) return; (m[r.key] = m[r.key] || { key: 'r:' + r.key, label: r.label, series: r.series, n: r.n, rows: [] }).rows.push(x); });
    var groups = Object.keys(m).map(function (k) { return m[k]; }).filter(function (g) { return g.rows.length >= 2; })
      .sort(function (a, b) { return natCmp(a.series, b.series) || a.n - b.n; });
    groups.forEach(function (g) { g.rows.sort(function (a, b) { return natCmp(a.subj, b.subj); }); g.sub = Array.from(new Set(g.rows.map(function (x) { return x.subj; }))).join(' · '); });
    return '<div class="exh-note card" style="padding:12px 16px">' + sv('link', '#B8841A', 14) + '<span>제목의 ‘시리즈명 · N회’를 읽어 과목을 가로질러 자동으로 묶었어요 (2개 이상인 회차만). <b style="color:#7B1D1D">폴더로 저장</b>을 누르면 그 묶음이 그대로 폴더가 돼요.</span></div>'
      + sections(groups, { action: function (g) { return '<button type="button" class="s" data-act="savefolder" data-v="' + esc(g.key) + '">' + sv('folder', '#B8841A', 14) + '폴더로 저장</button>'; } });
  }
  /* ---------- 학생별 보기 ---------- */
  function viewStudent() {
    if (T.studentUid) return studentDetail(T.studentUid);
    var stats = D.students.map(function (s) {
      var asg = D.rows.filter(function (x) { return x.st !== 'arch' && (x.ex.assignedTo || []).indexOf(s.uid) !== -1; });
      var pend = []; asg.forEach(function (x) { x.pend.forEach(function (p) { if (p.studentUid === s.uid) pend.push(p); }); });
      var late = pend.filter(function (p) { return dayDiff(tsMs(p.createdAt)) >= 3; }).length;
      return { s: s, asg: asg.length, pend: pend.length, late: late };
    }).filter(function (o) { return o.asg && (!T.q || norm(o.s.name).indexOf(norm(T.q)) !== -1); })
      .sort(function (a, b) { return b.pend - a.pend || natCmp(a.s.name, b.s.name); });
    if (!stats.length) return '<div class="card exh-empty">시험이 배정된 학생이 없어요</div>';
    return '<div class="card exh-main"><div class="exh-mh"><div><div class="exh-mt">학생별 <small>안 본 시험이 많은 순</small></div></div></div><div class="exh-studs">' + stats.map(function (o) {
      var pct = o.asg ? Math.round((o.asg - o.pend) / o.asg * 100) : 0;
      return '<button type="button" class="card exh-st" data-act="stud" data-v="' + o.s.uid + '"><div class="row" style="gap:10px"><span class="av" style="width:34px;height:34px;font-size:13px">' + esc((o.s.name || '?').slice(-2)) + '</span><span style="flex:1;min-width:0"><b style="display:block;font-size:14px">' + esc(o.s.name) + '</b><span style="font-size:11.5px;color:#8A7B7B">' + esc(o.s.grade || '') + '</span></span>' + (o.late ? '<span class="tag t-fail">밀림 ' + o.late + '</span>' : '') + '</div>'
        + '<div class="exh-prog"><div class="exh-pb' + (pct === 100 ? ' ok' : '') + '"><i style="width:' + pct + '%"></i></div><span class="tnum">' + (o.asg - o.pend) + '/' + o.asg + '</span></div>'
        + '<div style="font-size:11.5px;color:#8A7B7B">안 본 시험 <b style="color:' + (o.pend ? '#9C2F2F' : '#1B6B3A') + '">' + o.pend + '</b>개</div></button>';
    }).join('') + '</div></div>';
  }
  function studentDetail(uid) {
    var s = D.students.find(function (x) { return x.uid === uid; }) || { name: '?' };
    var list = D.rows.filter(function (x) { return (x.ex.assignedTo || []).indexOf(uid) !== -1 && qOk(x) && (T.status === 'arch' ? x.st === 'arch' : (T.status === 'all' || x.st !== 'arch')); });
    var mine = function (x) { return x.pend.find(function (p) { return p.studentUid === uid; }); };
    var notYet = list.filter(mine).sort(function (a, b) { return tsMs(mine(a).createdAt) - tsMs(mine(b).createdAt); });
    var doneL = list.filter(function (x) { return !mine(x); });
    var r = function (x) {
      var p = mine(x), d = p ? dayDiff(tsMs(p.createdAt)) : 0;
      return '<div class="exh-row exh-row2"><div class="c-sbj"><span class="exh-sbj">' + esc(x.subj || '—') + '</span></div><div class="c-tt" style="min-width:0"><div class="tt">' + esc(x.title) + '</div><div class="sm">'
        + (p ? (p.status !== 'not_started' ? '<span class="tag t-run">응시 중</span>' : '<span class="tag ' + (d >= 3 ? 't-fail' : 't-wait') + '">배정 ' + d + '일째</span>') : '<span class="tag t-pass">응시 완료</span>')
        + (x.pinned ? '<span class="tag" style="color:#7B1D1D;background:#F6E9E6">오늘 볼 시험</span>' : '') + '</div></div>'
        + '<div class="ac"><button type="button" class="s" data-act="monitor" data-id="' + x.id + '">현황</button><button type="button" class="ib" data-act="rowmenu" data-id="' + x.id + '" aria-label="더보기">' + sv('more', '#5A4848', 16, 3) + '</button></div></div>';
    };
    return '<div class="card exh-main"><div class="exh-mh"><div><div class="exh-mt"><button type="button" class="ib" data-act="studback" aria-label="학생 목록" style="width:34px;height:34px">' + sv('left', '#5A4848', 16, 2.6) + '</button>' + esc(s.name) + ' <small>' + esc(s.grade || '') + ' · 배정 ' + list.length + '</small></div></div></div>'
      + '<div class="exh-sec" style="cursor:default"><div class="l"><span>아직 안 본 시험</span><span class="n">' + notYet.length + '</span></div></div>' + (notYet.length ? notYet.map(r).join('') : '<div class="exh-empty" style="padding:20px">없어요 👍</div>')
      + '<div class="exh-sec" style="cursor:default"><div class="l"><span>응시 완료</span><span class="n">' + doneL.length + '</span></div></div>' + (doneL.length ? doneL.map(r).join('') : '<div class="exh-empty" style="padding:20px">아직 없어요</div>')
      + '</div>';
  }

  /* ---------- 이벤트 ---------- */
  var qTimer = null;
  function bind() {
    host.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b || !host.contains(b)) return;
      var a = b.getAttribute('data-act'), v = b.getAttribute('data-v'), id = b.getAttribute('data-id');
      if (a === 'twist') { e.stopPropagation(); T.open[v] = !T.open[v]; renderBody(); return; }
      act(a, v, id, b);
    };
    var qi = host.querySelector('[data-act-input="q"]');
    if (qi) qi.oninput = function () { clearTimeout(qTimer); var val = qi.value; qTimer = setTimeout(function () { T.q = val.trim(); renderBody(); }, 180); };
  }
  function act(a, v, id, el) {
    var x = id && D.byId[id];
    switch (a) {
      case 'view': T.view = v; T.studentUid = null; render(); break;
      case 'status': T.status = v; render(); break;
      case 'folder': T.folderId = v; T.pane = 'content'; if (fById(v) && kids(v).length) T.open[v] = true; renderBody(); scrollTopIfMobile(); break;
      case 'back': T.pane = 'tree'; renderBody(); break;
      case 'sec': T.secOpen[v] = !(T.secOpen[v] != null ? T.secOpen[v] : !!(el.nextElementSibling && el.nextElementSibling.querySelector && el.nextElementSibling.querySelector('.exh-th'))); renderBody(); break;
      case 'stud': T.studentUid = v; renderBody(); scrollTopIfMobile(); break;
      case 'studback': T.studentUid = null; renderBody(); break;
      case 'new': call('openCreateExamModal'); break;
      case 'more': moreMenu(el); break;
      case 'monitor': call('openExamMonitor', id); break;
      case 'assign': call('openAssignExamModal', id); break;
      case 'rowmenu': rowMenu(el, x); break;
      case 'file': fileDialog(x); break;
      case 'newfolder': folderDialog(null, null); break;
      case 'fmenu': folderMenu(el, fById(v)); break;
      case 'fadd': addExamsDialog(fById(v)); break;
      case 'fassign': folderAssignDialog(fById(v)); break;
      case 'rules': rulesDialog(); break;
      case 'seed': seedFolders(); break;
      case 'savefolder': saveRoundAsFolder(v); break;
    }
  }
  function scrollTopIfMobile() { if (window.innerWidth <= 900 && host) { try { host.scrollIntoView({ block: 'start' }); } catch (e) { } } }

  /* ---------- 팝업 메뉴 ---------- */
  var menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('mousedown', outside, true); window.removeEventListener('scroll', closeMenu, true); } }
  function outside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
  function popMenu(anchor, items) {
    closeMenu();
    var m = document.createElement('div'); m.className = 'exh-menu wt';
    m.innerHTML = items.map(function (it, i) {
      if (it === '-') return '<hr>';
      if (it.label) return '<div class="lb">' + esc(it.label) + '</div>';
      return '<button type="button" data-i="' + i + '" class="' + (it.danger ? 'dg' : '') + '">' + (it.icon ? sv(it.icon, it.danger ? '#9C2F2F' : '#8A6A66', 16) : '') + '<span>' + esc(it.text) + '</span></button>';
    }).join('');
    document.body.appendChild(m); menuEl = m;
    var r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    var left = Math.min(window.innerWidth - mw - 8, Math.max(8, r.right - mw)), top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    m.onclick = function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; var it = items[+b.getAttribute('data-i')]; closeMenu(); if (it && it.run) it.run(); };
    setTimeout(function () { document.addEventListener('mousedown', outside, true); window.addEventListener('scroll', closeMenu, true); }, 0);
  }
  function moreMenu(el) {
    var isMaster = (ME().profile || {}).role === 'master';
    popMenu(el, [
      { icon: 'live', text: '실시간 응시 현황', run: function () { call('openLiveExamStatusModal'); } },
      { icon: 'retry', text: '누락 성적 검사', run: function () { call('openMissingGradesRecoveryModal'); } },
      { icon: 'link', text: '묶음 목록 (성적 합산)', run: function () { call('openExamMergeGroupsModal'); } },
      { icon: 'gear', text: '선택과목 관리', run: function () { call('openElectiveManageModal'); } },
      { icon: 'list', text: '분류 관리', run: function () { call('openManageExamSourceOptions'); } },
      { icon: 'rule', text: '자동 분류 규칙', run: rulesDialog },
      '-',
      { icon: 'screen', text: '기존 목록으로 보기 (시험 묶기' + (isMaster ? ' · 강제제출' : '') + ')', run: function () { if (window.MP_EX && MP_EX.setClassic) MP_EX.setClassic(true); } }
    ]);
  }
  function rowMenu(el, x) {
    if (!x) return;
    var e = x.ex, t = x.title;
    var items = [
      { icon: 'edit', text: '설정 수정', run: function () { call('openEditExamModal', x.id); } },
      { icon: 'folder', text: '폴더 지정…', run: function () { fileDialog(x); } },
      { icon: 'pin', text: x.pinned ? '오늘 볼 시험 고정 해제' : '오늘 볼 시험으로 고정', run: function () { patchExam(x, { pinned: !x.pinned }, x.pinned ? '고정을 풀었어요' : '학생 화면 맨 위 ‘지금 볼 시험’에 먼저 떠요'); } },
      '-',
      { icon: 'lamp', text: '등불 복습', run: function () { call('DB_openTeacherPanel', x.id); } },
      { icon: 'trophy', text: '전체 순위', run: function () { call('openExamFullRanking', x.id, t); } }
    ];
    if (e.startAtMs) items.push({ icon: 'screen', text: '진행 화면', run: function () { call('openExamDisplayScreen', x.id); } });
    items.push(
      { icon: 'retry', text: '다시 채점하기', run: function () { call('reGradeExamSessions', x.id, t); } },
      { icon: 'leaf', text: '다음 걸음을 위하여', run: function () { call('openExamReflections', x.id, t); } },
      { icon: 'ruler', text: '등급표', run: function () { call('openEditGradeCutoffModal', x.id); } },
      '-',
      { icon: 'box', text: x.st === 'arch' ? '보관 해제' : '보관하기', run: function () { patchExam(x, { archived: x.st !== 'arch' }, x.st === 'arch' ? '보관을 풀었어요' : '보관했어요 · ‘보관’ 탭에서 볼 수 있어요'); } },
      { icon: 'trash', text: '삭제', danger: true, run: function () { call('deleteExamConfirm', x.id, t); } }
    );
    popMenu(el, items);
  }
  function patchExam(x, patch, msg) {
    var fb = F();
    fb.updateDoc(fb.doc(fb.db, 'exams', x.id), patch).then(function () {
      Object.assign(x.ex, patch);
      x.pinned = !!x.ex.pinned;
      var asgN = (x.ex.assignedTo || []).length;
      x.st = x.ex.archived ? 'arch' : (asgN && !x.pend.length ? 'done' : 'active');
      if (msg) toast(msg); rerender();
    }).catch(function (e) { toast('저장 실패: ' + e.message); });
  }
  function folderMenu(el, f) {
    if (!f) return;
    var items = [
      { icon: 'edit', text: '이름 바꾸기', run: function () { folderDialog(f, null); } }
    ];
    if (!f.parentId) items.push({ icon: 'folder', text: '하위 폴더 만들기', run: function () { folderDialog(null, f.id); } });
    items.push(
      { icon: 'rule', text: '이 폴더 자동 분류 규칙', run: function () { rulesDialog(f.id); } },
      { icon: f.showStudents === false ? 'eye' : 'eyeoff', text: f.showStudents === false ? '학생에게 보이기' : '학생에게 숨기기', run: function () { f.showStudents = f.showStudents === false; saveCfg(D.cfg).then(function () { toast(f.showStudents ? '학생 시험 탭의 시리즈로 보여요' : '학생 화면에서 숨겼어요 (선생님 정리용)'); rerender(); }); } },
      { icon: 'pin', text: '폴더 시험 전부 오늘 볼 시험으로 고정', run: function () { pinFolder(f, true); } },
      { icon: 'pin', text: '폴더 시험 고정 모두 해제', run: function () { pinFolder(f, false); } },
      '-',
      { icon: 'trash', text: '폴더 삭제 (시험은 그대로)', danger: true, run: function () { deleteFolder(f); } }
    );
    popMenu(el, items);
  }
  function pinFolder(f, on) {
    var list = rowsOf(idsOf(f, true)).filter(function (x) { return x.pinned !== on && x.st !== 'arch'; });
    if (!list.length) { toast('바꿀 시험이 없어요'); return; }
    var fb = F(), b = fb.writeBatch(fb.db);
    list.forEach(function (x) { b.update(fb.doc(fb.db, 'exams', x.id), { pinned: on }); });
    b.commit().then(function () { list.forEach(function (x) { x.ex.pinned = on; x.pinned = on; }); toast(list.length + '개 시험을 ' + (on ? '고정했어요' : '고정 해제했어요')); rerender(); }).catch(function (e) { toast('저장 실패: ' + e.message); });
  }
  function deleteFolder(f) {
    var ks = kids(f.id);
    U().confirmBox('“' + esc(f.name) + '” 폴더를 삭제할까요?<br><span style="font-size:12.5px;color:#8A7B7B">안에 든 시험은 지워지지 않아요.' + (ks.length ? ' 하위 폴더 ' + ks.length + '개도 함께 삭제돼요.' : '') + '</span>', '삭제').then(function (ok) {
      if (!ok) return;
      D.cfg.folders = folders().filter(function (x) { return x.id !== f.id && x.parentId !== f.id; });
      saveCfg(D.cfg).then(function () { T.folderId = '__all'; T.pane = 'tree'; rerender(); toast('폴더를 삭제했어요'); });
    });
  }

  /* ---------- 대화상자 ---------- */
  function folderDialog(f, parentId) {
    var m = U().modal({ eyebrow: f ? 'FOLDER' : (parentId ? 'SUB FOLDER' : 'NEW FOLDER'), title: f ? '폴더 이름 바꾸기' : (parentId ? '하위 폴더 만들기' : '새 폴더'), width: 460 });
    var par = parentId && fById(parentId);
    m.body.innerHTML = (par ? '<div style="font-size:12.5px;color:#8A7B7B;margin-bottom:10px">상위 폴더: <b style="color:#3D2B2B">' + esc(par.name) + '</b></div>' : '')
      + '<input class="inp" data-n placeholder="예) 2026년 파이널 · 서바이벌 9회 세트" style="width:100%;height:46px;padding:0 14px;font-size:14px" value="' + esc(f ? f.name : '') + '">'
      + (f ? '' : '<label class="row" style="margin-top:14px;font-size:13px;color:#3D2B2B;gap:10px;cursor:pointer"><button type="button" class="tog" data-tg><i></i></button><span>학생에게 보이기 <span style="color:#8A7B7B;font-size:12px">(끄면 선생님 정리용 폴더)</span></span></label>');
    m.foot.innerHTML = '<button type="button" class="s" data-c style="height:42px;padding:0 16px">취소</button><button type="button" class="p" data-ok style="height:42px;padding:0 18px">' + (f ? '저장' : '만들기') + '</button>';
    var inp = m.body.querySelector('[data-n]'), tg = m.body.querySelector('[data-tg]'), show = true;
    if (tg) tg.onclick = function () { show = !show; tg.classList.toggle('off', !show); };
    setTimeout(function () { inp.focus(); inp.select(); }, 30);
    m.foot.querySelector('[data-c]').onclick = m.close;
    var go = function () {
      var name = inp.value.trim(); if (!name) { inp.focus(); return; }
      if (f) f.name = name;
      else { var nf = { id: uid6(), name: name, parentId: parentId || null, examIds: [], rules: [], exclude: [], showStudents: show, order: Date.now() }; folders().push(nf); T.folderId = nf.id; T.pane = 'content'; if (parentId) T.open[parentId] = true; }
      saveCfg(D.cfg).then(function () { m.close(); if (T.view !== 'folder') T.view = 'folder'; render(); }).catch(function (e) { toast('저장 실패: ' + e.message); });
    };
    m.foot.querySelector('[data-ok]').onclick = go;
    inp.onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  function folderOptions(sel) {
    var h = '';
    tops().forEach(function (f) {
      h += '<label class="exh-pick"><input type="checkbox" value="' + f.id + '"' + (sel[f.id] ? ' checked' : '') + '>' + sv('folder', '#B8841A', 16) + '<b style="font-weight:700">' + esc(f.name) + '</b></label>';
      kids(f.id).forEach(function (k) { h += '<label class="exh-pick" style="padding-left:34px"><input type="checkbox" value="' + k.id + '"' + (sel[k.id] ? ' checked' : '') + '>' + sv('folder', '#C9A35A', 14) + '<span>' + esc(k.name) + '</span></label>'; });
    });
    return h || '<div class="exh-empty" style="padding:20px">폴더가 아직 없어요. 아래 ‘새 폴더’로 먼저 만들어 주세요.</div>';
  }
  function fileDialog(x) {
    if (!x) return;
    var m = U().modal({ eyebrow: 'FILE TO FOLDERS', title: '폴더 지정', width: 520 });
    var cur = {}; foldersOfExam(x.id).forEach(function (f) { cur[f.id] = 1; });
    m.body.innerHTML = '<div style="font-size:13px;color:#3D2B2B;font-weight:700;margin-bottom:4px">' + esc(x.title) + '</div><div style="font-size:12px;color:#8A7B7B;margin-bottom:12px">여러 폴더를 고를 수 있어요 — 한 시험이 여러 폴더에 동시에 들어가요.</div><div class="card" style="padding:6px" data-list>' + folderOptions(cur) + '</div>';
    m.foot.innerHTML = '<button type="button" class="s" data-nf style="height:42px;padding:0 14px;margin-right:auto">' + sv('plus', '#5A4848', 14, 2.6) + '새 폴더</button><button type="button" class="s" data-c style="height:42px;padding:0 16px">취소</button><button type="button" class="p" data-ok style="height:42px;padding:0 18px">저장</button>';
    m.foot.querySelector('[data-c]').onclick = m.close;
    m.foot.querySelector('[data-nf]').onclick = function () {
      var name = prompt('새 폴더 이름'); if (!name || !name.trim()) return;
      folders().push({ id: uid6(), name: name.trim(), parentId: null, examIds: [], rules: [], exclude: [], showStudents: true, order: Date.now() });
      var sel = {}; m.body.querySelectorAll('input:checked').forEach(function (i) { sel[i.value] = 1; });
      m.body.querySelector('[data-list]').innerHTML = folderOptions(sel);
    };
    m.foot.querySelector('[data-ok]').onclick = function () {
      var sel = {}; m.body.querySelectorAll('input:checked').forEach(function (i) { sel[i.value] = 1; });
      folders().forEach(function (f) {
        var inNow = !!directIds(f, exList())[x.id], want = !!sel[f.id];
        if (want === inNow) return;
        f.examIds = (f.examIds || []).filter(function (i) { return i !== x.id; });
        f.exclude = (f.exclude || []).filter(function (i) { return i !== x.id; });
        if (want) { if (!directIds(f, exList())[x.id]) f.examIds.push(x.id); }
        else if (directIds(f, exList())[x.id]) f.exclude.push(x.id); /* 규칙으로 들어온 시험은 '제외' 목록으로 */
      });
      saveCfg(D.cfg).then(function () { m.close(); toast('폴더를 저장했어요'); rerender(); }).catch(function (e) { toast('저장 실패: ' + e.message); });
    };
  }
  function addExamsDialog(f) {
    if (!f) return;
    var m = U().modal({ eyebrow: 'ADD EXAMS', title: '“' + f.name + '”에 시험 넣기', width: 640 });
    var inF = idsOf(f), onlyInbox = true, q = '';
    var inboxIds = {}; inboxRows().forEach(function (x) { inboxIds[x.id] = 1; });
    var picked = {};
    function list() {
      var rows = D.rows.filter(function (x) { return !inF[x.id] && x.st !== 'arch' && (!onlyInbox || inboxIds[x.id]) && (!q || norm(x.title + x.subj + x.src).indexOf(norm(q)) !== -1); });
      return rows.length ? rows.slice(0, 300).map(function (x) { return '<label class="exh-pick"><input type="checkbox" value="' + x.id + '"' + (picked[x.id] ? ' checked' : '') + '><span class="exh-sbj" style="flex:none">' + esc(x.subj || '—') + '</span><span style="flex:1;min-width:0"><b style="font-weight:700;display:block">' + esc(x.title) + '</b><span style="font-size:11.5px;color:#8A7B7B">' + esc(x.src || '분류 없음') + ' · ' + x.dur + '분 · 배정 ' + x.asg + '</span></span></label>'; }).join('')
        + (rows.length > 300 ? '<div style="font-size:12px;color:#8A7B7B;padding:8px 10px">300개까지만 보여요 · 검색으로 좁혀 주세요</div>' : '')
        : '<div class="exh-empty" style="padding:24px">넣을 수 있는 시험이 없어요</div>';
    }
    m.body.innerHTML = '<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap"><label class="exh-sw" style="flex:1;min-width:180px">' + sv('search', '#A89898', 15) + '<input class="inp exh-search" data-q placeholder="제목 · 과목 · 분류" style="width:100%"></label>'
      + '<div class="seg well"><button type="button" data-m="1" class="on">정리 대기만</button><button type="button" data-m="0">전체 시험</button></div></div><div class="card" style="padding:6px;max-height:52vh;overflow:auto" data-l>' + list() + '</div>';
    m.foot.innerHTML = '<span data-cnt style="margin-right:auto;font-size:12.5px;color:#8A7B7B;align-self:center">0개 선택</span><button type="button" class="s" data-c style="height:42px;padding:0 16px">취소</button><button type="button" class="p" data-ok style="height:42px;padding:0 18px">넣기</button>';
    var L = m.body.querySelector('[data-l]'), cnt = m.foot.querySelector('[data-cnt]');
    L.onchange = function (e) { if (e.target.type === 'checkbox') { if (e.target.checked) picked[e.target.value] = 1; else delete picked[e.target.value]; cnt.textContent = Object.keys(picked).length + '개 선택'; } };
    m.body.querySelector('[data-q]').oninput = function (e) { q = e.target.value.trim(); L.innerHTML = list(); };
    m.body.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { onlyInbox = b.getAttribute('data-m') === '1'; m.body.querySelectorAll('[data-m]').forEach(function (o) { o.classList.toggle('on', o === b); }); L.innerHTML = list(); }; });
    m.foot.querySelector('[data-c]').onclick = m.close;
    m.foot.querySelector('[data-ok]').onclick = function () {
      var ids = Object.keys(picked); if (!ids.length) { toast('넣을 시험을 골라 주세요'); return; }
      f.examIds = (f.examIds || []).concat(ids.filter(function (i) { return (f.examIds || []).indexOf(i) === -1; }));
      f.exclude = (f.exclude || []).filter(function (i) { return ids.indexOf(i) === -1; });
      saveCfg(D.cfg).then(function () { m.close(); toast(ids.length + '개 시험을 넣었어요'); rerender(); }).catch(function (e) { toast('저장 실패: ' + e.message); });
    };
  }
  function folderAssignDialog(f) {
    if (!f) return;
    var list = rowsOf(idsOf(f, true)).filter(function (x) { return x.st !== 'arch'; });
    if (!list.length) { toast('이 폴더에 배정할 시험이 없어요'); return; }
    var m = U().modal({ eyebrow: 'ASSIGN FOLDER', title: '“' + f.name + '” 통째로 배정', width: 560 });
    var studs = D.students.slice().sort(function (a, b) { return natCmp(a.grade, b.grade) || natCmp(a.name, b.name); });
    var grades = Array.from(new Set(studs.map(function (s) { return s.grade || ''; }).filter(Boolean)));
    var cntIn = function (s) { return list.filter(function (x) { return (x.ex.assignedTo || []).indexOf(s.uid) !== -1; }).length; };
    m.body.innerHTML = '<div style="font-size:12.5px;color:#8A7B7B;line-height:1.6;margin-bottom:10px">폴더 안 시험 <b style="color:#3D2B2B">' + list.length + '개</b>에 고른 학생을 한꺼번에 배정해요. 이미 배정된 시험은 건너뛰고, <b>기존 배정은 지우지 않아요.</b></div>'
      + (grades.length ? '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">' + grades.map(function (g) { return '<button type="button" class="chip exh-chip" data-g="' + esc(g) + '">' + esc(g) + '</button>'; }).join('') + '</div>' : '')
      + '<div class="card" style="padding:6px;max-height:50vh;overflow:auto">' + studs.map(function (s) { var n = cntIn(s); return '<label class="exh-pick" data-grade="' + esc(s.grade || '') + '"><input type="checkbox" value="' + s.uid + '"><span style="flex:1"><b style="font-weight:700">' + esc(s.name) + '</b> <span style="font-size:11.5px;color:#8A7B7B">' + esc(s.grade || '') + '</span></span>' + (n ? '<span class="tag ' + (n === list.length ? 't-pass' : 't-wait') + '">' + (n === list.length ? '전부 배정됨' : n + '/' + list.length + ' 배정') + '</span>' : '') + '</label>'; }).join('') + '</div>';
    m.foot.innerHTML = '<span data-cnt style="margin-right:auto;font-size:12.5px;color:#8A7B7B;align-self:center">0명 선택</span><button type="button" class="s" data-c style="height:42px;padding:0 16px">취소</button><button type="button" class="p" data-ok style="height:42px;padding:0 18px">배정하기</button>';
    var cnt = m.foot.querySelector('[data-cnt]');
    var sync = function () { cnt.textContent = m.body.querySelectorAll('input:checked').length + '명 선택'; };
    m.body.onchange = sync;
    m.body.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { var g = b.getAttribute('data-g'); var ins = Array.from(m.body.querySelectorAll('label[data-grade="' + CSS.escape(g) + '"] input')); var all = ins.every(function (i) { return i.checked; }); ins.forEach(function (i) { i.checked = !all; }); b.classList.toggle('on', !all); sync(); }; });
    m.foot.querySelector('[data-c]').onclick = m.close;
    m.foot.querySelector('[data-ok]').onclick = function () {
      var uids = Array.from(m.body.querySelectorAll('input:checked')).map(function (i) { return i.value; });
      if (!uids.length) { toast('학생을 골라 주세요'); return; }
      var btn = m.foot.querySelector('[data-ok]'); btn.disabled = true; btn.textContent = '배정 중…';
      var fb = F(), made = 0;
      var chain = Promise.resolve();
      list.forEach(function (x) {
        chain = chain.then(function () {
          var cur = x.ex.assignedTo || [], add = uids.filter(function (u) { return cur.indexOf(u) === -1; });
          if (!add.length) return;
          return fb.getDocs(fb.query(fb.collection(fb.db, 'examSessions'), fb.where('examId', '==', x.id))).then(function (snap) {
            var has = {}; snap.docs.forEach(function (d) { has[d.data().studentUid] = 1; });
            var b = fb.writeBatch(fb.db), next = cur.concat(add);
            b.update(fb.doc(fb.db, 'exams', x.id), { assignedTo: next });
            add.forEach(function (u) { if (has[u]) return; made++; b.set(fb.doc(fb.collection(fb.db, 'examSessions')), { examId: x.id, studentUid: u, branch: x.ex.branch || ME().branch, status: 'not_started', currentSubjectIndex: 0, subjectResults: [], createdAt: fb.serverTimestamp() }); });
            return b.commit().then(function () { x.ex.assignedTo = next; });
          });
        });
      });
      chain.then(function () {
        m.close(); toast(list.length + '개 시험에 배정했어요 · 새 응시 ' + made + '건');
        try { if (made) F().push(uids, '📝 새 시험이 배정됐어요', '“' + f.name + '” 시험이 배정됐어요. 시험 탭에서 확인하세요.', { tab: 'exam' }); } catch (e) { }
        if (window.MP_EX && MP_EX.invalidate) MP_EX.invalidate();
        reload();
      }).catch(function (e) { btn.disabled = false; btn.textContent = '배정하기'; toast('배정 실패: ' + e.message); });
    };
  }
  function rulesDialog(focusId) {
    var m = U().modal({ eyebrow: 'AUTO FILING', title: '자동 분류 규칙', width: 760 });
    var draw = function () {
      var rows = [];
      folders().forEach(function (f) { (f.rules || []).forEach(function (r, i) { rows.push({ f: f, r: r, i: i }); }); });
      var path = function (f) { var p = f.parentId && fById(f.parentId); return (p ? esc(p.name) + ' › ' : '') + esc(f.name); };
      m.body.innerHTML = '<div style="font-size:12.5px;color:#8A7B7B;line-height:1.6;margin-bottom:12px">규칙에 맞는 시험은 <b style="color:#3D2B2B">지금 있는 시험과 앞으로 만들 시험 모두</b> 그 폴더에 자동으로 들어가요. 여러 규칙에 맞으면 여러 폴더에 들어가요. 폴더에서 직접 뺀 시험은 규칙에 맞아도 다시 들어가지 않아요.</div>'
        + '<div class="card" style="overflow:hidden">' + (rows.length ? rows.map(function (o, k) {
          var n = exList().filter(function (e) { return ruleHit(o.r, e); }).length;
          return '<div class="row" style="padding:11px 14px;gap:10px;box-shadow:inset 0 -1px 0 #F6EFED;flex-wrap:wrap' + (focusId === o.f.id ? ';background:#FBF3E4' : '') + '"><span style="flex:1;min-width:200px;font-size:13px;font-weight:700">' + (o.r.field === 'source' ? '분류가 “' + esc(o.r.value) + '”' : '제목에 “' + esc(o.r.value) + '” 포함') + '</span>' + sv('right', '#B9A99E', 14) + '<span style="flex:1;min-width:160px;font-size:12.5px;display:flex;align-items:center;gap:6px">' + sv('folder', '#B8841A', 14) + path(o.f) + '</span><span class="tnum" style="font-size:12px;color:#8A7B7B;width:44px;text-align:right">' + n + '개</span><button type="button" class="ib" data-del="' + k + '" aria-label="규칙 삭제" style="width:32px;height:32px">' + sv('trash', '#9C2F2F', 14) + '</button></div>';
        }).join('') : '<div class="exh-empty" style="padding:24px">아직 규칙이 없어요</div>') + '</div>'
        + '<div class="card" style="margin-top:14px;padding:14px;display:flex;flex-direction:column;gap:10px"><b style="font-size:13px">규칙 추가</b>'
        + '<div class="row" style="gap:8px;flex-wrap:wrap"><select class="inp" data-fd style="height:42px;padding:0 10px;font-size:13px"><option value="title">제목에 포함</option><option value="source">분류가</option></select>'
        + '<input class="inp" data-v list="exh-srcs" placeholder="예) 지구과학 서바이벌" style="flex:1;min-width:160px;height:42px;padding:0 12px;font-size:13px"><datalist id="exh-srcs">' + Array.from(new Set(D.rows.map(function (x) { return x.src; }).filter(Boolean))).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>'
        + '<select class="inp" data-to style="height:42px;padding:0 10px;font-size:13px;min-width:160px">' + tops().map(function (f) { return '<option value="' + f.id + '"' + (focusId === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>' + kids(f.id).map(function (k) { return '<option value="' + k.id + '"' + (focusId === k.id ? ' selected' : '') + '>　└ ' + esc(k.name) + '</option>'; }).join(''); }).join('') + '</select>'
        + '<button type="button" class="p" data-add style="height:42px;padding:0 16px">' + sv('plus', '#FFF6E6', 14, 2.6) + '추가</button></div><span data-pv style="font-size:12px;color:#8A7B7B"></span></div>';
      var vi = m.body.querySelector('[data-v]'), fd = m.body.querySelector('[data-fd]'), pv = m.body.querySelector('[data-pv]');
      var prev = function () { var r = { field: fd.value, value: vi.value.trim() }; pv.textContent = r.value ? '지금 맞는 시험 ' + exList().filter(function (e) { return ruleHit(r, e); }).length + '개' : ''; };
      vi.oninput = prev; fd.onchange = function () { vi.placeholder = fd.value === 'source' ? '예) 2026년 파이널' : '예) 지구과학 서바이벌'; prev(); };
      m.body.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var o = rows[+b.getAttribute('data-del')]; o.f.rules.splice(o.i, 1); saveCfg(D.cfg).then(function () { draw(); rerender(); }); }; });
      m.body.querySelector('[data-add]').onclick = function () {
        var to = fById(m.body.querySelector('[data-to]').value), v = vi.value.trim();
        if (!to) { toast('폴더를 먼저 만들어 주세요'); return; }
        if (!v) { vi.focus(); return; }
        to.rules = (to.rules || []).concat([{ field: fd.value, value: v }]);
        saveCfg(D.cfg).then(function () { toast('규칙을 추가했어요'); draw(); rerender(); });
      };
    };
    draw();
    m.foot.innerHTML = '<button type="button" class="p" data-c style="height:42px;padding:0 18px">닫기</button>';
    m.foot.querySelector('[data-c]').onclick = m.close;
  }
  function seedFolders() {
    var srcs = {}; D.rows.forEach(function (x) { if (x.src) srcs[x.src] = (srcs[x.src] || 0) + 1; });
    var keys = Object.keys(srcs).sort(natCmp);
    if (!keys.length) { toast('분류가 지정된 시험이 없어요'); return; }
    U().confirmBox('분류마다 폴더를 하나씩 만들고 ‘분류가 ○○’ 규칙을 붙일게요.<br><span style="font-size:12.5px;color:#8A7B7B">' + keys.map(function (k) { return esc(k) + ' (' + srcs[k] + ')'; }).join(' · ') + '</span><br><span style="font-size:12.5px;color:#8A7B7B">나중에 이름을 바꾸거나 하위 폴더로 더 나눌 수 있어요.</span>', '폴더 만들기').then(function (ok) {
      if (!ok) return;
      var base = Date.now();
      keys.forEach(function (k, i) { if (folders().some(function (f) { return f.name === k; })) return; folders().push({ id: uid6() + i, name: k, parentId: null, examIds: [], rules: [{ field: 'source', value: k }], exclude: [], showStudents: true, order: base + i }); });
      saveCfg(D.cfg).then(function () { toast(keys.length + '개 폴더를 만들었어요'); rerender(); });
    });
  }
  function saveRoundAsFolder(key) {
    var g = null;
    visible(D.rows).forEach(function (x) { var r = roundInfo(x.title); if (r && 'r:' + r.key === key) { g = g || { label: r.label, ids: [] }; g.ids.push(x.id); } });
    if (!g) return;
    var name = prompt('폴더 이름', g.label + ' 세트'); if (!name || !name.trim()) return;
    var nf = { id: uid6(), name: name.trim(), parentId: null, examIds: g.ids, rules: [], exclude: [], showStudents: true, order: Date.now() };
    folders().push(nf);
    saveCfg(D.cfg).then(function () { toast('폴더로 저장했어요 · 학생에게 숨기려면 폴더 메뉴에서'); T.view = 'folder'; T.folderId = nf.id; T.pane = 'content'; render(); });
  }

  /* ================================================================== 학생 */
  var S = { showAllPend: false, doneOpen: false, doneN: 15 };
  var SD = null, shost = null;
  var exCache = {};
  function getExam(id) {
    if (exCache[id] && Date.now() - exCache[id].t < 120000) return Promise.resolve(exCache[id].v);
    var fb = F();
    return fb.getDoc(fb.doc(fb.db, 'exams', id)).then(function (d) { var v = d.exists() ? Object.assign({ id: id }, d.data()) : null; exCache[id] = { v: v, t: Date.now() }; return v; }).catch(function () { return null; });
  }
  function scoreOf(sess) {
    var r = (sess.subjectResults || []).filter(Boolean); if (!r.length) return null;
    var s = 0, t = 0; r.forEach(function (x) { s += +x.score || 0; t += +x.totalScore || 0; });
    return { s: Math.round(s * 10) / 10, t: t, pct: t ? s / t * 100 : null, at: Math.max.apply(null, r.map(function (x) { return +x.submittedAtMs || 0; })) };
  }
  EXH.studentMount = function (el) {
    shost = el; if (!el) return;
    el.className = 'wt';
    if (!SD) el.innerHTML = '<div class="exs"><div class="card exh-empty">시험을 불러오는 중…</div></div>'; else renderS();
    var fb = F(), me = ME();
    Promise.all([
      fb.getDocs(fb.query(fb.collection(fb.db, 'examSessions'), fb.where('studentUid', '==', me.uid))),
      loadCfg()
    ]).then(function (r) {
      var sess = r[0].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
      return Promise.all(sess.map(function (s) { return getExam(s.examId); })).then(function (exs) {
        var rows = sess.map(function (s, i) { return exs[i] ? { s: s, e: exs[i] } : null; }).filter(function (x) { return x && !x.e.archived; });
        SD = { rows: rows, cfg: r[1] };
        if (shost === el && document.body.contains(el)) renderS();
      });
    }).catch(function (e) { console.error(e); if (shost === el) el.innerHTML = '<div class="exs"><div class="card exh-empty" style="color:#9C2F2F">시험을 불러오지 못했어요</div></div>'; });
  };
  var LIVE = { waiting: 1, in_progress: 1, break: 1 };
  function isDone(r) { return r.s.status === 'graded' || r.s.status === 'submitted'; }
  /* 지금 볼 시험: ① 응시 중 ② 선생님 고정(또는 일괄 시작 시각 지정) ③ 가장 오래 밀린 시험 */
  function pickNow(rows) {
    var open = rows.filter(function (r) { return !isDone(r); });
    var live = open.filter(function (r) { return LIVE[r.s.status]; });
    if (live.length) return { r: live[0], why: 'live' };
    var pin = open.filter(function (r) { return r.e.pinned || (r.e.startAtMs && r.e.startAtMs > Date.now() - 86400000); })
      .sort(function (a, b) { return (a.e.startAtMs || Infinity) - (b.e.startAtMs || Infinity) || tsMs(a.s.createdAt) - tsMs(b.s.createdAt); });
    if (pin.length) return { r: pin[0], why: 'pin' };
    var old = open.slice().sort(function (a, b) { return tsMs(a.s.createdAt) - tsMs(b.s.createdAt) || natCmp(a.e.title, b.e.title); });
    return old.length ? { r: old[0], why: 'old' } : null;
  }
  function sSubj(e) { return subjName(e); }
  function renderS() {
    if (!shost || !SD) return;
    var rows = SD.rows;
    if (!rows.length) { shost.innerHTML = '<div class="exs"><div class="card exh-empty">배정된 시험이 없어요</div></div>'; return; }
    var now = pickNow(rows);
    var pend = rows.filter(function (r) { return !isDone(r) && (!now || r !== now.r); })
      .sort(function (a, b) { return (b.e.pinned ? 1 : 0) - (a.e.pinned ? 1 : 0) || tsMs(a.s.createdAt) - tsMs(b.s.createdAt) || natCmp(a.e.title, b.e.title); });
    var done = rows.filter(isDone).sort(function (a, b) { var sa = scoreOf(a.s), sb = scoreOf(b.s); return ((sb && sb.at) || 0) - ((sa && sa.at) || 0); });

    /* 히어로 */
    var hero;
    if (now) {
      var r = now.r, e = r.e, st = r.s.status, d = dayDiff(tsMs(r.s.createdAt));
      var pill = st === 'in_progress' || st === 'break' ? '응시 중' : st === 'waiting' ? '대기실' : now.why === 'pin' ? (e.pinned ? '선생님 지정' : '예정된 시험') : (d >= 1 ? d + '일째 안 봄' : '오늘 배정');
      var btn = st === 'in_progress' || st === 'break' ? '이어서 응시' : st === 'waiting' ? '대기실 입장' : '응시하기';
      var sub = sSubj(e) + ' · ' + durOf(e) + '분' + (st === 'in_progress' && r.s.deadlineMs ? ' · 남은 시간 ' + Math.max(0, Math.ceil((r.s.deadlineMs - Date.now()) / 60000)) + '분' : '') + (e.startAtMs && st !== 'in_progress' && e.startAtMs > Date.now() ? ' · ' + new Date(e.startAtMs).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' 시작' : '');
      hero = '<div class="exs-hero"><div class="row" style="justify-content:space-between"><span class="eb2">지금 볼 시험</span><span class="pill">' + esc(pill) + '</span></div><div class="ht">' + esc(e.title) + '</div><div class="hs">' + esc(sub) + '</div>'
        + '<button type="button" class="g" data-s="start" data-v="' + r.s.id + '">' + sv('play', '#3A1E18', 14, 2.4) + btn + '</button></div>';
    } else {
      hero = '<div class="exs-hero"><span class="eb2">지금 볼 시험</span><div class="ht">배정된 시험을 모두 봤어요 🎉</div><div class="hs">새 시험이 배정되면 여기에 가장 먼저 떠요.</div></div>';
    }
    /* 아직 안 본 시험 */
    var lim = S.showAllPend ? pend.length : 4;
    var pendH = '<div class="exs-sh"><b>아직 안 본 시험<em>' + pend.length + '</em></b>' + (pend.length > 4 ? '<button type="button" class="s" data-s="allpend">' + (S.showAllPend ? '접기' : '전체 보기') + '</button>' : '') + '</div>'
      + (pend.length ? pend.slice(0, lim).map(function (r) {
        var d = dayDiff(tsMs(r.s.createdAt)), live = LIVE[r.s.status];
        return '<div class="card exs-it"><div style="flex:1;min-width:0"><div class="tt">' + esc(r.e.title) + '</div><div class="sm"><span>' + esc(sSubj(r.e)) + ' · ' + durOf(r.e) + '분</span>'
          + (live ? '<span class="tag t-run">응시 중</span>' : r.e.pinned ? '<span class="tag" style="color:#7B1D1D;background:#F6E9E6">선생님 지정</span>' : '<span class="tag ' + (d >= 3 ? 't-fail' : 't-wait') + '">' + (d >= 1 ? d + '일째' : '오늘 배정') + '</span>') + '</div></div>'
          + '<button type="button" class="p" data-s="start" data-v="' + r.s.id + '">' + (live ? '이어서' : '응시') + '</button></div>';
      }).join('') : '<div class="card exh-empty" style="padding:22px">남은 시험이 없어요 👍</div>');

    /* 시리즈 */
    var series = buildSeries(rows);
    var serH = series.length ? '<div class="exs-sh"><b>시리즈별 진도</b></div><div class="exs-series">' + series.map(function (g, i) {
      var dn = g.rows.filter(isDone), sc = dn.map(function (r) { return scoreOf(r.s); }).filter(function (x) { return x && x.pct != null; });
      var avg = sc.length ? Math.round(sc.reduce(function (a, x) { return a + x.pct; }, 0) / sc.length * 10) / 10 : null;
      var pct = Math.round(dn.length / g.rows.length * 100);
      return '<button type="button" class="card exs-sc" data-s="series" data-v="' + i + '"><span class="nm" title="' + esc(g.name) + '">' + esc(g.name) + '</span><div class="exh-pb' + (pct === 100 ? ' ok' : '') + '"><i style="width:' + pct + '%"></i></div><span class="ft"><span><b>' + dn.length + '/' + g.rows.length + '</b></span><span>' + (avg != null ? '평균 <b>' + avg + '</b>' : '아직 결과 없음') + '</span></span></button>';
    }).join('') + '</div>' : '';
    SD.series = series;

    /* 응시 완료 */
    var doneH = '<div class="card exs-done"><div class="exs-dh" data-s="done"><b>응시 완료<span>' + done.length + '</span></b><button type="button" class="s">' + (S.doneOpen ? '접기' : '펼치기') + '</button></div>'
      + (S.doneOpen ? done.slice(0, S.doneN).map(doneRow).join('') + (done.length > S.doneN ? '<div style="padding:10px 16px;box-shadow:inset 0 1px 0 #F6EFED;text-align:center"><button type="button" class="s" data-s="moredone" style="height:34px;padding:0 14px;font-size:12px">' + Math.min(15, done.length - S.doneN) + '개 더 보기</button></div>' : '') : '') + '</div>';

    shost.innerHTML = '<div class="exs"><div class="exs-grid"><div class="exs-col">' + hero + pendH + '</div><div class="exs-col">' + serH + doneH + '</div></div></div>';
    shost.onclick = function (ev) {
      var b = ev.target.closest('[data-s]'); if (!b) return;
      var a = b.getAttribute('data-s'), v = b.getAttribute('data-v');
      if (a === 'start') call('startExam', v);
      else if (a === 'allpend') { S.showAllPend = !S.showAllPend; renderS(); }
      else if (a === 'done') { S.doneOpen = !S.doneOpen; renderS(); }
      else if (a === 'moredone') { S.doneN += 15; renderS(); }
      else if (a === 'result') call('viewExamResult', v);
      else if (a === 'refl') call('openReflectionForPastExam', v);
      else if (a === 'series') seriesModal(SD.series[+v]);
    };
  }
  function doneRow(r) {
    var sc = scoreOf(r.s);
    return '<div class="exs-dr"><div style="flex:1;min-width:0"><div class="tt">' + esc(r.e.title) + '</div><div class="sm">' + esc(sSubj(r.e)) + (sc && sc.at ? ' · ' + md(sc.at) : '') + (r.s.status === 'submitted' ? ' · 채점 중' : '') + '</div></div>'
      + (sc ? '<span class="sc">' + sc.s + '<span style="font-size:11px;color:#8A7B7B;font-weight:600">점</span></span>' : '')
      + '<span class="acts" style="display:flex;gap:6px">' + (r.s.status === 'graded' ? '<button type="button" class="s" data-s="result" data-v="' + r.s.id + '">결과</button><button type="button" class="g" data-s="refl" data-v="' + r.s.id + '">다음 걸음</button>' : '') + '</span></div>';
  }
  function buildSeries(rows) {
    var fs = (SD.cfg.folders || []).filter(function (f) { return f.showStudents !== false; });
    var all = rows.map(function (r) { return r.e; });
    var used = {}, out = [];
    var hidden = (SD.cfg.folders || []).filter(function (f) { return f.showStudents === false; });
    fs.forEach(function (f) {
      var set = directIds(f, all);
      var rs = rows.filter(function (r) { return set[r.e.id]; });
      if (!rs.length) return;
      rs.forEach(function (r) { used[r.e.id] = 1; });
      out.push({ name: f.name, rows: rs, order: f.order || 0 });
    });
    /* 숨긴 폴더에만 있는 시험도 아래 자동 묶음으로 */
    var hidSet = {}; hidden.forEach(function (f) { Object.assign(hidSet, directIds(f, all)); });
    var m = {};
    rows.forEach(function (r) { if (used[r.e.id]) return; var n = seriesName(r.e.title) || '기타 시험'; (m[n] = m[n] || []).push(r); });
    var etc = [];
    Object.keys(m).sort(natCmp).forEach(function (n) { if (m[n].length >= 2) out.push({ name: n, rows: m[n], order: Infinity }); else etc = etc.concat(m[n]); });
    if (etc.length) out.push({ name: '기타 시험', rows: etc, order: Infinity + 1 });
    out.forEach(function (g) { g.rows.sort(function (a, b) { return natCmp(a.e.title, b.e.title); }); g.open = g.rows.filter(function (r) { return !isDone(r); }).length; });
    /* 남은 시험이 있는 시리즈 먼저 */
    out.sort(function (a, b) { return (b.open ? 1 : 0) - (a.open ? 1 : 0) || (a.order === b.order ? natCmp(a.name, b.name) : (a.order < b.order ? -1 : 1)); });
    return out;
  }
  function seriesModal(g) {
    if (!g) return;
    var m = U().modal({ eyebrow: 'SERIES', title: g.name, width: 620 });
    var dn = g.rows.filter(isDone).length;
    m.body.innerHTML = '<div class="row" style="gap:10px;margin-bottom:12px"><div class="exh-pb' + (dn === g.rows.length ? ' ok' : '') + '" style="height:9px"><i style="width:' + Math.round(dn / g.rows.length * 100) + '%"></i></div><b class="tnum" style="font-size:13px;white-space:nowrap">' + dn + '/' + g.rows.length + '</b></div>'
      + '<div class="card exs-done">' + g.rows.map(function (r) {
        if (isDone(r)) return doneRow(r);
        var live = LIVE[r.s.status], d = dayDiff(tsMs(r.s.createdAt));
        return '<div class="exs-dr"><div style="flex:1;min-width:0"><div class="tt">' + esc(r.e.title) + '</div><div class="sm">' + esc(sSubj(r.e)) + ' · ' + durOf(r.e) + '분 · ' + (live ? '응시 중' : d >= 1 ? d + '일째 안 봄' : '오늘 배정') + '</div></div><span class="acts" style="display:flex"><button type="button" class="p" data-s="start" data-v="' + r.s.id + '" style="height:34px;padding:0 14px;font-size:12px">' + (live ? '이어서' : '응시') + '</button></span></div>';
      }).join('') + '</div>';
    m.foot.innerHTML = '<button type="button" class="s" data-c style="height:42px;padding:0 18px">닫기</button>';
    m.foot.querySelector('[data-c]').onclick = m.close;
    m.body.onclick = function (ev) {
      var b = ev.target.closest('[data-s]'); if (!b) return;
      var a = b.getAttribute('data-s'), v = b.getAttribute('data-v');
      if (a === 'start') { m.close(); call('startExam', v); }
      else if (a === 'result') { m.close(); call('viewExamResult', v); }
      else if (a === 'refl') { m.close(); call('openReflectionForPastExam', v); }
    };
  }
  EXH._dbg = { roundInfo: roundInfo, seriesName: seriesName, T: T, get D() { return D; }, get SD() { return SD; } };
})();

/* 링크로 시험 등록: https://…/?eximport=<key>  (data/eximport-<key>.json) — 선생님·원장만
   같은 시리즈의 가장 최근 시험(templateLike)에서 과목·시간·분류·구분을 그대로 가져오고,
   정답·배점·시작 시각·종료 알림(녹음 목소리)·배정 학생(학년)만 파일 값으로 채움 */
(function () {
  var key = (location.search.match(/[?&]eximport=([\w-]+)/) || [])[1]; if (!key) return;
  function clearParam() { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { } }
  var tries = 0;
  (function wait() {
    var me = null; try { me = window.MP_FB && MP_FB.me && MP_FB.me(); } catch (e) { }
    var U = window.WT && WT._u;
    if (!me || !me.uid || !me.profile || !U) { if (++tries < 120) return setTimeout(wait, 500); return; }
    if (['teacher', 'master'].indexOf(me.profile.role) < 0) { clearParam(); U.toast('선생님 계정에서만 등록할 수 있어요'); return; }
    var fb = MP_FB, esc = U.esc, br = me.branch;
    fetch('/data/eximport-' + key + '.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('파일 없음'); return r.json(); }).then(function (P) {
      return Promise.all([
        fb.getDocs(fb.query(fb.collection(fb.db, 'exams'), fb.where('branch', '==', br))),
        fb.getDoc(fb.doc(fb.db, 'ttsCustomAudioLibrary', br)).catch(function () { return null; }),
        fb.loadStudents()
      ]).then(function (r) {
        var exams = r[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        var dup = exams.filter(function (e) { return e.title === P.title; })[0];
        var tpl = exams.filter(function (e) { return (e.title || '').indexOf(P.templateLike) !== -1; })
          .sort(function (a, b) { return ((b.createdAt && b.createdAt.toMillis && b.createdAt.toMillis()) || 0) - ((a.createdAt && a.createdAt.toMillis && a.createdAt.toMillis()) || 0); })[0];
        var clips = (r[1] && r[1].exists && r[1].exists() && r[1].data().clips) || {};
        var voice = clips[P.voiceMin];
        var studs = (r[2] || []).filter(function (s) { return (!s.role || s.role === 'student'); });
        var gOk = function (s) { var g = String(s.grade || ''); return P.grades.some(function (x) { return g.indexOf(x) !== -1 || (x === 'N수' && /n수|재수|성인|졸업/i.test(g)); }); };
        studs.sort(function (a, b) { return (gOk(b) ? 1 : 0) - (gOk(a) ? 1 : 0) || String(a.grade || '').localeCompare(String(b.grade || '')) || String(a.name).localeCompare(String(b.name)); });
        var ts = tpl && tpl.subjects && tpl.subjects[0];
        var dur = ts ? ts.durationMin : 40;
        var startMs = new Date(P.startAt).getTime();
        var total = P.points.reduce(function (a, b) { return a + b; }, 0);
        var m = U.modal({ title: '시험 등록 · ' + P.title, eyebrow: 'IMPORT EXAM', width: 600 });
        m.body.innerHTML = '<div class="col" style="gap:12px;font-size:13.5px;line-height:1.7">'
          + (dup ? '<div class="card" style="padding:12px 14px;color:#9C2F2F;font-weight:700">⚠️ 같은 이름의 시험이 이미 있어요. 그래도 등록하면 하나 더 만들어져요.</div>' : '')
          + '<div class="card" style="padding:12px 14px"><b style="color:#7B1D1D">' + esc(P.title) + '</b><div style="font-size:12.5px;color:#6A5A5A;margin-top:4px">'
          + P.answers.length + '문항 · ' + total + '점 만점 · 객관식 ' + P.choices + '지선다<br>'
          + '시간 <b>' + dur + '분</b>' + (tpl ? ' (「' + esc(tpl.title) + '」과 같은 설정)' : ' (기본값)') + '<br>'
          + '시작 <b>' + new Date(startMs).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '</b> 일괄 시작<br>'
          + '종료 알림 <b>' + P.warnMinutes.join('·') + '분 전</b> · ' + (voice ? '녹음된 목소리' : '<span style="color:#9C2F2F">녹음 파일 없음 → 기본 음성</span>') + '<br>'
          + '등급 <b>' + (P.gradeCutoffs ? '사용' : '없음') + '</b></div>'
          + '<div style="font-size:12px;color:#8A7B7B;margin-top:6px">정답 ' + P.answers.map(function (a, i) { return (i + 1) + ':' + a; }).join(' ') + '</div></div>'
          + '<div><b>배정 학생</b> <span style="font-size:12px;color:#8A7B7B">(' + P.grades.join('·') + ' 자동 선택)</span><div class="card" style="padding:6px;margin-top:6px;max-height:34vh;overflow:auto">'
          + studs.map(function (s) { return '<label style="display:flex;align-items:center;gap:10px;min-height:40px;padding:4px 10px;cursor:pointer"><input type="checkbox" value="' + s.uid + '"' + (gOk(s) ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#7B1D1D"><b style="font-weight:700">' + esc(s.name) + '</b><span style="font-size:12px;color:#8A7B7B">' + esc(s.grade || '') + '</span></label>'; }).join('')
          + '</div></div></div>';
        m.foot.innerHTML = '<span data-cnt style="margin-right:auto;align-self:center;font-size:12.5px;color:#8A7B7B"></span><button type="button" class="s" data-n style="height:42px;padding:0 18px">취소</button><button type="button" class="p" data-y style="height:42px;padding:0 22px">등록하고 배정</button>';
        var cnt = m.foot.querySelector('[data-cnt]'), sync = function () { cnt.textContent = m.body.querySelectorAll('input:checked').length + '명 배정'; };
        m.body.onchange = sync; sync();
        m.foot.querySelector('[data-n]').onclick = function () { m.close(); clearParam(); };
        m.foot.querySelector('[data-y]').onclick = function () {
          var uids = Array.from(m.body.querySelectorAll('input:checked')).map(function (i) { return i.value; });
          var btn = this; btn.disabled = true; btn.textContent = '등록 중…';
          var subj = {
            subject: ts ? ts.subject : 'ko', exCategory: ts ? (ts.exCategory || null) : null, electiveOptions: [], questionsByElective: {},
            order: 1, durationMin: dur, breakAfterMin: 0, listeningUrl: null, listeningDurationSec: null,
            gradeCutoffsEnabled: !!P.gradeCutoffs, gradeCutoffs: null, gradeCutoffsByElective: null,
            questions: P.answers.map(function (a, i) { return { no: i + 1, type: 'mc', choices: P.choices, answer: a, point: P.points[i] }; })
          };
          if (ts && ts.questions && ts.questions[0]) { /* 기존 시험 문항 필드 모양을 그대로 따름 */
            var q0 = ts.questions[0]; subj.questions = subj.questions.map(function (q) { var o = {}; Object.keys(q0).forEach(function (k) { o[k] = q0[k]; }); return Object.assign(o, q); });
          }
          var ex = {
            title: P.title, type: (tpl && tpl.type) || 'single', examSource: tpl ? (tpl.examSource || null) : null, gradeType: (tpl && tpl.gradeType) || 'mock',
            warnMinutesList: P.warnMinutes, ttsEnabled: true, ttsVoiceURI: (tpl && tpl.ttsVoiceURI) || null, ttsVolume: (tpl && tpl.ttsVolume != null) ? tpl.ttsVolume : 1,
            ttsProvider: voice ? 'custom' : ((tpl && tpl.ttsProvider) || 'browser'), ttsCloudVoiceName: (tpl && tpl.ttsCloudVoiceName) || null,
            ttsCustomAudio: voice ? (function () { var o = {}; o[P.voiceMin] = voice; return o; })() : {},
            startAtMs: startMs, subjects: [subj], branch: br, createdBy: me.uid, createdAt: fb.serverTimestamp(), assignedTo: uids
          };
          fb.addDoc(fb.collection(fb.db, 'exams'), ex).then(function (ref) {
            var b = fb.writeBatch(fb.db);
            uids.forEach(function (u) { b.set(fb.doc(fb.collection(fb.db, 'examSessions')), { examId: ref.id, studentUid: u, branch: br, status: 'not_started', currentSubjectIndex: 0, subjectResults: [], createdAt: fb.serverTimestamp() }); });
            return b.commit().then(function () {
              try { if (uids.length && fb.push) fb.push(uids, '📝 새 시험이 배정됐어요', P.title + ' · 오늘 ' + new Date(startMs).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) + ' 시작', { tab: 'exam' }); } catch (e) { }
              m.close(); clearParam(); U.toast('등록했어요 · ' + uids.length + '명 배정');
              try { if (window.MP_EX && MP_EX.invalidate) MP_EX.invalidate(); if (window.teacherTab) window.teacherTab(7); } catch (e) { }
            });
          }).catch(function (e) { btn.disabled = false; btn.textContent = '다시 시도'; U.toast('등록하지 못했어요: ' + (e.message || e)); });
        };
      });
    }).catch(function (e) { clearParam(); (window.WT && WT._u ? WT._u.toast : alert)('시험 등록 파일을 불러오지 못했어요'); });
  })();
})();
