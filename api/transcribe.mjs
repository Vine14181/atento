import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  readJsonBody,
  verifyFirebaseUser,
  withTimeout,
} from "../lib/api-helpers.mjs";

/**
 * Transcrição de voz via Gemini (mesmo motor multimodal do app Gemini) —
 * substitui a Web Speech API do navegador, que erra muito em português.
 *
 * Exige login: sem isso o endpoint seria um serviço de IA multimodal grátis
 * rodando na cota do dono do app.
 *
 * Variável de ambiente na Vercel: GEMINI_API_KEY (mesma usada por /api/ai).
 */

// A Vercel limita o corpo da requisição (~4,5 MB no plano gratuito). O áudio
// vem em base64, que infla ~33%, então cortamos antes disso com uma mensagem
// clara em vez de deixar a plataforma rejeitar sem explicação.
const MAX_BASE64_CHARS = 4_000_000;

const AUTH_TIMEOUT_MS = 4000;
const GEMINI_TIMEOUT_MS = 48000;

// Só áudio. Sem esta trava, o campo mimeType transformaria o endpoint num
// leitor genérico de PDF/imagem/vídeo — muito mais caro em tokens que um
// trecho de voz, e um caminho para injetar instruções como se fossem áudio.
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/flac",
]);

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  const { audioBase64, mimeType, idToken } = body || {};

  if (typeof audioBase64 !== "string" || !audioBase64) {
    return res.status(400).json({ error: "Áudio inválido" });
  }
  if (audioBase64.length > MAX_BASE64_CHARS) {
    return res
      .status(413)
      .json({ error: "Áudio muito longo — grave um trecho mais curto" });
  }
  if (!BASE64_RE.test(audioBase64)) {
    return res.status(400).json({ error: "Áudio inválido" });
  }

  // Normaliza "audio/webm;codecs=opus" -> "audio/webm" antes de validar.
  const type = String(mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(type)) {
    return res.status(415).json({ error: "Formato de áudio não suportado" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error("GEMINI_API_KEY ausente no ambiente");
    return res.status(500).json({ error: "Serviço de IA indisponível" });
  }

  const user = await verifyFirebaseUser(idToken, AUTH_TIMEOUT_MS);
  if (!user) {
    return res.status(401).json({ error: "Faça login para usar o ditado" });
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await withTimeout(
      model.generateContent([
        "Você é um transcritor de voz. NÃO descreva o áudio, NÃO comente e NÃO responda ao que foi dito — " +
          "apenas devolva o texto exato das palavras faladas no áudio abaixo, em português do Brasil. " +
          "Sem aspas, sem markdown. Se não houver fala (silêncio, ruído, música sem letra), devolva uma string vazia.",
        { inlineData: { mimeType: type, data: audioBase64 } },
      ]),
      GEMINI_TIMEOUT_MS,
      "Gemini demorou demais"
    );
    const text = result.response.text().trim();
    return res.status(200).json({ text });
  } catch (err) {
    console.error("Erro na transcrição (Gemini):", err);
    return res.status(502).json({ error: "Falha ao transcrever o áudio" });
  }
}
