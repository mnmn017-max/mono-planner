// /api/force-submit-exams.js
// 마감시각이 지났는데도 waiting / in_progress / break 상태로 남아있는 시험 세션을
// 서버가 직접 채점·제출 처리하는 안전장치.
//
// 완료된 시험은 클라이언트와 동일하게 기존 성적탭(모의고사/내신)의 grades
// 컬렉션에도 자동으로 저장됩니다.

const admin = require('firebase-admin');

function parseServiceAccountJson(raw) {
  // FIREBASE_SERVICE_ACCOUNT는 base64로 인코딩되어 저장된 경우가 많다 (줄바꿈/따옴표 이스케이프 문제 회피용).
  // 1) base64로 우선 디코딩 시도 -> JSON.parse
  try {
    var decoded = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    // 2) base64가 아니라 순수 JSON 텍스트로 저장된 경우 그대로 파싱
    return JSON.parse(raw);
  }
}

function buildCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    var parsed;
    try {
      parsed = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 올바른 JSON 형식이 아닙니다 (base64 디코딩도 시도했지만 실패): ' + e.message);
    }
    return admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: (parsed.private_key || '').replace(/\\n/g, '\n'),
    });
  }
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  throw new Error('Firebase Admin 환경변수를 찾을 수 없습니다. FIREBASE_SERVICE_ACCOUNT 또는 (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) 중 하나가 Vercel에 설정되어 있어야 합니다.');
}

function ensureAdminInitialized() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: buildCredential() });
  }
  return admin.firestore();
}

let db; // 핸들러 첫 호출 시 지연 초기화됨
const DEFAULT_SUBJECT_NAMES = { ko: '국어', en: '영어', ma: '수학', hi: '한국사', sc: '과학탐구', so: '사회탐구' };

function gradeExamAnswers(subj, answers) {
  var details = [];
  var score = 0, totalScore = 0, correctCount = 0;
  var wrongNumbers = [];
  var mcTotal = 0, mcCorrect = 0, shortTotal = 0, shortCorrect = 0;

  (subj.questions || []).forEach(function (q) {
    totalScore += q.point;
    var studentRaw = answers ? answers[q.no] : undefined;
    var studentAnswerDisplay, isCorrect, normalizedStudent;

    if (q.type === 'mc') {
      mcTotal++;
      studentAnswerDisplay = studentRaw != null ? String(studentRaw) : null;
      isCorrect = studentAnswerDisplay != null && parseInt(studentAnswerDisplay, 10) === q.answer;
      if (isCorrect) mcCorrect++;
    } else if (q.shortMode === 'digit') {
      shortTotal++;
      var digits = (studentRaw && studentRaw.digits) ? studentRaw.digits : [0, 0, 0];
      normalizedStudent = digits.map(function (d) { return String(d); }).join('');
      studentAnswerDisplay = normalizedStudent;
      isCorrect = normalizedStudent === q.answer;
      if (isCorrect) shortCorrect++;
    } else {
      shortTotal++;
      var raw = (studentRaw || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      var correctNorm = (q.answer || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      studentAnswerDisplay = studentRaw || '';
      isCorrect = raw === correctNorm && raw !== '';
      if (isCorrect) shortCorrect++;
    }

    var earned = isCorrect ? q.point : 0;
    score += earned;
    if (isCorrect) correctCount++; else wrongNumbers.push(q.no);

    details.push({
      no: q.no, type: q.type, shortMode: q.shortMode || null,
      studentAnswer: studentAnswerDisplay, correctAnswer: q.answer,
      isCorrect: isCorrect, point: q.point, earned: earned,
      gradingMode: 'auto_server_forced'
    });
  });

  return {
    score: score, totalScore: totalScore, correctCount: correctCount,
    wrongNumbers: wrongNumbers, details: details,
    mcAccuracy: mcTotal ? Math.round(mcCorrect / mcTotal * 100) : null,
    shortAccuracy: shortTotal ? Math.round(shortCorrect / shortTotal * 100) : null
  };
}

function examTodayDateStr() {
  var now = new Date();
  var kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  var y = kst.getFullYear(), m = String(kst.getMonth() + 1).padStart(2, '0'), d = String(kst.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

async function getSubjectLabel(studentUid, key, cache) {
  if (cache[studentUid] === undefined) {
    try {
      var uDoc = await db.collection('users').doc(studentUid).get();
      var subs = uDoc.exists && Array.isArray(uDoc.data().subjects) ? uDoc.data().subjects : null;
      var map = {};
      if (subs) subs.forEach(function (s) { map[s.key] = s.name; });
      cache[studentUid] = map;
    } catch (e) { cache[studentUid] = {}; }
  }
  return cache[studentUid][key] || DEFAULT_SUBJECT_NAMES[key] || key;
}

function computeGradeFromCutoffs(cutoffs, score) {
  if (!cutoffs || !cutoffs.length) return '';
  var sorted = cutoffs.slice().sort(function (a, b) { return b.min - a.min; });
  for (var i = 0; i < sorted.length; i++) {
    if (score >= sorted[i].min) return String(sorted[i].grade);
  }
  return '';
}

var GRADE_REWARD_START_DATE = '2026-08-22';

async function getPrevSubjectScores(studentUid, gradeType) {
  try {
    var snap = await db.collection('grades').where('uid', '==', studentUid).get();
    var docs = snap.docs.map(function (d) { return d.data(); })
      .filter(function (g) { return (g.type || 'mock') === (gradeType || 'mock'); })
      .sort(function (a, b) {
        var at = a.createdAt ? a.createdAt.toMillis() : 0, bt = b.createdAt ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
    var prevBySubj = {};
    docs.forEach(function (g) {
      if (!g.scores) return;
      Object.keys(g.scores).forEach(function (key) {
        if (prevBySubj[key] === undefined && g.scores[key] && g.scores[key].score != null) {
          prevBySubj[key] = parseInt(g.scores[key].score, 10);
        }
      });
    });
    return prevBySubj;
  } catch (e) { return {}; }
}

async function awardGradeLevelReward(studentUid, branch, subjectLabel, gradeValue, examName, examDateStr) {
  if (!examDateStr || examDateStr < GRADE_REWARD_START_DATE) return;
  var pts = gradeValue === '1' ? 10 : gradeValue === '2' ? 5 : 0;
  if (!pts) return;
  var reason = subjectLabel + ' ' + gradeValue + '등급 달성 (' + examName + ') (자동)';
  try {
    var dup = await db.collection('points').where('studentUid', '==', studentUid).where('reason', '==', reason).limit(1).get();
    if (!dup.empty) return; // 이미 지급됨
    await db.collection('points').add({
      branch: branch, studentUid: studentUid, type: 'plus', reason: reason, points: pts,
      givenBy: 'system', givenByName: '자동지급', createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

async function awardExamRewards(studentUid, branch, exam, results, prevScores, subjectNameCache) {
  var todayStr = examTodayDateStr();

  await db.collection('points').add({
    branch: branch, studentUid: studentUid, type: 'plus',
    reason: '시험 응시 완료 (' + exam.title + ') (자동)', points: 3,
    givenBy: 'system', givenByName: '자동지급', createdAt: admin.firestore.FieldValue.serverTimestamp()
  }).catch(function () {});

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (!r) continue;
    var subjName = await getSubjectLabel(studentUid, r.subject, subjectNameCache);
    var subjDef = (exam.subjects && exam.subjects[r.subjectIndex]) || null;

    if (prevScores && prevScores[r.subject] != null && r.score > prevScores[r.subject]) {
      await db.collection('points').add({
        branch: branch, studentUid: studentUid, type: 'plus',
        reason: subjName + ' 성적 향상 (' + prevScores[r.subject] + '점→' + r.score + '점, ' + exam.title + ') (자동)', points: 10,
        givenBy: 'system', givenByName: '자동지급', createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(function () {});
    }

    if (subjDef && subjDef.gradeCutoffs) {
      var grade = computeGradeFromCutoffs(subjDef.gradeCutoffs, r.score);
      await awardGradeLevelReward(studentUid, branch, subjName, grade, exam.title, todayStr);
    }
  }
}

async function writeExamResultToGrades(studentUid, sessionId, examId, exam, results, subjectNameCache) {
  var scores = {}, wrongBySubj = {};
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (!r) continue;
    var label = await getSubjectLabel(studentUid, r.subject, subjectNameCache);
    var subjDef = (exam.subjects && exam.subjects[r.subjectIndex]) || null;
    var grade = (subjDef && subjDef.gradeCutoffs) ? computeGradeFromCutoffs(subjDef.gradeCutoffs, r.score) : '';
    scores[r.subject] = { score: r.score, grade: grade, label: label, group: r.subject };
    if (r.wrongNumbers && r.wrongNumbers.length) wrongBySubj[r.subject] = r.wrongNumbers.join(', ');
  }
  return db.collection('grades').add({
    uid: studentUid,
    type: exam.gradeType || 'mock',
    examName: exam.title,
    examDate: examTodayDateStr(),
    scores: scores,
    wrongBySubj: wrongBySubj,
    examSessionId: sessionId,
    examId: examId || null,
    source: 'exam_auto_forced',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = async function handler(req, res) {
  try {
    db = ensureAdminInitialized();
  } catch (e) {
    console.error('Firebase Admin 초기화 실패', e);
    return res.status(500).json({ error: 'Firebase Admin 초기화 실패: ' + e.message });
  }

  var authHeader = req.headers['authorization'] || '';
  var cronSecret = process.env.CRON_SECRET;
  var isCron = cronSecret && authHeader === 'Bearer ' + cronSecret;

  if (!isCron) {
    var idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: '인증 정보가 없습니다' });
    try {
      var decoded = await admin.auth().verifyIdToken(idToken);
      var userDoc = await db.collection('users').doc(decoded.uid).get();
      var role = userDoc.exists ? userDoc.data().role : null;
      if (role !== 'master') return res.status(403).json({ error: '마스터 계정만 실행할 수 있습니다' });
    } catch (e) {
      return res.status(401).json({ error: '인증 실패: ' + e.message });
    }
  }

  var now = Date.now();
  var scanned = 0, forceSubmittedSubjects = 0, movedToBreak = 0, fullyCompleted = 0, waitingStarted = 0, errors = 0;
  var subjectNameCache = {};

  try {
    var waitingSnap = await db.collection('examSessions').where('status', '==', 'waiting').get();
    for (var w = 0; w < waitingSnap.docs.length; w++) {
      var wDoc = waitingSnap.docs[w];
      var wSess = wDoc.data();
      scanned++;
      try {
        var wExamDoc = await db.collection('exams').doc(wSess.examId).get();
        if (!wExamDoc.exists) continue;
        var wExam = wExamDoc.data();
        if (!wExam.startAtMs || wExam.startAtMs > now) continue;
        var wSubjIdx = wSess.currentSubjectIndex || 0;
        var wSubj = wExam.subjects[wSubjIdx];
        if (!wSubj) continue;
        await wDoc.ref.update({
          status: 'in_progress',
          startedAtMs: wExam.startAtMs,
          deadlineMs: wExam.startAtMs + wSubj.durationMin * 60000,
          currentAnswers: {},
          listeningPlayed: false
        });
        waitingStarted++;
      } catch (e) {
        console.error('대기중 세션 시작 처리 실패', wDoc.id, e);
        errors++;
      }
    }

    var inProgressSnap = await db.collection('examSessions')
      .where('status', '==', 'in_progress')
      .get();

    for (var i = 0; i < inProgressSnap.docs.length; i++) {
      var sessDoc = inProgressSnap.docs[i];
      var sess = sessDoc.data();
      scanned++;
      if (!sess.deadlineMs || sess.deadlineMs > now) continue;

      try {
        var examDoc = await db.collection('exams').doc(sess.examId).get();
        if (!examDoc.exists) continue;
        var exam = examDoc.data();
        var subjIdx = sess.currentSubjectIndex || 0;
        var subj = exam.subjects[subjIdx];
        if (!subj) continue;

        var graded = gradeExamAnswers(subj, sess.currentAnswers || {});
        var subjectResult = {
          subject: subj.subject,
          subjectIndex: subjIdx,
          startedAtMs: sess.deadlineMs - subj.durationMin * 60000,
          submittedAtMs: now,
          autoSubmitted: true,
          forcedByServer: true,
          score: graded.score,
          totalScore: graded.totalScore,
          correctCount: graded.correctCount,
          wrongNumbers: graded.wrongNumbers,
          mcAccuracy: graded.mcAccuracy,
          shortAccuracy: graded.shortAccuracy,
          answers: graded.details
        };

        var results = (sess.subjectResults || []).slice();
        results[subjIdx] = subjectResult;

        var isLastSubject = (subjIdx >= exam.subjects.length - 1);

        if (isLastSubject) {
          await sessDoc.ref.update({
            status: 'graded',
            subjectResults: results,
            currentAnswers: {}
          });
          await writeExamResultToGrades(sess.studentUid, sessDoc.id, sess.examId, exam, results, subjectNameCache);
          var prevScores = await getPrevSubjectScores(sess.studentUid, exam.gradeType);
          await awardExamRewards(sess.studentUid, exam.branch, exam, results, prevScores, subjectNameCache);
          fullyCompleted++;
        } else {
          var breakMin = subj.breakAfterMin || 0;
          await sessDoc.ref.update({
            status: 'break',
            subjectResults: results,
            currentAnswers: {},
            currentSubjectIndex: subjIdx + 1,
            breakDeadlineMs: now + breakMin * 60000
          });
          movedToBreak++;
        }
        forceSubmittedSubjects++;
      } catch (e) {
        console.error('세션 강제제출 실패', sessDoc.id, e);
        errors++;
      }
    }

    var breakSnap = await db.collection('examSessions')
      .where('status', '==', 'break')
      .get();

    for (var j = 0; j < breakSnap.docs.length; j++) {
      var bDoc = breakSnap.docs[j];
      var bSess = bDoc.data();
      scanned++;
      if (!bSess.breakDeadlineMs || bSess.breakDeadlineMs > now) continue;
      try {
        var examDoc2 = await db.collection('exams').doc(bSess.examId).get();
        if (!examDoc2.exists) continue;
        var exam2 = examDoc2.data();
        var nextIdx = bSess.currentSubjectIndex || 0;
        var nextSubj = exam2.subjects[nextIdx];
        if (!nextSubj) continue;
        await bDoc.ref.update({
          status: 'in_progress',
          startedAtMs: now,
          deadlineMs: now + nextSubj.durationMin * 60000,
          currentAnswers: {},
          listeningPlayed: false
        });
      } catch (e) {
        console.error('쉬는시간 전환 실패', bDoc.id, e);
        errors++;
      }
    }

    return res.status(200).json({
      scanned: scanned,
      waitingStarted: waitingStarted,
      forceSubmittedSubjects: forceSubmittedSubjects,
      movedToBreak: movedToBreak,
      fullyCompleted: fullyCompleted,
      errors: errors
    });
  } catch (e) {
    console.error('force-submit-exams 전체 실패', e);
    return res.status(500).json({ error: e.message });
  }
};
