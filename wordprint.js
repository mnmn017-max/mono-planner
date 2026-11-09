/* MONO PLANNER · 단어 Test 시험지 인쇄 (wordprint.js)
 * 디자인 5종(A 매거진 · C 카드 · D 미니멀 그리드 · F 블록 헤더 · G 클래식 프레임) × 색상 5종
 * 주관식 30문항/장, 객관식 14문항/장, 학생별 이름 인쇄, 정답지, 문항 섞기
 * 설정(디자인·색상)은 계정(users 문서 wtPrint)에 저장 → 같은 계정이면 어느 기기에서나 같음
 */
(function () {
  'use strict';
  var WT = window.WT; if (!WT) return;
  var U = WT._u, esc = U.esc;
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };

  var PAL = {
    '버건디': { p: '#7B1D1D', d: '#3A0E0E', a: '#B4574B', s: '#F4E6DF', m: '#E6CDC4', l: '#EEE0D9', t: '#8A6E68', g: '#B8841A', gl: '#F6EEDF', tint: '#FBF6F3' },
    '포레스트': { p: '#1F4D3A', d: '#0D2A1F', a: '#4E8A66', s: '#E2EDE5', m: '#C3D9CA', l: '#DCE8E0', t: '#56695E', g: '#A8884A', gl: '#F2EEE2', tint: '#F5F9F6' },
    '네이비': { p: '#1E3A5F', d: '#111F33', a: '#4F7CAC', s: '#E3EBF4', m: '#C6D4E5', l: '#E0E6EE', t: '#5C6B7E', g: '#B08D4A', gl: '#F3EEE3', tint: '#F6F8FB' },
    '차콜 골드': { p: '#2E2C2A', d: '#161514', a: '#8A7A62', s: '#EFEBE3', m: '#D9D2C5', l: '#E7E2D8', t: '#6B655C', g: '#B08D4A', gl: '#F4EEE2', tint: '#FAF8F4' },
    '플럼': { p: '#5B2A4E', d: '#2F1428', a: '#9A5B88', s: '#F1E5EE', m: '#DEC6D8', l: '#EBDDE7', t: '#7D6476', g: '#B8841A', gl: '#F6EEDF', tint: '#FBF6FA' }
  };
  var DESIGNS = [
    { k: 'A', name: '매거진 Word Test', desc: '호계고2 양식', pal: '버건디' },
    { k: 'C', name: '카드', desc: '앱과 같은 톤', pal: '버건디' },
    { k: 'D', name: '미니멀 그리드', desc: '채점칸 포함', pal: '네이비' },
    { k: 'F', name: '블록 헤더', desc: '진한 상단 띠', pal: '버건디' },
    { k: 'G', name: '클래식 프레임', desc: '테두리 · 세리프', pal: '차콜 골드' }
  ];
  var CIR = ['①', '②', '③', '④', '⑤'];
  var FILL = ['결정하다', '개선하다', '분배하다', '기대하다', '증가하다', '유지하다', '비교하다', '거절하다', '참여하다', '발견하다', '정확한', '풍부한', '명백한', '독특한', '필수적인'];
  var PER = { sa: 30, mc: 14 };
  var LOGO = '/lighthouse-logo.png';

  /* ---------- 유틸 ---------- */
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function shuf(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function wfs(w, big, small) { return String(w).length < 14 ? big : (String(w).length < 22 ? small : small - 1.5); }
  function numOf(title) { var m = String(title || '').match(/(\d+)\s*(일차|회|강|day)?\s*$/i); return m ? (m[1].length < 2 ? '0' + m[1] : m[1]) : ''; }
  function mdDot(s) { if (!s) return ''; var p = s.split('-'); return +p[1] + '. ' + p[2]; }
  function logo(size, color) { return '<span class="mlogo" style="width:' + size + 'px;height:' + size + 'px;background:' + color + '"></span>'; }
  function cols2(items, per) { var h = Math.ceil(per / 2); return [items.slice(0, h), items.slice(h)]; }

  function buildItems(words, type, opt, seed) {
    var r = rng(seed);
    var list = words.filter(function (w) { return w && w.en && w.ko; });
    if (opt.shuffle) list = shuf(list, r);
    var pool = []; var seen = {};
    words.concat(opt.extraPool || []).forEach(function (w) { if (w && w.ko && !seen[w.ko]) { seen[w.ko] = 1; pool.push(w.ko); } });
    return list.map(function (w, i) {
      var it = { no: i + 1, en: w.en, ko: w.ko };
      if (type === 'mc') {
        var ds = shuf(pool.filter(function (k) { return k !== w.ko; }), r).slice(0, 4);
        var fi = shuf(FILL, r); while (ds.length < 4 && fi.length) { var f = fi.pop(); if (f !== w.ko && ds.indexOf(f) < 0) ds.push(f); }
        var ch = shuf(ds.concat([w.ko]), r);
        it.choices = ch; it.ans = ch.indexOf(w.ko);
      }
      return it;
    });
  }

  /* ---------- 공통 CSS ---------- */
  function baseCss() {
    return '@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
      + 'html,body{margin:0;padding:0;background:#fff}body{font-family:"Noto Sans KR",sans-serif;color:#231B1D}'
      + '.pg{width:794px;height:1123px;position:relative;overflow:hidden;page-break-after:always;break-after:page}'
      + '.pg:last-child{page-break-after:auto;break-after:auto}'
      + '.mlogo{display:block;flex:none;-webkit-mask:url(' + LOGO + ') center/contain no-repeat;mask:url(' + LOGO + ') center/contain no-repeat}'
      + '.serif{font-family:"DM Serif Display",serif}.bask{font-family:"Libre Baskerville",serif}.kserif{font-family:"Noto Serif KR",serif}.inter{font-family:Inter,"Noto Sans KR",sans-serif}'
      + '@media screen{body{background:#E9E5E1}.pg{margin:16px auto;box-shadow:0 4px 18px rgba(0,0,0,.18)}}';
  }
  var FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+KR:wght@400;500;700;800;900&family=Noto+Serif+KR:wght@500;600;700;900&family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;600;700;800;900&display=swap">';

  function chGrid(cs, numHtml, fs, lh, gap, pad, extra) {
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:' + gap + ';padding:' + pad + ';font-size:' + fs + 'px;line-height:' + lh + 'px;' + (extra || '') + '">'
      + cs.map(function (x, j) { return '<span style="display:flex;gap:6px;align-items:flex-start">' + numHtml(j) + '<span>' + esc(x) + '</span></span>'; }).join('') + '</div>';
  }

  /* ================= A · 매거진 ================= */
  function A(x) {
    var c = x.c, isSA = x.type === 'sa';
    var head = '<div style="padding:44px 52px 0"><div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid ' + c.p + ';padding-bottom:10px">'
      + '<div style="display:flex;align-items:flex-end;gap:14px"><div class="serif" style="font-size:42px;line-height:.86;color:' + c.p + '">Word<br><i style="color:' + c.a + '">Test.</i></div>'
      + (x.num ? '<div class="serif" style="font-size:60px;line-height:.8;color:' + c.p + ';letter-spacing:-.03em">' + x.num + '</div>' : '')
      + '<div style="font-size:11px;color:' + c.t + ';line-height:1.5;padding-bottom:2px;max-width:200px"><b style="color:' + c.d + ';font-size:12.5px">' + esc(x.title) + '</b><br>' + (isSA ? '주관식' : '객관식') + ' · 커트 ' + x.cut + ' / ' + x.total + '</div></div>'
      + '<div style="display:flex;align-items:flex-end;gap:12px"><div style="display:grid;grid-template-columns:auto auto auto;border:1px solid ' + c.p + '">'
      + '<div style="padding:5px 10px;font-size:10px;font-weight:700;color:' + c.p + ';border-right:1px solid ' + c.m + '">번호<span style="display:block;min-width:46px;height:20px"></span></div>'
      + '<div style="padding:5px 10px;font-size:10px;font-weight:700;color:' + c.p + ';border-right:1px solid ' + c.m + '">이름<span style="display:block;min-width:70px;height:20px;font-size:14px;color:' + c.d + ';font-weight:800;padding-top:2px">' + esc(x.name) + '</span></div>'
      + '<div style="padding:5px 10px;font-size:10px;font-weight:700;color:' + c.p + '">점수<span class="serif" style="display:block;min-width:64px;height:20px;text-align:right;font-size:15px;font-weight:400">/ ' + x.total + '</span></div></div>'
      + logo(52, c.p) + '</div></div>'
      + '<div style="display:flex;gap:8px;margin:12px 0 8px">'
      + (x.sub ? '<span style="background:' + c.s + ';color:' + c.d + ';font-size:11px;padding:4px 11px;display:flex;gap:7px;align-items:center"><b class="serif" style="font-weight:400;color:' + c.p + ';font-size:13.5px">' + (x.num ? 'Day ' + x.num : 'Book') + '</b>' + esc(x.sub) + '</span>' : '')
      + (x.date ? '<span style="background:' + c.s + ';color:' + c.d + ';font-size:11px;padding:4px 11px;display:flex;gap:7px;align-items:center"><b class="serif" style="font-weight:400;color:' + c.p + ';font-size:13.5px">' + x.dateDot + '</b>응시일</span>' : '') + '</div>';
    var foot = '<div style="position:absolute;left:52px;right:52px;bottom:30px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:' + c.t + ';letter-spacing:.05em"><span>멘토즈 스터디카페 울산송정점 · MONO PLANNER' + x.pageTxt + '</span><span class="serif" style="font-style:italic;font-size:12.5px;color:' + c.a + ';letter-spacing:0">너의 꾸준함과 우리의 치열함이 기적을 이루길</span></div>';
    var body;
    if (isSA) {
      var gh = '<div class="serif" style="display:flex;gap:9px;font-style:italic;font-size:12px;color:' + c.a + ';border-bottom:1.4px solid ' + c.p + ';padding-bottom:3px"><span style="width:26px"></span><span style="width:150px">Word</span><span style="flex:1;padding-left:9px">뜻 (Meaning)</span></div>';
      var col = function (its) { return its.map(function (it) { return '<div style="display:flex;align-items:flex-end;gap:9px;height:51px;border-bottom:1px solid ' + c.l + '"><span class="serif" style="color:' + c.a + ';width:26px;text-align:right;font-size:13px;padding-bottom:7px">' + it.no + '</span><span class="bask" style="font-weight:700;color:' + c.d + ';width:150px;font-size:' + wfs(it.en, 15, 12.5) + 'px;line-height:1.15;padding-bottom:7px">' + esc(it.en) + '</span><span style="flex:1;align-self:stretch;border-left:1px solid ' + c.m + '"></span></div>'; }).join(''); };
      var cc = cols2(x.items, PER.sa);
      body = '<div style="font-size:12px;color:' + c.t + ';margin-bottom:8px;display:flex;justify-content:space-between"><span>다음 영단어(어구)의 뜻을 <b style="color:' + c.p + '">우리말</b>로 쓰시오. 띄어쓰기는 채점하지 않습니다.</span><span>' + x.rangeTxt + '</span></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px"><div>' + gh + col(cc[0]) + '</div><div>' + (cc[1].length ? gh + col(cc[1]) : '') + '</div></div>';
    } else {
      var ns = function (j) { return '<b style="color:' + c.p + ';font-weight:500;flex:none">' + CIR[j] + '</b>'; };
      var item = function (it) { return '<div style="padding:12px 0 13px;border-bottom:1px solid ' + c.l + '"><div style="display:flex;align-items:baseline;gap:9px;margin-bottom:8px"><span class="serif" style="color:' + c.a + ';font-size:15px;width:22px;text-align:right">' + it.no + '</span><span class="bask" style="font-weight:700;font-size:' + wfs(it.en, 16, 13.5) + 'px;color:' + c.d + '">' + esc(it.en) + '</span></div>' + chGrid(it.choices, ns, 12, 17, '5px 12px', '0 0 0 31px') + '</div>'; };
      var mc = cols2(x.items, PER.mc);
      body = '<div style="font-size:12px;color:' + c.t + ';margin-bottom:4px;display:flex;justify-content:space-between"><span>다음 영단어(어구)의 뜻으로 <b style="color:' + c.p + '">알맞은 것</b>을 고르시오.</span><span>' + x.rangeTxt + '</span></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px;border-top:1.4px solid ' + c.p + '"><div>' + mc[0].map(item).join('') + '</div><div>' + mc[1].map(item).join('') + '</div></div>'
        + '<div style="margin-top:14px;display:flex;align-items:center;gap:12px;background:' + c.s + ';padding:7px 14px"><span class="serif" style="font-size:15px;color:' + c.p + '">Answer</span><div style="display:grid;grid-template-columns:repeat(14,minmax(0,1fr));flex:1;gap:4px">'
        + x.items.map(function (it) { return '<span style="background:#fff;height:28px;font-size:9px;color:' + c.t + ';padding:1px 0 0 3px">' + it.no + '</span>'; }).join('') + '</div></div>';
    }
    return '<div class="pg">' + head + body + '</div>' + foot + '</div>';
  }

  /* ================= C · 카드 ================= */
  function Cc(x) {
    var c = x.c, isSA = x.type === 'sa';
    var head = '<div style="height:142px;background:linear-gradient(135deg,' + c.s + ' 0%,' + c.gl + ' 100%);padding:28px 44px 0">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;gap:14px;align-items:center">' + logo(64, c.p)
      + '<div style="display:flex;flex-direction:column;gap:5px;min-width:0"><span style="font-size:10.5px;letter-spacing:.24em;color:' + c.g + ';font-weight:800">MONO PLANNER · WORD TEST</span>'
      + '<span class="kserif" style="font-size:' + (x.title.length > 14 ? 23 : 29) + 'px;font-weight:700;color:' + c.p + ';max-width:380px">' + esc(x.title) + '</span>'
      + '<span style="font-size:12.5px;color:' + c.t + '">' + esc(x.sub || '') + (x.sub ? ' · ' : '') + (isSA ? '주관식' : '객관식') + ' ' + x.total + '문항' + (x.date ? ' · ' + x.dateDot : '') + '</span></div></div>'
      + '<div style="display:flex;gap:10px;align-items:center"><div style="background:#fff;border-radius:16px;padding:10px 16px;box-shadow:0 6px 16px rgba(30,20,20,.10),0 0 0 1px ' + c.m + ';display:flex;flex-direction:column;gap:3px;min-width:116px"><span style="font-size:10px;color:' + c.t + ';font-weight:700">이름</span><span style="font-size:16px;font-weight:800;color:#1A1010;min-height:21px">' + esc(x.name) + '</span></div>'
      + '<div style="width:84px;height:84px;border-radius:50%;background:#fff;box-shadow:0 6px 16px rgba(30,20,20,.10),0 0 0 1px ' + c.m + ';display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative">'
      + '<svg width="84" height="84" viewBox="0 0 84 84" style="position:absolute;left:0;top:0" aria-hidden="true"><circle cx="42" cy="42" r="36" fill="none" stroke="' + c.l + '" stroke-width="5"/><circle cx="42" cy="42" r="36" fill="none" stroke="' + c.g + '" stroke-width="5" stroke-dasharray="' + Math.round(226 * x.cut / x.total) + ' 300" stroke-linecap="round" transform="rotate(-90 42 42)" opacity=".6"/></svg>'
      + '<span style="font-size:9.5px;color:' + c.t + ';font-weight:700">점수</span><span style="font-size:13px;color:#BBB;font-weight:700">　/ ' + x.total + '</span><span style="font-size:9px;color:' + c.g + ';font-weight:800">커트 ' + x.cut + '</span></div></div></div></div>';
    var foot = '<div style="position:absolute;left:44px;right:44px;bottom:24px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점 · 너의 꾸준함과 우리의 치열함이 기적을 이루길</span><span>' + (x.pageTxt ? x.pageTxt.replace(' · ', '') : '틀린 단어는 앱의 오답 시험에 모여요') + '</span></div>';
    var nb = function (n, sz) { return '<span style="width:' + sz + 'px;height:' + sz + 'px;border-radius:' + sz / 2 + 'px;background:' + c.s + ';color:' + c.p + ';font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">' + n + '</span>'; };
    var body;
    if (isSA) {
      body = '<div style="display:flex;justify-content:space-between;font-size:12px;color:' + c.t + ';margin-bottom:12px"><span>뜻을 우리말로 쓰세요 · <b style="color:' + c.p + '">띄어쓰기는 채점하지 않아요</b></span><span>' + x.rangeTxt + '</span></div>'
        + '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">' + x.items.map(function (it) { return '<div style="background:#fff;border-radius:12px;box-shadow:0 0 0 1px ' + c.l + ',0 2px 6px rgba(30,20,20,.05);padding:9px 12px 8px;display:flex;flex-direction:column;gap:8px;height:74px"><div style="display:flex;align-items:center;gap:8px">' + nb(it.no, 22) + '<span style="font-size:' + wfs(it.en, 15, 12.5) + 'px;font-weight:800;color:#1A1010;line-height:1.15">' + esc(it.en) + '</span></div><span style="flex:1;border-bottom:1.5px dashed ' + c.m + ';margin:0 2px 4px 30px"></span></div>'; }).join('') + '</div>';
    } else {
      var ns = function (j) { return '<span style="width:17px;height:17px;border-radius:9px;box-shadow:0 0 0 1.3px ' + c.m + ';font-size:9.5px;font-weight:800;color:' + c.p + ';display:flex;align-items:center;justify-content:center;flex:none">' + (j + 1) + '</span>'; };
      body = '<div style="display:flex;justify-content:space-between;font-size:12px;color:' + c.t + ';margin-bottom:12px"><span>알맞은 뜻의 번호에 <b style="color:' + c.p + '">동그라미</b> 하세요</span><span>' + x.rangeTxt + '</span></div>'
        + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px">' + x.items.map(function (it) { return '<div style="background:#fff;border-radius:14px;box-shadow:0 0 0 1px ' + c.l + ',0 2px 6px rgba(30,20,20,.05);padding:10px 16px 11px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:9px">' + nb(it.no, 24) + '<span style="font-size:' + wfs(it.en, 16, 13.5) + 'px;font-weight:800">' + esc(it.en) + '</span></div>' + chGrid(it.choices, ns, 12, 17, '6px 12px', '0 0 0 2px') + '</div>'; }).join('') + '</div>';
    }
    return '<div class="pg">' + head + '<div style="padding:20px 44px 0">' + body + '</div>' + foot + '</div>';
  }

  /* ================= D · 미니멀 그리드 ================= */
  function Dd(x) {
    var c = x.c, isSA = x.type === 'sa', LN = '#E3E6EB';
    var side = '<div style="position:absolute;left:0;top:0;bottom:0;width:70px;background:linear-gradient(180deg,' + c.p + ',' + c.d + ');display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:34px 0 28px">'
      + '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span class="inter" style="font-size:9px;letter-spacing:.2em;color:' + c.g + ';font-weight:700">' + (x.num ? 'DAY' : 'TEST') + '</span><span class="inter" style="font-size:32px;font-weight:800;color:#fff;line-height:1">' + (x.num || '—') + '</span><span style="width:22px;height:2px;background:' + c.g + ';margin-top:6px"></span></div>'
      + '<span class="inter" style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:13px;letter-spacing:.42em;color:rgba(255,255,255,.72);font-weight:600">VOCABULARY · <b style="color:' + c.g + '">' + (isSA ? 'WRITE' : 'CHOICE') + '</b></span>' + logo(44, '#fff') + '</div>';
    var info = [['NAME', esc(x.name)], ['DATE', x.dateDot], ['SCORE', '<span class="inter" style="color:#B0B5BF;font-weight:500">　　/ ' + x.total + '</span>']];
    var head = '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px"><div style="min-width:0"><div style="font-size:11px;color:' + c.g + ';font-weight:800;letter-spacing:.16em">' + esc(x.sub || 'MONO PLANNER') + '</div><div style="font-size:' + (x.title.length > 16 ? 21 : 27) + 'px;font-weight:900;color:' + c.d + ';letter-spacing:-.02em;margin-top:4px">' + esc(x.title) + ' <span style="color:' + c.g + '">·</span> ' + (isSA ? '주관식' : '객관식') + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:8px;background:' + c.gl + ';padding:7px 12px;border-radius:999px;font-size:11.5px;color:' + c.d + ';font-weight:700;white-space:nowrap">' + x.total + '문항 · 통과 ' + x.cut + '점</div></div>'
      + '<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;margin-top:14px;border-top:2px solid ' + c.d + ';border-bottom:1px solid ' + c.d + '">'
      + info.map(function (r, i) { return '<div style="padding:8px 14px;' + (i ? 'border-left:1px solid ' + LN + ';' : '') + 'display:flex;align-items:baseline;gap:10px"><span class="inter" style="font-size:10px;color:#7A8090;font-weight:700;letter-spacing:.1em">' + r[0] + '</span><span style="font-size:15px;font-weight:800;color:' + c.d + '">' + r[1] + '</span></div>'; }).join('') + '</div>';
    var dn = function (n) { return '<span class="inter" style="width:26px;height:26px;border-radius:13px;background:' + c.gl + ';color:' + c.d + ';font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">' + (n < 10 ? '0' + n : n) + '</span>'; };
    var body;
    if (isSA) {
      var col = function (its) {
        return '<div><div class="inter" style="display:flex;gap:10px;align-items:center;height:24px;font-size:9.5px;color:' + c.g + ';font-weight:700;letter-spacing:.14em;border-bottom:1.5px solid ' + c.d + '"><span style="width:26px">NO</span><span style="width:118px">WORD</span><span style="flex:1;padding-left:4px">MEANING</span><span style="width:26px;text-align:center">✓</span></div>'
          + its.map(function (it, i) { return '<div style="display:flex;gap:10px;align-items:center;height:56px;border-bottom:1px solid ' + LN + ';' + (i % 2 ? 'background:' + c.tint + ';' : '') + 'padding-left:2px">' + dn(it.no) + '<span class="inter" style="width:118px;font-size:' + wfs(it.en, 14.5, 12) + 'px;font-weight:700;color:' + c.d + ';line-height:1.2">' + esc(it.en) + '</span><span style="flex:1;align-self:stretch;border-left:1px solid ' + LN + '"></span><span style="width:26px;align-self:stretch;border-left:1px dashed ' + c.m + ';background:' + c.gl + '"></span></div>'; }).join('') + '</div>';
      };
      var cc = cols2(x.items, PER.sa);
      body = '<div style="font-size:12px;color:#5A6070;margin:14px 0 6px;display:flex;justify-content:space-between"><span>영단어의 뜻을 우리말로 쓰세요. 띄어쓰기는 채점하지 않아요.</span><span>' + x.rangeTxt + '</span></div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:22px">' + col(cc[0]) + (cc[1].length ? col(cc[1]) : '<div></div>') + '</div>';
    } else {
      var ns = function (j) { return '<span class="inter" style="width:16px;height:16px;border-radius:8px;box-shadow:0 0 0 1.3px ' + c.g + ';color:' + c.d + ';font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">' + (j + 1) + '</span>'; };
      var hd = '<div class="inter" style="height:24px;display:flex;align-items:center;font-size:9.5px;color:' + c.g + ';font-weight:700;letter-spacing:.14em;border-bottom:1.5px solid ' + c.d + '">NO · WORD · CHOICE</div>';
      var item = function (it, i) { return '<div style="padding:13px 8px 13px 2px;border-bottom:1px solid ' + LN + ';' + (i % 2 ? 'background:' + c.tint + ';' : '') + 'display:flex;flex-direction:column;gap:9px"><div style="display:flex;align-items:center;gap:10px">' + dn(it.no) + '<span class="inter" style="font-size:' + wfs(it.en, 15, 13) + 'px;font-weight:700;color:' + c.d + '">' + esc(it.en) + '</span></div>' + chGrid(it.choices, ns, 11.5, 16, '6px 10px', '0 0 0 4px') + '</div>'; };
      var mc = cols2(x.items, PER.mc);
      body = '<div style="font-size:12px;color:#5A6070;margin:14px 0 6px;display:flex;justify-content:space-between"><span>알맞은 뜻의 번호에 ○ 하세요.</span><span>' + x.rangeTxt + '</span></div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:22px"><div>' + hd + mc[0].map(item).join('') + '</div><div>' + (mc[1].length ? hd + mc[1].map(item).join('') : '') + '</div></div>';
    }
    var foot = '<div class="inter" style="position:absolute;left:108px;right:44px;bottom:24px;display:flex;justify-content:space-between;font-size:9.5px;color:#8A90A0"><span>MENTORS STUDY CAFE · ULSAN SONGJEONG' + x.pageTxt + '</span><span>' + (isSA ? '채점칸 <b style="color:' + c.g + '">○</b> 맞음 · <b style="color:' + c.g + '">／</b> 틀림' : '너의 꾸준함과 우리의 치열함이 기적을 이루길') + '</span></div>';
    return '<div class="pg">' + side + '<div style="position:absolute;left:70px;right:0;top:0;padding:34px 44px 0 38px">' + head + body + '</div>' + foot + '</div>';
  }

  /* ================= F · 블록 헤더 ================= */
  function Ff(x) {
    var c = x.c, isSA = x.type === 'sa';
    var head = '<div style="height:176px;background:' + c.p + ';position:relative;padding:32px 48px 0;color:#fff;overflow:hidden">'
      + (x.num ? '<div class="serif" style="position:absolute;right:-24px;top:-50px;font-size:250px;line-height:1;color:rgba(255,255,255,.06)">' + x.num + '</div>' : '')
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative"><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span style="font-size:10.5px;letter-spacing:.3em;color:' + c.g + ';font-weight:700">VOCABULARY TEST' + (x.num ? ' · DAY ' + x.num : '') + '</span>'
      + '<span class="kserif" style="font-size:' + (x.title.length > 14 ? 26 : 34) + 'px;font-weight:700">' + esc(x.title) + '</span>'
      + '<span style="font-size:12.5px;color:rgba(255,255,255,.78)">' + esc(x.sub || '') + (x.sub ? ' · ' : '') + (isSA ? '주관식' : '객관식') + ' ' + x.total + '문항 · 커트 ' + x.cut + '</span></div>' + logo(70, '#fff') + '</div></div>'
      + '<div style="margin:-26px 48px 0;position:relative;display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;background:#fff;border-radius:10px;box-shadow:0 10px 24px rgba(20,10,10,.16),0 0 0 1px ' + c.m + '">'
      + [['이름', esc(x.name)], ['응시일', x.date ? x.dateDot : ''], ['소요 시간', ''], ['점수', '<span style="color:#C9BDB4;font-weight:500">　　/ ' + x.total + '</span>']].map(function (r, i) { return '<div style="padding:9px 16px;' + (i ? 'border-left:1px solid ' + c.l + ';' : '') + 'display:flex;flex-direction:column;gap:3px"><span style="font-size:10px;color:' + c.t + ';font-weight:700;letter-spacing:.06em">' + r[0] + '</span><span style="font-size:15px;font-weight:800;color:#1E1214;height:20px">' + r[1] + '</span></div>'; }).join('') + '</div>';
    var fb = function (n) { return '<span class="inter" style="width:24px;height:24px;border-radius:7px;background:' + c.p + ';color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">' + n + '</span>'; };
    var body;
    if (isSA) {
      var col = function (its) { return its.map(function (it) { return '<div style="display:flex;align-items:center;gap:10px;height:51px;border-bottom:1px solid ' + c.l + '">' + fb(it.no) + '<span class="bask" style="width:148px;font-weight:700;font-size:' + wfs(it.en, 14.5, 12) + 'px;color:#1E1214;line-height:1.15">' + esc(it.en) + '</span><span style="flex:1;height:30px;border-radius:6px;background:' + c.tint + ';box-shadow:inset 0 0 0 1px ' + c.l + '"></span></div>'; }).join(''); };
      var cc = cols2(x.items, PER.sa);
      body = '<div style="padding:22px 48px 0"><div style="font-size:12px;color:' + c.t + ';margin-bottom:6px;display:flex;justify-content:space-between"><span>영단어의 뜻을 우리말로 쓰세요. <b style="color:' + c.p + '">띄어쓰기는 채점하지 않습니다.</b></span><span>' + x.rangeTxt + '</span></div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:28px"><div>' + col(cc[0]) + '</div><div>' + col(cc[1]) + '</div></div></div>';
    } else {
      var ns = function (j) { return '<b style="color:' + c.p + ';font-weight:600;flex:none">' + CIR[j] + '</b>'; };
      var item = function (it) { return '<div style="padding:12px 0 12px;border-bottom:1px solid ' + c.l + '"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' + fb(it.no) + '<span class="bask" style="font-weight:700;font-size:' + wfs(it.en, 15.5, 13) + 'px;color:#1E1214">' + esc(it.en) + '</span></div>' + chGrid(it.choices, ns, 12, 17, '5px 12px', '0 0 0 34px') + '</div>'; };
      var mc = cols2(x.items, PER.mc);
      body = '<div style="padding:18px 48px 0"><div style="font-size:12px;color:' + c.t + ';margin-bottom:2px;display:flex;justify-content:space-between"><span>뜻으로 알맞은 것을 고르세요.</span><span>' + x.rangeTxt + '</span></div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:28px"><div>' + mc[0].map(item).join('') + '</div><div>' + mc[1].map(item).join('') + '</div></div></div>';
    }
    var foot = '<div style="position:absolute;left:48px;right:48px;bottom:26px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:' + c.t + ';border-top:1px solid ' + c.l + ';padding-top:8px"><span>멘토즈 스터디카페 울산송정점 · MONO PLANNER' + x.pageTxt + '</span><span class="kserif" style="color:' + c.p + ';font-size:10.5px">너의 꾸준함과 우리의 치열함이 기적을 이루길</span></div>';
    return '<div class="pg">' + head + body + foot + '</div>';
  }

  /* ================= G · 클래식 프레임 ================= */
  function Gg(x) {
    var c = x.c, isSA = x.type === 'sa';
    var frame = '<div style="position:absolute;left:0;top:0;right:0;bottom:0;border:22px solid ' + c.s + '"></div><div style="position:absolute;left:22px;top:22px;right:22px;bottom:22px;border:3px solid ' + c.p + '"></div><div style="position:absolute;left:29px;top:29px;right:29px;bottom:29px;border:1px solid ' + c.g + '"></div>';
    var orn = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:8px 0"><span style="width:170px;height:1.5px;background:' + c.p + '"></span><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="' + c.g + '"/></svg><span style="width:170px;height:1.5px;background:' + c.p + '"></span></div>';
    var u = function (w, v, extra) { return '<b style="display:inline-block;min-width:' + w + 'px;border-bottom:1px solid ' + c.p + ';color:' + c.d + ';' + (extra || '') + '">' + v + '</b>'; };
    var head = '<div style="padding:46px 64px 0;text-align:center"><div style="display:flex;justify-content:center">' + logo(54, c.p) + '</div>'
      + '<div class="serif" style="font-size:36px;color:' + c.p + ';margin-top:6px">Vocabulary Examination</div>'
      + '<div class="kserif" style="font-size:13.5px;color:' + c.t + ';margin-top:2px">' + esc((x.sub ? x.sub + ' · ' : '') + x.title) + ' · ' + (isSA ? '주관식' : '객관식') + '</div>' + orn
      + '<div class="kserif" style="display:flex;justify-content:center;align-items:center;gap:26px;font-size:12.5px;color:' + c.t + ';margin-top:2px"><span>성명 ' + u(96, esc(x.name), 'font-size:14px') + '</span><span>응시일 ' + u(70, x.dateDot) + '</span><span>점수 ' + u(70, '/ ' + x.total, 'color:#B9AA9A;font-weight:400;text-align:right') + '</span><span style="color:#fff;background:' + c.p + ';padding:2px 10px;border-radius:999px;font-size:11.5px">통과 ' + x.cut + '점</span></div></div>';
    var body;
    if (isSA) {
      body = '<div style="padding:12px 64px 0"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:26px;grid-auto-flow:column;grid-template-rows:repeat(10,auto)">'
        + x.items.map(function (it) { return '<div style="height:76px;display:flex;flex-direction:column;justify-content:space-between;padding:10px 4px 9px;border-bottom:1px solid ' + c.l + '"><div style="display:flex;align-items:baseline;gap:7px"><span class="serif" style="font-size:14px;color:' + c.p + ';width:20px;flex:none">' + it.no + '</span><span class="bask" style="font-size:' + wfs(it.en, 14.5, 12) + 'px;color:' + c.d + ';font-weight:700;line-height:1.15">' + esc(it.en) + '</span></div><span style="margin-left:27px;border-bottom:1px dotted ' + c.a + ';height:1px"></span></div>'; }).join('') + '</div></div>';
    } else {
      var ns = function (j) { return '<span style="color:' + c.p + ';flex:none">' + CIR[j] + '</span>'; };
      var item = function (it) { return '<div style="padding:12px 0 13px;border-bottom:1px solid ' + c.l + '"><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><span class="serif" style="font-size:16px;color:' + c.p + ';width:22px">' + it.no + '</span><span class="bask" style="font-weight:700;font-size:' + wfs(it.en, 15.5, 13) + 'px;color:' + c.d + '">' + esc(it.en) + '</span></div><div class="kserif" style="color:' + c.t + '">' + chGrid(it.choices, ns, 12, 17, '5px 12px', '0 0 0 30px') + '</div></div>'; };
      var mc = cols2(x.items, PER.mc);
      body = '<div style="padding:6px 64px 0"><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px"><div>' + mc[0].map(item).join('') + '</div><div>' + mc[1].map(item).join('') + '</div></div></div>';
    }
    var foot = '<div class="kserif" style="position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:10.5px;color:' + c.p + ';letter-spacing:.06em">너의 꾸준함과 우리의 치열함이 기적을 이루길 · 멘토즈 스터디카페 울산송정점' + x.pageTxt + '</div>';
    return '<div class="pg" style="background:' + c.tint + '">' + frame + head + body + foot + '</div>';
  }

  /* ================= 정답지 ================= */
  function keyPage(x) {
    var c = x.c, isMC = x.type === 'mc';
    var nc = isMC ? 2 : 3, per = Math.ceil(x.items.length / nc), cols = [];
    for (var ci = 0; ci < nc; ci++) cols.push(x.items.slice(per * ci, per * (ci + 1)));
    var row = function (it) { return '<div style="display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid ' + c.l + ';font-size:11.5px;line-height:1.35"><b class="inter" style="width:22px;color:' + c.a + ';flex:none;text-align:right">' + it.no + '</b><span class="bask" style="width:' + (isMC ? 130 : 100) + 'px;flex:none;font-weight:700;color:' + c.d + ';font-size:' + (it.en.length > 14 ? 10 : 11.5) + 'px">' + esc(it.en) + '</span><span style="color:#3A3030">' + (isMC ? '<b style="color:' + c.p + '">' + CIR[it.ans] + '</b> ' : '') + esc(it.ko) + '</span></div>'; };
    return '<div class="pg"><div style="padding:44px 48px 0"><div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ' + c.p + ';padding-bottom:10px">'
      + '<div style="display:flex;align-items:flex-end;gap:14px"><div class="serif" style="font-size:38px;line-height:.86;color:' + c.p + '">Answer<br><i style="color:' + c.a + '">Key.</i></div><div style="font-size:12px;color:' + c.t + ';line-height:1.5"><b style="font-size:16px;color:' + c.d + '">' + esc(x.title) + '</b><br>' + (isMC ? '객관식' : '주관식') + ' ' + x.items.length + '문항 · 커트 ' + x.cut + (x.shuffleNote ? ' · ' + x.shuffleNote : '') + '</div></div>' + logo(48, c.p) + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(' + nc + ',minmax(0,1fr));column-gap:24px;margin-top:14px">' + cols.map(function (cl) { return '<div>' + cl.map(row).join('') + '</div>'; }).join('') + '</div></div>'
      + '<div style="position:absolute;left:48px;right:48px;bottom:28px;font-size:9.5px;color:' + c.t + ';display:flex;justify-content:space-between"><span>정답지 · 선생님용</span><span>멘토즈 스터디카페 울산송정점</span></div></div>';
  }

  var FN = { A: A, C: Cc, D: Dd, F: Ff, G: Gg };

  /* 한 학생(또는 빈 이름) 분량의 페이지들 */
  function sheetPages(o, items, name) {
    var per = PER[o.type], pages = Math.max(1, Math.ceil(items.length / per)), out = [];
    for (var p = 0; p < pages; p++) {
      var its = items.slice(p * per, (p + 1) * per);
      var lo = its.length ? its[0].no : 0, hi = its.length ? its[its.length - 1].no : 0;
      out.push(FN[o.design]({
        c: PAL[o.pal] || PAL['버건디'], type: o.type, title: o.title, sub: o.sub, num: o.num, date: o.date, dateDot: o.date ? mdDot(o.date) : '',
        name: name || '', total: items.length, cut: o.cut, items: its,
        pageTxt: pages > 1 ? ' · ' + (p + 1) + ' / ' + pages : '',
        rangeTxt: pages > 1 ? lo + '~' + hi + '번' + (p < pages - 1 ? ' · 다음 장에 이어서' : '') : items.length + '문항'
      }));
    }
    return out;
  }
  function buildDoc(o) {
    var names = o.names && o.names.length ? o.names : [''];
    var copies = o.names && o.names.length ? 1 : Math.max(1, o.copies || 1);
    var pages = [], keyItems = null;
    names.forEach(function (nm, si) {
      var seed = o.perStudent ? hash(o.testId + '|' + nm + '|' + si) : hash(o.testId + '|base');
      var items = buildItems(o.words, o.type, { shuffle: o.shuffle, extraPool: o.extraPool }, seed);
      for (var k = 0; k < copies; k++) pages = pages.concat(sheetPages(o, items, nm));
      if (o.withKey) {
        if (o.perStudent && o.shuffle && names.length > 1) pages.push(keyPage({ c: PAL[o.pal], type: o.type, title: o.title, cut: o.cut, items: items, shuffleNote: nm ? nm + ' 학생용' : '' }));
        else if (!keyItems) keyItems = items;
      }
    });
    if (keyItems) pages.push(keyPage({ c: PAL[o.pal], type: o.type, title: o.title, cut: o.cut, items: keyItems }));
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(o.title) + ' 시험지</title><base href="' + location.origin + '/">' + FONTS + '<style>' + baseCss() + '</style></head><body>' + pages.join('') + '</body></html>';
  }
  WT.printBuild = buildDoc;
  WT.printPalettes = PAL;
  WT._pr = { PAL: PAL, baseCss: baseCss, FONTS: FONTS, logo: logo, doPrint: function (h, b) { return doPrint(h, b); }, mdDot: mdDot };
  WT.printDesigns = DESIGNS;

  /* ---------- 인쇄 실행 (숨긴 iframe) ---------- */
  function doPrint(html, btn) {
    var old = document.getElementById('wt-print-frame'); if (old) old.remove();
    var fr = document.createElement('iframe'); fr.id = 'wt-print-frame';
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1';
    document.body.appendChild(fr);
    var d = fr.contentDocument; d.open(); d.write(html); d.close();
    var w = fr.contentWindow, done = false;
    var go = function () {
      if (done) return; done = true;
      var imgs = [].slice.call(d.querySelectorAll('.mlogo'));
      setTimeout(function () { try { w.focus(); w.print(); } catch (e) { U.toast('인쇄 창을 열지 못했어요'); } if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.lbl; } }, imgs.length ? 350 : 50);
    };
    var fontsReady = (d.fonts && d.fonts.ready) ? d.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { if (d.readyState === 'complete') go(); else w.addEventListener('load', go); setTimeout(go, 2500); });
  }

  /* ---------- 설정 저장 (계정) ---------- */
  function prefGet() {
    var p = null; try { var me = ME(); p = me && me.profile && me.profile.wtPrint; } catch (e) { }
    if (!p) { try { p = JSON.parse(localStorage.getItem('wt_print_v1') || 'null'); } catch (e) { } }
    return p || {};
  }
  function prefSave(p) {
    try { localStorage.setItem('wt_print_v1', JSON.stringify(p)); } catch (e) { }
    try { var me = ME(); if (me && me.uid) { if (me.profile) me.profile.wtPrint = p; F().updateDoc(F().doc(F().db, 'users', me.uid), { wtPrint: p }).catch(function () { }); } } catch (e) { }
  }

  /* ---------- 인쇄 창 ---------- */
  /* opts: { test, folderName, students:[{uid,name}], pickStudents:fn(sel,cb), assignDate, presetUids, extraPool } */
  WT.openPrint = function (opts) {
    var t = opts.test; if (!t) return;
    var words = (t.words || []).filter(function (w) { return w && w.en && w.ko; });
    if (!words.length) { U.toast('단어가 없는 시험이에요'); return; }
    var pf = prefGet();
    var st = {
      design: pf.design || 'A', pal: pf.pal || null, type: t.type === 'sa' ? 'sa' : 'mc', shuffle: pf.shuffle !== false, withKey: pf.withKey !== false,
      perStudent: !!pf.perStudent, sel: (opts.presetUids || []).slice(), copies: 1, date: opts.assignDate || U.todayStr()
    };
    var dsg = function () { for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].k === st.design) return DESIGNS[i]; return DESIGNS[0]; };
    if (!st.pal || !PAL[st.pal]) st.pal = dsg().pal;
    if (!document.getElementById('wt-pr-css')) { var cs = document.createElement('style'); cs.id = 'wt-pr-css'; cs.textContent = '@media (max-width:900px){.wt-pr-grid{grid-template-columns:minmax(0,1fr)!important}.wt-pr-grid>div:last-child{position:static!important;align-items:center}}'; document.head.appendChild(cs); }
    var m = U.modal({ title: '시험지 인쇄 · ' + t.title, eyebrow: 'PRINT', width: 1060 });
    var SC = 0.42;
    function cutN() { return WT.cutCount ? WT.cutCount(words.length, t) : Math.ceil(words.length * (t.cutPct != null ? t.cutPct : 80) / 100); }
    function names() { return st.sel.map(function (u) { var s = (opts.students || []).filter(function (x) { return x.uid === u; })[0]; return s ? s.name : ''; }).filter(Boolean); }
    function docOpts(preview) {
      return { design: st.design, pal: st.pal, type: st.type, title: t.title, sub: opts.folderName || '', num: numOf(t.title), date: st.date, cut: cutN(), words: words, testId: t.id, shuffle: st.shuffle, withKey: preview ? false : st.withKey, perStudent: st.perStudent, names: preview ? names().slice(0, 1) : names(), copies: preview ? 1 : st.copies, extraPool: opts.extraPool || [] };
    }
    function pageCount() { var per = PER[st.type], n = Math.ceil(words.length / per); var nm = names().length || st.copies; return n * nm + (st.withKey ? (st.perStudent && st.shuffle && names().length > 1 ? names().length : 1) : 0); }
    var lab = function (s) { return '<span style="font-size:12px;font-weight:800;color:#5A4848">' + s + '</span>'; };
    function draw() {
      var dz = DESIGNS.map(function (d) { var on = d.k === st.design; return '<button type="button" data-ds="' + d.k + '" class="' + (on ? 'p' : 's') + '" style="height:auto;padding:9px 10px;border-radius:12px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;min-width:0"><b style="font-size:12.5px">' + d.k + ' · ' + esc(d.name) + '</b><span style="font-size:10.5px;opacity:.75;font-weight:500">' + esc(d.desc) + '</span></button>'; }).join('');
      var pz = Object.keys(PAL).map(function (k) { var on = k === st.pal; return '<button type="button" data-pal="' + esc(k) + '" aria-label="' + esc(k) + '" aria-pressed="' + on + '" style="display:flex;align-items:center;gap:7px;height:36px;padding:0 12px 0 6px;border-radius:18px;border:0;cursor:pointer;background:' + (on ? '#fff' : 'transparent') + ';box-shadow:' + (on ? '0 0 0 2px ' + PAL[k].p + ',0 4px 10px rgba(0,0,0,.08)' : 'inset 0 0 0 1px #E6DCD8') + ';font:700 12px \'Noto Sans KR\',sans-serif;color:#3A2A2A"><span style="width:24px;height:24px;border-radius:12px;background:linear-gradient(135deg,' + PAL[k].p + ' 0 55%,' + PAL[k].g + ' 55% 100%)"></span>' + esc(k) + '</button>'; }).join('');
      var tog = function (k, txt, sub) { var on = !!st[k]; return '<button type="button" data-tog="' + k + '" aria-pressed="' + on + '" style="display:flex;align-items:center;gap:10px;padding:8px 2px;border:0;background:none;cursor:pointer;text-align:left;font-family:inherit"><span style="width:38px;height:22px;border-radius:11px;flex:none;position:relative;background:' + (on ? '#7B1D1D' : '#E2D8D4') + ';transition:.15s"><span style="position:absolute;top:3px;left:' + (on ? 19 : 3) + 'px;width:16px;height:16px;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:.15s"></span></span><span class="col" style="gap:1px"><b style="font-size:12.5px;color:#1A1010">' + txt + '</b>' + (sub ? '<span style="font-size:10.5px;color:#8A7B7B">' + sub + '</span>' : '') + '</span></button>'; };
      var nm = names();
      m.body.innerHTML = '<div style="display:grid;grid-template-columns:minmax(0,1fr) ' + Math.round(794 * SC + 2) + 'px;gap:22px;align-items:start" class="wt-pr-grid">'
        + '<div class="col" style="gap:16px">'
        + '<div class="col" style="gap:8px">' + lab('디자인') + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">' + dz + '</div></div>'
        + '<div class="col" style="gap:8px">' + lab('색상') + '<div class="row" style="flex-wrap:wrap;gap:6px">' + pz + '</div></div>'
        + '<div class="row" style="gap:18px;flex-wrap:wrap;align-items:flex-start"><div class="col" style="gap:8px">' + lab('유형') + '<div class="well seg" style="display:inline-flex">' + [['mc', '객관식'], ['sa', '주관식']].map(function (x) { return '<button type="button" data-ty="' + x[0] + '" class="' + (st.type === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>'
        + '<label class="col" style="gap:8px">' + lab('응시일') + '<input type="date" class="inp" id="wt-pr-date" value="' + esc(st.date) + '" style="height:38px;padding:0 10px;font-size:13px"></label></div>'
        + '<div class="col" style="gap:8px">' + lab('이름 인쇄') + '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        + (nm.length ? '<span style="font-size:12.5px;flex:1;min-width:0;line-height:1.6"><b style="color:#7B1D1D">' + nm.length + '명</b> · ' + esc(nm.slice(0, 8).join(', ')) + (nm.length > 8 ? ' 외 ' + (nm.length - 8) + '명' : '') + '</span>'
          : '<span style="font-size:12.5px;color:#8A7B7B;flex:1">이름 칸을 비워서</span><span class="row" style="gap:6px;font-size:12.5px">매수 <button type="button" class="ib" data-cp="-1" aria-label="한 장 줄이기" style="width:30px;height:30px">−</button><b style="min-width:22px;text-align:center">' + st.copies + '</b><button type="button" class="ib" data-cp="1" aria-label="한 장 늘리기" style="width:30px;height:30px">+</button></span>')
        + '<button type="button" class="s" data-pick style="height:34px;padding:0 12px;font-size:12px">' + (nm.length ? '학생 바꾸기' : '학생 고르기') + '</button>' + (nm.length ? '<button type="button" class="s" data-clear style="height:34px;padding:0 12px;font-size:12px">비우기</button>' : '') + '</div></div>'
        + '<div class="col" style="gap:2px">' + tog('shuffle', '문항 순서 섞기', '시험 화면처럼 순서를 섞어서 인쇄해요') + (st.shuffle && nm.length > 1 ? tog('perStudent', '학생마다 다른 순서', '옆 사람과 순서가 달라요 · 정답지도 학생별로') : '') + tog('withKey', '정답지 포함', '맨 뒤에 선생님용 정답지 1장') + '</div>'
        + '</div>'
        + '<div class="col" style="gap:8px;position:sticky;top:0"><div class="row" style="justify-content:space-between">' + lab('미리보기') + '<span style="font-size:11px;color:#8A7B7B">첫 장 · 전체 ' + pageCount() + '장</span></div>'
        + '<div style="width:' + Math.round(794 * SC) + 'px;height:' + Math.round(1123 * SC) + 'px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px #E6DCD8,0 8px 22px rgba(60,20,20,.12);background:#fff;position:relative"><iframe id="wt-pr-prev" title="시험지 미리보기" style="width:794px;height:1123px;border:0;transform:scale(' + SC + ');transform-origin:0 0;pointer-events:none;background:#fff"></iframe></div></div>'
        + '</div>';
      m.foot.innerHTML = '<span style="font-size:12px;color:#8A7B7B;margin-right:auto">' + words.length + '문항 · ' + (st.type === 'sa' ? '주관식 한 장 30문항' : '객관식 한 장 14문항') + ' · 인쇄 창에서 <b>배경 그래픽</b>을 켜 주세요</span>'
        + '<button type="button" class="s" data-n style="height:42px;padding:0 18px">닫기</button><button type="button" class="p" data-go data-lbl="인쇄하기 · ' + pageCount() + '장" style="height:42px;padding:0 22px">인쇄하기 · ' + pageCount() + '장</button>';
      bind(); preview();
    }
    var pvT = null;
    function preview() {
      clearTimeout(pvT);
      pvT = setTimeout(function () {
        var fr = m.body.querySelector('#wt-pr-prev'); if (!fr) return;
        var html = buildDoc(docOpts(true)).replace('@media screen{body{background:#E9E5E1}.pg{margin:16px auto;box-shadow:0 4px 18px rgba(0,0,0,.18)}}', '');
        fr.srcdoc = html;
      }, 60);
    }
    function save() { prefSave({ design: st.design, pal: st.pal, shuffle: st.shuffle, withKey: st.withKey, perStudent: st.perStudent }); }
    function bind() {
      var b = m.body;
      b.querySelectorAll('[data-ds]').forEach(function (x) { x.onclick = function () { var prevDef = dsg().pal; st.design = x.dataset.ds; if (st.pal === prevDef && !pf.pal) st.pal = dsg().pal; save(); draw(); }; });
      b.querySelectorAll('[data-pal]').forEach(function (x) { x.onclick = function () { st.pal = x.dataset.pal; pf.pal = st.pal; save(); draw(); }; });
      b.querySelectorAll('[data-ty]').forEach(function (x) { x.onclick = function () { st.type = x.dataset.ty; draw(); }; });
      b.querySelectorAll('[data-tog]').forEach(function (x) { x.onclick = function () { st[x.dataset.tog] = !st[x.dataset.tog]; save(); draw(); }; });
      b.querySelectorAll('[data-cp]').forEach(function (x) { x.onclick = function () { st.copies = Math.max(1, Math.min(60, st.copies + (+x.dataset.cp))); draw(); }; });
      var dt = b.querySelector('#wt-pr-date'); dt.onchange = function () { st.date = dt.value; preview(); };
      var pk = b.querySelector('[data-pick]'); pk.onclick = function () { if (!opts.pickStudents) return; opts.pickStudents(st.sel.slice(), function (sel) { st.sel = sel; draw(); }); };
      var cl = b.querySelector('[data-clear]'); if (cl) cl.onclick = function () { st.sel = []; draw(); };
      m.foot.querySelector('[data-n]').onclick = m.close;
      var go = m.foot.querySelector('[data-go]');
      go.onclick = function () { go.disabled = true; go.textContent = '준비 중…'; doPrint(buildDoc(docOpts(false)), go); };
    }
    draw();
  };
})();
