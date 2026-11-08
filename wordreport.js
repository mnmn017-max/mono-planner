/* MONO PLANNER · 단어 Test 성적표 인쇄 (wordreport.js)
 * 단일 시험: S1 결과 통지표 · S2 채점된 답안지 · S3 요약 카드+오답 노트 · S4 반 전체 결과표(선생님용)
 * 기간 종합: R1 매거진 리포트 · R2 대시보드 카드 · R3 학부모 안내 레터 · R4 달력+사이드 통계
 * 색상 5종, 선생님 의견 입력, 미리보기, 설정은 계정(users.wtReport)에 저장
 */
(function () {
  'use strict';
  var WT = window.WT; if (!WT || !WT._pr) return;
  var U = WT._u, esc = U.esc, PR = WT._pr, PAL = PR.PAL;
  var F = function () { return window.MP_FB; };
  var ME = function () { return F().me(); };
  var FAIL = '#C0392B', OKC = '#1B6B3A';
  var CATCH = '너의 꾸준함과 우리의 치열함이 기적을 이루길';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  var MODES = [
    { k: 'single', name: '시험 1회 · 학생', desc: '학생 한 명의 시험 결과', designs: [['S1', '결과 통지표', '문항별 ○✕ 채점'], ['S2', '채점된 답안지', '손글씨 채점 느낌'], ['S3', '요약 카드 + 오답 노트', '틀린 단어 3번 쓰기']] },
    { k: 'class', name: '시험 1회 · 반 전체', desc: '선생님용 반 결과표', designs: [['S4', '반 전체 결과표', '분포 · 많이 틀린 단어']] },
    { k: 'sum', name: '기간 종합', desc: '여러 시험을 모아서', designs: [['R1', '매거진 리포트', '추이선 · 회차별 표'], ['R2', '대시보드 카드', '도넛 · 막대 · 주간 기록'], ['R3', '학부모 안내 레터', '문장으로 풀어 쓴 공문'], ['R4', '달력 + 사이드 통계', '날짜별 결과 달력']] }
  ];
  var DEF_PAL = { S1: '버건디', S2: '네이비', S3: '포레스트', S4: '차콜 골드', R1: '버건디', R2: '네이비', R3: '버건디', R4: '포레스트' };

  /* ---------- 유틸 ---------- */
  function tsMs(t) { return U.tsMs(t); }
  function fmt(s) { return U.fmtSec(s || 0); }
  function mdKo(s) { if (!s) return ''; var d = U.parseYmd(s); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + ')'; }
  function dotDate(s) { if (!s) return ''; var p = s.split('-'); return p[0] + '. ' + (+p[1]) + '. ' + (+p[2]); }
  function md(s) { if (!s) return ''; var p = s.split('-'); return (+p[1]) + '.' + p[2]; }
  function numOf(title) { var m = String(title || '').match(/(\d+)\s*(일차|회|강|day)?\s*$/i); return m ? (m[1].length < 2 ? '0' + m[1] : m[1]) : ''; }
  function first(s) { return String(s || '').split(/[,;·]/)[0].trim(); }
  function logo(sz, col) { return PR.logo(sz, col); }
  function wfs(w, a, b) { return String(w).length < 14 ? a : (String(w).length < 22 ? b : b - 1.5); }
  function avgOf(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function pct(r) { return r.total ? r.score / r.total : 0; }

  /* ---------- 데이터 ---------- */
  function firstResults(results) {   // assignId → 첫 결과 (재시험 제외)
    var m = {};
    results.slice().sort(function (a, b) { return tsMs(a.createdAt) - tsMs(b.createdAt); }).forEach(function (r) { if (r.kind === 'retest') return; if (r.assignId && !m[r.assignId]) m[r.assignId] = r; });
    return m;
  }
  function retestOf(ctx, r) {   // 그 시험의 재시험 결과 중 가장 좋은 것
    var ras = ctx.assigns.filter(function (a) { return a.kind === 'retest' && a.parentAssignId === r.assignId; }).map(function (a) { return a.id; });
    var rs = ctx.results.filter(function (x) { return ras.indexOf(x.assignId) >= 0; });
    if (!rs.length) return null;
    return rs.sort(function (a, b) { return (b.passed - a.passed) || (b.score - a.score); })[0];
  }
  function classOfTest(ctx, testId) {
    var fm = firstResults(ctx.results);
    var as = ctx.assigns.filter(function (a) { return a.testId === testId && a.kind !== 'retest'; });
    var seen = {}, rows = [];
    as.forEach(function (a) { if (seen[a.studentUid]) return; seen[a.studentUid] = 1; rows.push({ a: a, r: fm[a.id] || null, name: a.studentName || ctx.stuName(a.studentUid) }); });
    return rows;
  }
  function singleData(ctx, testId, uid) {
    var rows = classOfTest(ctx, testId);
    var me = rows.filter(function (x) { return x.a.studentUid === uid; })[0];
    if (!me || !me.r) return null;
    var r = me.r, done = rows.filter(function (x) { return x.r; });
    var sorted = done.slice().sort(function (a, b) { return b.r.score - a.r.score; });
    var rank = 1; for (var i = 0; i < sorted.length; i++) { if (sorted[i].r.score > r.score) rank++; }
    var cAvg = avgOf(done.map(function (x) { return x.r.score; }));
    var cTime = avgOf(done.map(function (x) { return x.r.timeSec || 0; }));
    var fm = firstResults(ctx.results);
    var mine = Object.keys(fm).map(function (k) { return fm[k]; }).filter(function (x) { return x.studentUid === uid && x.kind !== 'retest'; }).sort(function (a, b) { return tsMs(a.createdAt) - tsMs(b.createdAt); });
    var idx = mine.map(function (x) { return x.id; }).indexOf(r.id), prev = idx > 0 ? mine[idx - 1] : null;
    var t = ctx.testById(testId) || {};
    var nextA = ctx.assigns.filter(function (a) { return a.studentUid === uid && a.kind !== 'retest' && a.status === 'assigned' && a.date >= (r.date || ''); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0] || null;
    return { r: r, name: me.name, test: t, title: r.title || t.title || '', num: numOf(r.title || t.title), rank: rank, n: done.length, cAvg: cAvg, cTime: cTime, prev: prev, re: r.passed ? null : retestOf(ctx, r), answers: (r.answers || []).map(function (a, i) { return { n: i + 1, en: a.en, ko: a.ko, g: a.unknown ? '' : (a.given || ''), ok: !!a.ok }; }), next: nextA };
  }
  function sumData(ctx, uid, from, to) {
    var fm = firstResults(ctx.results);
    var T = Object.keys(fm).map(function (k) { return fm[k]; }).filter(function (r) { return r.studentUid === uid && (!from || r.date >= from) && (!to || r.date <= to); }).sort(function (a, b) { return (a.date < b.date ? -1 : a.date > b.date ? 1 : tsMs(a.createdAt) - tsMs(b.createdAt)); });
    T = T.map(function (r, i) { var re = r.passed ? null : retestOf(ctx, r); return { n: i + 1, r: r, d: r.date, s: r.score, tot: r.total, cut: r.cut, ok: r.passed, re: re ? re.score : null, reOk: re ? re.passed : false, sec: r.timeSec || 0, kind: r.kind, type: r.type, title: r.title }; });
    var all = ctx.results.filter(function (r) { return r.studentUid === uid && (!from || r.date >= from) && (!to || r.date <= to); });
    var cnt = {}, ko = {}; all.forEach(function (r) { (r.answers || []).forEach(function (a) { if (!a.ok) { cnt[a.en] = (cnt[a.en] || 0) + 1; ko[a.en] = a.ko; } }); });
    var miss = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 12).map(function (k) { return [k, first(ko[k]), cnt[k]]; });
    var passN = T.filter(function (x) { return x.ok; }).length, reN = T.length - passN, reOkN = T.filter(function (x) { return !x.ok && x.reOk; }).length;
    var avgP = avgOf(T.map(function (x) { return x.tot ? x.s / x.tot * 30 : 0; }));
    return { T: T, miss: miss, passN: passN, reN: reN, reOkN: reOkN, avg30: avgP, avgRaw: avgOf(T.map(function (x) { return x.s; })), avgSec: avgOf(T.map(function (x) { return x.sec; })), last5: avgOf(T.slice(-5).map(function (x) { return x.s; })), first5: avgOf(T.slice(0, 5).map(function (x) { return x.s; })), from: from || (T[0] && T[0].d), to: to || (T.length && T[T.length - 1].d) };
  }

  /* ---------- 차트 ---------- */
  function lineChart(T, w, h, col, cutcol, grid, fill) {
    var pl = 30, pr = 10, pt = 12, pb = 22, n = T.length;
    if (!n) return '';
    var X = function (i) { return n === 1 ? (pl + w - pr) / 2 : pl + (w - pl - pr) * i / (n - 1); };
    var Y = function (p) { return pt + (h - pt - pb) * (1 - (p - 40) / 60); };   // 40~100%
    var P = function (x) { return x.tot ? x.s / x.tot * 100 : 0; };
    var cutP = avgOf(T.map(function (x) { return x.tot ? x.cut / x.tot * 100 : 80; }));
    var pts = T.map(function (x, i) { return X(i).toFixed(1) + ',' + Y(Math.max(40, P(x))).toFixed(1); }).join(' ');
    var g = [40, 60, 80, 100].map(function (v) { return '<line x1="' + pl + '" y1="' + Y(v).toFixed(1) + '" x2="' + (w - pr) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + grid + '"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end" font-size="9" fill="#8A8A8A" font-family="Inter">' + v + '</text>'; }).join('');
    var step = Math.max(1, Math.ceil(n / 12));
    var xl = T.map(function (x, i) { return (i % step === 0 || i === n - 1) ? '<text x="' + X(i).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="8.5" fill="#8A8A8A" font-family="Inter">' + x.n + '</text>' : ''; }).join('');
    var cut = '<line x1="' + pl + '" y1="' + Y(cutP).toFixed(1) + '" x2="' + (w - pr) + '" y2="' + Y(cutP).toFixed(1) + '" stroke="' + cutcol + '" stroke-width="1.4" stroke-dasharray="5 4"/><text x="' + (w - pr) + '" y="' + (Y(cutP) - 5).toFixed(1) + '" text-anchor="end" font-size="9" font-weight="700" fill="' + cutcol + '" font-family="Noto Sans KR">커트</text>';
    var area = fill && n > 1 ? '<polygon points="' + X(0).toFixed(1) + ',' + Y(40) + ' ' + pts + ' ' + X(n - 1).toFixed(1) + ',' + Y(40) + '" fill="' + fill + '" opacity=".16"/>' : '';
    var dots = T.map(function (x, i) { return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(Math.max(40, P(x))).toFixed(1) + '" r="3.6" fill="' + (x.ok ? '#fff' : FAIL) + '" stroke="' + (x.ok ? col : FAIL) + '" stroke-width="2"/>'; }).join('');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="회차별 정답률 추이">' + g + area + cut + (n > 1 ? '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>' : '') + dots + xl + '</svg>';
  }
  function barChart(T, w, h, col, cutcol, grid) {
    var pl = 26, pr = 6, pt = 10, pb = 20, n = Math.max(1, T.length), bw = (w - pl - pr) / n;
    var Y = function (p) { return pt + (h - pt - pb) * (1 - p / 100); };
    var g = [0, 50, 100].map(function (v) { return '<line x1="' + pl + '" y1="' + Y(v).toFixed(1) + '" x2="' + (w - pr) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + grid + '"/><text x="' + (pl - 5) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="#8A8A8A" font-family="Inter">' + v + '</text>'; }).join('');
    var step = Math.max(1, Math.ceil(n / 16));
    var b = T.map(function (x, i) { var p = x.tot ? x.s / x.tot * 100 : 0; return '<rect x="' + (pl + bw * i + bw * .18).toFixed(1) + '" y="' + Y(p).toFixed(1) + '" width="' + Math.max(2, bw * .64).toFixed(1) + '" height="' + (Y(0) - Y(p)).toFixed(1) + '" rx="2.5" fill="' + (x.ok ? col : FAIL) + '"/>' + ((i % step === 0 || i === n - 1) ? '<text x="' + (pl + bw * i + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="8" fill="#8A8A8A" font-family="Inter">' + x.n + '</text>' : ''); }).join('');
    var cutP = avgOf(T.map(function (x) { return x.tot ? x.cut / x.tot * 100 : 80; }));
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="회차별 정답률">' + g + b + '<line x1="' + pl + '" y1="' + Y(cutP).toFixed(1) + '" x2="' + (w - pr) + '" y2="' + Y(cutP).toFixed(1) + '" stroke="' + cutcol + '" stroke-width="1.4" stroke-dasharray="5 4"/></svg>';
  }
  function donut(sz, p, col, bg) { var r = sz / 2 - 9, L = 2 * Math.PI * r; return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 ' + sz + ' ' + sz + '" aria-hidden="true"><circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + bg + '" stroke-width="12"/><circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (L * p).toFixed(1) + ' ' + L.toFixed(1) + '" transform="rotate(-90 ' + sz / 2 + ' ' + sz / 2 + ')"/></svg>'; }
  function gauge(sz, p, col, bg) { var r = sz / 2 - 12, L = Math.PI * r; return '<svg width="' + sz + '" height="' + (sz / 2 + 8) + '" viewBox="0 0 ' + sz + ' ' + (sz / 2 + 8) + '" aria-hidden="true"><path d="M12 ' + sz / 2 + ' A' + r + ' ' + r + ' 0 0 1 ' + (sz - 12) + ' ' + sz / 2 + '" fill="none" stroke="' + bg + '" stroke-width="14" stroke-linecap="round"/><path d="M12 ' + sz / 2 + ' A' + r + ' ' + r + ' 0 0 1 ' + (sz - 12) + ' ' + sz / 2 + '" fill="none" stroke="' + col + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (L * p).toFixed(1) + ' ' + L.toFixed(1) + '"/></svg>'; }

  var SER = 'font-family:\'DM Serif Display\',serif;';
  function secHead(c, en, ko) { return '<span style="' + SER + 'font-size:17px;color:' + c.p + '">' + en + ' <span style="font-family:\'Noto Sans KR\';font-size:11.5px;color:' + c.t + '">' + ko + '</span></span>'; }

  /* ================= S1 결과 통지표 ================= */
  function S1(x) {
    var c = x.c, r = x.r, A = x.answers, nR = Math.ceil(A.length / 2), rh = Math.max(20, Math.min(38, Math.floor(560 / Math.max(1, nR)))), fs = rh >= 30 ? 12.5 : 11;
    var row = function (a) { return '<div style="display:flex;align-items:center;gap:8px;height:' + rh + 'px;border-bottom:1px solid ' + c.l + ';font-size:' + fs + 'px;' + (a.ok ? '' : 'background:#FDF1EF;') + '"><span style="' + SER + 'width:22px;text-align:right;color:' + c.a + ';font-size:12.5px">' + a.n + '</span><span style="width:20px;text-align:center;font-weight:900;font-size:13px;color:' + (a.ok ? OKC : FAIL) + '">' + (a.ok ? '○' : '✕') + '</span><span class="bask" style="width:112px;font-weight:700;color:' + c.d + ';font-size:' + wfs(a.en, 12, 10) + 'px;line-height:1.1">' + esc(a.en) + '</span><span style="flex:1;min-width:0;color:' + (a.ok ? '#3A3030' : FAIL) + ';' + (a.ok ? '' : 'text-decoration:line-through;') + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (a.g ? esc(a.g) : '<i style="color:#B9A9A3;text-decoration:none">모름</i>') + '</span>' + (a.ok ? '' : '<span style="color:' + OKC + ';font-weight:700;white-space:nowrap;font-size:11px">→ ' + esc(first(a.ko)) + '</span>') + '</div>'; };
    var kp = [['점수', r.score + '<span style="font-size:16px;color:' + c.t + '"> / ' + r.total + '</span>'], ['커트', r.cut], ['소요 시간', fmt(r.timeSec)], ['반 평균', x.n > 1 ? r1(x.cAvg) : '—'], ['반 등수', x.n > 1 ? x.rank + ' / ' + x.n : '—']];
    var wr = A.filter(function (a) { return !a.ok; });
    var stamp = r.passed ? ['통과', 'PASSED', OKC] : ['재시험', 'RETEST', FAIL];
    return '<div class="pg"><div style="padding:42px 50px 0">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ' + c.p + ';padding-bottom:10px"><div style="display:flex;align-items:flex-end;gap:14px"><div style="' + SER + 'font-size:42px;line-height:.86;color:' + c.p + '">Test<br><i style="color:' + c.a + '">Result.</i></div>' + (x.num ? '<div style="' + SER + 'font-size:58px;line-height:.8;color:' + c.p + '">' + x.num + '</div>' : '')
      + '<div style="font-size:11.5px;color:' + c.t + ';line-height:1.55;padding-bottom:2px"><b style="font-size:19px;color:' + c.d + ';font-weight:900">' + esc(x.name) + '</b><br>' + esc(x.title) + ' · ' + (r.type === 'sa' ? '주관식' : '객관식') + ' · ' + mdKo(r.date) + '</div></div>' + logo(54, c.p) + '</div>'
      + '<div style="display:flex;gap:18px;align-items:stretch;margin-top:16px"><div style="flex:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:' + c.s + '">' + kp.map(function (k, i) { return '<div style="padding:12px 14px;' + (i ? 'border-left:1px solid ' + c.m + ';' : '') + '"><div style="font-size:10.5px;color:' + c.t + ';font-weight:700">' + k[0] + '</div><div style="' + SER + 'font-size:' + (i ? 26 : 34) + 'px;color:' + c.p + ';line-height:1.1;margin-top:4px;white-space:nowrap">' + k[1] + '</div></div>'; }).join('') + '</div>'
      + '<div style="width:118px;display:flex;align-items:center;justify-content:center"><div style="width:104px;height:104px;border-radius:50%;border:3px double ' + stamp[2] + ';color:' + stamp[2] + ';display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-10deg)"><b class="kserif" style="font-size:' + (stamp[0].length > 2 ? 21 : 26) + 'px;letter-spacing:.1em">' + stamp[0] + '</b><span class="inter" style="font-size:9.5px;letter-spacing:.2em;font-weight:700">' + stamp[1] + '</span>' + (x.re ? '<span style="font-size:9px;font-weight:700;margin-top:2px">재시험 ' + x.re.score + '점</span>' : '') + '</div></div></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 4px">' + secHead(c, 'Answers', '문항별 채점 · 빨간 줄 = 틀린 답, 초록 = 정답') + '<span style="font-size:11px;color:' + c.t + '">○ ' + r.score + ' · ✕ ' + (r.total - r.score) + '</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:26px;border-top:1.4px solid ' + c.p + '"><div>' + A.slice(0, nR).map(row).join('') + '</div><div>' + A.slice(nR).map(row).join('') + '</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:16px"><div><div style="margin-bottom:6px">' + secHead(c, 'Review', '다시 볼 단어') + '</div><div style="border-top:1.4px solid ' + c.p + ';padding-top:8px;display:flex;flex-wrap:wrap;gap:6px">'
      + (wr.length ? wr.slice(0, 10).map(function (a) { return '<span style="border:1px solid ' + c.m + ';padding:5px 10px;font-size:11.5px"><b class="bask" style="color:' + c.d + '">' + esc(a.en) + '</b> <span style="color:' + c.t + '">' + esc(first(a.ko)) + '</span></span>'; }).join('') + (wr.length > 10 ? '<span style="font-size:11px;color:' + c.t + ';padding:5px 2px">외 ' + (wr.length - 10) + '개</span>' : '') : '<span style="font-size:12px;color:' + OKC + ';font-weight:700">모두 맞혔어요!</span>')
      + '</div>' + (wr.length ? '<div style="font-size:11px;color:' + c.t + ';margin-top:8px">틀린 단어는 다음 오답 모음 시험에 들어가요.</div>' : '') + '</div>'
      + '<div><div style="margin-bottom:6px">' + secHead(c, 'Comment', '선생님 의견') + '</div><div style="border-top:1.4px solid ' + c.p + ';padding-top:8px;font-size:11.5px;line-height:1.75;color:#3A3030;min-height:48px;white-space:pre-line">' + esc(x.comment) + '</div><div style="display:flex;justify-content:flex-end;gap:16px;margin-top:10px;font-size:10.5px;color:' + c.t + '"><span>담당 <b style="color:' + c.d + '">' + esc(x.teacher) + '</b></span><span>확인 <span style="display:inline-block;min-width:56px;border-bottom:1px solid ' + c.m + '"></span></span></div></div></div></div>'
      + '<div style="position:absolute;left:50px;right:50px;bottom:26px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점 · MONO PLANNER 단어 Test 결과표</span><span style="' + SER + 'font-style:italic;font-size:12px;color:' + c.a + '">' + CATCH + '</span></div></div>';
  }
  /* ================= S2 채점된 답안지 ================= */
  function S2(x) {
    var c = x.c, r = x.r, A = x.answers, nR = Math.ceil(A.length / 2), rh = Math.max(24, Math.min(50, Math.floor(720 / Math.max(1, nR)))), big = rh >= 40;
    var cell = function (a) {
      var mk = a.ok ? '<svg width="' + (big ? 40 : 30) + '" height="' + (big ? 40 : 30) + '" viewBox="0 0 40 40" style="position:absolute;left:-6px;top:' + (big ? 6 : 0) + 'px" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="none" stroke="' + FAIL + '" stroke-width="2.2" opacity=".85"/></svg>'
        : '<svg width="' + (big ? 44 : 32) + '" height="' + (big ? 44 : 32) + '" viewBox="0 0 44 44" style="position:absolute;left:-8px;top:' + (big ? 4 : -2) + 'px" aria-hidden="true"><path d="M8 36 L36 8" stroke="' + FAIL + '" stroke-width="2.6" stroke-linecap="round" opacity=".9"/></svg>';
      return '<div style="position:relative;display:flex;align-items:flex-end;height:' + rh + 'px;gap:8px;border-bottom:1px solid #E5E0DA;padding-left:4px">' + mk + '<span style="width:22px;font-size:13px;font-weight:700;color:#333;padding-bottom:' + (big ? 8 : 4) + 'px;position:relative">' + a.n + '.</span><span class="bask" style="width:120px;font-size:' + wfs(a.en, big ? 13.5 : 12, 11) + 'px;color:#222;padding-bottom:' + (big ? 8 : 4) + 'px;line-height:1.1">' + esc(a.en) + '</span><span style="flex:1;min-width:0;font-family:\'Nanum Pen Script\',cursive;font-size:' + (big ? 21 : 17) + 'px;color:#2A3A6A;padding-bottom:' + (big ? 4 : 1) + 'px;white-space:nowrap;overflow:hidden">' + (a.g ? esc(a.g) : '<span style="color:#9AA">—</span>') + (a.ok ? '' : '<span style="color:' + FAIL + ';font-size:' + (big ? 16 : 14) + 'px;margin-left:8px">' + esc(first(a.ko)) + '</span>') + '</span></div>';
    };
    return '<div class="pg"><div style="padding:38px 48px 0">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;gap:14px;align-items:center">' + logo(50, c.p) + '<div><div style="font-size:11px;color:' + c.t + ';letter-spacing:.2em;font-weight:700">GRADED ANSWER SHEET</div><div style="font-size:' + (x.title.length > 14 ? 20 : 24) + 'px;font-weight:900;color:' + c.d + ';margin-top:3px">' + esc(x.title) + ' · 채점 결과</div><div style="font-size:12px;color:' + c.t + ';margin-top:3px">' + (r.type === 'sa' ? '주관식' : '객관식') + ' ' + r.total + '문항 · 커트 ' + r.cut + ' · ' + dotDate(r.date) + ' 응시 · 소요 ' + fmt(r.timeSec) + '</div></div></div>'
      + '<div style="position:relative;width:150px;height:96px;border:1.5px solid ' + c.p + ';display:flex;flex-direction:column;justify-content:space-between;padding:8px 12px;flex:none"><span style="font-size:10.5px;color:' + c.t + ';font-weight:700">이름 <b style="color:' + c.d + ';font-size:15px;margin-left:6px">' + esc(x.name) + '</b></span><span style="font-family:\'Nanum Pen Script\',cursive;font-size:50px;color:' + FAIL + ';line-height:.8;text-align:right">' + r.score + '<span style="font-size:24px">/' + r.total + '</span></span></div></div>'
      + '<div style="height:2px;background:' + c.p + ';margin:14px 0 6px"></div><div style="font-size:11.5px;color:#666;display:flex;justify-content:space-between"><span>학생이 앱에 쓴 답을 그대로 옮겼어요 · <b style="color:' + FAIL + '">빨간 글씨</b> = 바른 뜻</span><span style="color:' + (r.passed ? OKC : FAIL) + ';font-weight:800">' + (r.passed ? '통과' : '재시험' + (x.re ? ' → ' + x.re.score + '점' : '')) + (x.n > 1 ? ' · 반 평균 ' + r1(x.cAvg) : '') + '</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px;margin-top:4px"><div>' + A.slice(0, nR).map(cell).join('') + '</div><div>' + A.slice(nR).map(cell).join('') + '</div></div>'
      + '<div style="margin-top:14px;display:flex;gap:16px;align-items:stretch"><div style="flex:1;border:1px dashed ' + c.m + ';border-radius:8px;padding:10px 14px;font-family:\'Nanum Pen Script\',cursive;font-size:20px;color:' + FAIL + ';line-height:1.25;min-height:46px;white-space:pre-line">' + esc(x.comment) + '</div><div style="width:150px;font-size:10.5px;color:' + c.t + ';display:flex;flex-direction:column;justify-content:space-between;gap:10px"><span>채점 <b style="color:' + c.d + '">' + esc(x.teacher) + '</b></span><span>학부모 확인 <span style="display:inline-block;width:60px;border-bottom:1px solid ' + c.m + '"></span></span></div></div></div>'
      + '<div style="position:absolute;left:48px;right:48px;bottom:24px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점</span><span>' + CATCH + '</span></div></div>';
  }
  /* ================= S3 요약 카드 + 오답 노트 ================= */
  function S3(x) {
    var c = x.c, r = x.r, A = x.answers, wr = A.filter(function (a) { return !a.ok; });
    var card = function (inner, extra) { return '<div style="background:#fff;border-radius:16px;box-shadow:0 0 0 1px ' + c.l + ',0 4px 14px rgba(30,20,20,.06);padding:16px 18px;' + (extra || '') + '">' + inner + '</div>'; };
    var stat = function (a, b, d) { return card('<div style="font-size:10.5px;color:' + c.t + ';font-weight:700">' + a + '</div><div class="inter" style="font-size:26px;font-weight:900;color:' + c.d + ';margin-top:4px;line-height:1;white-space:nowrap">' + b + '</div><div style="font-size:10.5px;color:' + c.g + ';font-weight:700;margin-top:6px">' + d + '</div>'); };
    var head = '<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:14px;align-items:center">' + logo(56, c.p) + '<div><div style="font-size:10.5px;letter-spacing:.24em;color:' + c.g + ';font-weight:800">WORD TEST · RESULT</div><div style="font-size:25px;font-weight:900;color:' + c.d + ';margin-top:3px">' + esc(x.name) + ' <span style="font-size:15px;color:' + c.t + ';font-weight:700">· ' + esc(x.title) + '</span></div><div style="font-size:11.5px;color:' + c.t + ';margin-top:2px">' + dotDate(r.date) + ' (' + DOW[U.parseYmd(r.date).getDay()] + ') · ' + (r.type === 'sa' ? '주관식' : '객관식') + ' ' + r.total + '문항</div></div></div><span style="padding:8px 16px;border-radius:999px;background:' + (r.passed ? OKC : FAIL) + ';color:#fff;font-weight:800;font-size:14px;white-space:nowrap">' + (r.passed ? '통과' : '재시험') + '</span></div>';
    var diff = r.score - r.cut;
    var g = card('<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="position:relative;width:200px;height:108px">' + gauge(200, pct(r), c.p, c.s) + '<div style="position:absolute;left:0;right:0;bottom:2px;text-align:center"><b class="inter" style="font-size:40px;color:' + c.d + ';line-height:1">' + r.score + '</b><span style="font-size:15px;color:' + c.t + '"> / ' + r.total + '</span></div></div><span style="font-size:11.5px;color:' + c.t + '">커트 ' + r.cut + '점' + (diff >= 0 ? '보다 <b style="color:' + OKC + '">+' + diff + '</b>' : '까지 <b style="color:' + FAIL + '">' + (-diff) + '개</b>') + '</span></div>');
    var prevTxt = x.prev ? x.prev.score + ' → ' + r.score : '첫 시험', prevSub = x.prev ? (r.score - x.prev.score >= 0 ? '▲ ' + (r.score - x.prev.score) + '점' : '▼ ' + (x.prev.score - r.score) + '점') : '';
    var top = '<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:12px;margin-top:18px"><div style="grid-row:span 2">' + g + '</div>' + stat('반 등수', x.n > 1 ? x.rank + ' / ' + x.n : '—', x.n > 1 ? '상위 ' + Math.max(1, Math.round(x.rank / x.n * 100)) + '%' : '') + stat('소요 시간', fmt(r.timeSec), x.n > 1 ? '반 평균 ' + fmt(x.cTime) : '') + stat('지난 시험', prevTxt, prevSub) + stat('반 평균', x.n > 1 ? r1(x.cAvg) : '—', x.n > 1 ? '내 점수 ' + (r.score - x.cAvg >= 0 ? '+' : '') + r1(r.score - x.cAvg) : '') + '</div>';
    var perRow = Math.min(30, A.length);
    var strip = '<div style="display:grid;grid-template-columns:repeat(' + perRow + ',minmax(0,1fr));gap:3px;margin-top:10px">' + A.map(function (a) { return '<span class="inter" style="height:24px;border-radius:4px;background:' + (a.ok ? c.p : FAIL) + ';color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center">' + a.n + '</span>'; }).join('') + '</div>';
    var sc = card('<div style="display:flex;justify-content:space-between"><b style="font-size:13.5px;color:' + c.d + '">문항별 결과</b><span style="font-size:10.5px;color:' + c.t + '"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + c.p + ';margin-right:4px"></span>맞음　<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + FAIL + ';margin-right:4px"></span>틀림</span></div>' + strip, 'margin-top:12px');
    var nRows = Math.ceil(A.length / 30), room = 560 - (nRows - 1) * 27, per = wr.length ? Math.max(48, Math.min(96, Math.floor(room / wr.length))) : 0, show = wr.length ? Math.min(wr.length, Math.floor(room / 48)) : 0;
    var note = wr.slice(0, show).map(function (a) { return '<div style="display:grid;grid-template-columns:160px 1fr;gap:16px;height:' + per + 'px;align-items:center;border-bottom:1px solid ' + c.l + '"><div><div class="bask" style="font-weight:700;font-size:' + wfs(a.en, 15.5, 12.5) + 'px;color:' + c.d + '">' + esc(a.en) + '</div><div style="font-size:12px;color:' + OKC + ';font-weight:700;margin-top:2px">' + esc(first(a.ko)) + '</div>' + (per >= 70 ? '<div style="font-size:10.5px;color:' + FAIL + ';margin-top:2px">내 답 · ' + esc(a.g || '모름') + '</div>' : '') + '</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-self:stretch;align-items:end;padding-bottom:10px">' + ('<span style="border-bottom:1.5px dashed ' + c.m + ';height:24px"></span>').repeat(3) + '</div></div>'; }).join('');
    var nb = card('<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:13.5px;color:' + c.d + '">오답 노트 · 세 번씩 써 보기</b><span style="font-size:10.5px;color:' + c.t + '">' + (wr.length ? wr.length + '단어' + (show < wr.length ? ' · ' + show + '개만 표시' : '') + ' · 다음 오답 시험에 들어가요' : '') + '</span></div>' + (wr.length ? '<div style="margin-top:4px">' + note + '</div>' : '<div style="padding:28px 0;text-align:center;font-size:14px;color:' + OKC + ';font-weight:800">모두 맞혔어요! 틀린 단어가 없어요.</div>'), 'margin-top:12px');
    var nx = x.next ? '<div style="font-size:17px;font-weight:900;color:' + c.d + ';margin-top:6px">' + esc(x.next.title) + '</div><div style="font-size:11.5px;color:' + c.t + ';margin-top:4px">' + mdKo(x.next.date) + ' · ' + (x.next.type === 'sa' ? '주관식' : '객관식') + '</div>' : '<div style="font-size:13px;color:' + c.t + ';margin-top:8px">예약된 다음 시험이 없어요</div>';
    var nxt = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' + card('<div style="font-size:10.5px;color:' + c.t + ';font-weight:700">다음 시험</div>' + nx) + card('<div style="font-size:10.5px;color:' + c.t + ';font-weight:700">선생님 한마디</div><div style="font-size:12px;line-height:1.7;color:#3A3030;margin-top:6px;white-space:pre-line">' + esc(x.comment) + '</div><div style="text-align:right;font-size:10.5px;color:' + c.t + ';margin-top:8px">학부모 확인 <span style="display:inline-block;width:60px;border-bottom:1px solid ' + c.m + '"></span></div>') + '</div>';
    return '<div class="pg" style="background:' + c.tint + '"><div style="padding:36px 40px 0">' + head + top + sc + nb + nxt + '</div><div style="position:absolute;left:40px;right:40px;bottom:22px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점 · 담당 ' + esc(x.teacher) + '</span><span>' + CATCH + '</span></div></div>';
  }
  /* ================= S4 반 전체 결과표 ================= */
  function S4(x) {
    var c = x.c, rows = x.rows, t = x.test, done = rows.filter(function (q) { return q.r; });
    var total = done.length ? done[0].r.total : (t.words || []).length, cut = done.length ? done[0].r.cut : x.cut;
    var avg = avgOf(done.map(function (q) { return q.r.score; })), passN = done.filter(function (q) { return q.r.passed; }).length;
    var sorted = done.slice().sort(function (a, b) { return b.r.score - a.r.score; }); var rk = {}; done.forEach(function (q) { var k = 1; sorted.forEach(function (s) { if (s.r.score > q.r.score) k++; }); rk[q.a.studentUid] = k; });
    var list = rows.slice().sort(function (a, b) { return (b.r ? b.r.score : -1) - (a.r ? a.r.score : -1) || a.name.localeCompare(b.name, 'ko'); });
    var rh = Math.max(24, Math.min(40, Math.floor(560 / Math.max(1, list.length)))), maxRows = Math.floor(600 / 24);
    var shown = list.slice(0, maxRows);
    var tag = function (txt, bg, fg) { return '<span style="font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:9px;background:' + bg + ';color:' + fg + ';white-space:nowrap">' + txt + '</span>'; };
    var trs = shown.map(function (q, i) {
      var s = q.r ? q.r.score : null, ok = q.r && q.r.passed;
      var bar = q.r ? '<div style="display:flex;align-items:center;gap:8px"><span style="flex:1;height:8px;border-radius:4px;background:' + c.l + ';position:relative;overflow:hidden"><span style="position:absolute;left:0;top:0;bottom:0;width:' + Math.round(s / q.r.total * 100) + '%;background:' + (ok ? c.p : FAIL) + ';border-radius:4px"></span></span><b class="inter" style="width:28px;text-align:right;color:' + (ok ? c.d : FAIL) + '">' + s + '</b></div>' : '<span style="color:#aaa">미응시</span>';
      var res = q.r ? (ok ? tag('통과', c.s, c.p) : tag('재시험', '#FBE5E2', FAIL)) : tag(q.a.date < U.todayStr() ? '밀림' : '대기', '#EEE', '#888');
      return '<tr style="height:' + rh + 'px;border-bottom:1px solid ' + c.l + ';font-size:12.5px;' + (i % 2 ? 'background:' + c.tint + ';' : '') + '"><td style="padding-left:10px;font-weight:800;color:' + c.d + '">' + esc(q.name) + '</td><td>' + bar + '</td><td class="inter" style="text-align:center;color:#666">' + (q.r ? fmt(q.r.timeSec) : '—') + '</td><td class="inter" style="text-align:center;font-weight:700;color:' + c.t + '">' + (q.r ? rk[q.a.studentUid] : '—') + '</td><td style="text-align:center">' + res + '</td><td></td></tr>';
    }).join('');
    var cnt = {}, ko = {}; done.forEach(function (q) { (q.r.answers || []).forEach(function (a) { if (!a.ok) { cnt[a.en] = (cnt[a.en] || 0) + 1; ko[a.en] = a.ko; } }); });
    var hard = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 8);
    var hb = hard.length ? hard.map(function (w) { return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:11.5px"><b class="bask" style="width:96px;color:' + c.d + ';font-size:' + wfs(w, 11.5, 10) + 'px">' + esc(w) + '</b><span style="flex:1;height:10px;border-radius:5px;background:' + c.l + ';position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:' + Math.round(cnt[w] / Math.max(1, done.length) * 100) + '%;background:' + FAIL + ';border-radius:5px;opacity:.85"></span></span><span class="inter" style="width:46px;text-align:right;font-weight:700;color:' + FAIL + '">' + cnt[w] + '/' + done.length + '</span></div>'; }).join('') : '<div style="font-size:12px;color:' + c.t + ';padding:10px 0">틀린 단어가 없어요</div>';
    var step = Math.max(1, Math.ceil(total / 6)), bins = []; for (var lo = 0; lo <= total; lo += step) bins.push([lo, Math.min(total, lo + step - 1)]);
    var mx = 1; bins.forEach(function (b) { b.push(done.filter(function (q) { return q.r.score >= b[0] && q.r.score <= b[1]; }).length); mx = Math.max(mx, b[2]); });
    var dist = bins.map(function (b) { return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1"><span class="inter" style="font-size:11px;font-weight:800;color:' + c.d + '">' + b[2] + '</span><span style="width:70%;height:' + Math.round(b[2] / mx * 140 + 3) + 'px;border-radius:5px 5px 0 0;background:' + (b[1] >= cut ? c.p : FAIL) + '"></span><span class="inter" style="font-size:9.5px;color:' + c.t + '">' + b[0] + (b[1] > b[0] ? '–' + b[1] : '') + '</span></div>'; }).join('');
    return '<div class="pg"><div style="padding:38px 46px 0"><div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ' + c.p + ';padding-bottom:12px"><div style="display:flex;gap:14px;align-items:center">' + logo(54, c.p) + '<div><div style="font-size:10.5px;letter-spacing:.24em;color:' + c.g + ';font-weight:800">CLASS RESULT · 선생님용</div><div style="font-size:' + (x.title.length > 14 ? 20 : 24) + 'px;font-weight:900;color:' + c.d + ';margin-top:3px">' + esc(x.title) + ' · 반 결과표</div><div style="font-size:11.5px;color:' + c.t + ';margin-top:2px">' + esc(x.sub || '') + (x.sub ? ' · ' : '') + (t.type === 'sa' ? '주관식' : '객관식') + ' ' + total + '문항 · 커트 ' + cut + ' · 출력 ' + dotDate(U.todayStr()) + '</div></div></div>'
      + '<div style="display:flex">' + [['응시', done.length + '/' + rows.length], ['통과', passN + '명'], ['평균', done.length ? r1(avg) : '—']].map(function (k) { return '<div style="padding:0 16px;border-left:1px solid ' + c.m + ';text-align:right"><div style="font-size:10.5px;color:' + c.t + '">' + k[0] + '</div><div class="inter" style="font-size:24px;font-weight:900;color:' + c.p + '">' + k[1] + '</div></div>'; }).join('') + '</div></div>'
      + '<table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="font-size:10.5px;color:' + c.t + ';height:26px;text-align:left;border-bottom:1.4px solid ' + c.p + '"><th style="padding-left:10px;width:110px">학생</th><th>점수</th><th style="text-align:center;width:70px">소요</th><th style="text-align:center;width:50px">등수</th><th style="text-align:center;width:80px">결과</th><th style="width:60px;text-align:center">확인</th></tr>' + trs + '</table>' + (list.length > shown.length ? '<div style="font-size:10.5px;color:' + c.t + ';margin-top:4px">외 ' + (list.length - shown.length) + '명은 생략</div>' : '')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:20px"><div><div style="font-size:14px;font-weight:800;color:' + c.d + ';margin-bottom:8px">점수 분포</div><div style="display:flex;align-items:flex-end;height:180px;border-bottom:1.4px solid ' + c.p + ';padding:0 4px">' + dist + '</div><div style="font-size:10.5px;color:' + c.t + ';margin-top:6px">빨간 막대 = 커트 미만 · 재시험 대상 ' + (done.length - passN) + '명</div></div><div><div style="font-size:14px;font-weight:800;color:' + c.d + ';margin-bottom:6px">많이 틀린 단어</div>' + hb + '</div></div></div>'
      + '<div style="position:absolute;left:46px;right:46px;bottom:24px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점 · MONO PLANNER</span><span>' + CATCH + '</span></div></div>';
  }

  /* ================= 기간 종합 공통 ================= */
  function sumCut(T) { return T.length ? T[T.length - 1].cut : 0; }
  function scoreTxt(x) { return x.s + '<span style="color:#aaa;font-weight:400">/' + x.tot + '</span>'; }
  /* ================= R1 매거진 리포트 ================= */
  function R1(x) {
    var c = x.c, d = x.d, T = d.T, N = T.length, show = T.slice(-20);
    var kp = [['응시', N + '회', md(d.from) + ' – ' + md(d.to)], ['통과율', Math.round(d.passN / Math.max(1, N) * 100) + '%', d.passN + ' / ' + N + '회 통과'], ['평균', r1(d.avgRaw), '정답률 ' + Math.round(avgOf(T.map(function (q) { return q.s / q.tot; })) * 100) + '%'], ['재시험', d.reN + '회', d.reN ? '재통과 ' + d.reOkN + '회' : '없음']];
    var rh = Math.max(18, Math.min(24, Math.floor(440 / Math.max(1, show.length))));
    var rows = show.map(function (q, i) { return '<tr style="height:' + rh + 'px;font-size:10.5px;' + (i % 2 ? 'background:' + c.tint + ';' : '') + '"><td class="inter" style="color:' + c.a + ';font-weight:700;padding-left:6px">' + (q.n < 10 ? '0' + q.n : q.n) + '</td><td>' + md(q.d) + '</td><td style="max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(q.title) + '</td><td class="inter" style="text-align:right;font-weight:700;color:' + (q.ok ? c.d : FAIL) + '">' + scoreTxt(q) + '</td><td style="text-align:center"><span style="font-size:9.5px;font-weight:800;padding:1px 7px;border-radius:9px;white-space:nowrap;' + (q.ok ? 'background:' + c.s + ';color:' + c.p : 'background:#FBE5E2;color:' + FAIL) + '">' + (q.ok ? '통과' : '재시험' + (q.re != null ? ' → ' + q.re : '')) + '</span></td><td class="inter" style="text-align:right;color:#777;padding-right:6px">' + fmt(q.sec) + '</td></tr>'; }).join('');
    var miss = d.miss.length ? d.miss.map(function (m) { return '<span style="display:inline-flex;gap:6px;align-items:baseline;border:1px solid ' + c.m + ';padding:4px 9px;margin:0 6px 6px 0;font-size:11px"><b class="bask" style="color:' + c.d + '">' + esc(m[0]) + '</b><span style="color:' + c.t + '">' + esc(m[1]) + '</span><b class="inter" style="color:' + FAIL + ';font-size:10px">×' + m[2] + '</b></span>'; }).join('') : '<span style="font-size:12px;color:' + c.t + '">틀린 단어가 없어요</span>';
    return '<div class="pg"><div style="padding:40px 48px 0"><div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ' + c.p + ';padding-bottom:10px"><div style="display:flex;align-items:flex-end;gap:16px"><div style="' + SER + 'font-size:44px;line-height:.86;color:' + c.p + '">Word<br><i style="color:' + c.a + '">Report.</i></div><div style="font-size:11.5px;color:' + c.t + ';line-height:1.55;padding-bottom:2px"><b style="font-size:20px;color:' + c.d + ';font-weight:900">' + esc(x.name) + '</b> 학생' + (x.grade ? ' · ' + esc(x.grade) : '') + '<br>' + esc(x.sub || '단어 Test') + ' · ' + dotDate(d.from) + ' – ' + dotDate(d.to) + '</div></div>' + logo(56, c.p) + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:' + c.s + ';margin-top:14px">' + kp.map(function (k, i) { return '<div style="padding:12px 16px;' + (i ? 'border-left:1px solid ' + c.m + ';' : '') + '"><div style="font-size:10.5px;color:' + c.t + ';font-weight:700">' + k[0] + '</div><div style="' + SER + 'font-size:34px;color:' + c.p + ';line-height:1.05;margin-top:4px">' + k[1] + '</div><div style="font-size:10.5px;color:' + c.t + ';margin-top:2px">' + k[2] + '</div></div>'; }).join('') + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 4px">' + secHead(c, 'Score Trend', '회차별 정답률 (%)') + '<span style="font-size:10px;color:' + c.t + '">○ 통과　<span style="color:' + FAIL + '">●</span> 미통과</span></div>' + lineChart(T, 698, 170, c.p, c.g, c.l)
      + '<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:22px;margin-top:10px"><div><div style="margin-bottom:4px">' + secHead(c, 'All Tests', N > 20 ? '최근 20회' : '회차별 기록') + '</div><table style="width:100%;border-collapse:collapse;border-top:1.4px solid ' + c.p + ';table-layout:fixed"><colgroup><col style="width:24px"><col style="width:38px"><col><col style="width:46px"><col style="width:76px"><col style="width:38px"></colgroup><tr style="font-size:9.5px;color:' + c.t + ';height:20px;text-align:left"><th style="padding-left:6px">회</th><th>날짜</th><th>시험</th><th style="text-align:right">점수</th><th style="text-align:center">결과</th><th style="text-align:right;padding-right:6px">시간</th></tr>' + rows + '</table></div>'
      + '<div><div style="margin-bottom:6px">' + secHead(c, 'Most Missed', '자주 틀린 단어') + '</div><div style="border-top:1.4px solid ' + c.p + ';padding-top:8px">' + miss + '</div><div style="margin:12px 0 6px">' + secHead(c, 'Comment', '선생님 의견') + '</div><div style="border-top:1.4px solid ' + c.p + ';padding-top:8px;font-size:11.5px;line-height:1.75;color:#3A3030;white-space:pre-line">' + esc(x.comment) + '</div><div style="display:flex;justify-content:flex-end;gap:16px;margin-top:12px;font-size:10.5px;color:' + c.t + '"><span>담당 <b style="color:' + c.d + '">' + esc(x.teacher) + '</b></span><span>확인 <span style="display:inline-block;min-width:60px;border-bottom:1px solid ' + c.m + '"></span></span></div></div></div></div>'
      + '<div style="position:absolute;left:48px;right:48px;bottom:26px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점 · MONO PLANNER 단어 Test 성적표</span><span style="' + SER + 'font-style:italic;font-size:12px;color:' + c.a + '">' + CATCH + '</span></div></div>';
  }
  /* ================= R2 대시보드 카드 ================= */
  function weekKey(s) { var d = U.parseYmd(s), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return U.ymd(d); }
  function R2(x) {
    var c = x.c, d = x.d, T = d.T, N = T.length;
    var card = function (inner, extra) { return '<div style="background:#fff;border-radius:16px;box-shadow:0 0 0 1px ' + c.l + ',0 4px 14px rgba(30,20,20,.06);padding:16px 18px;' + (extra || '') + '">' + inner + '</div>'; };
    var pr = d.passN / Math.max(1, N);
    var head = '<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:14px">' + logo(58, c.p) + '<div><div style="font-size:10.5px;letter-spacing:.24em;color:' + c.g + ';font-weight:800">MONO PLANNER · WORD TEST REPORT</div><div style="font-size:26px;font-weight:900;color:' + c.d + ';margin-top:3px">' + esc(x.name) + ' <span style="font-size:15px;font-weight:700;color:' + c.t + '">단어 Test 성적표</span></div><div style="font-size:11.5px;color:' + c.t + ';margin-top:2px">' + esc(x.sub ? x.sub + ' · ' : '') + mdKo(d.from).replace(/ \(.\)/, '') + ' ~ ' + mdKo(d.to).replace(/ \(.\)/, '') + ' · ' + N + '회</div></div></div><div style="text-align:right;font-size:10.5px;color:' + c.t + '">발행일 ' + dotDate(U.todayStr()) + '<br>담당 ' + esc(x.teacher) + ' 선생님</div></div>';
    var k1 = card('<div style="display:flex;align-items:center;gap:14px"><div style="position:relative;width:96px;height:96px">' + donut(96, pr, c.p, c.s) + '<div style="position:absolute;left:0;top:0;width:96px;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center"><b class="inter" style="font-size:22px;color:' + c.p + '">' + Math.round(pr * 100) + '%</b><span style="font-size:9.5px;color:' + c.t + '">통과율</span></div></div><div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:' + c.t + '"><span><b style="color:' + c.d + ';font-size:15px">' + d.passN + '</b> 회 첫 응시 통과</span><span><b style="color:' + FAIL + ';font-size:15px">' + d.reN + '</b> 회 재시험</span><span>재시험 통과 <b style="color:' + c.d + '">' + d.reOkN + '/' + d.reN + '</b></span></div></div>');
    var stat = function (a, b, s) { return card('<div style="font-size:10.5px;color:' + c.t + ';font-weight:700">' + a + '</div><div class="inter" style="font-size:30px;font-weight:900;color:' + c.d + ';margin-top:4px;line-height:1">' + b + '</div><div style="font-size:10.5px;color:' + c.g + ';font-weight:700;margin-top:6px">' + s + '</div>'); };
    var dd = d.last5 - d.first5;
    var top = '<div style="display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:12px;margin-top:18px">' + k1 + stat('평균 점수', r1(d.avgRaw), N >= 6 ? (dd >= 0 ? '▲ ' : '▼ ') + '처음 5회보다 ' + (dd >= 0 ? '+' : '') + r1(dd) : '') + stat('평균 소요', fmt(d.avgSec), N >= 5 ? '최근 5회 ' + fmt(avgOf(T.slice(-5).map(function (q) { return q.sec; }))) : '') + '</div>';
    var chart = card('<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><b style="font-size:13.5px;color:' + c.d + '">회차별 정답률</b><span style="font-size:10px;color:' + c.t + '"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + c.p + ';margin-right:4px"></span>통과　<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + FAIL + ';margin:0 4px 0 6px"></span>미통과　<span style="color:' + c.g + '">- - 커트</span></span></div>' + barChart(T, 660, 150, c.p, c.g, c.l), 'margin-top:12px');
    var wk = {}, order = []; T.forEach(function (q) { var k = weekKey(q.d); if (!wk[k]) { wk[k] = []; order.push(k); } wk[k].push(q); });
    order = order.slice(-4);
    var wkh = order.map(function (k) { var ts = wk[k], e = U.addDays(k, 6); return '<div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;background:' + c.tint + ';box-shadow:inset 0 0 0 1px ' + c.l + '"><div style="display:flex;justify-content:space-between"><b style="font-size:12px;color:' + c.d + '">' + (U.parseYmd(k).getMonth() + 1) + '월 ' + Math.ceil(U.parseYmd(k).getDate() / 7) + '주</b><span style="font-size:10px;color:' + c.t + '">' + md(k) + '–' + md(e) + '</span></div><div style="display:flex;gap:4px">' + ts.slice(0, 7).map(function (q) { return '<span class="inter" style="flex:1;height:30px;border-radius:6px;background:' + (q.ok ? c.p : FAIL) + ';color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">' + q.s + '</span>'; }).join('') + '</div><span style="font-size:10.5px;color:' + c.t + '">평균 <b style="color:' + c.d + '">' + r1(avgOf(ts.map(function (q) { return q.s; }))) + '</b> · 통과 ' + ts.filter(function (q) { return q.ok; }).length + '/' + ts.length + '</span></div>'; }).join('');
    var weekc = card('<b style="font-size:13.5px;color:' + c.d + '">주간 기록' + (Object.keys(wk).length > 4 ? ' <span style="font-size:11px;color:' + c.t + ';font-weight:500">· 최근 4주</span>' : '') + '</b><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px">' + wkh + '</div>', 'margin-top:12px');
    var miss = d.miss.slice(0, 8).map(function (m, i) { return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid ' + c.l + ';font-size:11.5px"><b class="inter" style="width:20px;color:' + c.g + '">' + (i + 1) + '</b><b style="flex:1;color:' + c.d + '">' + esc(m[0]) + '</b><span style="color:' + c.t + ';flex:1">' + esc(m[1]) + '</span><span class="inter" style="font-weight:800;color:' + FAIL + '">' + m[2] + '회</span></div>'; }).join('') || '<div style="font-size:12px;color:' + c.t + ';padding:10px 0">틀린 단어가 없어요</div>';
    var bottom = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' + card('<b style="font-size:13.5px;color:' + c.d + '">자주 틀린 단어 TOP 8</b><div style="margin-top:6px">' + miss + '</div>') + card('<b style="font-size:13.5px;color:' + c.d + '">선생님 한마디</b><div style="font-size:12px;line-height:1.8;color:#3A3030;margin-top:8px;white-space:pre-line;min-height:80px">' + esc(x.comment) + '</div><div style="display:flex;justify-content:flex-end;gap:14px;margin-top:14px;font-size:10.5px;color:' + c.t + '"><span>학부모 확인 <span style="display:inline-block;width:70px;border-bottom:1px solid ' + c.m + '"></span></span></div>') + '</div>';
    return '<div class="pg" style="background:' + c.tint + '"><div style="padding:36px 40px 0">' + head + top + chart + weekc + bottom + '</div><div style="position:absolute;left:40px;right:40px;bottom:22px;display:flex;justify-content:space-between;font-size:9.5px;color:' + c.t + '"><span>멘토즈 스터디카페 울산송정점</span><span>' + CATCH + '</span></div></div>';
  }
  /* ================= R3 학부모 안내 레터 ================= */
  function R3(x) {
    var c = x.c, d = x.d, T = d.T, N = T.length, show = T.slice(-20), half = Math.ceil(show.length / 2);
    var tab = function (rs) { return '<table class="kserif" style="width:100%;border-collapse:collapse"><tr style="font-size:9.5px;color:' + c.t + ';height:20px;border-bottom:1.2px solid ' + c.p + '"><th style="text-align:left;font-weight:600">회</th><th style="text-align:left;font-weight:600">날짜</th><th style="text-align:right;font-weight:600">점수</th><th style="font-weight:600">통과</th></tr>' + rs.map(function (q) { return '<tr style="height:22px;font-size:10.5px;border-bottom:1px solid ' + c.l + '"><td style="' + SER + 'color:' + c.p + ';font-size:12px">' + q.n + '</td><td>' + md(q.d) + '</td><td class="bask" style="text-align:right;font-weight:700;color:' + (q.ok ? c.d : FAIL) + '">' + q.s + '<span style="color:#aaa;font-weight:400;font-size:9px">/' + q.tot + '</span></td><td style="text-align:center;color:' + c.t + '">' + (q.ok ? '○' : '재 ' + (q.re != null ? q.re : '-')) + '</td></tr>'; }).join('') + '</table>'; };
    var frame = '<div style="position:absolute;left:0;top:0;right:0;bottom:0;border:22px solid ' + c.s + '"></div><div style="position:absolute;left:22px;top:22px;right:22px;bottom:22px;border:3px solid ' + c.p + '"></div><div style="position:absolute;left:29px;top:29px;right:29px;bottom:29px;border:1px solid ' + c.g + '"></div>';
    var weeks = Math.max(1, Math.round((U.parseYmd(d.to) - U.parseYmd(d.from)) / 86400000 / 7));
    var trend = N >= 6 ? (d.last5 >= d.first5 ? '최근 다섯 번의 평균이 처음보다 ' + r1(d.last5 - d.first5) + '점 높아 꾸준히 나아지고 있습니다.' : '최근 점수가 조금 내려가 다시 집중이 필요한 시기입니다.') : '';
    var letter = '안녕하세요, <b>' + esc(x.name) + '</b> 학생 학부모님.<br>지난 ' + weeks + '주 동안 ' + esc(x.name.length >= 3 ? x.name.slice(1) : x.name) + ' 학생은 단어 Test <b style="color:' + c.p + '">' + N + '회</b>에 응시해 <b style="color:' + c.p + '">' + d.passN + '회를 한 번에 통과</b>했고' + (d.reN ? ', 통과하지 못한 ' + d.reN + '회 중 ' + d.reOkN + '회는 재시험으로 통과했습니다.' : ', 재시험 없이 모두 통과했습니다.') + ' 평균은 <b style="color:' + c.p + '">' + r1(d.avgRaw) + '점</b>입니다. ' + trend;
    return '<div class="pg" style="background:' + c.tint + '">' + frame + '<div class="kserif" style="padding:52px 66px 0;color:#2E2622">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="bask" style="font-size:10.5px;letter-spacing:.36em;color:' + c.g + '">LEARNING REPORT</div><div style="font-size:28px;font-weight:900;color:' + c.p + ';margin-top:6px">단어 학습 성취 보고서</div><div style="font-size:12px;color:' + c.t + ';margin-top:4px">' + dotDate(d.from) + ' ~ ' + dotDate(d.to) + (x.sub ? ' · ' + esc(x.sub) : '') + '</div></div>' + logo(64, c.p) + '</div>'
      + '<div style="height:1.5px;background:' + c.p + ';margin:14px 0"></div><div style="font-size:12.5px;line-height:1.95">' + letter + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0">' + [['첫 응시 통과', d.passN + ' / ' + N], ['평균 점수', r1(d.avgRaw)], [N >= 5 ? '최근 5회 평균' : '재시험', N >= 5 ? r1(d.last5) : d.reN + '회']].map(function (k) { return '<div style="text-align:center;padding:12px 0;border-top:1.5px solid ' + c.p + ';border-bottom:1px solid ' + c.l + '"><div style="font-size:10.5px;color:' + c.t + '">' + k[0] + '</div><div style="' + SER + 'font-size:30px;color:' + c.p + ';line-height:1.1;margin-top:3px">' + k[1] + '</div></div>'; }).join('') + '</div>'
      + '<div style="font-size:13px;font-weight:700;color:' + c.p + ';margin-bottom:4px">점수 흐름 (정답률 %)</div>' + lineChart(T, 662, 130, c.p, c.g, c.l)
      + '<div style="font-size:13px;font-weight:700;color:' + c.p + ';margin:12px 0 4px">회차별 기록' + (N > 20 ? ' (최근 20회)' : '') + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">' + tab(show.slice(0, half)) + tab(show.slice(half)) + '</div>'
      + '<div style="margin-top:14px;font-size:12px;line-height:1.85;white-space:pre-line"><b style="color:' + c.p + '">선생님 의견</b> — ' + esc(x.comment) + '</div>'
      + '<div style="display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:14px;font-size:12px"><span>' + dotDate(U.todayStr()) + '.</span><span>담당 <b>' + esc(x.teacher) + '</b></span><span style="display:flex;align-items:center;gap:8px">원장 <span style="width:46px;height:46px;border-radius:50%;border:2px solid ' + c.a + ';color:' + c.a + ';display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:900;transform:rotate(-8deg);line-height:1.1;text-align:center">멘토즈<br>울산송정</span></span></div></div>'
      + '<div class="kserif" style="position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:10.5px;color:' + c.p + '">' + CATCH + ' · 멘토즈 스터디카페 울산송정점</div></div>';
  }
  /* ================= R4 달력 + 사이드 통계 ================= */
  function R4(x) {
    var c = x.c, d = x.d, T = d.T, N = T.length, byD = {};
    T.forEach(function (q) { (byD[q.d] = byD[q.d] || []).push(q); });
    var end = U.parseYmd(d.to), sd = U.parseYmd(d.from), mon = new Date(sd); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
    var lastMon = new Date(end); lastMon.setDate(lastMon.getDate() - (lastMon.getDay() + 6) % 7);
    var wks = Math.round((lastMon - mon) / 86400000 / 7) + 1; if (wks > 5) { mon = new Date(lastMon); mon.setDate(mon.getDate() - 28); wks = 5; }
    var ch = wks >= 5 ? 66 : 78, cells = '';
    for (var k = 0; k < wks * 7; k++) {
      var dd = new Date(mon); dd.setDate(dd.getDate() + k); var key = U.ymd(dd), qs = byD[key];
      if (qs) { var q = qs[0], ok = qs.every(function (z) { return z.ok; }); cells += '<div style="height:' + ch + 'px;border-radius:10px;background:' + (ok ? c.p : FAIL) + ';padding:7px 9px;display:flex;flex-direction:column;justify-content:space-between"><span class="inter" style="font-size:10px;color:rgba(255,255,255,.75)">' + dd.getDate() + '</span><b class="inter" style="font-size:' + (ch > 70 ? 22 : 19) + 'px;color:#fff;line-height:1">' + q.s + (qs.length > 1 ? '<span style="font-size:10px">+' + (qs.length - 1) + '</span>' : '') + '</b><span style="font-size:9.5px;color:rgba(255,255,255,.85)">' + (ok ? '통과' : '재시험' + (q.re != null ? ' ' + q.re : '')) + '</span></div>'; }
      else { var wkd = dd.getDay() === 0 || dd.getDay() === 6; cells += '<div class="inter" style="height:' + ch + 'px;border-radius:10px;background:' + (wkd ? 'transparent' : c.tint) + ';box-shadow:inset 0 0 0 1px ' + c.l + ';padding:7px 9px;font-size:10px;color:#aaa">' + dd.getDate() + '</div>'; }
    }
    var wd = '월화수목금토일'.split('').map(function (s) { return '<span style="text-align:center;font-size:10px;color:' + c.t + ';font-weight:700">' + s + '</span>'; }).join('');
    var side = function (a, b, s) { return '<div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.18)"><div style="font-size:10.5px;color:rgba(255,255,255,.7);letter-spacing:.06em">' + a + '</div><div class="inter" style="font-size:30px;font-weight:800;color:#fff;line-height:1.1;margin-top:3px">' + b + '</div><div style="font-size:10.5px;color:' + c.gl + ';margin-top:2px">' + s + '</div></div>'; };
    var miss = d.miss.slice(0, 6).map(function (m) { return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid ' + c.l + ';font-size:11.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b style="color:' + c.d + '">' + esc(m[0]) + '</b> <span style="color:' + c.t + '">' + esc(m[1]) + '</span></span><b class="inter" style="color:' + FAIL + '">' + m[2] + '</b></div>'; }).join('') || '<div style="font-size:12px;color:' + c.t + '">틀린 단어가 없어요</div>';
    return '<div class="pg"><div style="position:absolute;left:0;top:0;bottom:0;width:214px;background:linear-gradient(180deg,' + c.p + ',' + c.d + ');padding:40px 26px;color:#fff;display:flex;flex-direction:column">' + logo(60, '#fff')
      + '<div style="font-size:10.5px;letter-spacing:.26em;color:' + c.gl + ';font-weight:700;margin-top:18px">WORD TEST</div><div style="font-size:' + (x.name.length > 4 ? 21 : 26) + 'px;font-weight:900;margin-top:4px">' + esc(x.name) + '</div><div style="font-size:11.5px;color:rgba(255,255,255,.75);margin-top:4px;line-height:1.6">' + esc([x.grade, x.sub].filter(Boolean).join(' · ')) + '<br>' + md(d.from) + ' – ' + md(d.to) + '</div>'
      + '<div style="margin-top:20px">' + side('첫 응시 통과', d.passN + '/' + N, '통과율 ' + Math.round(d.passN / Math.max(1, N) * 100) + '%') + side('평균 점수', r1(d.avgRaw), '정답률 ' + Math.round(avgOf(T.map(function (q) { return q.s / q.tot; })) * 100) + '%') + side('재시험', d.reN + '회', d.reN ? '재통과 ' + d.reOkN + '회' : '없음') + side('평균 소요', fmt(d.avgSec), N >= 5 ? '최근 5회 ' + fmt(avgOf(T.slice(-5).map(function (q) { return q.sec; }))) : '') + '</div>'
      + '<div style="margin-top:auto;font-size:10px;color:rgba(255,255,255,.65);line-height:1.6">멘토즈 스터디카페<br>울산송정점</div></div>'
      + '<div style="position:absolute;left:214px;right:0;top:0;padding:40px 38px 0 32px"><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:24px;font-weight:900;color:' + c.d + '">' + wks + '주 응시 달력</div><div style="font-size:11.5px;color:' + c.t + ';margin-top:3px">칸 색 = 그날 결과 · 숫자 = 점수</div></div><div style="display:flex;gap:10px;font-size:10.5px;color:' + c.t + '"><span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + c.p + ';margin-right:4px"></span>통과</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + FAIL + ';margin-right:4px"></span>재시험</span></div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:14px">' + wd + cells + '</div>'
      + '<div style="font-size:14px;font-weight:800;color:' + c.d + ';margin:18px 0 4px">정답률 추이 (%)</div>' + lineChart(T, 508, 130, c.p, c.g, c.l, c.p)
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px"><div><div style="font-size:14px;font-weight:800;color:' + c.d + ';margin-bottom:4px">자주 틀린 단어</div>' + miss + '</div><div><div style="font-size:14px;font-weight:800;color:' + c.d + ';margin-bottom:8px">선생님 의견</div><div style="font-size:11.5px;line-height:1.8;color:#3A3030;padding:12px 14px;border-radius:12px;background:' + c.tint + ';box-shadow:inset 0 0 0 1px ' + c.l + ';white-space:pre-line">' + esc(x.comment) + '</div><div style="display:flex;justify-content:flex-end;gap:12px;margin-top:12px;font-size:10.5px;color:' + c.t + '"><span>담당 ' + esc(x.teacher) + '</span><span>학부모 확인 <span style="display:inline-block;width:60px;border-bottom:1px solid ' + c.m + '"></span></span></div></div></div></div>'
      + '<div style="position:absolute;left:246px;right:38px;bottom:24px;font-size:9.5px;color:' + c.t + ';text-align:right">' + CATCH + '</div></div>';
  }
  var FN = { S1: S1, S2: S2, S3: S3, S4: S4, R1: R1, R2: R2, R3: R3, R4: R4 };

  /* ---------- 자동 의견 ---------- */
  function autoSingle(sd) {
    var r = sd.r, wr = sd.answers.filter(function (a) { return !a.ok; });
    var s = r.passed ? (r.score === r.total ? '만점이에요! 아주 잘했어요.' : '커트보다 ' + (r.score - r.cut) + '개 더 맞혀 통과했어요.') : '커트까지 ' + (r.cut - r.score) + '개가 부족했어요. 틀린 단어로 재시험을 볼 거예요.';
    if (sd.prev) s += ' 지난 시험(' + sd.prev.score + '점)보다 ' + (r.score >= sd.prev.score ? (r.score - sd.prev.score) + '점 올랐어요.' : (sd.prev.score - r.score) + '점 내려갔어요.');
    if (wr.length) s += ' ' + wr.slice(0, 2).map(function (a) { return a.en; }).join(', ') + ' 등은 한 번 더 보세요.';
    return s;
  }
  function autoSum(d) {
    var T = d.T; if (!T.length) return '';
    var s = '기간 동안 ' + T.length + '회 응시해 ' + d.passN + '회를 한 번에 통과했어요.';
    if (T.length >= 6) s += d.last5 >= d.first5 ? ' 최근 점수가 꾸준히 오르고 있어요.' : ' 최근 점수가 조금 내려가 다시 집중이 필요해요.';
    if (d.miss.length) s += ' 자주 틀린 ' + d.miss.slice(0, 2).map(function (m) { return m[0]; }).join(', ') + '은(는) 오답 시험으로 다시 확인할게요.';
    return s;
  }

  /* ---------- 문서 ---------- */
  function docHtml(pages, title) {
    var fonts = PR.FONTS.replace('&display=swap', '&family=Nanum+Pen+Script&display=swap');
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><base href="' + location.origin + '/">' + fonts + '<style>' + PR.baseCss() + '</style></head><body>' + pages.join('') + '</body></html>';
  }
  /* o: {mode, design, pal, testId, uids[], from, to, comment, autoComment} ; ctx: data */
  function build(ctx, o, preview) {
    var c = PAL[o.pal] || PAL['버건디'], pages = [], teacher = ctx.teacher || '';
    if (o.mode === 'class') {
      var t = ctx.testById(o.testId); if (!t) return { html: '', n: 0 };
      var f = ctx.folderById(t.folderId);
      pages.push(S4({ c: c, rows: classOfTest(ctx, o.testId), test: t, title: t.title, sub: f ? f.name : '', cut: Math.ceil((t.words || []).length * (t.cutPct != null ? t.cutPct : 80) / 100) }));
    } else {
      var uids = preview ? o.uids.slice(0, 1) : o.uids;
      uids.forEach(function (uid) {
        var st = ctx.student(uid) || { name: '' };
        if (o.mode === 'single') {
          var sd = singleData(ctx, o.testId, uid); if (!sd) return;
          var tf = ctx.folderById(sd.test.folderId);
          pages.push(FN[o.design]({ c: c, r: sd.r, name: sd.name || st.name, title: sd.title, num: sd.num, rank: sd.rank, n: sd.n, cAvg: sd.cAvg, cTime: sd.cTime, prev: sd.prev, re: sd.re, answers: sd.answers, next: sd.next, comment: o.comment || autoSingle(sd), teacher: teacher, sub: tf ? tf.name : '' }));
        } else {
          var d = sumData(ctx, uid, o.from, o.to); if (!d.T.length) return;
          var fid = d.T[d.T.length - 1].r.folderId, ff = ctx.folderById(fid);
          pages.push(FN[o.design]({ c: c, d: d, name: st.name || d.T[0].r.studentName || '', grade: st.grade || '', sub: ff ? ff.name : '', comment: o.comment || autoSum(d), teacher: teacher }));
        }
      });
    }
    return { html: pages.length ? docHtml(pages, '단어 Test 성적표') : '', n: pages.length };
  }
  WT.reportBuild = build;

  /* ---------- 설정 저장 ---------- */
  function prefGet() { var p = null; try { p = ME().profile.wtReport; } catch (e) { } if (!p) { try { p = JSON.parse(localStorage.getItem('wt_report_v1') || 'null'); } catch (e) { } } return p || {}; }
  function prefSave(p) { try { localStorage.setItem('wt_report_v1', JSON.stringify(p)); } catch (e) { } try { var me = ME(); if (me.profile) me.profile.wtReport = p; F().updateDoc(F().doc(F().db, 'users', me.uid), { wtReport: p }).catch(function () { }); } catch (e) { } }

  /* ---------- 인쇄 창 ---------- */
  /* opts: {ctx, mode, testId, uids, pickStudents} */
  WT.openReportPrint = function (opts) {
    var ctx = opts.ctx, pf = prefGet();
    var tests = ctx.resultTests();
    var st = { mode: opts.mode || pf.mode || 'single', design: null, pal: null, testId: opts.testId || (tests[0] && tests[0].id), uids: (opts.uids || []).slice(), from: U.addDays(U.todayStr(), -27), to: U.todayStr(), comment: '' };
    var pick = function () { var m = MODES.filter(function (x) { return x.k === st.mode; })[0]; return m; };
    function setDesign(k) { var ds = pick().designs.map(function (d) { return d[0]; }); st.design = ds.indexOf(k) >= 0 ? k : ((pf.design && ds.indexOf(pf.design[st.mode]) >= 0) ? pf.design[st.mode] : ds[0]); st.pal = (pf.pal && pf.pal[st.design]) || DEF_PAL[st.design]; }
    setDesign(null);
    if (!document.getElementById('wt-pr-css')) { var cs = document.createElement('style'); cs.id = 'wt-pr-css'; cs.textContent = '@media (max-width:900px){.wt-pr-grid{grid-template-columns:minmax(0,1fr)!important}.wt-pr-grid>div:last-child{position:static!important;align-items:center}}'; document.head.appendChild(cs); }
    var m = U.modal({ title: '성적표 인쇄', eyebrow: 'REPORT', width: 1080 });
    var SC = 0.42;
    var lab = function (s) { return '<span style="font-size:12px;font-weight:800;color:#5A4848">' + s + '</span>'; };
    function validUids() {
      if (st.mode === 'single') { var rows = classOfTest(ctx, st.testId).filter(function (q) { return q.r; }).map(function (q) { return q.a.studentUid; }); return st.uids.filter(function (u) { return rows.indexOf(u) >= 0; }); }
      if (st.mode === 'sum') return st.uids.filter(function (u) { return sumData(ctx, u, st.from, st.to).T.length; });
      return [];
    }
    function save() { var p = prefGet(); p.mode = st.mode; p.design = p.design || {}; p.design[st.mode] = st.design; p.pal = p.pal || {}; p.pal[st.design] = st.pal; pf = p; prefSave(p); }
    function draw() {
      var md0 = pick(), vu = validUids();
      var modes = MODES.map(function (x) { var on = x.k === st.mode; return '<button type="button" data-mode="' + x.k + '" class="' + (on ? 'on' : '') + '">' + x.name + '</button>'; }).join('');
      var dz = md0.designs.map(function (d) { var on = d[0] === st.design; return '<button type="button" data-ds="' + d[0] + '" class="' + (on ? 'p' : 's') + '" style="height:auto;padding:9px 10px;border-radius:12px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;min-width:0"><b style="font-size:12.5px">' + d[0] + ' · ' + esc(d[1]) + '</b><span style="font-size:10.5px;opacity:.75;font-weight:500">' + esc(d[2]) + '</span></button>'; }).join('');
      var pz = Object.keys(PAL).map(function (k) { var on = k === st.pal; return '<button type="button" data-pal="' + esc(k) + '" aria-pressed="' + on + '" style="display:flex;align-items:center;gap:7px;height:36px;padding:0 12px 0 6px;border-radius:18px;border:0;cursor:pointer;background:' + (on ? '#fff' : 'transparent') + ';box-shadow:' + (on ? '0 0 0 2px ' + PAL[k].p + ',0 4px 10px rgba(0,0,0,.08)' : 'inset 0 0 0 1px #E6DCD8') + ';font:700 12px \'Noto Sans KR\',sans-serif;color:#3A2A2A"><span style="width:24px;height:24px;border-radius:12px;background:linear-gradient(135deg,' + PAL[k].p + ' 0 55%,' + PAL[k].g + ' 55% 100%)"></span>' + esc(k) + '</button>'; }).join('');
      var tsel = '<select class="inp" id="wt-rp-test" style="height:40px;padding:0 12px;font-size:13px;font-weight:700;width:100%">' + (tests.length ? tests.map(function (t) { var f = ctx.folderById(t.folderId); return '<option value="' + t.id + '"' + (t.id === st.testId ? ' selected' : '') + '>' + esc(t.title) + (f ? ' · ' + esc(f.name) : '') + '</option>'; }).join('') : '<option>결과가 있는 시험이 없어요</option>') + '</select>';
      var names = vu.map(function (u) { return (ctx.student(u) || {}).name || ''; });
      var who = st.mode === 'class' ? '' : '<div class="col" style="gap:8px">' + lab('학생') + '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        + (vu.length ? '<span style="font-size:12.5px;flex:1;min-width:0;line-height:1.6"><b style="color:#7B1D1D">' + vu.length + '명</b> · ' + esc(names.slice(0, 8).join(', ')) + (names.length > 8 ? ' 외 ' + (names.length - 8) + '명' : '') + '</span>' : '<span style="font-size:12.5px;color:#9C2F2F;flex:1">' + (st.mode === 'single' ? '이 시험을 본 학생을 골라 주세요' : '이 기간에 응시한 학생을 골라 주세요') + '</span>')
        + '<button type="button" class="s" data-pick style="height:34px;padding:0 12px;font-size:12px">학생 고르기</button>' + (st.mode === 'single' ? '<button type="button" class="s" data-alltaken style="height:34px;padding:0 12px;font-size:12px">응시한 학생 전부</button>' : '') + '</div>' + (st.uids.length > vu.length ? '<span style="font-size:11px;color:#8A7B7B">' + (st.uids.length - vu.length) + '명은 ' + (st.mode === 'single' ? '이 시험 결과가 없어' : '이 기간 결과가 없어') + ' 빠져요</span>' : '') + '</div>';
      var range = st.mode === 'sum' ? '<div class="col" style="gap:8px">' + lab('기간') + '<div class="row" style="gap:8px;flex-wrap:wrap"><input type="date" class="inp" id="wt-rp-from" value="' + st.from + '" style="height:38px;padding:0 10px;font-size:13px"><span>~</span><input type="date" class="inp" id="wt-rp-to" value="' + st.to + '" style="height:38px;padding:0 10px;font-size:13px">' + [[7, '1주'], [28, '4주'], [56, '8주']].map(function (q) { return '<button type="button" class="s" data-rng="' + q[0] + '" style="height:34px;padding:0 10px;font-size:12px">' + q[1] + '</button>'; }).join('') + '</div></div>' : '<div class="col" style="gap:8px">' + lab('시험') + tsel + '</div>';
      var cm = st.mode === 'class' ? '' : '<label class="col" style="gap:8px">' + lab('선생님 의견 <span style="font-weight:500;color:#8A7B7B">· 비워 두면 결과를 보고 자동으로 써요 (학생마다 다르게)</span>') + '<textarea class="inp" id="wt-rp-cm" rows="3" placeholder="예) 지난 시험보다 점수가 올랐어요. 틀린 단어를 세 번씩 써 보세요." style="padding:10px 12px;font-size:13px;line-height:1.6;resize:vertical">' + esc(st.comment) + '</textarea></label>';
      var nPages = st.mode === 'class' ? 1 : vu.length;
      m.body.innerHTML = '<div style="display:grid;grid-template-columns:minmax(0,1fr) ' + Math.round(794 * SC + 2) + 'px;gap:22px;align-items:start" class="wt-pr-grid"><div class="col" style="gap:16px">'
        + '<div class="col" style="gap:8px">' + lab('종류') + '<div class="well seg scroll" style="display:inline-flex;max-width:100%">' + modes + '</div></div>'
        + '<div class="col" style="gap:8px">' + lab('디자인') + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">' + dz + '</div></div>'
        + '<div class="col" style="gap:8px">' + lab('색상') + '<div class="row" style="flex-wrap:wrap;gap:6px">' + pz + '</div></div>'
        + range + who + cm + '</div>'
        + '<div class="col" style="gap:8px;position:sticky;top:0"><div class="row" style="justify-content:space-between">' + lab('미리보기') + '<span style="font-size:11px;color:#8A7B7B">' + (nPages ? '첫 장 · 전체 ' + nPages + '장' : '') + '</span></div><div style="width:' + Math.round(794 * SC) + 'px;height:' + Math.round(1123 * SC) + 'px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px #E6DCD8,0 8px 22px rgba(60,20,20,.12);background:#fff;position:relative"><iframe id="wt-rp-prev" title="성적표 미리보기" style="width:794px;height:1123px;border:0;transform:scale(' + SC + ');transform-origin:0 0;pointer-events:none;background:#fff"></iframe><div id="wt-rp-empty" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;font-size:13px;color:#8A7B7B;padding:20px;line-height:1.7"></div></div></div></div>';
      m.foot.innerHTML = '<span style="font-size:12px;color:#8A7B7B;margin-right:auto">인쇄 창에서 <b>배경 그래픽</b>을 켜 주세요 · 한 학생당 A4 1장</span><button type="button" class="s" data-n style="height:42px;padding:0 18px">닫기</button><button type="button" class="p" data-go data-lbl="인쇄하기 · ' + nPages + '장" style="height:42px;padding:0 22px"' + (nPages ? '' : ' disabled') + '>인쇄하기 · ' + nPages + '장</button>';
      bind(); preview();
    }
    var pvT = null;
    function opt(preview) { return { mode: st.mode, design: st.design, pal: st.pal, testId: st.testId, uids: validUids(), from: st.from, to: st.to, comment: st.comment.trim() }; }
    function preview() {
      clearTimeout(pvT);
      pvT = setTimeout(function () {
        var fr = m.body.querySelector('#wt-rp-prev'), em = m.body.querySelector('#wt-rp-empty'); if (!fr) return;
        var b = build(ctx, opt(true), true);
        if (!b.n) { fr.srcdoc = '<html><body style="background:#fff"></body></html>'; em.style.display = 'flex'; em.innerHTML = st.mode === 'class' ? '이 시험의 결과가 아직 없어요' : '학생을 고르면<br>여기에 미리보기가 나와요'; return; }
        em.style.display = 'none';
        fr.srcdoc = b.html.replace('@media screen{body{background:#E9E5E1}.pg{margin:16px auto;box-shadow:0 4px 18px rgba(0,0,0,.18)}}', '');
      }, 80);
    }
    function bind() {
      var b = m.body;
      b.querySelectorAll('[data-mode]').forEach(function (x) { x.onclick = function () { st.mode = x.dataset.mode; setDesign(null); save(); draw(); }; });
      b.querySelectorAll('[data-ds]').forEach(function (x) { x.onclick = function () { setDesign(x.dataset.ds); save(); draw(); }; });
      b.querySelectorAll('[data-pal]').forEach(function (x) { x.onclick = function () { st.pal = x.dataset.pal; save(); draw(); }; });
      var ts = b.querySelector('#wt-rp-test'); if (ts) ts.onchange = function () { st.testId = ts.value; draw(); };
      var f1 = b.querySelector('#wt-rp-from'), f2 = b.querySelector('#wt-rp-to');
      if (f1) f1.onchange = function () { st.from = f1.value; draw(); };
      if (f2) f2.onchange = function () { st.to = f2.value; draw(); };
      b.querySelectorAll('[data-rng]').forEach(function (x) { x.onclick = function () { st.to = U.todayStr(); st.from = U.addDays(st.to, -(+x.dataset.rng - 1)); draw(); }; });
      var pk = b.querySelector('[data-pick]'); if (pk) pk.onclick = function () { opts.pickStudents(st.uids.slice(), function (sel) { st.uids = sel; draw(); }); };
      var al = b.querySelector('[data-alltaken]'); if (al) al.onclick = function () { st.uids = classOfTest(ctx, st.testId).filter(function (q) { return q.r; }).map(function (q) { return q.a.studentUid; }); draw(); };
      var cm = b.querySelector('#wt-rp-cm'); if (cm) cm.oninput = function () { st.comment = cm.value; preview(); };
      m.foot.querySelector('[data-n]').onclick = m.close;
      var go = m.foot.querySelector('[data-go]');
      go.onclick = function () { var bb = build(ctx, opt(false), false); if (!bb.n) return; go.disabled = true; go.textContent = '준비 중…'; PR.doPrint(bb.html, go); };
    }
    draw();
  };
})();
