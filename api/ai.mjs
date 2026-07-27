import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  readJsonBody,
  verifyFirebaseUser,
  isVipUser,
  withTimeout,
} from "../lib/api-helpers.mjs";

/**
 * Roteador de IA do Atento — mantém as chaves no servidor, fora do navegador.
 *
 * Motores:
 *  — VIPs (verificados pelo token do Firebase): Claude Opus 5 (Anthropic)
 *  — Todos os demais: Gemini (Google)
 *
 * Exige login em TODAS as chamadas: sem isso, qualquer pessoa poderia usar
 * /api/ai como proxy de IA grátis e esgotar a cota paga pelo dono do app.
 *
 * Variáveis de ambiente na Vercel:
 *  — GEMINI_API_KEY        (obrigatória)
 *  — ANTHROPIC_API_KEY     (para o motor VIP)
 *  — FIREBASE_WEB_API_KEY  (para verificar o token de login; é a chave pública do Firebase)
 *  — VIP_EMAILS            (emails do motor VIP, separados por vírgula)
 */

// vercel.json dá 60s de execução. Trabalhamos dentro de 55s para sobrar tempo
// de enviar a resposta, e reservamos uma fatia para o Gemini — se o Opus 5
// consumisse tudo, a plataforma mataria a função e o fallback nunca rodaria.
const TOTAL_BUDGET_MS = 55000;
const AUTH_TIMEOUT_MS = 4000;
const GEMINI_RESERVE_MS = 14000;
const OPUS_MIN_USEFUL_MS = 6000;

/**
 * Claude Opus 5 via API da Anthropic (fetch puro, sem SDK).
 *
 * Sobre o esforço de raciocínio: no Opus 5 o pensamento vem ligado por padrão e
 * max_tokens limita pensamento + resposta JUNTOS. Esforço "max" pede max_tokens
 * na casa de 64K, o que não cabe em 60s de função serverless — o pensamento
 * consumiria o orçamento e a resposta voltaria vazia ou cortada, caindo
 * silenciosamente no Gemini. "high" é o teto real aqui, com folga de tokens.
 */
async function callOpus5(prompt, key, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        output_config: { effort: "high" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Anthropic retornou ${res.status}`);

    const data = await res.json();

    // Classificadores podem recusar; checar antes de ler o conteúdo.
    if (data.stop_reason === "refusal") throw new Error("recusa");
    // Resposta cortada no limite de tokens: o texto viria incompleto e o
    // cliente falharia ao interpretar o JSON. Melhor tratar como falha e
    // deixar o Gemini responder.
    if (data.stop_reason === "max_tokens") throw new Error("resposta truncada");

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (!text) throw new Error("resposta vazia");
    return text;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("tempo esgotado");
    throw err;
  } finally {
    // Só limpamos o timer aqui: assim o limite cobre também a leitura do corpo
    // da resposta, não apenas o início da requisição.
    clearTimeout(timer);
  }
}

async function callGemini(prompt, key, timeoutMs) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const result = await withTimeout(
    model.generateContent(prompt),
    timeoutMs,
    "Gemini demorou demais"
  );
  return result.response.text();
}

export default async function handler(req, res) {
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  const { prompt, idToken } = body || {};

  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) {
    return res.status(400).json({ error: "Prompt inválido" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey) {
    console.error("GEMINI_API_KEY ausente no ambiente");
    return res.status(500).json({ error: "Serviço de IA indisponível" });
  }

  // Login obrigatório para qualquer motor.
  const user = await verifyFirebaseUser(idToken, AUTH_TIMEOUT_MS);
  if (!user) {
    return res.status(401).json({ error: "Faça login para usar a IA" });
  }

  // Motor VIP: Claude Opus 5, só para emails verificados na lista do servidor.
  if (anthropicKey && isVipUser(user)) {
    const elapsed = Date.now() - startedAt;
    const opusBudget = TOTAL_BUDGET_MS - elapsed - GEMINI_RESERVE_MS;
    if (opusBudget >= OPUS_MIN_USEFUL_MS) {
      try {
        const text = await callOpus5(prompt, anthropicKey, opusBudget);
        return res.status(200).json({ text, engine: "opus-5" });
      } catch (err) {
        // Recusa, truncamento, limite de taxa, tempo esgotado ou erro de rede:
        // cai para o Gemini em vez de falhar a requisição.
        console.error("Opus 5 falhou, usando Gemini:", err.message);
      }
    } else {
      console.error("Sem tempo para o Opus 5; usando Gemini direto");
    }
  }

  try {
    const geminiBudget = Math.max(
      5000,
      TOTAL_BUDGET_MS - (Date.now() - startedAt)
    );
    const text = await callGemini(prompt, geminiKey, geminiBudget);
    return res.status(200).json({ text, engine: "gemini" });
  } catch (err) {
    console.error("Erro na chamada ao Gemini:", err);
    return res.status(502).json({ error: "Falha ao consultar a IA" });
  }
}
