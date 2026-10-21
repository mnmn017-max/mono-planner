/* =====================================================================
 * 등불(DEUNGBUL) — 모의고사 정밀 복기 시스템 · MONO PLANNER 연동 모듈
 * ---------------------------------------------------------------------
 * index.html(모듈 스크립트)이 window.MP_FB / window.MP_DB_CTX 등을 노출하면
 * 이 파일이 그것을 이용해 아래 기능을 제공한다.
 *   1) 선생님: 등불 데이터(JSON) 업로드 + 시험 정답 자동 대조
 *   2) 채점 직후 학생별 복습지(reviewSheets) 자동 생성 (48시간 기한)
 *   3) 학생: 시험탭 「등불 복습」 카드 + 복습 OMR(복습 체크·쌍둥이 답·오답 원인)
 *   4) 선생님: 현황판(제출/지연/쌍둥이 정답률/문항 통계), 미제출 알림
 *   5) 개인 복습지 · 선생님용 전체본 인쇄(등불 디자인, 문항 지도/빠른 정답 자동 표기)
 * Firestore 컬렉션
 *   deungbulPacks/{examId}               팩 메타 + 정답표 + 단위 목록
 *   deungbulPacks/{examId}/units/{uid}   지문 세트(문항 분석·쌍둥이 포함)
 *   reviewSheets/{sessionId}             학생별 복습지 + 복습 OMR 응답
 *   examSessions.unknownBySubj.{과목idx}  OMR '모름(?)' 표시 문항 번호 배열
 * ===================================================================== */
(function () {
  'use strict';

  var DUE_MS = 48 * 3600 * 1000;
  var CIRC = '①②③④⑤';
  var CAUSES = ['개념 부족', '지문 독해', '선지 판단', '조건 누락', '시간 부족'];
  var ASSET = '/assets/deungbul';
  var ELECTIVES = ['화법과 작문', '언어와 매체'];
  // 과목별 구조: 공통 문항 수, 전체 문항 수, 선택과목
  var SUBJ = {
    ko: { name: '국어', commonMax: 34, total: 45, electives: ['화법과 작문', '언어와 매체'] },
    ma: { name: '수학', commonMax: 22, total: 30, electives: ['확률과 통계', '미적분', '기하'] },
    en: { name: '영어', commonMax: 45, total: 45, electives: [] },
    so: { name: '사회탐구', commonMax: 0, total: 20, electives: ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '정치와 법', '경제', '사회문화'] },
    sc: { name: '과학탐구', commonMax: 0, total: 20, electives: ['물리학Ⅰ', '화학Ⅰ', '생명과학Ⅰ', '지구과학Ⅰ', '물리학Ⅱ', '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ'] }
  };
  var ABBR = { '화법과 작문': '화작', '언어와 매체': '언매', '확률과 통계': '확통', '미적분': '미적', '기하': '기하' };
  function subjOf(m) { return SUBJ[(m && m.subject) || 'ko'] || SUBJ.ko; }
  function abbr(el) { return ABBR[el] || el || '-'; }
  // 정답 표기: 객관식은 ①~⑤, 단답형은 숫자
  function AT(v, t) { if (v == null || v === '') return '-'; return t === 'short' ? String(v) : (CIRC[v - 1] || String(v)); }

  // ------------------------------------------------------------ 공통 헬퍼
  function fb() {
    if (!window.MP_FB) throw new Error('MP_FB 미초기화');
    return window.MP_FB;
  }
  function ctx() { return window.MP_DB_CTX ? window.MP_DB_CTX() : {}; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(x) { var n = Number(x); return isFinite(n) ? String(n) : '-'; }
  function elSquash(t) {
    return String(t).replace(/[\s·ㆍ・.]/g, '').replace(/II$|2$/, 'Ⅱ').replace(/I$|1$/, 'Ⅰ');
  }
  function normEl(e) {
    if (!e) return e;
    var t = String(e).replace(/\s+/g, '');
    if (t === '화작' || t === '화법과작문') return '화법과 작문';
    if (t === '확통' || t === '확률과통계') return '확률과 통계';
    if (t === '미적') return '미적분';
    if (t === '언매' || t === '언어와매체') return '언어와 매체';
    if (t === '생윤') return '생활과 윤리';
    if (t === '윤사') return '윤리와 사상';
    if (t === '사문') return '사회문화';
    if (t === '정법') return '정치와 법';
    var q = elSquash(t);
    for (var k in SUBJ) { var els = SUBJ[k].electives; for (var i = 0; i < els.length; i++) if (elSquash(els[i]) === q) return els[i]; }
    return e;
  }
  // 등불 아이콘: 아이보리 배경 위 금색 등대
  function lhIcon(box, img, radius) {
    return '<span style="display:inline-flex;align-items:center;justify-content:center;flex:none;vertical-align:middle;width:' + box + 'px;height:' + box + 'px;border-radius:' + radius + 'px;background:#FBF1DC"><img src="' + ASSET + '/ic_lighthouse.svg" alt="" style="width:' + img + 'px;height:' + img + 'px;display:block"></span>';
  }
  window.DB_icon = lhIcon;
  // 쌍둥이 문항 섞기 순서: 학생(세션)마다 다르고, 인쇄와 OMR에서 항상 같은 순서. 문항이 추가돼도 기존 문항끼리의 순서는 유지
  function hash32(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function twinOrder(sheet, idx) {
    var sid = String(sheet.sessionId || '');
    return (sheet.items || []).filter(function (x) { return !idx || (idx[x.k] && idx[x.k].item.twin_a); }).sort(function (a, b) { return hash32(sid + '|' + a.k) - hash32(sid + '|' + b.k); })
      .map(function (x, i) { return { k: x.k, t: i + 1, it: x }; });
  }
  function secShort(sec) { return !sec || sec === '공통' ? '' : abbr(sec) + ' '; }
  function now() { return window.MP_nowSynced ? window.MP_nowSynced() : Date.now(); }
  function key(sec, no) { return sec + ':' + no; }
  function sectionOf(no, elective, commonMax) { return no <= (commonMax == null ? 34 : commonMax) ? '공통' : elective; }
  function fmtDT(ms) {
    if (!ms) return '-';
    var d = new Date(ms);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function fmtLeft(ms) {
    if (ms <= 0) return '기한 지남';
    var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h >= 1 ? (h + '시간 ' + m + '분 남음') : (m + '분 남음');
  }

  // 팩 JSON → 출력 단위(지문 세트) 배열 (Python 빌더의 units()와 동일 규칙)
  function flattenUnits(pack) {
    var out = [];
    (pack.sets || []).forEach(function (d) {
      if (d.subsets) {
        d.subsets.forEach(function (s, i) {
          var u = Object.assign({}, s); u.set_id = d.set_id + (i + 1); u.section = d.section; out.push(u);
        });
      } else {
        out.push(Object.assign({}, d));
      }
    });
    return out;
  }

  // ------------------------------------------------------------ 데이터 계층
  var _packCache = {};
  function loadPack(examId, withUnits) {
    var F = fb();
    var c = _packCache[examId];
    if (c && (!withUnits || c.units)) return Promise.resolve(c);
    return F.getDoc(F.doc(F.db, 'deungbulPacks', examId)).then(function (snap) {
      if (!snap.exists()) { _packCache[examId] = null; return null; }
      var meta = snap.data();
      if (!withUnits) { _packCache[examId] = { meta: meta }; return _packCache[examId]; }
      return F.getDocs(F.collection(F.db, 'deungbulPacks', examId, 'units')).then(function (us) {
        var units = us.docs.map(function (d) { return d.data(); });
        units.sort(function (a, b) { return (a._order || 0) - (b._order || 0); });
        _packCache[examId] = { meta: meta, units: units };
        return _packCache[examId];
      });
    });
  }
  function itemIndex(units) {
    var idx = {};
    units.forEach(function (u) { (u.items || []).forEach(function (it) { idx[key(u.section, it.no)] = { unit: u, item: it }; }); });
    return idx;
  }

  // 시험(exams 문서)에서 국어 과목과 선택과목별 정답표를 뽑는다
  // 시험 안에서 이 과목(code)에 해당하는 블록들. 탐구는 예전 구조(subject=so/sc)와
  // 새 구조(subject=ex1/ex2 + exCategory=so/sc)를 모두 찾는다. 탐구1·2가 같은 계열이면 둘 다 후보.
  function examSubjInfos(exam, code) {
    code = code || 'ko';
    var subs = exam.subjects || [], out = [];
    for (var i = 0; i < subs.length; i++) {
      var sb = subs[i];
      var hit = sb.subject === code || ((sb.subject === 'ex1' || sb.subject === 'ex2') && sb.exCategory === code);
      if (!hit) continue;
      var byEl = {};
      var hasByEl = sb.questionsByElective && Object.keys(sb.questionsByElective).some(function (k) { return (sb.questionsByElective[k] || []).length; });
      if (hasByEl) {
        Object.keys(sb.questionsByElective).forEach(function (el) {
          var qs = sb.questionsByElective[el];
          if (qs && qs.length) byEl[normEl(el)] = qs;
        });
      }
      out.push({ index: i, subj: sb, byElective: byEl, base: sb.questions || [], options: (sb.electiveOptions || []).map(normEl) });
    }
    return out;
  }
  // els(등불 선택과목 목록)를 다루는 블록을 우선으로 하나 고른다
  function examKoInfo(exam, code, els) {
    var infos = examSubjInfos(exam, code);
    if (!infos.length) return null;
    if (els && els.length) {
      for (var i = 0; i < infos.length; i++) {
        var f = infos[i];
        if (els.some(function (el) { return f.byElective[el] || f.options.indexOf(el) >= 0; })) return f;
      }
    }
    return infos[0];
  }
  function answerMap(qs) {
    var m = {};
    (qs || []).forEach(function (q) {
      if (q.type === 'mc' || q.type == null) m[q.no] = parseInt(q.answer, 10);
      else if (q.type === 'short' && String(q.answer).trim() !== '' && !isNaN(Number(q.answer))) m[q.no] = Number(q.answer);
    });
    return m;
  }

  // 업로드 전 검증: 팩 정답표 vs 시험 정답
  function validatePack(pack, exam) {
    var report = { ok: true, errors: [], warnings: [], electives: [] };
    if (!pack || !pack.answer_key || !pack.sets) { report.ok = false; report.errors.push('등불 데이터 형식이 아닙니다(answer_key/sets 없음).'); return report; }
    var S = subjOf(pack), code = pack.subject || 'ko';
    var packEls0 = Object.keys(pack.answer_key).filter(function (k) { return k !== '공통'; });
    var info = examKoInfo(exam, code, packEls0);
    if (!info) { report.ok = false; report.errors.push('이 시험에 ' + S.name + ' 과목이 없습니다. (등불 데이터는 ' + S.name + ')'); return report; }
    var CM = S.commonMax, TOT = S.total;
    var common = pack.answer_key['공통'] || {};
    var packEls = Object.keys(pack.answer_key).filter(function (k) { return k !== '공통'; });
    report.electives = packEls;
    function cmp(qs, label, sec, from, to) {
      var am = answerMap(qs), bad = [];
      for (var n = from; n <= to; n++) {
        var pk = pack.answer_key[sec] && pack.answer_key[sec][String(n)];
        if (!pk) { bad.push(n + '번(등불 데이터에 없음)'); continue; }
        if (am[n] == null) { bad.push(n + '번(시험에 정답 없음)'); continue; }
        if (am[n] !== Number(pk.answer)) bad.push(n + '번(시험 ' + AT(am[n], pk.type) + ' / 등불 ' + AT(pk.answer, pk.type) + ')');
      }
      if (bad.length) { report.ok = false; report.errors.push(label + ' 정답 불일치: ' + bad.join(', ')); }
    }
    if (!S.electives.length) { cmp(info.base, S.name, '공통', 1, TOT); report.electives = []; return report; }
    var hasEl = Object.keys(info.byElective).length > 0;
    if (hasEl) {
      if (!packEls.some(function (el) { return info.byElective[el]; })) {
        report.ok = false;
        report.errors.push('시험의 선택과목(' + Object.keys(info.byElective).join(', ') + ')과 등불 데이터의 선택과목(' + packEls.join(', ') + ')이 하나도 맞지 않습니다.');
        return report;
      }
      packEls.forEach(function (el) {
        var qs = info.byElective[el];
        if (!qs) { report.warnings.push('시험에 「' + el + '」 선택과목 문항이 설정되어 있지 않습니다. 이 선택과목 학생은 복습지가 만들어지지 않습니다.'); return; }
        cmp(qs, '공통(' + el + ' 기준)', '공통', 1, CM);
        cmp(qs, el, el, CM + 1, TOT);
      });
    } else {
      cmp(info.base, '공통', '공통', 1, CM);
      var matched = packEls.filter(function (el) {
        var am = answerMap(info.base);
        for (var n = CM + 1; n <= TOT; n++) { var pk = pack.answer_key[el][String(n)]; if (!pk || am[n] !== Number(pk.answer)) return false; }
        return true;
      });
      if (!matched.length) { report.ok = false; report.errors.push('시험의 ' + (CM + 1) + '~' + TOT + '번 정답이 등불 데이터의 어느 선택과목과도 일치하지 않습니다.'); }
      else report.warnings.push('시험에 선택과목 구분이 없어, ' + (CM + 1) + '~' + TOT + '번은 「' + matched[0] + '」로 처리합니다.');
      report.singleElective = matched[0] || null;
    }
    return report;
  }

  function uploadPack(examId, exam, pack, report) {
    var F = fb(), c = ctx();
    var units = flattenUnits(pack);
    var meta = {
      examId: examId, branch: c.branch || null, examTitle: exam.title || '', format: pack.format || 'deungbul-pack/1',
      packVersion: pack.version || '', subject: pack.subject || 'ko', display: pack.display || { line1: exam.title || '', line2: subjOf(pack).name + ' 영역', short: exam.title || '' },
      answerKey: pack.answer_key, electives: report.electives, singleElective: report.singleElective || null,
      unitIndex: units.map(function (u, i) { return { id: u.set_id, order: i, section: u.section || '', range: u.range || '', area: u.area || '', title: u.title || '', nos: (u.items || []).map(function (x) { return x.no; }) }; }),
      uploadedAt: F.serverTimestamp(), uploadedBy: c.user ? c.user.uid : null, uploadedByName: c.profile ? c.profile.name : ''
    };
    // 이전 단위 문서 정리 후 새로 기록
    return F.getDocs(F.collection(F.db, 'deungbulPacks', examId, 'units')).then(function (old) {
      return Promise.all(old.docs.map(function (d) { return F.deleteDoc(d.ref); }));
    }).then(function () {
      return Promise.all(units.map(function (u, i) {
        var data = Object.assign({}, u, { _order: i });
        return F.setDoc(F.doc(F.db, 'deungbulPacks', examId, 'units', u.set_id), data);
      }));
    }).then(function () {
      return F.setDoc(F.doc(F.db, 'deungbulPacks', examId), meta);
    }).then(function () { delete _packCache[examId]; });
  }

  // ------------------------------------------------------------ 복습지 생성
  // 세션(채점 완료) → 국어 결과 → 오답/모름 문항 → reviewSheets/{sessionId}
  function buildSheetData(sess, exam, packMeta) {
    var S = subjOf(packMeta);
    var infos = examSubjInfos(exam, packMeta.subject || 'ko');
    if (!infos.length) return null;
    var ec = sess.electiveChoices || {};
    var info = null;
    if (S.electives.length) {
      // 학생이 이 등불의 선택과목을 고른 블록(탐구1/탐구2 중)을 찾는다
      for (var ii = 0; ii < infos.length; ii++) { var ch = normEl(ec[infos[ii].index] || ec[String(infos[ii].index)]); if (ch && packMeta.answerKey[ch]) { info = infos[ii]; break; } }
      if (!info && infos.length === 1) info = infos[0];
      if (!info) return { skip: '이 등불 선택과목을 응시하지 않음' };
    } else info = infos[0];
    var r = (sess.subjectResults || [])[info.index];
    if (!r || !r.answers) return null;
    var elective = S.electives.length ? normEl(ec[info.index] || ec[String(info.index)] || packMeta.singleElective || null) : '';
    if (S.electives.length && (!elective || S.electives.indexOf(elective) < 0 || !packMeta.answerKey[elective])) return { skip: '선택과목 정보 없음(' + (elective || '-') + ')' };
    var unk = (sess.unknownBySubj && (sess.unknownBySubj[info.index] || sess.unknownBySubj[String(info.index)])) || [];
    var unkSet = {}; unk.forEach(function (n) { unkSet[parseInt(n, 10)] = true; });
    var all = [];
    r.answers.forEach(function (a) {
      var no = parseInt(a.no, 10); if (!(no >= 1 && no <= S.total)) return;
      var sec = sectionOf(no, elective, S.commonMax);
      var pk = packMeta.answerKey[sec] && packMeta.answerKey[sec][String(no)];
      if (!pk) return;
      var my = a.studentAnswer != null && String(a.studentAnswer).trim() !== '' ? Number(String(a.studentAnswer).trim()) : null;
      all.push({ k: key(sec, no), sec: sec, no: no, type: pk.type || 'mc', my: my == null || isNaN(my) ? null : my, correct: pk.answer, ok: !!a.isCorrect, unk: !!unkSet[no], pts: pk.points || a.point || 2 });
    });
    all.sort(function (a, b) { return a.no - b.no; });
    var items = all.filter(function (x) { return !x.ok || x.unk; }).map(function (x) {
      return { k: x.k, sec: x.sec, no: x.no, type: x.type, my: x.my, correct: x.correct, status: x.ok ? 'unknown' : (x.unk ? 'wrong+unknown' : 'wrong'), pts: x.pts };
    });
    return { elective: elective, all: all, items: items, score: r.score, totalScore: r.totalScore };
  }

  function ensureSheet(sessionId, opts) {
    opts = opts || {};
    var F = fb();
    return F.getDoc(F.doc(F.db, 'examSessions', sessionId)).then(function (ss) {
      if (!ss.exists()) return { status: 'no-session' };
      var sess = Object.assign({ id: ss.id }, ss.data());
      if (sess.status !== 'graded') return { status: 'not-graded' };
      return Promise.all([
        F.getDoc(F.doc(F.db, 'exams', sess.examId)),
        loadPack(sess.examId, false),
        F.getDoc(F.doc(F.db, 'reviewSheets', sessionId))
      ]).then(function (res) {
        if (!res[0].exists()) return { status: 'no-exam' };
        var exam = Object.assign({ id: res[0].id }, res[0].data());
        var pack = res[1];
        if (!pack) return { status: 'no-pack' };
        var data = buildSheetData(sess, exam, pack.meta);
        if (!data) return { status: 'no-ko' };
        if (data.skip) return { status: 'skip', reason: data.skip };
        var existing = res[2].exists() ? res[2].data() : null;
        var sig = data.items.map(function (x) { return x.k + x.status; }).join('|') + '#' + data.all.map(function (x) { return x.my; }).join(',');
        if (existing && existing.sig === sig && !opts.force) return { status: 'unchanged' };
        var c = ctx();
        var doc = {
          uid: sess.studentUid, branch: sess.branch || c.branch || null, sessionId: sessionId, examId: sess.examId, examTitle: exam.title || '',
          elective: data.elective, items: data.items, all: data.all, score: data.score, totalScore: data.totalScore,
          wrongCount: data.items.filter(function (x) { return x.status !== 'unknown'; }).length,
          unknownCount: data.items.filter(function (x) { return x.status !== 'wrong'; }).length,
          sig: sig, updatedAt: F.serverTimestamp()
        };
        if (!existing) {
          var t = now();
          // 채점 직후에는 '발행 대기'로만 만들어 둔다. 학생 OMR·48시간은 선생님이 발행하는 순간 시작.
          // 복습할 문항이 없으면(전부 맞히고 '모름'도 없음) 제출 대상이 아님
          Object.assign(doc, { status: data.items.length ? 'pending' : 'clear', createdAtMs: t, dueAtMs: null, reviewAnswers: {}, createdAt: F.serverTimestamp() });
          if (opts.studentName) doc.studentName = opts.studentName;
          return F.setDoc(F.doc(F.db, 'reviewSheets', sessionId), doc).then(function () { return { status: 'created', items: data.items.length }; });
        }
        // 재채점 등으로 내용이 바뀐 경우: 기존 응답·기한은 유지, 문항 목록만 갱신
        if (existing.status === 'clear' && data.items.length) { doc.status = 'pending'; doc.dueAtMs = null; }
        if (!data.items.length && existing.status !== 'submitted') doc.status = 'clear';
        if (existing.status === 'submitted') doc.needsResubmit = data.items.some(function (x) { return !(existing.reviewAnswers || {})[x.k]; });
        return F.updateDoc(F.doc(F.db, 'reviewSheets', sessionId), doc).then(function () { return { status: 'updated', items: data.items.length }; });
      });
    }).catch(function (e) { console.warn('[등불] 복습지 생성 실패', sessionId, e); return { status: 'error', error: e.message }; });
  }

  // 선생님 발행: 발행 대기 → 학생 시험탭 OMR 열림 + 48시간 시작 + 알림
  function publishSheets(sheets, ids, examTitle) {
    var F = fb(), c = ctx(), t = now();
    var targets = ids.filter(function (id) { return sheets[id] && sheets[id].status === 'pending'; });
    return Promise.all(targets.map(function (id) {
      var upd = { status: 'assigned', issuedAtMs: t, dueAtMs: t + DUE_MS, issuedBy: (c.user && c.user.uid) || null };
      return F.updateDoc(F.doc(F.db, 'reviewSheets', id), upd).then(function () { Object.assign(sheets[id], upd); return id; });
    })).then(function (done) {
      var uids = done.map(function (id) { return sheets[id].uid; }).filter(Boolean);
      if (uids.length && window.MP_push) {
        try { window.MP_push(uids, '[등불] 복습지가 도착했어요', '「' + (examTitle || '') + '」 복습 OMR이 시험탭에 열렸어요. ' + fmtDT(t + DUE_MS) + '까지 제출해 주세요.', { type: 'deungbul' }); } catch (e) {}
      }
      return done.length;
    });
  }

  // 채점 직후 index.html에서 호출됨
  window.DB_onExamGraded = function (sessionId) {
    try { return ensureSheet(sessionId).then(function (r) { if (r && r.status === 'created') console.log('[등불] 복습지 생성', sessionId, r); return r; }); }
    catch (e) { console.warn('[등불] onExamGraded', e); }
  };

  // ------------------------------------------------------------ 스타일(앱 화면용)
  var APP_CSS = '' +
    '.db-ov{position:fixed;inset:0;z-index:9000;background:rgba(26,16,16,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}' +
    '.db-panel{background:var(--bg,#F7F4F0);border-radius:16px;width:100%;max-width:980px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden}' +
    '.db-ph{display:flex;align-items:center;gap:10px;padding:16px 18px;background:linear-gradient(135deg,#7B1D1D,#9B2D2D);color:#fff}' +
    '.db-ph h3{font-size:16px;font-weight:800;flex:1;margin:0}.db-ph small{display:block;font-size:11px;opacity:.85;font-weight:500}' +
    '.db-x{background:rgba(255,255,255,.15);border:0;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer}' +
    '.db-body{padding:16px 18px}.db-sec{background:#fff;border:1px solid var(--border,rgba(123,29,29,.1));border-radius:12px;padding:14px;margin-bottom:12px}' +
    '.db-sec h4{font-size:13px;font-weight:800;color:var(--burg,#7B1D1D);margin:0 0 10px}' +
    '.db-btn{font-size:12px;font-weight:700;padding:8px 12px;border-radius:8px;border:1px solid var(--border,rgba(123,29,29,.15));background:var(--surface2,#F2EDE6);color:var(--tx2,#3D2B2B);cursor:pointer;margin:0 6px 6px 0}' +
    '.db-btn.p{background:var(--burg,#7B1D1D);color:#fff;border-color:var(--burg,#7B1D1D)}.db-btn.g{background:var(--gold-l,rgba(184,132,26,.08));color:var(--gold,#B8841A);border-color:rgba(184,132,26,.3)}' +
    '.db-btn:disabled{opacity:.45;cursor:default}' +
    '.db-note{font-size:12px;color:var(--tx3,#7A6060);line-height:1.6}.db-err{font-size:12px;color:var(--red,#B91C1C);line-height:1.6}.db-ok{font-size:12px;color:var(--green,#1B6B3A);line-height:1.6}' +
    '.db-tbl{width:100%;border-collapse:collapse;font-size:12px}.db-tbl th{background:var(--surface2,#F2EDE6);color:var(--tx2);font-weight:700;padding:7px 6px;text-align:center;white-space:nowrap}' +
    '.db-tbl td{padding:7px 6px;border-bottom:1px solid var(--border2,rgba(123,29,29,.06));text-align:center}.db-tbl td.l{text-align:left}' +
    '.db-badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}' +
    '.db-b-ok{background:#dcfce7;color:#1B6B3A}.db-b-late{background:#fee2e2;color:#B91C1C}.db-b-wait{background:#FFF4DC;color:#9a6a0c}.db-b-none{background:#EEE;color:#888}.db-b-over{background:#B91C1C;color:#fff}' +
    '.db-scroll{overflow-x:auto}' +
    /* 학생 카드 */
    '.db-card{background:linear-gradient(135deg,#1a2338,#0f1626);color:#F3E7CF;border-radius:14px;padding:16px;margin-bottom:12px;display:flex;gap:14px;align-items:center;cursor:pointer;border:1px solid rgba(212,160,74,.35)}' +
    '.db-omr-h{margin:14px 2px 6px;font-size:13px;font-weight:800;color:var(--tx,#2A1A12)}' +
    '.db-card .lamp{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center}' +
    '.db-card .t{font-size:15px;font-weight:800;color:#F6E9CC}.db-card .s{font-size:12px;color:#D8C6A2;margin-top:3px}.db-card .r{margin-left:auto;text-align:right;font-size:12px;white-space:nowrap}' +
    '.db-card.done{background:var(--surface,#fff);color:var(--tx1);border-color:var(--border)}.db-card.done .t{color:var(--tx1)}.db-card.done .s{color:var(--tx3)}' +
    /* 복습 OMR */
    '.db-omr-row{background:#fff;border:1px solid var(--border,rgba(123,29,29,.1));border-radius:12px;padding:12px;margin-bottom:10px}' +
    '.db-omr-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}' +
    '.db-no{font-size:18px;font-weight:800;color:var(--burg,#7B1D1D);min-width:34px}.db-st{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}' +
    '.db-st.w{background:#fee2e2;color:#B91C1C}.db-st.u{background:#FFF4DC;color:#9a6a0c}.db-mya{font-size:12px;color:var(--tx3)}' +
    '.db-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px}.db-lab{font-size:11px;font-weight:700;color:var(--tx3);min-width:64px}' +
    '.db-bub{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--tx4,#B0A0A0);background:#fff;font-size:14px;font-weight:700;color:var(--tx2);cursor:pointer}' +
    '.db-bub.on{background:var(--burg,#7B1D1D);border-color:var(--burg,#7B1D1D);color:#fff}' +
    '.db-chip{font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid var(--border,rgba(123,29,29,.15));background:var(--surface2,#F2EDE6);color:var(--tx2);cursor:pointer}' +
    '.db-chip.on{background:var(--gold,#B8841A);border-color:var(--gold,#B8841A);color:#fff}' +
    '.db-chk{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--tx2);cursor:pointer;padding:6px 10px;border-radius:8px;background:var(--surface2,#F2EDE6)}' +
    '.db-chk.on{background:#dcfce7;color:#1B6B3A}' +
    '.db-res{margin-top:8px;padding:10px;border-radius:10px;font-size:12px;line-height:1.7}.db-res.o{background:#ecfdf3;color:#14532d}.db-res.x{background:#fff1f1;color:#7f1d1d}' +
    '.db-sticky{position:sticky;bottom:0;background:var(--bg,#F7F4F0);padding:12px 0 4px;display:flex;gap:8px;align-items:center}' +
    /* OMR '모름' 토글 */
    '.omr-unk{flex:none;width:30px;height:30px;margin-left:6px;border-radius:8px;border:1.5px dashed var(--tx4,#B0A0A0);background:transparent;color:var(--tx3,#7A6060);font-weight:800;font-size:14px;cursor:pointer}' +
    '.omr-unk.on{background:#FFF4DC;border:1.5px solid var(--gold,#B8841A);color:var(--gold,#B8841A)}';
  function injectCss() {
    if (document.getElementById('db-app-css')) return;
    var s = document.createElement('style'); s.id = 'db-app-css'; s.textContent = APP_CSS; document.head.appendChild(s);
  }
  injectCss();

  function overlay(id, title, sub) {
    var old = document.getElementById(id); if (old) old.remove();
    var ov = document.createElement('div'); ov.className = 'db-ov'; ov.id = id;
    ov.innerHTML = '<div class="db-panel"><div class="db-ph">' + lhIcon(30, 23, 8) + '<h3>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h3><button class="db-x" title="닫기">✕</button></div><div class="db-body">불러오는 중...</div></div>';
    ov.querySelector('.db-x').onclick = function () { ov.remove(); };
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return ov.querySelector('.db-body');
  }

  // ------------------------------------------------------------ 선생님 현황판
  window.DB_openTeacherPanel = function (examId) {
    var F = fb();
    var body = overlay('db-teacher', '등불 · 복습 관리', '');
    var state = { examId: examId };
    function load() {
      body.innerHTML = '<div class="db-note">불러오는 중...</div>';
      return Promise.all([
        F.getDoc(F.doc(F.db, 'exams', examId)),
        loadPack(examId, false).catch(function () { return null; }),
        F.getDocs(F.query(F.collection(F.db, 'examSessions'), F.where('examId', '==', examId))),
        F.getDocs(F.query(F.collection(F.db, 'reviewSheets'), F.where('examId', '==', examId))),
        window.MP_loadStudentList ? window.MP_loadStudentList() : Promise.resolve([])
      ]).then(function (r) {
        state.exam = Object.assign({ id: examId }, r[0].data() || {});
        state.pack = r[1];
        state.sessions = r[2].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        state.sheets = {}; r[3].docs.forEach(function (d) { state.sheets[d.id] = d.data(); });
        state.names = {}; (r[4] || []).forEach(function (s) { state.names[s.uid] = s.name; });
        var ph = document.querySelector('#db-teacher .db-ph h3');
        if (ph) ph.innerHTML = '등불 · 복습 관리<small>' + esc(state.exam.title || '') + '</small>';
        render();
      }).catch(function (e) { body.innerHTML = '<div class="db-err">불러오기 실패: ' + esc(e.message) + '<br>Firestore 보안 규칙에 deungbulPacks / reviewSheets 컬렉션 권한이 있는지 확인해 주세요.</div>'; });
    }
    function render() {
      var p = state.pack, h = '';
      // 1) 데이터 연결
      h += '<div class="db-sec"><h4>① 등불 데이터</h4>';
      if (p) {
        var m = p.meta, at = m.uploadedAt && m.uploadedAt.toDate ? m.uploadedAt.toDate().getTime() : null;
        h += '<div class="db-ok">✔ 연결됨 · ' + esc(m.display && m.display.short || '') + ' · 버전 ' + esc(m.packVersion || '-') + ' · 업로드 ' + fmtDT(at) + (m.uploadedByName ? ' (' + esc(m.uploadedByName) + ')' : '') + '</div>';
        h += '<div class="db-note">선택과목: ' + esc((m.electives || []).join(', ')) + ' · 지문 세트 ' + (m.unitIndex || []).length + '개</div>';
      } else {
        h += '<div class="db-note">아직 연결된 등불 데이터가 없습니다. 「앱 업로드용 문항데이터.json」 파일을 올려 주세요. 올리는 즉시 시험 정답과 자동 대조합니다.</div>';
      }
      h += '<div style="margin-top:10px"><label class="db-btn p" style="display:inline-block">' + (p ? '데이터 다시 올리기' : '등불 데이터 올리기') + '<input type="file" accept=".json,application/json" id="db-pack-file" style="display:none"></label>';
      if (p && !(p.meta.electives || []).length) h += '<button class="db-btn" data-tprint="">🖨 선생님용 전체본(보기·인쇄)</button>';
      if (p) (p.meta.electives || []).forEach(function (el) { h += '<button class="db-btn" data-tprint="' + esc(el) + '">🖨 선생님용 전체본(보기·인쇄) · ' + esc(abbr(el)) + '</button>'; });
      h += '</div><div id="db-val"></div></div>';

      // 2) 학생 현황
      var graded = state.sessions.filter(function (s) { return s.status === 'graded'; });
      var rows = state.sessions.map(function (s) {
        var sh = state.sheets[s.id];
        var st, cls;
        if (s.status !== 'graded') { st = s.status === 'not_started' ? '미응시' : '응시중/채점 전'; cls = 'db-b-none'; }
        else if (!sh) { st = '복습지 미생성'; cls = 'db-b-none'; }
        else if (sh.status === 'clear') { st = '복습 문항 없음'; cls = 'db-b-ok'; }
        else if (sh.status === 'pending') { st = '발행 대기'; cls = 'db-b-none'; }
        else if (sh.status === 'submitted') { st = sh.late ? '지연 제출' : '제출 완료'; cls = sh.late ? 'db-b-late' : 'db-b-ok'; }
        else if (now() > sh.dueAtMs) { st = '미제출 · 기한 지남'; cls = 'db-b-over'; }
        else { st = '진행 중 · ' + fmtLeft(sh.dueAtMs - now()); cls = 'db-b-wait'; }
        return { s: s, sh: sh, st: st, cls: cls, name: state.names[s.studentUid] || (sh && sh.studentName) || '?' };
      }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
      var submitted = rows.filter(function (r) { return r.sh && r.sh.status === 'submitted'; });
      var late = submitted.filter(function (r) { return r.sh.late; }).length;
      var missing = graded.filter(function (s) { return !state.sheets[s.id]; }).length;
      var pendingN = rows.filter(function (r) { return r.sh && r.sh.status === 'pending'; }).length;
      h += '<div class="db-sec"><h4>② 학생별 복습 현황</h4>';
      h += '<div class="db-note" style="margin-bottom:8px">채점 완료 ' + graded.length + '명 · 복습지 ' + Object.keys(state.sheets).length + '건 · 제출 ' + submitted.length + '명(지연 ' + late + ') · 발행 대기 ' + pendingN + '명 · 복습지 미생성 ' + missing + '명</div>';
      h += '<div class="db-note" style="margin-bottom:8px">채점되면 복습지가 「발행 대기」로 만들어집니다. 인쇄해서 나눠 줄 때 「발행」하면 그때부터 학생 시험탭에 OMR이 열리고 48시간이 시작됩니다.</div>';
      h += '<div style="margin-bottom:8px">';
      h += '<button class="db-btn g" id="db-gen-sel" ' + (p ? '' : 'disabled') + '>선택한 학생 복습지 생성 · 갱신</button>';
      h += '<button class="db-btn g" id="db-gen" ' + (p ? '' : 'disabled') + '>복습지 일괄 생성 · 갱신</button>';
      h += '<button class="db-btn p" id="db-print-sel" ' + (p ? '' : 'disabled') + '>🖨 선택한 학생 복습지 인쇄</button>';
      h += '<button class="db-btn g" id="db-pub-sel">📮 선택한 학생 발행</button>';
      h += '<button class="db-btn g" id="db-pub-all"' + (pendingN ? '' : ' disabled') + '>📮 발행 대기 ' + pendingN + '명 일괄 발행</button>';
      h += '<button class="db-btn" id="db-remind">🔔 미제출 학생 알림</button></div>';
      h += '<div class="db-scroll"><table class="db-tbl"><thead><tr><th><input type="checkbox" id="db-allchk" style="width:18px;height:18px;accent-color:#7B1D1D;cursor:pointer" title="전체 선택"></th><th>이름</th><th>선택</th><th>점수</th><th>오답</th><th>모름</th><th>상태</th><th>마감</th><th>쌍둥이</th><th>제출</th><th>인쇄</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var sh = r.sh;
        h += '<tr><td>' + (r.s.status === 'graded' ? '<input type="checkbox" class="db-chk-row" value="' + r.s.id + '" style="width:18px;height:18px;accent-color:#7B1D1D;cursor:pointer">' : '') + '</td>' +
          '<td class="l"><b>' + esc(r.name) + '</b></td><td>' + esc(sh ? abbr(sh.elective) : '-') + '</td>' +
          '<td>' + (sh ? num(sh.score) : '-') + '</td><td>' + (sh ? num(sh.wrongCount) : '-') + '</td><td>' + (sh ? num(sh.unknownCount) : '-') + '</td>' +
          '<td><span class="db-badge ' + r.cls + '">' + esc(r.st) + '</span>' + (sh && sh.needsResubmit ? '<br><span class="db-badge db-b-wait">재채점으로 문항 추가됨</span>' : '') + '</td>' +
          '<td>' + (sh && sh.dueAtMs ? fmtDT(sh.dueAtMs) : '-') + '</td>' +
          '<td>' + (sh && sh.status === 'submitted' ? (num(sh.twinCorrect) + '/' + num(sh.twinTotal)) : '-') + '</td>' +
          '<td>' + (sh && sh.submittedAtMs ? fmtDT(sh.submittedAtMs) : '-') + '</td>' +
          '<td>' + (r.s.status === 'graded' ? '<button class="db-btn" style="margin:0;padding:5px 9px" data-print="' + r.s.id + '">🖨</button>' + (sh && sh.printedAtMs ? '<div class="db-note" style="font-size:10px">' + fmtDT(sh.printedAtMs) + '</div>' : '') : '') + '</td></tr>';
      });
      h += '</tbody></table></div></div>';

      // 3) 문항 통계
      h += '<div class="db-sec"><h4>③ 문항별 통계 (오답·모름·쌍둥이 오답·오답 원인)</h4>' + statsHtml() + '</div>';
      body.innerHTML = h;
      bind();
    }
    function statsHtml() {
      var st = {};
      Object.keys(state.sheets).forEach(function (sid) {
        var sh = state.sheets[sid];
        (sh.items || []).forEach(function (it) {
          if (!/^(공통|화법과 작문|언어와 매체):\d+$/.test(String(it.k))) return;
          var o = st[it.k] || (st[it.k] = { k: it.k, sec: it.sec, no: it.no, wrong: 0, unk: 0, twinX: 0, causes: {} });
          if (it.status !== 'unknown') o.wrong++;
          if (it.status !== 'wrong') o.unk++;
          var ra = (sh.reviewAnswers || {})[it.k];
          if (sh.status === 'submitted' && ra) {
            if (ra.twinOk === false) o.twinX++;
            if (ra.cause) o.causes[ra.cause] = (o.causes[ra.cause] || 0) + 1;
          }
        });
      });
      var arr = Object.keys(st).map(function (k) { return st[k]; }).sort(function (a, b) { return (b.wrong + b.unk) - (a.wrong + a.unk) || a.no - b.no; });
      if (!arr.length) return '<div class="db-note">아직 복습지가 없습니다.</div>';
      var h = '<div class="db-scroll"><table class="db-tbl"><thead><tr><th>문항</th><th>오답</th><th>모름</th><th>쌍둥이 오답</th><th class="l">오답 원인(학생 선택)</th></tr></thead><tbody>';
      arr.slice(0, 25).forEach(function (o) {
        var cs = Object.keys(o.causes).sort(function (a, b) { return o.causes[b] - o.causes[a]; }).map(function (c) { return c + ' ' + o.causes[c]; }).join(' · ');
        h += '<tr><td><b>' + secShort(o.sec) + num(o.no) + '번</b></td><td>' + o.wrong + '</td><td>' + o.unk + '</td><td>' + o.twinX + '</td><td class="l">' + esc(cs || '-') + '</td></tr>';
      });
      return h + '</tbody></table></div>';
    }
    function bind() {
      var f = document.getElementById('db-pack-file');
      if (f) f.onchange = function () {
        var file = f.files[0]; if (!file) return;
        var val = document.getElementById('db-val');
        val.innerHTML = '<div class="db-note">파일 확인 중...</div>';
        file.text().then(function (txt) {
          var pack; try { pack = JSON.parse(txt); } catch (e) { val.innerHTML = '<div class="db-err">JSON 파일을 읽을 수 없습니다.</div>'; return; }
          var rep = validatePack(pack, state.exam);
          var html = rep.errors.map(function (x) { return '<div class="db-err">✖ ' + esc(x) + '</div>'; }).join('') + rep.warnings.map(function (x) { return '<div class="db-note">⚠ ' + esc(x) + '</div>'; }).join('');
          if (!rep.ok) { val.innerHTML = html + '<div class="db-err" style="margin-top:6px">정답이 맞지 않아 업로드를 중단했습니다. 시험 정답 또는 데이터 파일을 확인해 주세요.</div>'; return; }
          val.innerHTML = html + '<div class="db-ok">✔ 시험 정답과 모두 일치합니다. 저장 중...</div>';
          uploadPack(state.examId, state.exam, pack, rep).then(function () {
            val.innerHTML = '<div class="db-ok">✔ 저장 완료. 이제 「복습지 일괄 생성」을 눌러 이미 채점된 학생들의 복습지를 만드세요.</div>';
            return load();
          }).catch(function (e) { val.innerHTML = '<div class="db-err">저장 실패: ' + esc(e.message) + '</div>'; });
        });
      };
      function genFor(btn, list) {
        btn.disabled = true; btn.textContent = '생성 중...';
        var res = { created: 0, updated: 0, unchanged: 0, skip: [] };
        var chain = Promise.resolve();
        list.forEach(function (s) {
          chain = chain.then(function () {
            return ensureSheet(s.id, { studentName: state.names[s.studentUid] }).then(function (r) {
              if (r.status === 'created') res.created++; else if (r.status === 'updated') res.updated++; else if (r.status === 'unchanged') res.unchanged++;
              else res.skip.push((state.names[s.studentUid] || '?') + ': ' + (r.reason || r.error || r.status));
            });
          });
        });
        chain.then(function () {
          alert('복습지 생성 완료\n새로 생성 ' + res.created + ' · 갱신 ' + res.updated + ' · 변경 없음 ' + res.unchanged + (res.skip.length ? '\n\n건너뜀:\n' + res.skip.join('\n') : '') + '\n\n만들어진 복습지는 「발행 대기」 상태입니다. 나눠 줄 때 발행해 주세요.');
          load();
        });
      }
      var g = document.getElementById('db-gen');
      if (g) g.onclick = function () { genFor(g, state.sessions.filter(function (s) { return s.status === 'graded'; })); };
      var gs = document.getElementById('db-gen-sel');
      if (gs) gs.onclick = function () {
        var ids = Array.prototype.map.call(document.querySelectorAll('.db-chk-row:checked'), function (c) { return c.value; });
        if (!ids.length) { alert('복습지를 만들 학생을 선택해 주세요.'); return; }
        genFor(gs, state.sessions.filter(function (s) { return s.status === 'graded' && ids.indexOf(s.id) >= 0; }));
      };
      var all = document.getElementById('db-allchk');
      if (all) all.onchange = function () { document.querySelectorAll('.db-chk-row').forEach(function (c) { c.checked = all.checked; }); };
      body.querySelectorAll('[data-print]').forEach(function (b) { b.onclick = function () { printSheets(state, [b.getAttribute('data-print')], load); }; });
      var ps = document.getElementById('db-print-sel');
      if (ps) ps.onclick = function () {
        var ids = Array.prototype.map.call(document.querySelectorAll('.db-chk-row:checked'), function (c) { return c.value; });
        if (!ids.length) { alert('인쇄할 학생을 선택해 주세요.'); return; }
        printSheets(state, ids, load);
      };
      function pubConfirm(ids) {
        ensureMissing(state, ids).then(function () { pubConfirm2(ids); }).catch(function (e) { alert('복습지 생성 실패: ' + e.message); });
      }
      function pubConfirm2(ids) {
        var pend = ids.filter(function (id) { return state.sheets[id] && state.sheets[id].status === 'pending'; });
        if (!pend.length) { alert('발행 대기 중인 학생이 없습니다. (이미 발행했거나 복습 문항이 없는 학생은 제외됩니다)'); return; }
        var names = pend.map(function (id) { var sh = state.sheets[id]; return state.names[sh.uid] || sh.studentName || '?'; });
        if (!confirm(pend.length + '명에게 복습지를 발행할까요?\n' + names.join(', ') + '\n\n지금부터 48시간(' + fmtDT(now() + DUE_MS) + ' 마감) 카운트가 시작되고 학생에게 알림이 갑니다.')) return;
        publishSheets(state.sheets, pend, state.exam.title).then(function (n) { alert(n + '명 발행 완료'); load(); }).catch(function (e) { alert('발행 실패: ' + e.message); });
      }
      var pbs = document.getElementById('db-pub-sel');
      if (pbs) pbs.onclick = function () {
        var ids = Array.prototype.map.call(document.querySelectorAll('.db-chk-row:checked'), function (c) { return c.value; });
        if (!ids.length) { alert('발행할 학생을 선택해 주세요.'); return; }
        pubConfirm(ids);
      };
      var pba = document.getElementById('db-pub-all');
      if (pba) pba.onclick = function () { pubConfirm(Object.keys(state.sheets)); };
      body.querySelectorAll('[data-tprint]').forEach(function (b) { b.onclick = function () { printTeacherBook(state, b.getAttribute('data-tprint')); }; });
      var rm = document.getElementById('db-remind');
      if (rm) rm.onclick = function () {
        var targets = Object.keys(state.sheets).map(function (k) { return state.sheets[k]; }).filter(function (sh) { return sh.status === 'assigned' || sh.needsResubmit; });
        if (!targets.length) { alert('미제출 학생이 없습니다.'); return; }
        if (!confirm('미제출 학생 ' + targets.length + '명에게 알림을 보낼까요?')) return;
        if (window.MP_push) window.MP_push(targets.map(function (s) { return s.uid; }), '[등불] 복습 제출 안내', '「' + (state.exam.title || '') + '」 복습 OMR을 제출해 주세요. 기한이 지나면 지연으로 표시됩니다.', { type: 'deungbul' });
        alert('알림을 보냈습니다.');
      };
    }
    load();
  };

  // ------------------------------------------------------------ 학생: 시험탭 카드
  window.DB_renderStudentReviews = function () {
    var host = document.getElementById('db-review-host');
    var c = ctx();
    if (!host || !c.user) return;
    var F = fb();
    F.getDocs(F.query(F.collection(F.db, 'reviewSheets'), F.where('uid', '==', c.user.uid))).then(function (snap) {
      var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (x) { return x.status !== 'clear' && x.status !== 'pending'; });
      if (!list.length) { host.innerHTML = ''; return; }
      list.sort(function (a, b) { return (a.status === 'submitted') - (b.status === 'submitted') || (b.createdAtMs || 0) - (a.createdAtMs || 0); });
      host.innerHTML = list.map(function (sh) {
        var done = sh.status === 'submitted';
        var right;
        if (done) right = '<span class="db-badge ' + (sh.late ? 'db-b-late' : 'db-b-ok') + '">' + (sh.late ? '지연 제출' : '제출 완료') + '</span><div style="margin-top:4px">쌍둥이 ' + num(sh.twinCorrect) + '/' + num(sh.twinTotal) + '</div>';
        else if (now() > sh.dueAtMs) right = '<span class="db-badge db-b-over">기한 지남</span><div style="margin-top:4px">지금 제출하면 지연으로 표시돼요</div>';
        else right = '<div style="color:#D4A04A;font-weight:800">' + fmtLeft(sh.dueAtMs - now()) + '</div><div style="margin-top:2px;opacity:.8">마감 ' + fmtDT(sh.dueAtMs) + '</div>';
        return '<div class="db-card' + (done ? ' done' : '') + '" onclick="DB_openReviewOmr(\'' + esc(sh.id) + '\')"><div class="lamp">' + lhIcon(38, 30, 10) + '</div><div><div class="t">등불 복습 · ' + esc(sh.examTitle) + '</div><div class="s">오답 ' + num(sh.wrongCount) + ' · 모름 ' + num(sh.unknownCount) + ' · 복습 문항 ' + (sh.items || []).length + '개' + (sh.needsResubmit ? ' · 문항이 추가되어 다시 제출이 필요해요' : '') + '</div></div><div class="r">' + right + '</div></div>';
      }).join('');
    }).catch(function (e) { console.warn('[등불] 학생 복습 목록 실패', e); host.innerHTML = ''; });
  };

  // ------------------------------------------------------------ 학생: 복습 OMR
  window.DB_openReviewOmr = function (sheetId) {
    var F = fb();
    var body = overlay('db-omr', '등불 복습 OMR', '');
    var st = {};
    F.getDoc(F.doc(F.db, 'reviewSheets', sheetId)).then(function (sd) {
      if (!sd.exists()) throw new Error('복습지를 찾을 수 없습니다');
      if (sd.data().status === 'pending') throw new Error('아직 선생님이 발행하지 않은 복습지입니다.');
      st.sh = sd.data(); st.ans = JSON.parse(JSON.stringify(st.sh.reviewAnswers || {}));
      var ph = document.querySelector('#db-omr .db-ph h3');
      if (ph) ph.innerHTML = '등불 복습 OMR<small>' + esc(st.sh.examTitle) + ' · 마감 ' + fmtDT(st.sh.dueAtMs) + '</small>';
      return loadPack(st.sh.examId, true);
    }).then(function (pack) {
      if (!pack) throw new Error('등불 데이터가 아직 연결되지 않았습니다');
      st.idx = itemIndex(pack.units);
      render();
    }).catch(function (e) { body.innerHTML = '<div class="db-err">' + esc(e.message) + '</div>'; });

    var saveT = null;
    function autosave() {
      if (st.sh.status === 'submitted' && !st.sh.needsResubmit) return;
      clearTimeout(saveT);
      saveT = setTimeout(function () { F.updateDoc(F.doc(F.db, 'reviewSheets', sheetId), { reviewAnswers: st.ans }).catch(function () {}); }, 600);
    }
    function render() {
      var sh = st.sh, locked = sh.status === 'submitted' && !sh.needsResubmit;
      var left = sh.dueAtMs - now();
      var order = twinOrder(sh, st.idx);
      var h = '<div class="db-sec" style="background:linear-gradient(135deg,#1a2338,#0f1626);color:#F3E7CF;border:0">' +
        '<div style="font-size:13px;line-height:1.7"><b style="color:#D4A04A">① 해설 복습</b> — 원 문항마다 해설을 읽고 확인 질문 빈칸을 채웠으면 체크하고, 오답 원인을 고르세요.<br><b style="color:#D4A04A">② 섞어 푸는 쌍둥이</b> — 복습지 뒤의 쌍둥이 문항(T번호)을 풀고 답을 입력하세요. 해설 다음 날 푸는 것을 권합니다.</div>' +
        '<div style="margin-top:6px;font-size:12px;color:#D8C6A2">' + (locked ? (sh.late ? '지연 제출됨 · ' : '제출 완료 · ') + fmtDT(sh.submittedAtMs) : (left > 0 ? '⏳ ' + fmtLeft(left) + ' (마감 ' + fmtDT(sh.dueAtMs) + ')' : '⚠ 기한이 지났습니다. 지금 제출하면 「지연」으로 표시됩니다.')) + '</div></div>';
      h += '<h4 class="db-omr-h">① 해설 복습 · 원 문항 ' + (sh.items || []).length + '개</h4>';
      (sh.items || []).forEach(function (it) {
        var a = st.ans[it.k] || {};
        var stb = it.status === 'unknown' ? '<span class="db-st u">모름(맞힘)</span>' : it.status === 'wrong+unknown' ? '<span class="db-st w">오답·모름</span>' : '<span class="db-st w">오답</span>';
        h += '<div class="db-omr-row rv" data-k="' + esc(it.k) + '"><div class="db-omr-top"><span class="db-no">' + secShort(it.sec) + num(it.no) + '</span>' + stb +
          '<span class="db-mya">내 답 ' + (it.my != null ? esc(AT(it.my, it.type)) : '미기입') + ' · 정답 ' + esc(AT(it.correct, it.type)) + '</span></div>';
        h += '<div class="db-line"><span class="db-lab">복습</span><span class="db-chk' + (a.done ? ' on' : '') + '" data-act="done">' + (a.done ? '✔ 해설 복습 · 확인 질문 완료' : '☐ 해설 읽고 확인 질문 빈칸 채움') + '</span></div>';
        h += '<div class="db-line"><span class="db-lab">' + (it.status === 'unknown' ? '헷갈린 이유<br>(선택)' : '오답 원인') + '</span>' + CAUSES.map(function (c) { return '<span class="db-chip' + (a.cause === c ? ' on' : '') + '" data-act="cause" data-v="' + c + '">' + c + '</span>'; }).join('') + '</div></div>';
      });
      if (order.length) h += '<h4 class="db-omr-h">② 섞어 푸는 쌍둥이 · T1~T' + order.length + '</h4>';
      order.forEach(function (o) {
        var a = st.ans[o.k] || {}, ref = st.idx[o.k], u = ref && ref.unit, tw = ref && ref.item.twin_a;
        h += '<div class="db-omr-row tw" data-k="' + esc(o.k) + '"><div class="db-omr-top"><span class="db-no">T' + o.t + '</span><span class="db-mya">' + (u ? '원 시험지 ' + esc(u.section + ' ' + u.range) + '번 지문' : '') + '</span></div>';
        if (tw && tw.type === 'short') h += '<div class="db-line"><span class="db-lab">쌍둥이 답</span><input class="db-num" type="text" inputmode="numeric" maxlength="4" placeholder="숫자" data-act="twinnum" value="' + (a.twin != null ? esc(a.twin) : '') + '"' + (locked ? ' disabled' : '') + '></div>';
        else h += '<div class="db-line"><span class="db-lab">쌍둥이 답</span>' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="db-bub' + (a.twin === n ? ' on' : '') + '" data-act="twin" data-v="' + n + '"' + (locked ? ' disabled' : '') + '>' + n + '</button>'; }).join('') + '</div>';
        if (locked && a.twin) {
          var ok = tw && Number(a.twin) === Number(tw.answer);
          var orig = '원 ' + secShort(o.it.sec) + o.it.no + '번의 쌍둥이';
          h += '<div class="db-res ' + (ok ? 'o' : 'x') + '">' + (ok ? '⭕ 정답 · ' + orig + '. 같은 포인트를 이제 정확히 잡았어요.' : '❌ 오답 (정답 ' + (tw ? AT(tw.answer, tw.type) : '-') + ') · ' + orig + '<br>👉 <b>복습지의 원 ' + secShort(o.it.sec) + o.it.no + '번 해설로 돌아가</b> 정답 해설과 선지 근거를 다시 읽으세요. (쪽수는 「나의 문항 지도」의 해설 쪽)<br><b>다시 내릴 닻</b> · ' + esc(tw ? tw.review_comment : '')) + '</div>';
        }
        h += '</div>';
      });
      if (!locked) h += '<div class="db-sticky"><button class="db-btn p" id="db-submit" style="flex:1;padding:12px;font-size:14px">' + (sh.status === 'submitted' ? '다시 제출하기' : '제출하기') + '</button></div>';
      else {
        h += '<div class="db-sticky"><div class="db-note" style="flex:1">쌍둥이 ' + num(sh.twinCorrect) + '/' + num(sh.twinTotal) + ' 정답. 틀린 T번호는 원 문항 해설로 돌아가 다시 읽고, 부록 「쌍둥이 문항 정답과 해설」도 확인하세요.</div></div>';
      }
      body.innerHTML = h;
      if (locked) return;
      body.querySelectorAll('.db-omr-row').forEach(function (row) {
        var k = row.getAttribute('data-k');
        row.querySelectorAll('[data-act]').forEach(function (el) {
          if (el.getAttribute('data-act') === 'twinnum') {
            el.onchange = function () {
              var a = st.ans[k] || (st.ans[k] = {}); var v = String(el.value).trim();
              a.twin = v === '' || isNaN(Number(v)) ? null : Number(v); if (v !== '' && a.twin == null) el.value = '';
              autosave();
            };
            return;
          }
          el.onclick = function () {
            var a = st.ans[k] || (st.ans[k] = {});
            var act = el.getAttribute('data-act');
            if (act === 'done') a.done = !a.done;
            else if (act === 'twin') { var v = parseInt(el.getAttribute('data-v'), 10); a.twin = a.twin === v ? null : v; }
            else if (act === 'cause') { var c = el.getAttribute('data-v'); a.cause = a.cause === c ? null : c; }
            autosave(); render();
          };
        });
      });
      document.getElementById('db-submit').onclick = submit;
    }
    function submit() {
      clearTimeout(saveT);
      var sh = st.sh, miss = [];
      (sh.items || []).forEach(function (it) {
        var a = st.ans[it.k] || {};
        var need = [];
        if (!a.done) need.push('복습 체크');
        if (!a.cause && it.status !== 'unknown') need.push('오답 원인');
        if (need.length) miss.push('① ' + secShort(it.sec) + it.no + '번(' + need.join('·') + ')');
      });
      twinOrder(sh, st.idx).forEach(function (o) { if ((st.ans[o.k] || {}).twin == null) miss.push('② T' + o.t + ' 쌍둥이 답'); });
      if (miss.length) { alert('아직 입력하지 않은 항목이 있어요.\n\n' + miss.join('\n')); return; }
      var t = now(), ok = 0, nTw = 0;
      // 재채점으로 문항이 추가돼 다시 제출하는 경우, 처음 제출 시점의 지연 여부를 유지한다
      var resubmit = sh.status === 'submitted' && sh.submittedAtMs;
      var late = resubmit ? !!sh.late : t > sh.dueAtMs;
      (sh.items || []).forEach(function (it) {
        var ref = st.idx[it.k]; var tw = ref && ref.item.twin_a;
        var a = st.ans[it.k] || (st.ans[it.k] = {}); if (!tw) { delete a.twinOk; return; } nTw++; a.twinOk = !!(a.twin != null && Number(a.twin) === Number(tw.answer)); if (a.twinOk) ok++;
      });
      if (late && !resubmit && !confirm('기한(' + fmtDT(sh.dueAtMs) + ')이 지났습니다. 「지연 제출」로 표시됩니다. 제출할까요?')) return;
      var upd = { reviewAnswers: st.ans, status: 'submitted', late: late, twinCorrect: ok, twinTotal: nTw, needsResubmit: false };
      if (resubmit) upd.resubmittedAtMs = t; else upd.submittedAtMs = t;
      F.updateDoc(F.doc(F.db, 'reviewSheets', sheetId), upd).then(function () {
        Object.assign(st.sh, upd); render();
        if (window.DB_renderStudentReviews) window.DB_renderStudentReviews();
      }).catch(function (e) { alert('제출 실패: ' + e.message); });
    }
  };

  // ------------------------------------------------------------ OMR '모름' 토글 (index.html이 호출)
  window.DB_omrUnknownBtn = function (no, on) {
    return '<button type="button" class="omr-unk' + (on ? ' on' : '') + '" data-unk="' + no + '" title="모름: 답은 마킹하고, 확신 없는 문항이면 눌러 주세요" onclick="toggleExamUnknown(' + no + ',this)">?</button>';
  };

  // ==================================================================== 인쇄
  var WJ = '⁠', NB = ' ';
  function isHangul(ch) { return ch >= '가' && ch <= '힣'; }
  function glueRun(w) {
    if (w.length < 2) return w;
    var out = w[0];
    for (var i = 1; i < w.length; i++) out += (isHangul(w[i - 1]) && isHangul(w[i])) ? w[i] : WJ + w[i];
    return out;
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function nb(t) {
    t = t.replace(/「([^」]{1,18})」/g, function (m, a) { return '「' + a.replace(/ /g, NB) + '」'; });
    t = t.replace(/(\((?:가|나|다|라|마)\)) /g, '$1' + NB);
    t = t.replace(/(공통|화법과 작문|언어와 매체) (\d)/g, function (m, a, b) { return a.replace(/ /g, NB) + NB + b; });
    t = t.split('작자 미상').join('작자' + NB + '미상');
    t = t.replace(/ (\/|·) /g, NB + '$1 ');
    t = t.replace(/ (→|↔|=|>|<|≤|≥|\+) /g, ' $1' + NB);
    t = t.replace(/(\d+) (문단|연|행|쪽|번|점|분|단|장면)/g, '$1' + NB + '$2');
    t = t.replace(/(장면|문단|선지) (\d+)/g, '$1' + NB + '$2');
    [["'", "'", 10], ['‘', '’', 10], ['“', '”', 10], ['"', '"', 10], ['(', ')', 12], ['<', '>', 8], ['[', ']', 8]].forEach(function (q) {
      var re = new RegExp(reEsc(q[0]) + '([^' + reEsc(q[0] + q[1]) + '\\n]{1,' + q[2] + '})' + reEsc(q[1]), 'g');
      t = t.replace(re, function (m, a) { return q[0] + a.replace(/ /g, NB) + q[1]; });
    });
    t = t.replace(/(\S) (수|줄|것|때|뿐|듯) (있|없|알|모|이|같|을|으)/g, '$1' + NB + '$2' + NB + '$3');
    t = t.split(', 「').join(',' + NB + '「');
    t = t.replace(/ (\S{1,4}[.?!]?)$/, NB + '$1');
    t = t.replace(/\S+/g, glueRun);
    return t;
  }
  function E(s) {
    s = String(s == null ? '' : s);
    if (s.indexOf('**') >= 0) return E(s.replace(/\*\*/g, '\u0001')).replace(/\u0001([^\u0001]*)\u0001/g, '<b>$1</b>').replace(/\u0001/g, '');
    if (!MM) {
      // 성염색체 유전자형 표기 X^A, X^aB → 위첨자 (A, a, B 등은 대립유전자, Y는 Y 염색체)
      var ul = s.indexOf('<u>') >= 0;
      if (ul) s = s.replace(/<u>/g, '\uE002').replace(/<\/u>/g, '\uE003');
      var sup = s.indexOf('^') >= 0;
      if (sup) s = s.replace(/([XY])\^((?:(?!X\^)[A-XZa-z])+\*?)(?![+\-−a-z])/g, '$1\uE000$2\uE001')
        // 지수·이온 전하: (광도)^(1/4) → 위첨자 1/4, B^b+ → 위첨자 b+, 10^3.5 → 위첨자 3.5
        .replace(/\^\(([^)\n]{1,10})\)/g, '\uE000$1\uE001')
        .replace(/\^([0-9a-z.]{1,4}[+\-−]?)/g, '\uE000$1\uE001');
      var o = esc(nb(s));
      if (ul) o = o.replace(/\uE002/g, '<u class="ul">').replace(/\uE003/g, '</u>');
      if (sup) o = o.replace(/\uE000([^\uE001]*)\uE001/g, function (m, a) { return '<sup class="gt">' + a.replace(/\u2060/g, '') + '</sup>'; });
      // 수학 책과 함께 인쇄될 때 금액 표기($15 등)가 수식으로 읽히지 않게 $를 따로 감싼다
      if (o.indexOf('$') >= 0) o = o.replace(/\$/g, function () { return '<span>$</span>'; });
      return o;
    }
    if (s.indexOf('$') < 0) return esc(nb(s));
    // 수식($...$)은 줄바꿈 처리(nb) 없이 그대로 두고 KaTeX가 그린다
    return s.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/).map(function (p, i) { return i % 2 ? esc(p) : esc(nb(p)); }).join('');
  }
  function H(s) { return esc(s); } // 속성값용(줄바꿈 처리 없음)
  var EM = false; // 영어
  var TM = false; // 탐구(공통 없이 선택과목만)
  var MM = false; // 지금 조판 중인 책이 수학인가 (personalParts/teacherParts가 설정)
  function areaGroup(u) {
    if (u.section !== '공통') return u.section;
    if (MM) return '공통';
    if (EM) return String(u.area || '').indexOf('듣기') === 0 ? '듣기' : '독해';
    return ['시', '소설', '수필', '극', '고전'].some(function (k) { return (u.area || '').indexOf(k) >= 0; }) ? '문학' : '독서';
  }
  function runLabel(u) { return u.section + ' ' + u.range + '번 · ' + (u.area || ''); }
  function atom(inner, o) {
    o = o || {};
    var a = '';
    if (o.run) a += ' data-run="' + H(o.run) + '"';
    if (o.cont) a += ' data-cont="' + H(o.cont) + '"';
    if (o.mark) a += ' data-mark="' + H(o.mark) + '"';
    if (o.newpage) a += ' data-newpage="1"';
    if (o.group) a += ' data-group="' + o.group + '"';
    return '<div class="atom ' + (o.cls || '') + '"' + a + '>' + inner + '</div>';
  }
  function icon(n, cls) { return '<img class="' + (cls || 'ic') + '" src="' + ASSET + '/ic_' + n + '.png">'; }
  function secTitle(ic, k, t) { return '<div class="sh">' + icon(ic) + '<div><div class="kick">' + E(k) + '</div><div class="sht">' + E(t) + '</div></div></div>'; }
  function boxHtml(txt) {
    var lines = String(txt || '').split('\n'), out = [], i = 0;
    var isRow = function (l) { return /^\s*\|.*\|\s*$/.test(l); };
    while (i < lines.length) {
      var ln = lines[i];
      if (isRow(ln)) {
        var rows = [];
        while (i < lines.length && isRow(lines[i])) {
          var cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
          if (!cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) rows.push(cells);
          i++;
        }
        out.push('<table class="btab"><thead><tr>' + rows[0].map(function (c) { return '<th>' + E(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + E(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
        continue;
      }
      if (!ln.trim()) out.push('<div class="bgap"></div>');
      else {
        var ind = ln.length - ln.replace(/^ +/, '').length, s = ln.trim();
        var cls = (/^[○·•ⓐ-ⓩ㉠-㉭\-]\s/.test(s) || /^[ⓐ-ⓩ㉠-㉭]/.test(s)) ? 'bl hang' : 'bl';
        out.push('<div class="' + cls + '" style="margin-left:' + (ind * 1.6) + 'mm">' + E(s) + '</div>');
      }
      i++;
    }
    return out.join('');
  }
  function full(inner, cls, extra) { return '<div class="fullsrc ' + cls + '"' + (extra || '') + '>' + inner + '</div>'; }

  function setAtoms(u, items, opts) {
    opts = opts || {};
    var run = runLabel(u);
    var pms = u.passage_map || [];
    var maxL = Math.max.apply(null, pms.map(function (p) { return String(p.part || '').length; }).concat([4]));
    var pm = pms.map(function (p) { return '<li style="--lw:' + Math.round(Math.min(40, Math.max(15, 2 + 3.2 * maxL))) + 'mm"><b>' + E(p.part) + '</b><span>' + E(p.summary) + '</span></li>'; }).join('');
    var cons = (u.concepts || []).map(function (c) { return '<span class="ctag">' + E(c.name) + '</span>'; }).join('');
    var chips = [u.area, u.recommended_time ? '권장 ' + u.recommended_time : null].filter(Boolean).map(function (x) { return '<span class="chip">' + E(x) + '</span>'; }).join('');
    var head = '<div class="banner"><img src="' + ASSET + '/banner.jpg"></div><div class="op-head"><div class="op-range"><small>' + E(u.section) + '</small>' + E(u.range) + '</div>' +
      '<div class="op-title"><div class="op-chips">' + chips + '</div><h2>' + String(u.title || '').split(' / ').map(E).join('<br>') + '</h2>' +
      '<div class="op-meta"><div>원 시험지 · ' + E(u.orig_location) + '</div><div>' + E(u.source_note) + '</div></div></div></div>';
    var how = '<div class="card how">' + (MM ? secTitle('compass', '이 묶음 공략법', '시험장 운영법') : secTitle('compass', '이 지문을 읽는 법', '그날의 항해법')) + '<p>' + E(u.reading_strategy) + '</p><div class="cons"><div class="kick">' + (MM ? '이 묶음의 핵심 도구' : '이 세트의 핵심 개념') + '</div>' + cons + '</div></div>';
    var mapTitle = MM ? secTitle('map', '문항 한눈에', '이 묶음의 문항') : secTitle('map', '지문 구조도', '먼저 지나간 길');
    var mapcard = '<div class="card map">' + mapTitle + '<ol class="pmap">' + pm + '</ol></div>';
    var A = [atom(head + '<div class="op-grid">' + mapcard + how + '</div>', { run: run, mark: 'SET:' + u.set_id, newpage: true, cls: 'opener' })];
    var lw = Math.round(Math.min(46, Math.max(16, 2 + 3.2 * maxL)));
    var alt = [atom(head + how, { run: run, mark: 'SET:' + u.set_id, newpage: true, cls: 'opener alt' })];
    pms.forEach(function (p, k) {
      alt.push(atom((k === 0 ? mapTitle : '') + '<div class="pmrow' + (k === pms.length - 1 ? ' last' : '') + '" style="--lw:' + lw + 'mm"><b>' + E(p.part) + '</b><span>' + E(p.summary) + '</span></div>',
        { run: run, cls: 'a-pm cont alt' + (k === 0 ? ' first' : ''), cont: MM ? '문항 한눈에 (이어서)' : '지문 구조도 (이어서)' }));
    });
    A.push('<template class="altset">' + alt.join('') + '</template>');
    items.forEach(function (it) { A = A.concat(itemAtoms(u, it, run, opts.personal)); });
    var tws = items.filter(function (it) { return it.twin_a; });
    return opts.noTwins || !tws.length ? A : A.concat(twinAtoms(u, tws));
  }
  function itemAtoms(u, it, run, personal) {
    var ans = it.answer;
    var head = '<header class="ih"><div class="badge"><span>' + it.no + '</span></div><div class="ihm"><div class="ihchips"><span class="chip ans">정답 ' + AT(ans, it.type) + '</span><span class="chip">' + (it.points || 2) + '점</span><span class="chip">' + E(it.q_type) + '</span><span class="chip lv-' + H(it.difficulty) + '">난이도 ' + E(it.difficulty) + '</span>' +
      (it._mine ? '<span class="chip" style="border-color:var(--ng);color:var(--ng)">' + E(it._mine) + '</span>' : '') +
      '</div><div class="qs">' + E(it.q_summary) + '</div></div><label class="chk"><i></i>복습 완료</label></header>' +
      '<div class="blk point">' + secTitle('lantern', '빛의 초점', '출제 포인트') + '<p>' + E(it.point) + '</p></div>';
    if (it.one_line) head += '<div class="oneline"><span class="ol-k">이렇게 풀었어야 한다</span><p>' + E(it.one_line) + '</p></div>';
    var A = [atom(head, { run: run, mark: 'ITEM:' + u.section + ':' + it.no, cls: 'item-start' })];
    var st = secTitle('compass', '그날의 항해법', '시험장 풀이 전략');
    (it.strategy || []).forEach(function (s, i) {
      var step = '<div class="step"><div class="sn">' + (i + 1) + '</div><div class="sb"><div class="sr"><span class="lb look">볼 곳</span><span>' + E(s.look) + '</span></div><div class="sr"><span class="lb think">생각</span><span>' + E(s.think) + '</span></div><div class="sr"><span class="lb do">처리</span><span>' + E(s.do) + '</span></div></div></div>';
      A.push(atom((i === 0 ? st : '') + step, { run: run, cls: 'a-step cont' + (i === 0 ? ' first' : ''), cont: i === 0 ? it.no + '번 문항' : it.no + '번 · 시험장 풀이 전략 (이어서)' }));
    });
    if (it.solution) {
      // 긴 풀이(수학)는 단계(빈 줄) 단위로 나눠 쪽을 넘길 수 있게 한다
      var sparts = String(it.solution).split(/\n\s*\n/).filter(function (x) { return x.trim(); });
      sparts.forEach(function (sp, i) {
        A.push(atom((i === 0 ? secTitle('lantern', '빛이 닿는 자리', '정답 해설 · 정답 ' + AT(ans, it.type)) : '') + '<div class="solp' + (i ? ' more' : '') + '">' + E(sp) + '</div>',
          { run: run, cls: 'a-sol cont', cont: i === 0 ? it.no + '번 문항' : it.no + '번 · 정답 해설 (이어서)' }));
      });
    }
    // <보기> ㄱ~ㄹ 판단 (탐구 등)
    (it.marks || []).forEach(function (mk, k) {
      var bad = String(mk.verdict || '').charAt(0) === '부';
      A.push(atom((k === 0 ? secTitle('scale', '하나씩, 정확히', '〈보기〉 판단 근거') : '') + '<div class="orow mk"><div class="on">' + E(mk.m) + '</div><div class="ov"><span class="pill ' + (bad ? 'x' : 'o') + '">' + (bad ? '부적절' : '적절') + '</span></div><div class="oc"><div class="claim">' + E(mk.claim) + '</div><div class="basis">' + E(mk.basis) + '</div></div></div>',
        { run: run, cls: 'a-opt cont' + (k === 0 ? ' first' : ''), cont: it.no + '번 · 〈보기〉 판단 근거 (이어서)' }));
    });
    // 개인 복습지: 정답·내가 고른 선지·가장 매력적인 오답은 자세히, 나머지는 한 줄 근거
    var focus = {}; focus[ans] = '정답';
    if (personal && it.attractive) focus[it.attractive] = focus[it.attractive] || '매력적 오답';
    if (personal && it._myNo && it._myNo !== ans) focus[it._myNo] = '내가 고른 답';
    var ot = secTitle('scale', '하나씩, 정확히', personal ? '선지별 판단 근거' : '모든 선지의 판단 근거') + (personal ? '<p class="optnote">정답 · 내가 고른 답 · 가장 매력적인 오답은 자세히, 나머지는 한 줄로 정리했습니다.</p>' : '');
    (it.options || []).forEach(function (o, k) {
      var bad = String(o.verdict || '').charAt(0) === '부';
      var mini = personal && !focus[o.n] && o.short;
      var tag = personal && focus[o.n] && focus[o.n] !== '정답' ? '<span class="otag' + (focus[o.n] === '내가 고른 답' ? ' me' : '') + '">' + focus[o.n] + '</span>' : '';
      var row = mini
        ? '<div class="orow mini"><div class="on">' + CIRC[o.n - 1] + '</div><div class="ov"><span class="pill ' + (bad ? 'x' : 'o') + '">' + (bad ? '부적절' : '적절') + '</span></div><div class="oc"><div class="short">' + E(String(o.short).replace(/^(적절|부적절)\s*[—\-:]\s*/, '')) + '</div></div></div>'
        : '<div class="orow ' + (o.n === ans ? 'ans' : '') + (focus[o.n] === '내가 고른 답' ? ' mine' : '') + '"><div class="on">' + CIRC[o.n - 1] + '</div><div class="ov"><span class="pill ' + (bad ? 'x' : 'o') + '">' + (bad ? '부적절' : '적절') + '</span></div><div class="oc">' + tag + '<div class="claim">' + E(o.claim) + '</div><div class="basis">' + E(o.basis) + '</div>' + (o.trap ? '<span class="trap">' + E(o.trap) + '</span>' : '') + '</div></div>';
      A.push(atom((k === 0 ? ot : '') + row, { run: run, cls: 'a-opt cont' + (k === 0 ? ' first' : ''), cont: k === 0 ? it.no + '번 문항' : it.no + '번 · 선지별 판단 근거 (이어서)' }));
    });
    A.push(atom('<div class="foot2"><div class="errs"><div class="kick">예상 오답 원인</div><ul>' + (it.error_causes || []).map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></div><div class="tags"><div class="kick">사용 개념</div>' + (it.concept_tags || []).map(function (x) { return '<span class="ctag">' + E(x) + '</span>'; }).join('') + '</div></div>', { run: run, cls: 'a-foot kwp' }));
    if (it.check_q) {
      var cq = String(it.check_q).split('___').map(E).join('<span class="blank"></span>');
      A.push(atom('<div class="checkq"><div class="cqk">확인 질문 <small>해설을 읽었다면 채울 수 있습니다 · 정답은 부록</small></div><p>' + cq + '</p></div>', { run: run, cls: 'a-check kwp' }));
    }
    return A;
  }
  function twinChoices(t) {
    if (t.type === 'short' || !(t.choices || []).length) return '<div class="ansline">답 <span class="blank"></span></div>';
    if ((t.choices || []).every(function (c) { return /^\s*[①-⑤]\s*$/.test(c); })) return ''; // 번호가 지문 안에 있는 유형(문장 삽입·무관한 문장)
    return '<ol class="choices">' + (t.choices || []).map(function (c) { return '<li>' + E(c) + '</li>'; }).join('') + '</ol>';
  }
  // 영어 쌍둥이 지문: 문장 삽입은 [주어진 문장]을 상자로, 순서 배열은 주어진 글을 상자로, 요약문은 ↓ 아래 상자로
  function engPsg(t, bx) {
    var stem = String(t.stem || ''), m;
    if ((m = bx.match(/^\[주어진 문장\]\s*([\s\S]*?)\n\s*\n([\s\S]*)$/))) {
      return '<div class="tbox given">' + boxHtml(m[1].trim()) + '</div><div class="tbox psg">' + boxHtml(m[2].trim()) + '</div>';
    }
    if (/주어진 글 다음에/.test(stem) && (m = bx.match(/^([\s\S]*?)\n\s*\n(\(A\)[\s\S]*)$/))) {
      return '<div class="tbox given">' + boxHtml(m[1].trim()) + '</div><div class="tbox psg">' + boxHtml(m[2].trim()) + '</div>';
    }
    if (/주어진 글 \(A\)에/.test(stem) && (m = bx.match(/^\(A\)\s*\n([\s\S]*?)\n\s*\n(\(B\)[\s\S]*)$/))) {
      return '<div class="tbox given"><div class="bl">(A)</div>' + boxHtml(m[1].trim()) + '</div><div class="tbox psg">' + boxHtml(m[2].trim()) + '</div>';
    }
    if ((m = bx.match(/^([\s\S]*?)\n\s*\n→\s*([\s\S]*)$/))) {
      return '<div class="tbox psg">' + boxHtml(m[1].trim()) + '</div><div class="sumarrow">↓</div><div class="tbox given sum">' + boxHtml(m[2].trim()) + '</div>';
    }
    return '<div class="tbox psg">' + boxHtml(bx) + '</div>';
  }
  function twinAtoms(u, items) {
    var pm = (u.passage_map || []).map(function (p) { return '<em>' + E(p.part) + '</em>'; }).join('<i>→</i>');
    var head = '<div class="tw-head">' + icon('mirror', 'ic big') + '<div><div class="kick">같은 바다, 다른 파도</div><h3>쌍둥이 문항 · ' + E(u.range) + '번</h3></div></div><div class="pointer"><b>' + (MM || EM || TM ? '원 시험지 없이 이 쪽만으로 풉니다' : '원 시험지를 펴고 푸세요') + '</b><span>' + E(u.orig_location) + '</span><span class="pm">' + pm + '</span></div>';
    return items.map(function (it, k) {
      var t = it.twin_a, bx = String(t.box || '').trim(), box = '';
      if (bx.indexOf('(원 시험지') === 0) box = '<div class="refbox"><b>원 시험지 자료를 보고 답하세요</b><span>' + E(bx.replace(/^\(|\)$/g, '')) + '</span></div>';
      else if (bx) box = (EM ? engPsg(t, bx) : (TM ? '<div class="tbox">' : '<div class="tbox"><div class="tbl">&lt;보기&gt;</div>') + boxHtml(bx) + '</div>');
      var tw = '<div class="twin"><div class="twh"><span class="tno">' + it.no + '<small>-쌍둥이</small></span><span class="tfrom">원 ' + it.no + '번과 같은 출제 포인트</span></div><div class="stem">' + E(t.stem) + '</div>' + box + twinChoices(t) + (MM ? '' : '<div class="memo"><span>풀이 메모</span></div>') + '</div>';
      var ta = atom((k === 0 ? head : '') + tw, { run: '쌍둥이 문항 · ' + u.section + ' ' + u.range + '번', newpage: k === 0, cls: 'a-twin' });
      return MM ? ta + atom('<div class="memo big"><span>' + it.no + '-쌍둥이 풀이 메모</span></div>', { run: '쌍둥이 문항 · ' + u.section + ' ' + u.range + '번', cls: 'a-memo' }) : ta;
    });
  }
  var KIND = { thinker: '사상가 판별', compare: '개념 비교', procedure: '유형 절차', syntax: '구문', signal: '신호 → 도구', tool: '해법 도구', calc: '계산 요령', structure: '지문 구조', trap: '함정 유형', apply: '〈보기〉 적용', bg: '배경지식', concept: '개념', work: '작품 정리', genre: '갈래 독법', term: '표현·서술 용어', grammar: '문법 개념', checklist: '판단 체크리스트' };
  function cardBody(c) {
    function p(x) { return x ? '<p>' + E(x) + '</p>' : ''; }
    function row(k, x) { return x ? '<div class="cr"><span class="ck">' + k + '</span><span class="cv">' + E(x) + '</span></div>' : ''; }
    function list(k, arr, ord) { if (!arr || !arr.length) return ''; var t = ord ? 'ol' : 'ul'; return '<div class="cr"><span class="ck">' + k + '</span><' + t + ' class="cl">' + arr.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</' + t + '></div>'; }
    switch (c.kind) {
      case 'thinker': return list('핵심 주장', c.keys) + list('판별 단서', c.signals) + row('헷갈리는 사상가', c.vs);
      case 'compare': return p(c.desc) + (c.table ? '<div class="ctab">' + boxHtml(c.table) + '</div>' : '');
      case 'procedure': return p(c.desc) + list('푸는 순서', c.steps, true) + row('이번 시험', c.this_exam);
      case 'syntax': return p(c.desc) + row('예문', c.example) + row('이번 지문', c.this_exam);
      case 'signal': return row('이런 문구가 보이면', c.signal) + row('꺼낼 도구', c.tool) + row('왜', c.why);
      case 'tool': return p(c.desc) + row('쓰는 조건', c.when) + row('주의', c.caution);
      case 'calc': return p(c.desc) + row('이번 시험', c.example);
      case 'structure': return p(c.desc) + row('이번 시험', c.this_exam) + row('이렇게 나온다', c.asked);
      case 'trap': return p(c.desc) + row('이번 시험', c.example) + row('판단법', c.fix);
      case 'apply': return p(c.desc) + list('판단 순서', c.steps, true);
      case 'bg': return p(c.desc) + row('다시 나오는 이유', c.why);
      case 'concept': return p(c.desc) + row('이렇게 나온다', c.asked);
      case 'work':
        return row('갈래', c.genre) + row('주제', c.theme) + row('전개', c.flow) + row(c.people && /화자/.test(c.people) ? '화자·대상' : '인물', c.people) +
          ((c.lines || []).length ? '<div class="cr"><span class="ck">핵심 구절</span><ul class="cl">' + c.lines.map(function (l) { return '<li><b>' + E(l.q) + '</b> — ' + E(l.m) + '</li>'; }).join('') + '</ul></div>' : '') +
          list('출제 포인트', c.asked);
      case 'genre': return list('읽을 때 잡을 것', c.points) + row('이번 작품', c.this_exam);
      case 'term': return p(c.desc) + row('선지 판단법', c.judge) + row('이번 시험', c.example);
      case 'grammar': return p(c.desc) + list('판별 순서', c.steps, true) + list('헷갈리는 예', c.confusing) + row('이렇게 나온다', c.asked);
      case 'checklist': return list('확인할 것', c.checks) + row('이번 시험', c.this_exam);
      default: return p(c.desc);
    }
  }
  function conceptAtoms(units, filter) {
    var A = [atom('<div class="kick">항해 일지</div><h2 class="pt">개념 총정리</h2><p class="lead">' + (filter ? '내가 틀리거나 모름으로 표시한 문항과 관련된 것만 모았습니다. ' : '') + '이 시험지에서만 통하는 내용은 해설에 두고, <b>다음 시험에서도 다시 쓰이는 것</b>만 정리했습니다 — ' + (TM ? '사상가를 알아보는 단서, 헷갈리는 개념 비교표, 핵심 개념, 함정 유형.' : EM ? '유형별 푸는 순서, 함정 유형, 어법 판별, 구문 끊어 읽기.' : MM ? '어떤 조건 문구를 보면 어떤 도구를 꺼내는지(신호 → 도구), 해법 도구, 함정 유형, 계산 요령.' : '독서는 지문 구조·함정 유형, 문학은 작품·갈래 독법·표현 용어, 문법은 판별 순서, 화작·매체는 판단 체크리스트.') + '</p>', { run: '부록 · 개념 총정리', mark: 'CONCEPTS', newpage: true })];
    units.forEach(function (u) {
      var cs = (u.concepts || []).filter(function (c) { return !filter || (c.items || []).some(function (n) { return filter[key(u.section, n)]; }); });
      cs.forEach(function (c, k) {
        var used = (c.items || []).map(function (n) { return '<span class="use"' + (filter && filter[key(u.section, n)] ? ' style="background:var(--burg);color:#fff"' : '') + '>' + n + '번</span>'; }).join('');
        var h = k === 0 ? '<div class="csh"><span class="crng">' + E(u.section) + ' ' + E(u.range) + '</span>' + E(u.title) + '</div>' : '';
        A.push(atom(h + '<div class="ccard k-' + H(c.kind || 'x') + '"><div class="cn">' + (KIND[c.kind] ? '<span class="kd">' + KIND[c.kind] + '</span>' : '') + E(c.name) + '</div>' + cardBody(c) + '<div class="cu">사용 문항 ' + used + '</div></div>', { run: '부록 · 개념 총정리' }));
      });
    });
    return A;
  }
  function tansAtoms(units, pick) {
    TRSEEN = {};
    var A = [atom('<div class="kick">거울 너머의 답</div><h2 class="pt">쌍둥이 문항 정답과 해설</h2>', { run: '부록 · 쌍둥이 문항 정답과 해설', mark: 'TANS', newpage: true })];
    units.forEach(function (u) {
      var its = pick(u).filter(function (it) { return it.twin_a; }); if (!its.length) return;
      its.forEach(function (it, k) {
        var t = it.twin_a;
        var h = k === 0 ? '<div class="csh"><span class="crng">' + E(u.section) + ' ' + E(u.range) + '</span>' + E(u.title) + '</div>' : '';
        var tp = tansParts('<span class="tno">' + it.no + '<small>-쌍둥이</small></span><span class="chip ans">정답 ' + AT(t.answer, t.type) + '</span>', t, it.no + '-쌍둥이');
        if (h) { var m0 = tp[0].indexOf('>') + 1; tp[0] = tp[0].slice(0, m0) + h + tp[0].slice(m0); }
        A = A.concat(tp);
      });
    });
    return A;
  }
  function mixedTwinAtoms(order, unitOf) {
    if (!order.length) return [];
    var A = [atom('<div class="tw-head">' + icon('mirror', 'ic big') + '<div><div class="kick">같은 바다, 다른 파도</div><h3>섞어 푸는 쌍둥이 문항</h3></div></div>' +
      '<p class="lead">해설을 다 읽은 <b>다음 날</b> 푸는 것을 권합니다. 문항은 섞여 있고 원래 몇 번의 쌍둥이인지 적혀 있지 않습니다. <b>어떤 개념을 묻는지부터 스스로 판단</b>하세요. ' + (TM ? '쌍둥이는 새로 쓴 제시문이라 원 시험지 없이 풉니다. ' : EM ? '쌍둥이는 새로 쓴 지문이라 원 시험지 없이 풉니다. 듣기 문항은 쌍둥이가 없습니다. ' : MM ? '쌍둥이는 원 시험지 없이 이 쪽만으로 풀 수 있습니다. 풀이 메모 칸에 풀이 과정을 남기세요. ' : '원 시험지는 표시된 지문을 펴 두고 풉니다. ') + '답은 앱의 등불 복습 OMR에 T번호대로 입력합니다(단답형은 숫자 입력).</p>', { run: '섞어 푸는 쌍둥이 문항', mark: 'TWINS', newpage: true })];
    order.forEach(function (o) {
      var ref = unitOf(o.k); if (!ref) return;
      var u = ref.unit, t = ref.item.twin_a, bx = String(t.box || '').trim(), box = '';
      if (bx.indexOf('(원 시험지') === 0) box = '<div class="refbox"><b>원 시험지 자료를 보고 답하세요</b><span>' + E(bx.replace(/^\(|\)$/g, '')) + '</span></div>';
      else if (bx) box = (EM ? engPsg(t, bx) : (TM ? '<div class="tbox">' : '<div class="tbox"><div class="tbl">&lt;보기&gt;</div>') + boxHtml(bx) + '</div>');
      var tw = '<div class="twin"><div class="twh"><span class="tno">T' + o.t + '</span><span class="tfrom">' + (TM ? E(u.section) : EM ? E(areaGroup(u)) : MM ? E(u.section === '공통' ? '공통과목' : u.section) : '원 시험지 · ' + E(u.section + ' ' + u.range) + '번 지문을 펴고 푸세요') + '</span></div><div class="stem">' + E(t.stem) + '</div>' + box + twinChoices(t) + (MM ? '' : '<div class="memo"><span>풀이 메모</span></div>') + '</div>';
      A.push(atom(tw, { run: '섞어 푸는 쌍둥이 문항', cls: 'a-twin' }));
      if (MM) A.push(atom('<div class="memo big"><span>T' + o.t + ' 풀이 메모</span></div>', { run: '섞어 푸는 쌍둥이 문항', cls: 'a-memo' }));
    });
    return A;
  }
  // 단어장(영어): list = [{w,pos,m,no}]
  function vocabList(units, inc) {
    var seen = {}, out = [];
    units.forEach(function (u) { (u.items || []).forEach(function (it) {
      if (inc && !inc[key(u.section, it.no)]) return;
      (it.vocab || []).forEach(function (v) { var k = String(v.w || '').toLowerCase().trim(); if (!k) return; if (seen[k]) { if (seen[k].nos.indexOf(it.no) < 0) seen[k].nos.push(it.no); return; } seen[k] = { w: v.w, pos: v.pos || '', m: v.m || '', nos: [it.no] }; out.push(seen[k]); });
    }); });
    return out;
  }
  function vocabAtoms(list, test) {
    if (!list.length) return [];
    var run = test ? '단어 테스트' : inUnitsAll ? '부록 · 단어장' : '나의 단어장';
    var A = [atom(test
      ? '<div class="kick">뜻 쓰기</div><h2 class="pt">단어 테스트</h2><p class="lead">이번 복습 문항에서 나온 단어입니다. 앞의 「나의 단어장」을 가린 채 지문 속에서 쓰인 뜻을 적고, 단어장으로 채점하세요.</p>'
      : '<div class="kick">단어</div><h2 class="pt">' + (inUnitsAll ? '단어장' : '나의 단어장') + '</h2><p class="lead">뜻은 그 지문에서 쓰인 뜻(문맥상 의미)입니다. 문항 번호를 보고 원 지문에서 다시 확인하세요.' + (inUnitsAll ? '' : ' 먼저 외운 뒤, 바로 다음의 단어 테스트로 확인하세요.') + '</p>',
      { run: run, mark: test ? 'VTEST' : 'VOCAB', newpage: true })];
    for (var i = 0; i < list.length; i += 2) {
      var pair = list.slice(i, i + 2).map(function (v, j) {
        var n = i + j + 1;
        return '<div class="vcell"><span class="vno">' + n + '</span><span class="vw">' + E(v.w) + '</span><span class="vp">' + E(v.pos) + '</span>' + (test ? '<span class="vblank"></span>' : '<span class="vm">' + E(v.m) + '</span><span class="vn">' + v.nos.join('·') + '번</span>') + '</div>';
      }).join('');
      A.push(atom('<div class="vrow">' + pair + '</div>', { run: run }));
    }
    return A;
  }
  var inUnitsAll = false;
  function checkAnsAtoms(list) { // list: [{label, a}]
    if (!list.length) return [];
    var A = [atom('<div class="kick">빈칸 확인</div><h2 class="pt">확인 질문 정답</h2><p class="lead">해설 끝 「확인 질문」의 정답입니다. 틀렸다면 그 문항의 정답 해설을 다시 읽으세요.</p>', { run: '부록 · 확인 질문 정답', mark: 'CHECKANS' })];
    list.forEach(function (x) { A.push(atom('<div class="cqa"><span class="cqn">' + E(x.label) + '</span><span class="cqv">' + E(x.a) + '</span></div>', { run: '부록 · 확인 질문 정답' })); });
    return A;
  }
  // 쌍둥이 해설: 머리 + 풀이 단계들 + 선지 노트 + 닻 (길면 쪽을 넘김)
  var TRSEEN = {};
  function tansParts(headInner, t, label) {
    var run = '부록 · 쌍둥이 문항 정답과 해설';
    var ex = String(t.explanation || '').split(/\n\s*\n/).filter(function (x) { return x.trim(); });
    var A = [];
    ex.forEach(function (sp, i) { A.push(atom((i === 0 ? '<div class="tah">' + headInner + '</div>' : '') + '<p class="tex">' + E(sp) + '</p>', { run: run, cls: 'a-tans cont' + (i === 0 ? ' first' : ''), cont: label + ' 해설 (이어서)' })); });
    if (!ex.length) A.push(atom('<div class="tah">' + headInner + '</div>', { run: run, cls: 'a-tans' }));
    // 영어 쌍둥이 지문 해석(같은 지문을 쓰는 문항끼리는 한 번만)
    if (t.translation) {
      var trk = String(t.translation);
      if (TRSEEN[trk]) A.push(atom('<p class="trnote">지문 해석은 앞의 ' + E(TRSEEN[trk]) + ' 해설에 있습니다.</p>', { run: run, cls: 'a-tans' }));
      else {
        TRSEEN[trk] = label;
        trk.split(/\n\s*\n/).filter(function (x) { return x.trim(); }).forEach(function (tp, i) {
          A.push(atom((i === 0 ? '<div class="trh">지문 해석</div>' : '') + '<p class="trp">' + E(tp).replace(/\n/g, '<br>') + '</p>', { run: run, cls: 'a-tans cont', cont: label + ' 지문 해석 (이어서)' }));
        });
      }
    }
    var tail = ((t.option_notes || []).length ? '<ul class="tnotes">' + t.option_notes.map(function (n) { return '<li>' + E(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="anchor">' + icon('anchor') + '<div><div class="kick">다시 내릴 닻 · 복습 처방</div><p>' + E(t.review_comment) + '</p></div></div>';
    A.push(atom(tail, { run: run, cls: 'a-tans tail cont kwp', cont: label + ' 해설 (이어서)' }));
    return A;
  }
  function mixedTansAtoms(order, unitOf) {
    if (!order.length) return [];
    TRSEEN = {};
    var A = [atom('<div class="kick">거울 너머의 답</div><h2 class="pt">쌍둥이 문항 정답과 해설</h2><p class="lead">여기서 처음으로 각 T번호가 원래 몇 번의 쌍둥이인지 밝힙니다. 틀린 문항은 「다시 내릴 닻」을 읽고 원 문항 해설로 돌아가세요.</p>', { run: '부록 · 쌍둥이 문항 정답과 해설', mark: 'TANS', newpage: true })];
    order.forEach(function (o) {
      var ref = unitOf(o.k); if (!ref) return;
      var t = ref.item.twin_a, u = ref.unit;
      A = A.concat(tansParts('<span class="tno">T' + o.t + '</span><span class="tmap">= 원 ' + E(secShort(u.section)) + ref.item.no + '번의 쌍둥이</span><span class="chip ans">정답 ' + AT(t.answer, t.type) + '</span><span class="tpg">원 문항 해설 <b data-ref="ITEM:' + H(u.section) + ':' + ref.item.no + '"></b>쪽</span>', t, 'T' + o.t));
    });
    return A;
  }
  function cover(disp, who, edLabel) {
    return full('<div class="frame"><img class="art" src="' + ASSET + '/deung_front.jpg"><div class="ctext"><div class="eyebrow">MONO PLANNER · 모의고사 정밀 복기 시리즈</div><h1>등불</h1><div class="sub">틀린 자리를 비추는 빛</div>' +
      '<div class="examplate">' + (who ? '<span class="who">' + E(who) + '</span>' : '') + '<span>' + E(disp.line1) + '</span><b>' + E(disp.line2) + '</b></div>' +
      '<p class="copy">길을 잃는 건 길이 없어서가 아니라, 빛이 닿지 않았기 때문이다.</p></div>' +
      '<div class="cmeta"><div class="ed"><span>' + E(who ? '나만의 복습지 · 오답·모름 문항' : '선생님용 · 전 문항 분석') + '</span><b>' + E(edLabel) + '</b></div><div class="brand">멘토즈 스터디카페 울산송정점 · Team MONO</div></div></div>', 'cover-front', ' data-book="1"');
  }
  function backCover() {
    return full('<div class="frame"><img class="art" src="' + ASSET + '/deung_back.jpg"><div class="btext"><p class="bq">어두운 바다일수록<br>작은 불빛이 더 멀리 닿는다.</p><div class="rule"></div><p class="cp">너의 꾸준함과 우리의 치열함이 기적을 이루길</p><div class="bbrand"><b>MONO PLANNER</b>멘토즈 스터디카페 울산송정점 · Team MONO<br>카카오톡 채널 「멘토즈 울산송정점」 · 010-2848-8317</div></div></div>', 'cover-back');
  }
  function greeting(due) {
    return full('<img class="bgimg" src="' + ASSET + '/greeting.jpg"><div class="gtext"><div class="kick">등불을 펼친 너에게</div><h2>모든 오답은<br>암초가 있는 자리를 알려 주는 표지입니다.</h2>' +
      '<p>한 번 비춘 암초에는 다시 부딪히지 않습니다. 이 등불이 비추는 곳만 정확히 보고 가세요. 정답을 확인하는 데서 멈추지 말고, <b>시험장에서 어디를 보고 무엇을 떠올렸어야 했는지</b>를 되짚는 것이 이 책의 목적입니다.</p>' +
      '<div class="howto"><div class="kick">이렇게 쓰세요</div><ol>' +
      '<li><b>48시간 안에</b> — ' + (due ? '이 복습지의 제출 기한은 <b>' + esc(fmtDT(due)) + '</b>입니다. ' : '복습지를 받은 순간 모노플래너 시험탭에 OMR이 열리고, 그때부터 48시간 안에 제출해야 합니다. ') + '다음 시험과 겹치면 복습이 밀립니다.</li>' +
      '<li><b>첫날 · 해설</b> — 출제 포인트 → 풀이 전략 → 선지 근거 순으로 읽고, 문항 끝 <b>확인 질문</b>의 빈칸을 채웁니다. 내가 고른 답과 가장 매력적인 오답은 특히 꼼꼼히.</li>' +
      '<li><b>다음 날 · 쌍둥이</b> — 책 뒤의 「섞어 푸는 쌍둥이 문항」을 ' + (MM ? '풀이 과정을 적으며' : EM ? '단어 테스트와 함께' : TM ? '사상가·개념 카드를 덮고' : '원 시험지를 펴 둔 채') + ' 풉니다. 몇 번의 쌍둥이인지 숨겨 두었으니 무엇을 묻는지부터 판단하세요.</li>' +
      '<li><b>제출</b> — 모노플래너 시험탭의 「등불 복습 OMR」에 복습 체크·오답 원인·쌍둥이 답(T번호)을 입력하고 제출합니다. 틀린 쌍둥이는 원 문항 해설로 돌아가 다시 읽습니다.</li></ol></div></div>', 'greet');
  }
  function divider(img, k, t, s) { return full('<img class="bgimg" src="' + ASSET + '/' + img + '"><div class="dtext"><div class="kick">' + E(k) + '</div><h2>' + E(t) + '</h2><p>' + E(s) + '</p></div>', 'divider'); }

  // 학생 개인 복습지
  function personalParts(sheet, pack, name) {
    MM = (pack.meta && pack.meta.subject) === 'ma'; EM = (pack.meta && pack.meta.subject) === 'en'; TM = subjOf(pack.meta).commonMax === 0;
    var trackLabel = !sheet.elective ? subjOf(pack.meta).name : TM ? sheet.elective : '공통 + ' + sheet.elective;
    var units = pack.units, meta = pack.meta, disp = meta.display || {};
    var inc = {}; (sheet.items || []).forEach(function (x) { inc[x.k] = x; });
    var allMap = {}; (sheet.all || []).forEach(function (x) { allMap[x.k] = x; });
    var track = units.filter(function (u) { return u.section === '공통' || u.section === sheet.elective; });
    var pick = function (u) { return (u.items || []).filter(function (it) { return inc[key(u.section, it.no)]; }).map(function (it) { var x = inc[key(u.section, it.no)]; var c = Object.assign({}, it); c._mine = '내 답 ' + (x.my != null ? AT(x.my, it.type) : '미기입') + (x.status === 'unknown' ? ' · 모름' : ''); c._myNo = it.type === 'short' ? null : (x.my || null); return c; }); };
    var idx = itemIndex(track);
    var order = twinOrder(sheet, idx);
    var P = [cover(disp, name + ' 학생의 등불', trackLabel + ' · 복습 ' + (sheet.items || []).length + '문항'), greeting(sheet.dueAtMs)];
    // 문항 지도(자동 표기)
    var wrong = (sheet.items || []).filter(function (x) { return x.status !== 'unknown'; }).length, unk = (sheet.items || []).filter(function (x) { return x.status !== 'wrong'; }).length;
    P.push(atom('<div class="kick">한눈에 보는 바다</div><h2 class="pt">나의 문항 지도</h2><div class="sumbox"><div><b>' + num(sheet.score) + '</b><span>원점수' + (sheet.totalScore ? ' / ' + num(sheet.totalScore) : '') + '</span></div><div><b>' + wrong + '</b><span>오답 문항</span></div><div><b>' + unk + '</b><span>모름(?) 표시 문항</span></div><div><b>' + (sheet.items || []).length + '</b><span>이번 복습 문항</span></div></div><p class="lead">색이 칠해진 줄이 이번에 복습할 문항입니다. <b>해설 쪽</b>을 펴서 순서대로 복습하세요.</p>', { run: '나의 문항 지도', mark: 'MAPPAGE', newpage: true }));
    P.push(atom('<div class="mrow my mhead"><span>번호</span><span>영역</span><span>유형 · 핵심 개념</span><span>정답</span><span>내 답</span><span>결과</span><span>해설 쪽</span><span>오답</span><span>모름</span></div>', { run: '나의 문항 지도', cls: 'maphdr', group: 'map' }));
    var n = 0;
    track.forEach(function (u) {
      (u.items || []).forEach(function (it) {
        n++;
        var k = key(u.section, it.no), a = allMap[k] || {}, isInc = !!inc[k];
        var res = a.ok ? (a.unk ? '?' : '○') : '✕';
        P.push(atom('<div class="mrow my' + (n % 5 === 0 ? ' z' : '') + (isInc ? ' inc' : '') + '"><span class="mn">' + it.no + '</span><span class="ma">' + E(u.area) + '</span><span class="mt">' + E(it.q_type) + '<small>' + E((it.concept_tags || []).slice(0, 2).join(', ')) + '</small></span>' +
          '<span class="mans">' + AT(it.answer, it.type) + '</span><span class="mmy ' + (a.ok ? 'o' : 'x') + '">' + (a.my != null ? AT(a.my, it.type) : '-') + '</span><span class="mmy ' + (a.ok ? 'o' : 'x') + '">' + res + '</span>' +
          '<span class="mp"' + (isInc ? ' data-ref="ITEM:' + H(u.section) + ':' + it.no + '"' : '') + '></span><span class="mx"><i class="' + (a.ok ? '' : 'on') + '"></i></span><span class="mx"><i class="' + (a.unk ? 'on' : '') + '"></i></span></div>', { run: '나의 문항 지도', group: 'map' }));
      });
    });
    // 빠른 정답(내 답 자동 표기)
    var ra = sheet.reviewAnswers || {};
    var cells = '';
    track.forEach(function (u) { pick(u).forEach(function (it) {
      var x = inc[key(u.section, it.no)], tw = ra[key(u.section, it.no)];
      cells += '<div class="qc"><div class="qcn">' + secShort(u.section) + it.no + '</div><div class="qcr"><span class="ql">정답</span><b>' + AT(it.answer, it.type) + '</b></div><div class="qcr mine"><span class="ql">내 답</span><b>' + (x.my != null ? AT(x.my, it.type) : '-') + '</b></div><div class="qcm"><span>해설</span><b class="pg" data-ref="ITEM:' + H(u.section) + ':' + it.no + '"></b></div></div>';
    }); });
    P.push(atom('<div class="kick">빠른 정답</div><h2 class="pt">나의 복습 문항 정답표</h2><p class="lead">시험에서 고른 <b>내 답</b>은 자동으로 적혀 있습니다. 쌍둥이 문항의 정답은 스스로 풀어 본 뒤 확인하도록 책 맨 뒤 부록에 두었습니다.</p><div class="qblk"><div class="qgrid">' + cells + '</div></div>', { run: '빠른 정답표', mark: 'QUICK', newpage: true }));
    // 본문
    var groups = groupsFor(sheet.elective);
    groups.forEach(function (g) {
      var us = track.filter(function (u) { return areaGroup(u) === g[0] && pick(u).length; });
      if (!us.length) return;
      P.push(divider(g[1], g[2], g[3], g[4]));
      us.forEach(function (u) { P = P.concat(setAtoms(u, pick(u), { personal: true, noTwins: true })); });
    });
    var unitOf = function (k) { return idx[k]; };
    P = P.concat(mixedTwinAtoms(order, unitOf));
    var vl = vocabList(track, inc); inUnitsAll = false;
    if (vl.length) P = P.concat(vocabAtoms(vl, false)).concat(vocabAtoms(vl, true));
    P.push(divider('div_common2.jpg', '부록', '항해 일지', '개념 총정리 · 확인 질문 정답 · 쌍둥이 해설'));
    var cqs = []; track.forEach(function (u) { pick(u).forEach(function (it) { if (it.check_a) cqs.push({ label: secShort(u.section) + it.no + '번', a: it.check_a }); }); });
    P = P.concat(conceptAtoms(track, inc)).concat(checkAnsAtoms(cqs)).concat(mixedTansAtoms(order, unitOf));
    P.push(backCover());
    return { parts: P, short: disp.short || '', foot: name + ' · ' + trackLabel + ' · 개인 복습지', math: MM };
  }
  // 선생님용 전체본
  function groupsFor(elective) {
    if (TM) return [[elective, 'div_common1.jpg', '탐구', elective, '개념과 사상가를 정확히 구분하도록']];
    if (EM) return [['듣기', 'div_eng.jpg', '영어', '듣기', '한 번 흘려들은 말을 다시 놓치지 않도록'], ['독해', 'div_eng.jpg', '영어', '독해', '문장과 문장 사이의 논리를 따라']];
    if (MM) return [['공통', 'div_math.jpg', '공통과목', '수학Ⅰ · 수학Ⅱ', '조건 하나하나가 길을 가리킨다'], [elective, 'div_common1.jpg', '선택과목', elective, '마지막 여덟 문항까지, 같은 정확도로']];
    return [['독서', 'div_kor.jpg', '공통', '독서', '지문의 구조를 따라, 빛이 닿는 순서대로'], ['문학', 'div_kor.jpg', '공통', '문학', '작품이 건네는 말을 놓치지 않도록'], [elective, 'div_common1.jpg', '선택과목', elective, '마지막 열한 문항까지, 같은 정확도로']];
  }
  function teacherParts(pack, elective) {
    MM = (pack.meta && pack.meta.subject) === 'ma'; EM = (pack.meta && pack.meta.subject) === 'en'; TM = subjOf(pack.meta).commonMax === 0;
    var trackLabel = !elective ? subjOf(pack.meta).name : TM ? elective : '공통 + ' + elective;
    var units = pack.units.filter(function (u) { return u.section === '공통' || u.section === elective; }), disp = pack.meta.display || {};
    var all = function (u) { return u.items || []; };
    var P = [cover(disp, '', trackLabel), greeting(null)];
    var rows = [['MAPPAGE', '문항 지도', '정답 · 난이도 · 해설 쪽 한눈에 보기'], ['QUICK', '빠른 정답', '원 문항 · 쌍둥이 문항 정답표']].concat(units.map(function (u) { return ['SET:' + u.set_id, u.section + ' ' + u.range + '번', (u.area || '') + ' · ' + (u.title || '')]; })).concat([['CONCEPTS', '부록 1', '개념 총정리'], ['CHECKANS', '부록 2', '확인 질문 정답'], ['TANS', '부록 3', '쌍둥이 문항 정답과 해설']]);
    P.push(atom('<div class="kick">CONTENTS</div><h2 class="pt">차례</h2><div class="toct">' + rows.map(function (r) { return '<div class="trow"><span class="tl">' + E(r[1]) + '</span><span class="ts">' + E(r[2]) + '</span><span class="tp" data-ref="' + H(r[0]) + '"></span></div>'; }).join('') + '</div>', { run: '차례', newpage: true }));
    P.push(atom('<div class="kick">한눈에 보는 바다</div><h2 class="pt">문항 지도</h2><p class="lead">학생이 <b>틀린 문항</b>과 <b>모름(?)으로 표시한 문항</b>에 체크하면, 그 줄의 쪽만 복습하면 됩니다. 앱에서는 학생별 개인 복습지에 자동으로 표기됩니다.</p>', { run: '문항 지도', mark: 'MAPPAGE', newpage: true }));
    P.push(atom('<div class="mrow mhead"><span>번호</span><span>영역</span><span>유형 · 핵심 개념</span><span>난이도</span><span>정답</span><span>해설 쪽</span><span>오답</span><span>모름</span></div>', { run: '문항 지도', cls: 'maphdr', group: 'map' }));
    var n = 0;
    units.forEach(function (u) { all(u).forEach(function (it) { n++;
      P.push(atom('<div class="mrow' + (n % 5 === 0 ? ' z' : '') + '"><span class="mn">' + it.no + '</span><span class="ma">' + E(u.area) + '</span><span class="mt">' + E(it.q_type) + '<small>' + E((it.concept_tags || []).slice(0, 2).join(', ')) + '</small></span><span class="md lv-' + H(it.difficulty) + '">' + E(it.difficulty) + '</span><span class="mans">' + AT(it.answer, it.type) + '</span><span class="mp" data-ref="ITEM:' + H(u.section) + ':' + it.no + '"></span><span class="mx"><i></i></span><span class="mx"><i></i></span></div>', { run: '문항 지도', group: 'map' }));
    }); });
    var blocks = '';
    (elective ? ['공통', elective] : ['공통']).forEach(function (sec) {
      var cells = '';
      units.filter(function (u) { return u.section === sec; }).forEach(function (u) { all(u).forEach(function (it) { cells += '<div class="qc"><div class="qcn">' + it.no + '</div><div class="qcr"><span class="ql">원</span><b>' + AT(it.answer, it.type) + '</b></div><div class="qcr tw"><span class="ql">쌍둥이</span><b>' + (it.twin_a ? AT(it.twin_a.answer, it.twin_a.type) : '-') + '</b></div><div class="qcm"><span>내 답</span><i></i></div></div>'; }); });
      blocks += '<div class="qblk"><div class="qh">' + E(sec) + '</div><div class="qgrid">' + cells + '</div></div>';
    });
    P.push(atom('<div class="kick">빠른 정답</div><h2 class="pt">원 문항 · 쌍둥이 문항 정답표</h2><p class="lead">원 문항 정답과, 각 세트 뒤에 실린 쌍둥이 문항의 정답입니다.</p>' + blocks, { run: '빠른 정답표', mark: 'QUICK', newpage: true }));
    groupsFor(elective).forEach(function (g) {
      var us = units.filter(function (u) { return areaGroup(u) === g[0]; });
      if (!us.length) return;
      P.push(divider(g[1], g[2], g[3], g[4]));
      us.forEach(function (u) { P = P.concat(setAtoms(u, all(u))); });
    });
    P.push(divider('div_common2.jpg', '부록', '항해 일지', '개념 총정리 · 확인 질문 정답 · 쌍둥이 해설'));
    var cqt = []; units.forEach(function (u) { all(u).forEach(function (it) { if (it.check_a) cqt.push({ label: secShort(u.section) + it.no + '번', a: it.check_a }); }); });
    inUnitsAll = true;
    P = P.concat(conceptAtoms(units, null)).concat(checkAnsAtoms(cqt)).concat(tansAtoms(units, all)).concat(vocabAtoms(vocabList(units, null), false));
    inUnitsAll = false;
    P.push(backCover());
    return { parts: P, short: disp.short || '', foot: trackLabel + ' · 선생님용', math: MM };
  }

  // 페이지 조판 스크립트(인쇄 창 안에서 실행) — Python 빌더와 동일한 규칙 + 여러 권 연속 처리
  var PAGINATE = function () {
    var src = document.getElementById('src'), book = document.getElementById('book');
    var pc = null, cur = null, pageNo = 0, bookNo = 0, marks = {};
    var books = []; // [{short, foot}]
    function newFlow() {
      pageNo++;
      var p = document.createElement('div'); p.className = 'page flow'; p.dataset.no = pageNo; p.dataset.book = bookNo;
      p.innerHTML = '<div class="pc"></div>'; book.appendChild(p); cur = p; pc = p.firstChild;
    }
    function over() { var l = pc.lastElementChild; if (!l) return false; var mb = parseFloat(getComputedStyle(l).marginBottom) || 0; return l.offsetTop + l.offsetHeight + mb > pc.clientHeight - 8; }
    var queue = Array.prototype.slice.call(src.children);
    while (queue.length) {
      var el = queue.shift();
      if (el.tagName === 'TEMPLATE') continue;
      if (el.classList.contains('bookinfo')) { bookNo++; pageNo = 0; marks[bookNo] = {}; books[bookNo] = { short: el.dataset.short, foot: el.dataset.foot }; continue; }
      if (el.classList.contains('fullsrc')) {
        // 양면 인쇄: 뒤표지가 짝수 쪽(종이 뒷면)에 오도록 빈 쪽을 넣어, 다음 학생 복습지가 새 종이에서 시작되게 한다
        if (el.classList.contains('cover-back') && (pageNo + 1) % 2 === 1) {
          pageNo++; var bp = document.createElement('div'); bp.className = 'page full blank'; bp.dataset.no = pageNo; bp.dataset.book = bookNo; book.appendChild(bp);
        }
        pageNo++;
        var fp = document.createElement('div'); fp.className = 'page full ' + el.className.replace('fullsrc', '');
        fp.dataset.no = pageNo; fp.dataset.book = bookNo; fp.innerHTML = el.innerHTML; book.appendChild(fp); cur = null; pc = null; continue;
      }
      if (!pc || el.dataset.newpage === '1') newFlow();
      pc.appendChild(el);
      if (over() && el.classList.contains('opener') && !el.classList.contains('alt')) {
        pc.removeChild(el);
        var tpl = queue[0] && queue[0].tagName === 'TEMPLATE' ? queue.shift() : null;
        if (tpl) { var alts = Array.prototype.map.call(tpl.content.children, function (x) { return document.importNode(x, true); }); alts[0].dataset.newpage = '0'; queue = alts.concat(queue); continue; }
        pc.appendChild(el);
      }
      if (over()) {
        pc.removeChild(el);
        var carry = [];
        if (el.classList.contains('kwp') && pc.lastElementChild && pc.lastElementChild.classList.contains('cont')) { carry.push(pc.lastElementChild); pc.removeChild(pc.lastElementChild); }
        newFlow();
        var first = carry[0] || el;
        if (first.dataset.cont && first.classList.contains('cont')) { var lab = document.createElement('div'); lab.className = 'atom contlab'; lab.textContent = first.dataset.cont; pc.appendChild(lab); }
        carry.forEach(function (c) { pc.appendChild(c); });
        if (el.dataset.group === 'map' && !el.classList.contains('maphdr')) { var hd = src.ownerDocument.querySelectorAll('.page[data-book="' + bookNo + '"] .maphdr')[0]; if (hd) pc.appendChild(hd.cloneNode(true)); }
        pc.appendChild(el);
      }
      if (el.dataset.mark && !(el.dataset.mark in marks[bookNo])) marks[bookNo][el.dataset.mark] = pageNo;
      if (el.dataset.run) cur.dataset.run = cur.dataset.run || el.dataset.run;
    }
    var lastRun = '';
    Array.prototype.forEach.call(book.querySelectorAll('.page'), function (p) {
      if (p.classList.contains('full')) return;
      var n = +p.dataset.no, even = n % 2 === 0, bk = books[+p.dataset.book] || {};
      var run = p.dataset.run || lastRun; lastRun = run;
      var bg = p.querySelector('[data-mark="MAPPAGE"]') ? 'map_bg.jpg' : (even ? 'body_bg_L.jpg' : 'body_bg.jpg');
      p.insertAdjacentHTML('afterbegin', '<img class="ovbg" src="' + window.DB_ASSET + '/' + bg + '">');
      p.insertAdjacentHTML('beforeend', '<div class="ovh ' + (even ? 'ev' : 'od') + '"><span class="ovb1">등불<span class="ovsep"></span><span class="ovex"></span></span><span class="ovb2"></span></div><div class="ovf ' + (even ? 'ev' : 'od') + '"><span class="pnum">' + n + '</span><span class="ovt"></span></div>');
      p.querySelector('.ovex').textContent = bk.short || ''; p.querySelector('.ovt').textContent = bk.foot || ''; p.querySelector('.ovb2').textContent = run;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.page [data-ref]'), function (s) {
      var bk = s.closest('.page').dataset.book; s.textContent = (marks[bk] || {})[s.dataset.ref] || '';
    });
    src.remove();
    return book.querySelectorAll('.page').length;
  };

  // 팝업 차단을 피하려고 클릭 순간에 창부터 연 뒤, 데이터가 준비되면 내용을 채운다
  function preparePrintWindow() {
    var w = window.open('', '_blank');
    if (!w) { alert('팝업이 차단되었습니다. 브라우저 주소창의 팝업 허용을 켠 뒤 다시 눌러 주세요.'); return null; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>등불 인쇄 준비</title><p style="font:15px sans-serif;padding:30px;color:#7B1D1D">등불 복습지를 준비하는 중입니다…</p>');
    return w;
  }
  function fillPrintWindow(w, books, title) {
    if (!w || w.closed) return false;
    w.document.open(); w.document.write(buildPrintHtml(books, title, location.origin)); w.document.close();
    addDownloadButton(w, title);
    return true;
  }

  // ------------------------------------------------------------ PDF 바로 받기
  // 인쇄 창에서 조판이 끝난 HTML을 서버(api/deungbul-pdf)로 보내 쪽 범위별 PDF를 받고, 여기서 하나로 합쳐 내려받는다.
  var PDF_CHUNK = 16, PDF_PARALLEL = 6;
  function addDownloadButton(w, title) {
    var bar = w.document.getElementById('db-printbar'); if (!bar) return;
    var pbtn = w.document.getElementById('db-pbtn');
    function mk(id, label, bg) {
      var b = w.document.createElement('button');
      b.id = id; b.disabled = true; b.textContent = label;
      b.style.cssText = 'background:' + bg + ';color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;opacity:.6';
      bar.insertBefore(b, pbtn); return b;
    }
    var bPrint = mk('db-pdfprint', '🖨 PDF로 인쇄', '#7B1D1D');
    var bDl = mk('db-dlbtn', '⬇ PDF 바로 받기', '#1F3A5F');
    // 기존 브라우저 인쇄는 쪽이 많으면 미리보기가 멈출 수 있어 보조 버튼으로 둔다
    if (pbtn) { pbtn.textContent = '브라우저로 직접 인쇄(느림)'; pbtn.style.background = '#555'; pbtn.style.fontWeight = '400'; }
    var tm = setInterval(function () {
      if (w.closed) return clearInterval(tm);
      if (w.DB_PAGES === undefined) return;
      clearInterval(tm);
      if (w.DB_PAGES > 0) [bPrint, bDl].forEach(function (b) { b.disabled = false; b.style.opacity = '1'; });
    }, 300);
    function run(btn, mode, idle) {
      [bPrint, bDl].forEach(function (b) { b.disabled = true; b.style.opacity = '.7'; });
      downloadPdf(w, title, function (msg) { btn.textContent = msg; }, mode).then(function () {
        if (mode === 'download') { btn.textContent = '✔ 받기 완료 (다시 받기)'; [bPrint, bDl].forEach(function (b) { b.disabled = false; b.style.opacity = '1'; }); }
      }).catch(function (e) {
        btn.textContent = idle; [bPrint, bDl].forEach(function (b) { b.disabled = false; b.style.opacity = '1'; });
        w.alert('PDF 만들기 실패: ' + e.message + '\n\n잠시 뒤 다시 눌러 주세요. 계속 실패하면 이 문구를 알려 주세요.');
      });
    }
    bPrint.onclick = function () { run(bPrint, 'open', '🖨 PDF로 인쇄'); };
    bDl.onclick = function () { run(bDl, 'download', '⬇ PDF 바로 받기'); };
  }
  // win 창 안에 스크립트를 올린다(합치기는 사용자가 보고 있는 인쇄 창에서 돌려야 크롬의 백그라운드 탭 지연을 받지 않음)
  function loadScriptOnce(src, globalName, win) {
    win = win || window;
    if (win[globalName]) return Promise.resolve(win[globalName]);
    return new Promise(function (res, rej) {
      var s = win.document.createElement('script'); s.src = new URL(src, location.origin).href;
      s.onload = function () { win[globalName] ? res(win[globalName]) : rej(new Error(globalName + ' 로드 실패')); };
      s.onerror = function () { rej(new Error(src + ' 로드 실패')); };
      win.document.head.appendChild(s);
    });
  }
  function gzipText(text) {
    if (typeof CompressionStream === 'undefined') return Promise.resolve(new Blob([text]));
    return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
  }
  // 조판이 끝난 쪽은 서로 독립(쪽 번호·머리말까지 박혀 있음)이라, 요청마다 그 범위의 쪽만 보낸다
  function bookHtmlForPdf(w, from, to) {
    var root = w.document.documentElement.cloneNode(true);
    Array.prototype.forEach.call(root.querySelectorAll('script, #db-printbar'), function (x) { x.remove(); });
    if (from) Array.prototype.forEach.call(root.querySelectorAll('#book > .page'), function (pg, i) { if (i + 1 < from || i + 1 > to) pg.remove(); });
    return '<!doctype html>' + root.outerHTML;
  }
  function downloadPdf(w, title, progress, mode) {
    var total = w.DB_PAGES;
    if (!(total > 0)) return Promise.reject(new Error('조판이 아직 끝나지 않았습니다.'));
    var user = ctx().user;
    if (!user || !user.getIdToken) return Promise.reject(new Error('로그인 정보가 없습니다. 앱에서 다시 로그인해 주세요.'));
    progress('PDF 준비 중…');
    return Promise.all([user.getIdToken(), loadScriptOnce('/assets/vendor/pdf-lib.min.js', 'PDFLib', w)]).then(function (r) {
      var token = r[0], PDFLib = r[1];
      var queue = [], results = [], done = 0;
      for (var a = 1; a <= total; a += PDF_CHUNK) queue.push([a, Math.min(total, a + PDF_CHUNK - 1)]);
      var parts = queue.length;
      function fetchRange(rg, tries) {
        return gzipText(bookHtmlForPdf(w, rg[0], rg[1])).then(function (body) {
          return fetch('/api/deungbul-pdf', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'X-Pages': rg[0] + '-' + rg[1], 'X-Count': String(rg[1] - rg[0] + 1), 'Content-Type': 'application/octet-stream' }, body: body });
        }).then(function (resp) {
          if (resp.status === 413 && rg[1] > rg[0]) {
            var mid = Math.floor((rg[0] + rg[1]) / 2); parts += 1;
            return Promise.all([fetchRange([rg[0], mid], 0), fetchRange([mid + 1, rg[1]], 0)]).then(function () {});
          }
          if (!resp.ok) {
            return resp.json().catch(function () { return {}; }).then(function (j) {
              if (tries < 1 && resp.status >= 500) return fetchRange(rg, tries + 1);
              throw new Error((j && j.error) || ('서버 오류 ' + resp.status));
            });
          }
          return resp.arrayBuffer().then(function (buf) { results.push({ from: rg[0], buf: buf }); done += 1; progress('PDF 만드는 중… ' + done + '/' + parts); });
        });
      }
      function worker() { var rg = queue.shift(); if (!rg) return Promise.resolve(); return fetchRange(rg, 0).then(worker); }
      progress('PDF 만드는 중… 0/' + parts);
      var ws = []; for (var i = 0; i < PDF_PARALLEL; i++) ws.push(worker());
      return Promise.all(ws).then(function () {
        progress('PDF 합치는 중…');
        results.sort(function (x, y) { return x.from - y.from; });
        return PDFLib.PDFDocument.create().then(function (out) {
          var chain = Promise.resolve();
          results.forEach(function (r, ri) {
            chain = chain.then(function () { progress('PDF 합치는 중… ' + (ri + 1) + '/' + results.length); return PDFLib.PDFDocument.load(new w.Uint8Array(r.buf), { parseSpeed: Infinity, updateMetadata: false }); }).then(function (src) {
              return out.copyPages(src, src.getPageIndices()).then(function (pgs) { pgs.forEach(function (p) { out.addPage(p); }); });
            });
          });
          return chain.then(function () {
            if (out.getPageCount() !== total) throw new Error('쪽 수가 맞지 않습니다(' + out.getPageCount() + '/' + total + ').');
            out.setTitle(title);
            progress('PDF 저장 중…');
            // objectsPerTick: Infinity → 중간에 타이머로 쉬지 않고 한 번에 저장(백그라운드 지연 방지)
            return out.save({ objectsPerTick: Infinity });
          });
        });
      }).then(function (bytes) {
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        if (mode === 'open') {
          // 이 창을 PDF 보기 화면으로 바꾼다 → 크롬 PDF 뷰어에서 바로 인쇄(Ctrl+P)·저장 가능
          w.location.href = url;
          return;
        }
        var a = w.document.createElement('a');
        a.href = url; a.download = String(title || '등불').replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
        w.document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
      });
    });
  }
  function buildPrintHtml(books, title, origin) {
    var src = books.map(function (b) { return '<div class="bookinfo" data-short="' + H(b.short) + '" data-foot="' + H(b.foot) + '"></div>' + b.parts.join(''); }).join('');
    var hasMath = books.some(function (b) { return b.math; });
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><base href="' + origin + '/">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;700&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Bebas+Neue&family=DM+Mono:wght@500&display=block" rel="stylesheet">' +
      '<link rel="stylesheet" href="' + origin + '/deungbul-print.css?v=9">' +
      (hasMath ? '<style>*{text-wrap-style:auto!important}</style><link rel="stylesheet" href="' + origin + '/assets/katex/katex.min.css"><script src="' + origin + '/assets/katex/katex.min.js"><\/script><script src="' + origin + '/assets/katex/contrib/auto-render.min.js"><\/script>' : '') +
      '</head><body><div id="db-printbar"><span id="db-pstat">페이지를 조판하는 중입니다… (글꼴·이미지 로딩)</span><button id="db-pbtn" disabled>🖨 인쇄 / PDF 저장</button></div><div id="book"></div><div id="src" style="display:none">' + src + '</div>' +
      '<script>window.DB_ASSET=' + JSON.stringify(ASSET) + ';var PAG=' + PAGINATE.toString() + ';' +
      '(async function(){try{await document.fonts.ready;var s=document.getElementById("src");s.style.display="block";s.style.position="absolute";s.style.left="-9999px";s.style.width="176mm";' +
      'if(window.renderMathInElement){var mo={delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false};renderMathInElement(s,mo);Array.prototype.forEach.call(document.querySelectorAll("template"),function(t){renderMathInElement(t.content,mo);});try{await Promise.all(["KaTeX_Main","KaTeX_Math","KaTeX_Size1","KaTeX_Size2","KaTeX_Size3","KaTeX_Size4","KaTeX_AMS"].map(function(f){return document.fonts.load("16px "+f,"x");}).concat([document.fonts.load("italic 16px KaTeX_Math","x"),document.fonts.load("bold 16px KaTeX_Main","x")]));}catch(e){}}' +
      'void s.offsetHeight;try{await Promise.all(["400 16px \\"Noto Sans KR\\"","700 16px \\"Noto Sans KR\\"","500 16px \\"Noto Sans KR\\"","400 16px \\"Noto Serif KR\\"","700 16px \\"Noto Serif KR\\"","600 16px \\"Cormorant Garamond\\"","16px \\"Bebas Neue\\"","500 16px \\"DM Mono\\""].map(function(f){return document.fonts.load(f,"가나A1");}));}catch(e){}' +
      'await Promise.all(Array.prototype.map.call(document.images,function(i){return i.complete?1:new Promise(function(r){i.onload=i.onerror=r;});}));' +
      'await document.fonts.ready;var n=PAG();await Promise.all(Array.prototype.map.call(document.images,function(i){return i.complete?1:new Promise(function(r){i.onload=i.onerror=r;});}));' +
      'window.DB_PAGES=n;document.getElementById("db-pstat").textContent="총 "+n+"쪽 · A4 · 양면 · 여백 없음 · 배경 그래픽 켜기로 인쇄하세요";var b=document.getElementById("db-pbtn");b.disabled=false;b.onclick=function(){window.print();};}catch(e){window.DB_PAGES=-1;document.getElementById("db-pstat").textContent="조판 오류: "+e.message;}})();<\/script></body></html>';
  }

  // 선택했지만 아직 복습지가 없는 학생(등불 데이터를 올리기 전에 채점된 학생)은 그 자리에서 만든다
  function ensureMissing(state, ids) {
    var F = fb();
    var miss = ids.filter(function (id) { return !state.sheets[id]; });
    if (!miss.length) return Promise.resolve();
    var chain = Promise.resolve();
    miss.forEach(function (id) {
      chain = chain.then(function () {
        var sess = (state.sessions || []).filter(function (x) { return x.id === id; })[0];
        return ensureSheet(id, { studentName: sess ? state.names[sess.studentUid] : undefined }).then(function (r) {
          if (r.status === 'no-pack') throw new Error('먼저 「등불 데이터 올리기」로 문항 데이터를 올려 주세요.');
          return F.getDoc(F.doc(F.db, 'reviewSheets', id)).then(function (d) { if (d.exists()) state.sheets[id] = d.data(); });
        });
      });
    });
    return chain;
  }
  function printSheets(state, sessionIds, onChanged) {
    var w = preparePrintWindow(); if (!w) return;
    ensureMissing(state, sessionIds).then(function () { return loadPack(state.examId, true); }).then(function (pack) {
      if (!pack) { w.close(); alert('등불 데이터가 없습니다.'); return; }
      var books = [];
      sessionIds.forEach(function (sid) {
        var sh = state.sheets[sid]; if (!sh) return;
        var name = state.names[sh.uid] || sh.studentName || '학생';
        if (!(sh.items || []).length) return;
        books.push(personalParts(sh, pack, name));
      });
      if (!books.length) { w.close(); alert('인쇄할 복습 문항이 있는 학생이 없습니다(전부 맞힌 학생은 복습지가 비어 있습니다).'); return; }
      if (!fillPrintWindow(w, books, '등불 개인 복습지 (' + books.length + '명)')) return;
      addPublishButton(w, state, sessionIds, onChanged);
      var F = fb(), t = now();
      sessionIds.forEach(function (sid) { if (state.sheets[sid]) F.updateDoc(F.doc(F.db, 'reviewSheets', sid), { printedAtMs: t }).catch(function () {}); });
      if (onChanged) setTimeout(function () { try { onChanged(); } catch (e) {} }, 800);
    }).catch(function (e) { try { w.close(); } catch (x) {} alert('인쇄 준비 실패: ' + e.message); });
  }
  function addPublishButton(w, state, sessionIds, onChanged) {
    var pend = sessionIds.filter(function (id) { var sh = state.sheets[id]; return sh && sh.status === 'pending' && (sh.items || []).length; });
    var bar = w.document.getElementById('db-printbar'); if (!bar) return;
    var b = w.document.createElement('button');
    b.id = 'db-pubbtn';
    b.style.cssText = 'margin-left:8px;background:#2F5D50;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer';
    if (!pend.length) { b.textContent = '✔ 이미 발행된 복습지'; b.disabled = true; b.style.opacity = '.6'; bar.appendChild(b); return; }
    b.textContent = '📮 인쇄한 학생 바로 발행 (' + pend.length + '명)';
    b.onclick = function () {
      if (!w.confirm(pend.length + '명에게 지금 발행할까요?\n학생 시험탭에 OMR이 열리고 48시간(' + fmtDT(now() + DUE_MS) + ' 마감)이 시작됩니다.')) return;
      b.disabled = true; b.textContent = '발행 중…';
      publishSheets(state.sheets, pend, state.exam.title).then(function (n) {
        b.textContent = '✔ ' + n + '명 발행 완료'; b.style.opacity = '.7';
        if (onChanged) try { onChanged(); } catch (e) {}
      }).catch(function (e) { b.disabled = false; b.textContent = '📮 다시 시도 (발행 실패: ' + e.message + ')'; });
    };
    bar.appendChild(b);
  }
  function printTeacherBook(state, elective) {
    var w = preparePrintWindow(); if (!w) return;
    loadPack(state.examId, true).then(function (pack) {
      if (!pack) { w.close(); alert('등불 데이터가 없습니다.'); return; }
      if (elective && !pack.units.some(function (u) { return u.section === elective; })) { w.close(); alert('이 데이터에는 「' + elective + '」가 없습니다.'); return; }
      fillPrintWindow(w, [teacherParts(pack, elective)], '등불 선생님용 전체본 · ' + elective);
    }).catch(function (e) { try { w.close(); } catch (x) {} alert('인쇄 준비 실패: ' + e.message); });
  }

  // 테스트·외부 사용을 위한 노출
  window.DB_internal = { uploadPack: uploadPack, ensureSheet: ensureSheet, loadPack: loadPack, buildPrintHtml: buildPrintHtml, flattenUnits: flattenUnits, validatePack: validatePack, buildSheetData: buildSheetData, nb: nb, personalParts: personalParts, teacherParts: teacherParts, PAGINATE: PAGINATE, examKoInfo: examKoInfo, examSubjInfos: examSubjInfos, normEl: normEl, itemIndex: itemIndex, twinOrder: twinOrder, publishSheets: publishSheets, bookHtmlForPdf: bookHtmlForPdf, downloadPdf: downloadPdf, fillPrintWindow: fillPrintWindow };
})();
