import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Transcrição de voz via Gemini (mesmo motor multimodal do app Gemini) —
 * substitui a Web Speech API do navegador, que erra muito em português.
 *
 * Variável de ambiente no Netlify: GEMINI_API_KEY (mesma usada pela function /ai).
 */
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let audioBase64, mimeType;
  try {
    ({ audioBase64, mimeType } = await req.json());
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof audioBase64 !== "string" || !audioBase64) {
    return Response.json({ error: "Áudio inválido" }, { status: 400 });
  }
  // ~15MB em base64 é uma trava generosa para um trecho de voz curto
  if (audioBase64.length > 20_000_000) {
    return Response.json({ error: "Áudio muito longo" }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY não configurada no Netlify" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent([
      "Você é um transcritor de voz. NÃO descreva o áudio, NÃO comente e NÃO responda ao que foi dito — " +
        "apenas devolva o texto exato das palavras faladas no áudio abaixo, em português do Brasil. " +
        "Sem aspas, sem markdown. Se não houver fala (silêncio, ruído, música sem letra), devolva uma string vazia.",
      { inlineData: { mimeType: mimeType || "audio/webm", data: audioBase64 } },
    ]);
    const text = result.response.text().trim();
    return Response.json({ text });
  } catch (err) {
    console.error("Erro na transcrição (Gemini):", err);
    return Response.json({ error: "Falha ao transcrever o áudio" }, { status: 502 });
  }
};
