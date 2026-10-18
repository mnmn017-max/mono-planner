/**
 * MONO PLANNER - 등불 PDF 만들기 (Vercel Serverless Function)
 * ============================================================
 * 선생님 앱의 인쇄 창에서 이미 조판이 끝난 등불 HTML을 받아, 서버의 크롬으로 PDF를 만들어 돌려준다.
 *  - 응답 크기 제한(약 4.5MB) 때문에 쪽 범위(pages: "1-24")로 나누어 요청받고, 앱에서 하나로 합친다
 *  - 범위 PDF가 너무 크면 413을 돌려주고, 앱은 범위를 반으로 나눠 다시 요청한다
 *  - 선생님·마스터 계정만 사용 가능 (Firebase ID 토큰 확인)
 * 요청: POST, 헤더 Authorization: Bearer <idToken>, X-Pages: "1-24"
 *       본문: gzip으로 압축한 HTML (Content-Type: application/octet-stream)
 * 필요한 환경변수: FIREBASE_SERVICE_ACCOUNT (기존 API와 동일)
 */
const zlib = require("zlib");
const admin = require("firebase-admin");

// Vercel(아마존 리눅스 2023)에서 크롬 실행에 필요한 라이브러리를 풀도록 알려 줌
if (process.env.VERCEL && !process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_JS_RUNTIME) {
  process.env.AWS_LAMBDA_JS_RUNTIME = "nodejs22.x";
}
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const MAX_PDF_BYTES = 4200000;

function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.");
  let json;
  try { json = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")); } catch (e) { json = JSON.parse(raw); }
  admin.initializeApp({ credential: admin.credential.cert(json) });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      chromium.setGraphicsMode = false;
      return puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
        defaultViewport: { width: 1000, height: 1400 },
      });
    })().catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // 1) 선생님·마스터 확인
  try {
    ensureFirebaseAdmin();
    const auth = String(req.headers.authorization || "");
    const decoded = await admin.auth().verifyIdToken(auth.replace(/^Bearer\s+/i, ""));
    const ud = await admin.firestore().collection("users").doc(decoded.uid).get();
    const role = ud.exists ? ud.data().role : null;
    if (role !== "teacher" && role !== "master") return res.status(403).json({ error: "선생님·마스터 계정만 사용할 수 있습니다." });
  } catch (e) {
    return res.status(401).json({ error: "인증 실패: " + e.message });
  }

  // 2) HTML 받기
  const pages = String(req.headers["x-pages"] || "").trim();
  if (!/^\d+-\d+$/.test(pages)) return res.status(400).json({ error: "쪽 범위(X-Pages)가 올바르지 않습니다." });
  let html;
  try {
    let buf = req.body && Buffer.isBuffer(req.body) ? req.body : await readBody(req);
    if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
    html = buf.toString("utf-8");
  } catch (e) {
    return res.status(400).json({ error: "본문을 읽지 못했습니다: " + e.message });
  }
  if (!html || html.indexOf("<html") < 0) return res.status(400).json({ error: "HTML이 비어 있습니다." });

  // 3) PDF 만들기
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 40000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.prototype.map.call(document.images, (i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, pageRanges: pages, timeout: 45000 });
    if (pdf.length > MAX_PDF_BYTES) return res.status(413).json({ error: "too-large", bytes: pdf.length });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdf.length);
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    return res.status(500).json({ error: "PDF 생성 실패: " + e.message });
  } finally {
    if (page) page.close().catch(() => {});
  }
};

// 본문을 직접 읽기 위해 기본 JSON 파서를 끔
module.exports.config = { api: { bodyParser: false } };
