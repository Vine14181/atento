import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Roteador de IA do Atento — mantém as chaves no servidor, fora do navegador.
 *
 * Motores:
 *  — VIPs (verificados pelo token do Firebase): Claude Opus 5 (Anthropic), raciocínio máximo
 *  — Todos os demais: Gemini (Google)
 *
 * Variáveis de ambiente no Netlify:
 *  — GEMINI_API_KEY        (obrigatória)
 *  — ANTHROPIC_API_KEY     (para o motor VIP)
 *  — FIREBASE_WEB_API_KEY  (para verificar o token de login; é a chave pública do Firebase)
 *  — VIP_EMAILS            (emails do motor VIP, separados por vírgula)
 */

// Teto de tempo pro Opus 5 antes de desistir e cair no Gemini — a function do
// Netlify tem um limite de execução (~10s no plano padrão). "Esforço máximo"
// pode pensar por mais tempo que isso, e se a function inteira for encerrada
// pela plataforma no meio do caminho, o fallback abaixo nunca roda. Por isso
// abortamos a chamada por conta própria um pouco antes do limite da plataforma.
const OPUS_TIMEOUT_MS = 8000;

// Emails com acesso ao motor VIP — configurados no ambiente (VIP_EMAILS,
// separados por vírgula), nunca no código. Vazio = todos usam o Gemini.
const VIP_EMAILS = (process.env.VIP_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Verifica o ID token do Firebase e retorna o email real do usuário.
// Sem verificação server-side, qualquer um poderia se passar por VIP.
async function getVerifiedEmail(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.email?.toLowerCase() || null;
  } catch {
    return null;
  }
}

// Claude Opus 5 via API da Anthropic (fetch puro, sem SDK), com raciocínio no
// esforço máximo. Aborta sozinho depois de OPUS_TIMEOUT_MS para não deixar a
// plataforma matar a function inteira (o que puparia o fallback do Gemini).
async function callOpus5(prompt, key) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPUS_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 8000,
        output_config: { effort: "max" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("tempo esgotado");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`Anthropic retornou ${res.status}`);
  }
  const data = await res.json();
  // Checar stop_reason antes de ler o conteúdo (classificadores podem recusar)
  if (data.stop_reason === "refusal") {
    throw new Error("refusal");
  }
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) throw new Error("resposta vazia");
  return text;
}

async function callGemini(prompt, key) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let prompt, idToken;
  try {
    ({ prompt, idToken } = await req.json());
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) {
    return Response.json({ error: "Prompt inválido" }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Motor VIP: Claude Opus 5 (raciocínio máximo), só para emails verificados
  if (anthropicKey) {
    const email = await getVerifiedEmail(idToken);
    if (email && VIP_EMAILS.includes(email)) {
      try {
        const text = await callOpus5(prompt, anthropicKey);
        return Response.json({ text, engine: "opus-5" });
      } catch (err) {
        // Recusa, limite de taxa, tempo esgotado ou erro: cai para o Gemini em vez de falhar
        console.error("Opus 5 falhou, usando Gemini:", err.message);
      }
    }
  }

  if (!geminiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY não configurada no Netlify" },
      { status: 500 }
    );
  }

  try {
    const text = await callGemini(prompt, geminiKey);
    return Response.json({ text, engine: "gemini" });
  } catch (err) {
    console.error("Erro na chamada ao Gemini:", err);
    return Response.json({ error: "Falha ao consultar a IA" }, { status: 502 });
  }
};
