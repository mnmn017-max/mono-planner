/**
 * MONO PLANNER - 시험 종료 알림용 고품질 한국어 음성 생성 (Google Cloud Text-to-Speech)
 * ============================================================
 * 기기에 내장된 음성(브라우저 speechSynthesis)은 한국어 목소리가 1~2개뿐인 경우가
 * 많아서, 더 다양한(성별/톤별) 한국어 목소리를 쓰고 싶을 때 이 서버 함수를 통해
 * Google Cloud TTS로 실제 음성 파일(MP3, base64)을 만들어서 돌려준다.
 *
 * 필요한 환경변수:
 *   - GOOGLE_TTS_API_KEY (Google Cloud Console에서 발급한 API 키, Text-to-Speech API 사용 설정 필요)
 *
 * 요금: Standard 음성 매달 400만자, WaveNet/Neural2 음성 매달 100만자까지 무료
 * (알림 문구 하나가 10자 안팎이라 일반적인 사용량으로는 사실상 무료 한도 안에 계속 머무름)
 */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GOOGLE_TTS_API_KEY 환경변수가 Vercel에 설정되어 있지 않습니다." });
  }

  const { text, voiceName } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "읽어줄 문구가 없습니다." });
  }

  const voice = voiceName || "ko-KR-Neural2-A";

  try {
    const response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: String(text).slice(0, 200) },
          voice: { languageCode: "ko-KR", name: voice },
          audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const reason = (data && data.error && data.error.message) || ("HTTP " + response.status);
      return res.status(response.status).json({ error: "Google TTS 오류: " + reason });
    }
    if (!data.audioContent) {
      return res.status(500).json({ error: "음성 데이터를 받지 못했습니다." });
    }

    return res.status(200).json({ audioContent: data.audioContent }); // base64 MP3
  } catch (e) {
    console.error("[tts-generate] 실패", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
