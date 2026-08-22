// /api/monthly-top5-reward.js
// 매월 마지막날, 그 달 순공시간 TOP5 학생에게 상점 30점씩 자동 지급.
// 지점(branch)별로 따로 집계합니다. 같은 달에 중복 실행돼도 이미 지급된
// 학생에게는 다시 주지 않습니다 (points 컬렉션에서 동일 사유 존재 여부로 판단).

const admin = require('firebase-admin');

function buildCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    var parsed;
    try {
      parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 올바른 JSON 형식이 아닙니다: ' + e.message);
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

function getKstNow() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function isLastDayOfMonthKst(kst) {
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return kst.getUTCDate() === lastDay;
}

module.exports = async function handler(req, res) {
  let db;
  try {
    db = ensureAdminInitialized();
  } catch (e) {
    console.error('Firebase Admin 초기화 실패', e);
    return res.status(500).json({ error: 'Firebase Admin 초기화 실패: ' + e.message });
  }

  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === 'Bearer ' + cronSecret;
  const force = (req.query && req.query.force === '1');

  if (!isCron) {
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: '인증 정보가 없습니다' });
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      const role = userDoc.exists ? userDoc.data().role : null;
      if (role !== 'master') return res.status(403).json({ error: '마스터 계정만 실행할 수 있습니다' });
    } catch (e) {
      return res.status(401).json({ error: '인증 실패: ' + e.message });
    }
  }

  const kst = getKstNow();
  if (!force && !isLastDayOfMonthKst(kst)) {
    return res.status(200).json({ skipped: true, reason: '오늘은 이번 달 마지막날이 아닙니다 (force=1로 강제 실행 가능)' });
  }

  const monthStr = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + 1, 0)).getUTCDate();
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  try {
    const [todoSnap, studentSnap] = await Promise.all([
      db.collection('todos').where('date', '>=', startDate).where('date', '<=', endDate).get(),
      db.collection('users').where('role', '==', 'student').get(),
    ]);

    const studentByUid = {};
    studentSnap.docs.forEach((d) => {
      const u = d.data();
      if (u.suspended === true) return;
      studentByUid[d.id] = { branch: u.branch || '(미지정)', name: u.name || '' };
    });

    // branch별 시간 집계
    const timeByBranchUid = {}; // branch -> { uid: secs }
    todoSnap.docs.forEach((d) => {
      const t = d.data();
      if (!t.studyTime || !t.uid || !studentByUid[t.uid]) return;
      const parts = String(t.studyTime).split(':');
      const secs = (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
      if (secs <= 0) return;
      const branch = studentByUid[t.uid].branch;
      if (!timeByBranchUid[branch]) timeByBranchUid[branch] = {};
      timeByBranchUid[branch][t.uid] = (timeByBranchUid[branch][t.uid] || 0) + secs;
    });

    let branchesProcessed = 0, awarded = 0, alreadyAwarded = 0;
    const detail = [];

    for (const branch of Object.keys(timeByBranchUid)) {
      branchesProcessed++;
      const map = timeByBranchUid[branch];
      const top5 = Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, 5);

      for (const uid of top5) {
        const reason = `${monthStr} 순공시간 TOP5 월간 시상 (자동)`;
        const dup = await db.collection('points')
          .where('studentUid', '==', uid)
          .where('reason', '==', reason)
          .limit(1)
          .get();
        if (!dup.empty) { alreadyAwarded++; continue; }

        await db.collection('points').add({
          branch, studentUid: uid, type: 'plus', reason, points: 30,
          givenBy: 'system', givenByName: '자동지급',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        awarded++;
        detail.push({ branch, uid, name: studentByUid[uid].name, seconds: map[uid] });
      }
    }

    return res.status(200).json({ month: monthStr, branchesProcessed, awarded, alreadyAwarded, detail });
  } catch (e) {
    console.error('monthly-top5-reward 실패', e);
    return res.status(500).json({ error: e.message });
  }
};
