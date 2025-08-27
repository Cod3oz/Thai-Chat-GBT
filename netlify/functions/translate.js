export async function handler(event) {
  try {
    const { text, direction = "auto", gender = "auto" } = JSON.parse(event.body || "{}");

    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing text input" }) };
    }

    let sourceLang, targetLang;
    if (direction === "en-th") {
      sourceLang = "English"; targetLang = "Thai";
    } else if (direction === "th-en") {
      sourceLang = "Thai"; targetLang = "English";
    } else {
      const thaiChars = /[\u0E00-\u0E7F]/;
      if (thaiChars.test(text)) { sourceLang = "Thai"; targetLang = "English"; }
      else { sourceLang = "English"; targetLang = "Thai"; }
    }

    const genderNote =
      gender === "male" ? "Assume the speaker is male; use polite particles like ครับ/นะครับ when needed." :
      gender === "female" ? "Assume the speaker is female; use polite particles like ค่ะ/นะคะ when needed." :
      "If polite particles are needed, pick the neutral/most common form.";

    const system = `You are a professional translator following the G-Dawg Standard for ${sourceLang} ↔ ${targetLang}.
Return FIVE versions of the translation: Literal, Natural, Creative/Localized, Joking, Romantic.
Honor cultural nuance and politeness levels for Thai. ${genderNote}
Keep Joking playful (family-friendly). Keep Romantic sincere.
Output STRICT JSON with keys: literal, natural, creative, joking, romantic. No commentary.`;

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ],
      temperature: 0.7
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content.trim());
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: "Bad JSON from model", raw: data.choices[0].message.content }) };
    }

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
